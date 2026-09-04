import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { VideoCallingService } from '../services/video-calling.service';
import { GuardVideoWebRtcService, webRtcMediaBlockedReason } from '../services/guard-video-webrtc.service';
import { VideoCallSignalingService } from '../services/video-call-signaling.service';
import {
  Guard,
  VideoCall,
  VideoCallStatus,
  VideoCallDirection,
  GuardStatus,
  VideoCallStatistics,
  VideoCallFilter
} from '../models/video-calling.model';
import { Subscription, interval, firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-video-calling',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="video-calling-container">
      <div class="page-header">
        <h1><i class="material-icons">videocam</i> Video Calling with Guard</h1>
        <p>Real WebRTC video with guards — dial any mobile number to test</p>
      </div>

      <!-- Real WebRTC dial panel -->
      <div class="real-vc-panel">
        <div class="real-vc-title">
          <i class="material-icons">phone_in_talk</i>
          <span>Call by guard mobile number</span>
        </div>
        <p class="real-vc-hint">
          This is <strong>browser video</strong>, not a WhatsApp/phone call. Enter any 10-digit number as a room ID.
          On your PC: click <em>Call Guard</em>, then open the join link in another tab/browser as the guard.
          Both sides must allow camera and microphone.
        </p>
        <div class="webrtc-error secure-context" *ngIf="mediaBlockedHint">
          <i class="material-icons">lock</i> {{ mediaBlockedHint }}
        </div>
        <div class="webrtc-error api-warn" *ngIf="signalingApiHint && !mediaBlockedHint">
          <i class="material-icons">cloud_off</i> {{ signalingApiHint }}
        </div>
        <div class="dial-row">
          <input
            type="tel"
            class="dial-input"
            [(ngModel)]="dialPhone"
            placeholder="Guard mobile e.g. 9876543210"
            maxlength="15"
          />
          <input
            type="text"
            class="dial-input name-input"
            [(ngModel)]="dialGuardName"
            placeholder="Guard name (optional)"
          />
        </div>
        <div class="dial-actions">
          <button type="button" class="btn-dial call" (click)="startRealCallAsResident()" [disabled]="realCallBusy">
            <i class="material-icons">videocam</i>
            Call Guard
          </button>
          <button type="button" class="btn-dial answer" (click)="answerRealCallAsGuard()" [disabled]="realCallBusy">
            <i class="material-icons">call_received</i>
            Answer as Guard
          </button>
          <button type="button" class="btn-dial copy" (click)="copyGuardJoinLink()" [disabled]="!guardJoinUrl">
            <i class="material-icons">content_copy</i>
            Copy join link
          </button>
        </div>
        <div class="join-link-box" *ngIf="guardJoinUrl">
          <label>Guard opens this URL:</label>
          <code>{{ guardJoinUrl }}</code>
        </div>
        <div class="webrtc-error" *ngIf="webrtcError">
          <i class="material-icons">error</i> {{ webrtcError }}
        </div>
      </div>

      <!-- Statistics -->
      <div class="statistics-grid" *ngIf="statistics">
        <div class="stat-card total">
          <div class="stat-icon">
            <i class="material-icons">videocam</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.totalCalls }}</div>
            <div class="stat-label">Total Calls</div>
          </div>
        </div>
        <div class="stat-card today">
          <div class="stat-icon">
            <i class="material-icons">today</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.callsToday }}</div>
            <div class="stat-label">Calls Today</div>
          </div>
        </div>
        <div class="stat-card active">
          <div class="stat-icon">
            <i class="material-icons">call</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.activeCalls }}</div>
            <div class="stat-label">Active Calls</div>
          </div>
        </div>
        <div class="stat-card guards">
          <div class="stat-icon">
            <i class="material-icons">security</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.availableGuards }}/{{ statistics.totalGuards }}</div>
            <div class="stat-label">Available Guards</div>
          </div>
        </div>
        <div class="stat-card duration">
          <div class="stat-icon">
            <i class="material-icons">timer</i>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatDuration(statistics.averageCallDuration) }}</div>
            <div class="stat-label">Avg Duration</div>
          </div>
        </div>
      </div>

      <!-- Active Video Call Display -->
      <div class="active-call-container" *ngIf="activeCall">
        <div class="video-call-header">
          <div class="call-info">
            <div class="call-guard-name">
              <i class="material-icons">security</i>
              {{ activeCall.guard?.name || 'Unknown Guard' }}
            </div>
            <div class="call-status" [ngClass]="getCallStatusClass(activeCall.status)">
              {{ getCallStatusText(activeCall.status) }}
            </div>
            <div class="call-meta" *ngIf="activeCall.gateName">
              <i class="material-icons">location_on</i>
              {{ activeCall.gateName }}
            </div>
          </div>
        </div>

        <!-- Video Display Area -->
        <div class="video-display-area" *ngIf="activeCall.status === VideoCallStatus.CONNECTED || activeCall.status === VideoCallStatus.RINGING">
          <div class="video-container">
            <!-- Remote Video (Guard's Video) -->
            <div class="remote-video-container">
              <video
                #remoteVideo
                class="remote-video"
                [class.video-disabled]="!activeCall.isRemoteVideoEnabled"
                autoplay
                playsinline
              ></video>
              <div class="video-overlay" *ngIf="!activeCall.isRemoteVideoEnabled">
                <i class="material-icons">videocam_off</i>
                <span>Video Off</span>
              </div>
              <div class="video-label">Guard View</div>
            </div>

            <!-- Local Video (Your Video) -->
            <div class="local-video-container">
              <video
                #localVideo
                class="local-video"
                [class.video-disabled]="!activeCall.isVideoEnabled"
                autoplay
                playsinline
                muted
              ></video>
              <div class="video-overlay" *ngIf="!activeCall.isVideoEnabled">
                <i class="material-icons">videocam_off</i>
                <span>Your Video Off</span>
              </div>
              <div class="video-label">Your View</div>
            </div>
          </div>

          <!-- Call Timer -->
          <div class="call-timer">
            <span>{{ formatCallDuration() }}</span>
          </div>

          <!-- Connection Quality Indicator -->
          <div class="connection-quality" *ngIf="activeCall.connectionQuality">
            <i class="material-icons" [ngClass]="getQualityClass(activeCall.connectionQuality)">
              {{ getQualityIcon(activeCall.connectionQuality) }}
            </i>
            <span>{{ activeCall.connectionQuality }}</span>
          </div>
        </div>

        <!-- Call Controls -->
        <div class="call-controls">
          <button 
            class="control-btn" 
            [ngClass]="{ 'active': activeCall.isVideoEnabled }"
            (click)="toggleVideo()"
            [disabled]="activeCall.status !== VideoCallStatus.CONNECTED">
            <i class="material-icons">{{ activeCall.isVideoEnabled ? 'videocam' : 'videocam_off' }}</i>
            <span>{{ activeCall.isVideoEnabled ? 'Video On' : 'Video Off' }}</span>
          </button>

          <button 
            class="control-btn" 
            [ngClass]="{ 'active': activeCall.isAudioEnabled }"
            (click)="toggleAudio()"
            [disabled]="activeCall.status !== VideoCallStatus.CONNECTED">
            <i class="material-icons">{{ activeCall.isAudioEnabled ? 'mic' : 'mic_off' }}</i>
            <span>{{ activeCall.isAudioEnabled ? 'Unmute' : 'Mute' }}</span>
          </button>

          <button 
            class="control-btn record" 
            [ngClass]="{ 'recording': activeCall.isRecording }"
            (click)="toggleRecording()"
            [disabled]="activeCall.status !== VideoCallStatus.CONNECTED">
            <i class="material-icons">{{ activeCall.isRecording ? 'stop_circle' : 'fiber_manual_record' }}</i>
            <span>{{ activeCall.isRecording ? 'Stop Recording' : 'Record' }}</span>
          </button>

          <button 
            class="control-btn end-call" 
            (click)="endCurrentCall()">
            <i class="material-icons">call_end</i>
            <span>End Call</span>
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="video-calling-content">
        <!-- Guards Panel -->
        <div class="guards-panel">
          <div class="panel-header">
            <h2>Available Guards</h2>
            <div class="search-filter">
              <input 
                type="text" 
                placeholder="Search guards..." 
                [(ngModel)]="filter.searchTerm"
                (input)="applyFilters()"
                class="search-input">
              <select [(ngModel)]="filter.gateId" (change)="applyFilters()" class="filter-select">
                <option value="">All Gates</option>
                <option value="MAIN_GATE">Main Gate</option>
                <option value="SIDE_GATE">Side Gate</option>
                <option value="PARKING_GATE">Parking Gate</option>
                <option value="EMERGENCY_GATE">Emergency Gate</option>
              </select>
            </div>
          </div>

          <div class="guards-list" *ngIf="!isLoading && guards.length > 0">
            <div 
              *ngFor="let guard of guards" 
              class="guard-card"
              [ngClass]="{ 
                'unavailable': guard.status !== GuardStatus.AVAILABLE, 
                'calling': isCalling(guard.id),
                'busy': guard.status === GuardStatus.BUSY
              }"
              (click)="makeVideoCall(guard)">
              <div class="guard-avatar">
                <i class="material-icons">security</i>
                <div class="status-badge" [ngClass]="getGuardStatusClass(guard.status)"></div>
              </div>
              <div class="guard-info">
                <div class="guard-name">{{ guard.name }}</div>
                <div class="guard-meta">
                  <span *ngIf="guard.badgeNumber" class="badge-number">Badge: {{ guard.badgeNumber }}</span>
                  <span *ngIf="guard.gateName" class="gate-name">{{ guard.gateName }}</span>
                </div>
                <div class="guard-status-text">{{ getGuardStatusText(guard.status) }}</div>
              </div>
              <div class="guard-actions">
                <button class="btn-video-call" (click)="makeVideoCall(guard); $event.stopPropagation()">
                  <i class="material-icons">videocam</i>
                </button>
              </div>
            </div>
          </div>

          <div class="empty-state" *ngIf="!isLoading && guards.length === 0">
            <i class="material-icons">security</i>
            <p>No guards available</p>
          </div>
        </div>

        <!-- Call History Panel -->
        <div class="history-panel">
          <div class="panel-header">
            <h2>Call History</h2>
            <button class="btn-refresh" (click)="loadCallHistory()">
              <i class="material-icons">refresh</i>
            </button>
          </div>

          <div class="history-list" *ngIf="callHistory.length > 0">
            <div *ngFor="let call of callHistory" class="history-item">
              <div class="history-icon" [ngClass]="getCallDirectionClass(call.direction)">
                <i class="material-icons">videocam</i>
              </div>
              <div class="history-info">
                <div class="history-guard">{{ call.guard?.name || 'Unknown Guard' }}</div>
                <div class="history-meta">
                  <span class="history-time">{{ formatDateTime(call.startTime) }}</span>
                  <span *ngIf="call.duration" class="history-duration">{{ formatDuration(call.duration) }}</span>
                  <span *ngIf="call.gateName" class="history-gate">{{ call.gateName }}</span>
                </div>
              </div>
              <div class="history-status" [ngClass]="getCallStatusClass(call.status)">
                {{ call.status }}
              </div>
            </div>
          </div>

          <div class="empty-state" *ngIf="callHistory.length === 0">
            <i class="material-icons">history</i>
            <p>No call history</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .video-calling-container {
      padding: 24px;
      max-width: 1800px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .page-header h1 {
      font-size: 28px;
      margin: 0 0 8px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 15px;
    }

    .real-vc-panel {
      background: #ecfdf5;
      border: 1px solid #6ee7b7;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }

    .real-vc-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      color: #065f46;
      margin-bottom: 8px;
    }

    .real-vc-hint {
      margin: 0 0 12px;
      font-size: 13px;
      color: #047857;
      line-height: 1.5;
    }

    .dial-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .dial-input {
      flex: 1;
      min-width: 180px;
      padding: 12px 14px;
      border: 2px solid #a7f3d0;
      border-radius: 8px;
      font-size: 15px;
    }

    .dial-input.name-input {
      max-width: 220px;
      flex: 0 1 220px;
    }

    .dial-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }

    .btn-dial {
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: white;
    }

    .btn-dial:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-dial.call {
      background: #059669;
    }

    .btn-dial.answer {
      background: #2563eb;
    }

    .btn-dial.copy {
      background: #64748b;
    }

    .join-link-box {
      font-size: 12px;
      color: #065f46;
      word-break: break-all;
    }

    .join-link-box code {
      display: block;
      margin-top: 4px;
      background: rgba(255, 255, 255, 0.7);
      padding: 8px;
      border-radius: 6px;
    }

    .webrtc-error.secure-context {
      color: #92400e;
      background: #fef3c7;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid #fcd34d;
    }

    .webrtc-error.api-warn {
      color: #1e40af;
      background: #eff6ff;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid #93c5fd;
    }

    .webrtc-error {
      margin-top: 10px;
      color: #b91c1c;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .statistics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: white;
    }

    .stat-card.total .stat-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .stat-card.today .stat-icon {
      background: #17a2b8;
    }

    .stat-card.active .stat-icon {
      background: #28a745;
    }

    .stat-card.guards .stat-icon {
      background: #ffc107;
    }

    .stat-card.duration .stat-icon {
      background: #f5576c;
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 13px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    .active-call-container {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      color: white;
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
    }

    .video-call-header {
      margin-bottom: 20px;
    }

    .call-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .call-guard-name {
      font-size: 24px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .call-status {
      font-size: 14px;
      opacity: 0.9;
    }

    .call-meta {
      font-size: 13px;
      opacity: 0.8;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .video-display-area {
      margin-bottom: 20px;
    }

    .video-container {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }

    .remote-video-container,
    .local-video-container {
      position: relative;
      background: #000;
      border-radius: 12px;
      overflow: hidden;
      aspect-ratio: 16/9;
    }

    .remote-video,
    .local-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .video-disabled {
      background: #1a1a1a;
    }

    .video-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: #fff;
    }

    .video-overlay .material-icons {
      font-size: 48px;
      opacity: 0.5;
    }

    .video-label {
      position: absolute;
      bottom: 8px;
      left: 8px;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .call-timer {
      text-align: center;
      font-size: 32px;
      font-weight: 700;
      font-family: 'Courier New', monospace;
      margin-bottom: 12px;
    }

    .connection-quality {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 14px;
      opacity: 0.9;
    }

    .call-controls {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .control-btn {
      padding: 12px 24px;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .control-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.3);
    }

    .control-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .control-btn.active {
      background: rgba(255, 255, 255, 0.3);
      border-color: rgba(255, 255, 255, 0.5);
    }

    .control-btn.record.recording {
      background: rgba(220, 53, 69, 0.8);
      border-color: rgba(220, 53, 69, 1);
      animation: pulse 2s infinite;
    }

    .control-btn.end-call {
      background: rgba(220, 53, 69, 0.8);
      border-color: rgba(220, 53, 69, 1);
    }

    .control-btn.end-call:hover {
      background: rgba(220, 53, 69, 1);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .video-calling-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .guards-panel,
    .history-panel {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f0f0f0;
    }

    .panel-header h2 {
      margin: 0;
      font-size: 20px;
      color: #2c3e50;
    }

    .search-filter {
      display: flex;
      gap: 12px;
      flex: 1;
      max-width: 400px;
    }

    .search-input {
      flex: 1;
      padding: 10px 14px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
    }

    .filter-select {
      padding: 10px 14px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      cursor: pointer;
    }

    .btn-refresh {
      padding: 8px;
      background: #f5f5f5;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .btn-refresh:hover {
      background: #e0e0e0;
    }

    .guards-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 600px;
      overflow-y: auto;
    }

    .guard-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .guard-card:hover {
      border-color: #667eea;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
      transform: translateY(-2px);
    }

    .guard-card.unavailable {
      opacity: 0.6;
    }

    .guard-card.calling {
      border-color: #28a745;
      background: #f0f9ff;
    }

    .guard-card.busy {
      border-color: #ffc107;
    }

    .guard-avatar {
      position: relative;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }

    .status-badge {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid white;
    }

    .status-badge.available {
      background: #28a745;
    }

    .status-badge.busy {
      background: #ffc107;
    }

    .status-badge.offline {
      background: #dc3545;
    }

    .status-badge.on-patrol {
      background: #17a2b8;
    }

    .guard-info {
      flex: 1;
    }

    .guard-name {
      font-size: 16px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 6px;
    }

    .guard-meta {
      display: flex;
      gap: 12px;
      font-size: 13px;
      color: #7f8c8d;
      margin-bottom: 4px;
    }

    .guard-status-text {
      font-size: 12px;
      color: #667eea;
      font-weight: 600;
      text-transform: uppercase;
    }

    .guard-actions {
      display: flex;
      align-items: center;
    }

    .btn-video-call {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #28a745;
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .btn-video-call:hover {
      background: #218838;
      transform: scale(1.1);
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 600px;
      overflow-y: auto;
    }

    .history-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border: 2px solid #f0f0f0;
      border-radius: 12px;
      transition: all 0.2s;
    }

    .history-item:hover {
      border-color: #e0e0e0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .history-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
    }

    .history-icon.incoming {
      background: #28a745;
    }

    .history-icon.outgoing {
      background: #667eea;
    }

    .history-info {
      flex: 1;
    }

    .history-guard {
      font-size: 15px;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .history-meta {
      display: flex;
      gap: 12px;
      font-size: 13px;
      color: #7f8c8d;
    }

    .history-status {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .history-status.ended {
      background: #d4edda;
      color: #155724;
    }

    .history-status.missed {
      background: #f8d7da;
      color: #721c24;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #7f8c8d;
    }

    .empty-state .material-icons {
      font-size: 48px;
      margin-bottom: 12px;
      color: #ddd;
    }

    @media (max-width: 1024px) {
      .video-calling-content {
        grid-template-columns: 1fr;
      }

      .video-container {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class VideoCallingComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('localVideo') localVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideoRef?: ElementRef<HTMLVideoElement>;

  guards: Guard[] = [];
  callHistory: VideoCall[] = [];
  statistics: VideoCallStatistics | null = null;
  activeCall: VideoCall | null = null;
  isLoading = false;
  filter: VideoCallFilter & { searchTerm?: string } = {};

  /** Dial-by-number fields for real WebRTC testing */
  dialPhone = '';
  dialGuardName = '';
  guardJoinUrl = '';
  webrtcError = '';
  realCallBusy = false;
  /** Shown when HTTP (non-localhost) blocks camera access. */
  mediaBlockedHint = '';
  /** Shown when /video-calls API is not proxied to Spring Boot. */
  signalingApiHint = '';

  private callTimer?: Subscription;
  private statusCheckInterval?: ReturnType<typeof setInterval>;
  private callStartTime?: Date;
  private activeCallSubscription?: Subscription;
  private webrtcStateSub?: Subscription;
  private remoteVideoSub?: Subscription;

  VideoCallStatus = VideoCallStatus;
  VideoCallDirection = VideoCallDirection;
  GuardStatus = GuardStatus;

  constructor(
    private videoCallingService: VideoCallingService,
    private webrtc: GuardVideoWebRtcService,
    private signaling: VideoCallSignalingService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.mediaBlockedHint = webRtcMediaBlockedReason();
    this.checkSignalingApi();
    this.loadData();
    this.loadCallHistory();
    this.subscribeToActiveCall();
    this.subscribeToWebRtc();

    const q = this.route.snapshot.queryParamMap;
    const number = q.get('number') || q.get('phone');
    const role = q.get('role');
    if (number) {
      this.dialPhone = number;
    }
    if (number && role === 'guard') {
      setTimeout(() => void this.answerRealCallAsGuard(), 500);
    }
  }

  ngAfterViewInit(): void {
    void this.refreshLocalPreview();
  }

  ngOnDestroy(): void {
    if (this.callTimer) {
      this.callTimer.unsubscribe();
    }
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
    if (this.activeCallSubscription) {
      this.activeCallSubscription.unsubscribe();
    }
    this.webrtcStateSub?.unsubscribe();
    this.remoteVideoSub?.unsubscribe();
    void this.webrtc.endCall();
  }

  private subscribeToWebRtc(): void {
    this.webrtcStateSub = this.webrtc.state$.subscribe(state => {
      if (state.status === 'connected' && this.activeCall) {
        this.videoCallingService.markCallConnected(this.activeCall.id);
        this.activeCall.status = VideoCallStatus.CONNECTED;
        this.activeCall.isRemoteVideoEnabled = true;
        if (!this.callTimer) {
          this.startCallTimer();
        }
      }
      if (state.status === 'failed' && state.errorMessage) {
        this.webrtcError = state.errorMessage;
        this.realCallBusy = false;
      }
      if (state.status === 'ended') {
        this.realCallBusy = false;
      }
    });
  }

  private async refreshLocalPreview(): Promise<void> {
    const el = this.localVideoRef?.nativeElement;
    if (!el) {
      return;
    }
    try {
      await this.webrtc.attachLocalPreview(el);
    } catch {
      // Permission prompt appears when starting a call
    }
  }

  private checkSignalingApi(): void {
    this.signaling.verifyBackend().subscribe(result => {
      if (!result.ok) {
        this.signalingApiHint = result.detail;
      } else {
        this.signalingApiHint = '';
      }
    });
  }

  /** Wait for active-call video elements after *ngIf renders. */
  private async waitForVideoElements(): Promise<void> {
    for (let i = 0; i < 10; i++) {
      this.cdr.detectChanges();
      if (this.localVideoRef?.nativeElement && this.remoteVideoRef?.nativeElement) {
        return;
      }
      await new Promise(r => setTimeout(r, 80));
    }
  }

  private formatCallError(err: unknown): string {
    if (err instanceof Error && err.message) {
      return err.message;
    }
    const stateMsg = this.webrtc.state$.value.errorMessage;
    if (stateMsg) {
      return stateMsg;
    }
    return 'Could not start video call. Check camera permission and backend API.';
  }

  async startRealCallAsResident(): Promise<void> {
    if (this.mediaBlockedHint) {
      alert(this.mediaBlockedHint);
      return;
    }
    const roomId = this.signaling.normalizeRoomId(this.dialPhone);
    if (!roomId) {
      alert('Enter a valid mobile number (at least 6 digits)');
      return;
    }
    this.webrtcError = '';
    this.realCallBusy = true;
    const guard = this.videoCallingService.registerGuardByPhone(
      this.dialPhone,
      this.dialGuardName || undefined
    );
    this.guardJoinUrl = this.buildGuardJoinUrl(roomId);
    const response = await firstValueFrom(
      this.videoCallingService.makeVideoCall({
        guardId: guard.id,
        gateId: guard.gateId,
        callerName: 'Resident',
        callerType: 'RESIDENT',
        enableVideo: true,
        enableAudio: true
      })
    );
    if (response?.call) {
      this.activeCall = response.call;
    }
    try {
      await this.waitForVideoElements();
      await this.refreshLocalPreview();
      if (this.remoteVideoRef?.nativeElement) {
        this.remoteVideoSub?.unsubscribe();
        this.remoteVideoSub = this.webrtc.bindRemoteVideo(this.remoteVideoRef.nativeElement);
      }
      await this.webrtc.startOutgoingCall(roomId, guard.name);
    } catch (e) {
      console.error(e);
      this.realCallBusy = false;
      this.webrtcError = this.formatCallError(e);
    }
    this.loadData();
  }

  async answerRealCallAsGuard(): Promise<void> {
    if (this.mediaBlockedHint) {
      alert(this.mediaBlockedHint);
      return;
    }
    const roomId = this.signaling.normalizeRoomId(this.dialPhone);
    if (!roomId) {
      alert('Enter the same mobile number the resident dialed');
      return;
    }
    this.webrtcError = '';
    this.realCallBusy = true;
    const guardName = this.dialGuardName?.trim() || `Guard ${roomId.slice(-4)}`;
    this.videoCallingService.registerGuardByPhone(this.dialPhone, guardName);
    if (!this.activeCall) {
      const g = this.videoCallingService.getGuardByPhone(this.dialPhone);
      if (g) {
        this.activeCall = this.videoCallingService.startCallRecord(g, 'Incoming');
        this.activeCall.direction = VideoCallDirection.INCOMING;
      }
    }
    try {
      await this.waitForVideoElements();
      await this.refreshLocalPreview();
      if (this.remoteVideoRef?.nativeElement) {
        this.remoteVideoSub?.unsubscribe();
        this.remoteVideoSub = this.webrtc.bindRemoteVideo(this.remoteVideoRef.nativeElement);
      }
      await this.webrtc.joinIncomingCall(roomId, guardName);
    } catch (e) {
      console.error(e);
      this.realCallBusy = false;
      this.webrtcError = this.formatCallError(e);
    }
  }

  copyGuardJoinLink(): void {
    if (!this.guardJoinUrl) {
      return;
    }
    navigator.clipboard?.writeText(this.guardJoinUrl).then(
      () => alert('Join link copied — open on guard device'),
      () => alert(this.guardJoinUrl)
    );
  }

  private buildGuardJoinUrl(roomId: string): string {
    const path = this.router.url.split('?')[0];
    return `${window.location.origin}${path}?number=${roomId}&role=guard`;
  }

  loadData(): void {
    this.isLoading = true;
    const filter: any = {};
    if (this.filter.gateId) {
      filter.gateId = this.filter.gateId;
    }

    this.videoCallingService.getAllGuards(filter).subscribe({
      next: (guards) => {
        // Apply search filter if present
        if (this.filter.searchTerm) {
          const search = this.filter.searchTerm.toLowerCase();
          guards = guards.filter(g => 
            g.name.toLowerCase().includes(search) ||
            g.badgeNumber?.toLowerCase().includes(search) ||
            g.gateName?.toLowerCase().includes(search)
          );
        }
        this.guards = guards;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading guards:', error);
        this.isLoading = false;
      }
    });

    this.videoCallingService.getStatistics().subscribe({
      next: (stats) => {
        this.statistics = stats;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
      }
    });
  }

  loadCallHistory(): void {
    this.videoCallingService.getCallHistory(this.filter).subscribe({
      next: (calls) => {
        this.callHistory = calls;
      },
      error: (error) => {
        console.error('Error loading call history:', error);
      }
    });
  }

  subscribeToActiveCall(): void {
    this.activeCallSubscription = this.videoCallingService.getActiveCall().subscribe({
      next: (call) => {
        this.activeCall = call;
        if (call && call.status === VideoCallStatus.CONNECTED) {
          this.startCallTimer();
        } else {
          this.stopCallTimer();
        }
      }
    });
  }

  startCallTimer(): void {
    if (this.activeCall && this.activeCall.startTime) {
      this.callStartTime = new Date(this.activeCall.startTime);
    } else {
      this.callStartTime = new Date();
    }
    this.callTimer = interval(1000).subscribe(() => {
      // Timer updates handled in formatCallDuration
    });
  }

  stopCallTimer(): void {
    if (this.callTimer) {
      this.callTimer.unsubscribe();
      this.callTimer = undefined;
    }
  }

  applyFilters(): void {
    this.loadData();
    this.loadCallHistory();
  }

  makeVideoCall(guard: Guard): void {
    this.dialPhone = guard.phoneNumber;
    this.dialGuardName = guard.name;
    this.guardJoinUrl = this.buildGuardJoinUrl(this.signaling.normalizeRoomId(guard.phoneNumber));
    void this.startRealCallAsResident();
  }

  endCurrentCall(): void {
    void this.webrtc.endCall();
    if (this.activeCall) {
      this.videoCallingService.endCall(this.activeCall.id).subscribe({
        next: () => {
          this.activeCall = null;
          this.stopCallTimer();
          this.realCallBusy = false;
          this.loadCallHistory();
          this.loadData();
        }
      });
    }
  }

  toggleVideo(): void {
    if (this.activeCall) {
      const newState = !this.activeCall.isVideoEnabled;
      this.webrtc.setVideoEnabled(newState);
      this.videoCallingService.toggleVideo(this.activeCall.id, newState).subscribe({
        next: response => {
          if (response.success && response.call) {
            this.activeCall = response.call;
          }
        }
      });
    }
  }

  toggleAudio(): void {
    if (this.activeCall) {
      const newState = !this.activeCall.isAudioEnabled;
      this.webrtc.setAudioEnabled(newState);
      this.videoCallingService.toggleAudio(this.activeCall.id, newState).subscribe({
        next: response => {
          if (response.success && response.call) {
            this.activeCall = response.call;
          }
        }
      });
    }
  }

  toggleRecording(): void {
    if (this.activeCall) {
      const newState = !this.activeCall.isRecording;
      this.videoCallingService.toggleRecording(this.activeCall.id, newState).subscribe({
        next: (response) => {
          if (response.success && response.call) {
            this.activeCall = response.call;
          }
        },
        error: (error) => {
          console.error('Error toggling recording:', error);
        }
      });
    }
  }

  isCalling(guardId: string): boolean {
    return this.activeCall?.guardId === guardId && 
           this.activeCall?.status === VideoCallStatus.RINGING;
  }

  getGuardStatusClass(status: GuardStatus): string {
    switch (status) {
      case GuardStatus.AVAILABLE:
        return 'available';
      case GuardStatus.BUSY:
        return 'busy';
      case GuardStatus.OFFLINE:
        return 'offline';
      case GuardStatus.ON_PATROL:
        return 'on-patrol';
      default:
        return '';
    }
  }

  getGuardStatusText(status: GuardStatus): string {
    switch (status) {
      case GuardStatus.AVAILABLE:
        return 'Available';
      case GuardStatus.BUSY:
        return 'Busy';
      case GuardStatus.OFFLINE:
        return 'Offline';
      case GuardStatus.ON_PATROL:
        return 'On Patrol';
      case GuardStatus.ON_BREAK:
        return 'On Break';
      default:
        return status;
    }
  }

  getCallStatusClass(status: VideoCallStatus): string {
    return status.toLowerCase();
  }

  getCallStatusText(status: VideoCallStatus): string {
    switch (status) {
      case VideoCallStatus.RINGING:
        return 'Ringing...';
      case VideoCallStatus.CONNECTED:
        return 'Connected';
      case VideoCallStatus.ENDED:
        return 'Ended';
      case VideoCallStatus.MISSED:
        return 'Missed';
      case VideoCallStatus.REJECTED:
        return 'Rejected';
      default:
        return status;
    }
  }

  getCallDirectionClass(direction: VideoCallDirection): string {
    return direction.toLowerCase();
  }

  getQualityClass(quality: string): string {
    switch (quality) {
      case 'EXCELLENT':
        return 'quality-excellent';
      case 'GOOD':
        return 'quality-good';
      case 'FAIR':
        return 'quality-fair';
      case 'POOR':
        return 'quality-poor';
      default:
        return '';
    }
  }

  getQualityIcon(quality: string): string {
    switch (quality) {
      case 'EXCELLENT':
      case 'GOOD':
        return 'signal_cellular_alt';
      case 'FAIR':
        return 'signal_cellular_3_bar';
      case 'POOR':
        return 'signal_cellular_1_bar';
      default:
        return 'signal_cellular_alt';
    }
  }

  formatCallDuration(): string {
    if (!this.callStartTime || !this.activeCall || this.activeCall.status !== VideoCallStatus.CONNECTED) {
      return '00:00';
    }
    const now = new Date();
    const seconds = Math.floor((now.getTime() - this.callStartTime.getTime()) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  formatDateTime(date: Date): string {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}

