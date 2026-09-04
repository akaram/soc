import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { IncidentReportService } from '../../../modules/guard-patrol/services/incident-report.service';
import {
  IncidentSeverity,
  IncidentType,
  Priority
} from '../../../modules/guard-patrol/models/incident-report.model';
import { SessionContextService } from '../../../core/services/session-context.service';
import { MobileAuthService } from '../../services/mobile-auth.service';

/**
 * Incident Report Component with Photo Upload
 * Allows guards to report incidents with photo evidence
 */
interface IncidentPhoto {
  id: string;
  file: File;
  preview: string;
  uploaded: boolean;
  uploadProgress?: number;
}

interface IncidentReport {
  id?: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  location: string;
  locationDetails?: string;
  latitude?: number;
  longitude?: number;
  photos: IncidentPhoto[];
  reportedBy: string;
  reportedAt: Date;
  status: 'draft' | 'submitted' | 'under_review' | 'resolved';
  assignedTo?: string;
  resolutionNotes?: string;
}

@Component({
  selector: 'app-incident-report',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="incident-report-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">report_problem</i>
            Incident Reporting
          </h1>
          <p>Report security incidents with photo evidence</p>
        </div>
      </div>

      <!-- Form Section -->
      <div class="form-container">
        <form (ngSubmit)="submitIncident()" #incidentForm="ngForm">
          <!-- Basic Information -->
          <div class="form-section">
            <h2>
              <i class="material-icons">info</i>
              Incident Details
            </h2>

            <div class="form-group">
              <label for="title">Incident Title <span class="required">*</span></label>
              <input 
                type="text" 
                id="title"
                [(ngModel)]="incident.title" 
                name="title"
                placeholder="Brief description of the incident"
                required
                maxlength="100">
            </div>

            <div class="form-group">
              <label for="category">Category <span class="required">*</span></label>
              <select 
                id="category"
                [(ngModel)]="incident.category" 
                name="category"
                required>
                <option value="">Select category</option>
                <option value="security_breach">Security Breach</option>
                <option value="unauthorized_entry">Unauthorized Entry</option>
                <option value="vandalism">Vandalism</option>
                <option value="theft">Theft</option>
                <option value="suspicious_activity">Suspicious Activity</option>
                <option value="fire_hazard">Fire Hazard</option>
                <option value="medical_emergency">Medical Emergency</option>
                <option value="vehicle_incident">Vehicle Incident</option>
                <option value="noise_complaint">Noise Complaint</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div class="form-group">
              <label for="priority">Priority Level <span class="required">*</span></label>
              <div class="priority-buttons">
                <button 
                  type="button"
                  class="priority-btn low" 
                  [class.active]="incident.priority === 'low'"
                  (click)="incident.priority = 'low'">
                  <i class="material-icons">info</i>
                  Low
                </button>
                <button 
                  type="button"
                  class="priority-btn medium" 
                  [class.active]="incident.priority === 'medium'"
                  (click)="incident.priority = 'medium'">
                  <i class="material-icons">warning</i>
                  Medium
                </button>
                <button 
                  type="button"
                  class="priority-btn high" 
                  [class.active]="incident.priority === 'high'"
                  (click)="incident.priority = 'high'">
                  <i class="material-icons">error</i>
                  High
                </button>
                <button 
                  type="button"
                  class="priority-btn urgent" 
                  [class.active]="incident.priority === 'urgent'"
                  (click)="incident.priority = 'urgent'">
                  <i class="material-icons">emergency</i>
                  Urgent
                </button>
              </div>
            </div>

            <div class="form-group">
              <label for="description">Description <span class="required">*</span></label>
              <textarea 
                id="description"
                [(ngModel)]="incident.description" 
                name="description"
                placeholder="Provide detailed information about the incident..."
                rows="5"
                required
                maxlength="1000"></textarea>
              <div class="char-count">{{ incident.description.length }}/1000</div>
            </div>
          </div>

          <!-- Location Information -->
          <div class="form-section">
            <h2>
              <i class="material-icons">location_on</i>
              Location
            </h2>

            <div class="form-group">
              <label for="location">Location <span class="required">*</span></label>
              <input 
                type="text" 
                id="location"
                [(ngModel)]="incident.location" 
                name="location"
                placeholder="e.g., Main Gate, Parking Area, Building A"
                required>
            </div>

            <div class="form-group">
              <label for="locationDetails">Additional Location Details</label>
              <textarea 
                id="locationDetails"
                [(ngModel)]="incident.locationDetails" 
                name="locationDetails"
                placeholder="Specific area, floor, room number, etc."
                rows="2"
                maxlength="200"></textarea>
            </div>

            <button type="button" class="btn-location" (click)="captureLocation()" [disabled]="isCapturingLocation">
              <i class="material-icons">my_location</i>
              {{ isCapturingLocation ? 'Capturing...' : 'Capture GPS Location' }}
            </button>
            <div class="location-status" *ngIf="incident.latitude && incident.longitude">
              <i class="material-icons">check_circle</i>
              Location captured: {{ incident.latitude.toFixed(6) }}, {{ incident.longitude.toFixed(6) }}
            </div>
          </div>

          <!-- Photo Upload Section -->
          <div class="form-section">
            <h2>
              <i class="material-icons">photo_camera</i>
              Photos ({{ incident.photos.length }}/10)
            </h2>
            <p class="section-description">Add photos as evidence. Maximum 10 photos, 5MB each.</p>

            <!-- Photo Upload Area -->
            <div class="photo-upload-area" *ngIf="incident.photos.length < 10">
              <input 
                type="file" 
                id="photoInput"
                #photoInput
                accept="image/*" 
                multiple
                (change)="onPhotoSelected($event)"
                style="display: none;">
              <button 
                type="button"
                class="btn-upload-photo" 
                (click)="photoInput.click()"
                [disabled]="isUploading">
                <i class="material-icons">add_photo_alternate</i>
                Add Photos
              </button>
              <button 
                type="button"
                class="btn-capture-photo" 
                (click)="openCameraCapture()"
                [disabled]="isUploading || showCameraModal">
                <i class="material-icons">camera_alt</i>
                Take Photo
              </button>
            </div>

            <!-- Photo Grid -->
            <div class="photos-grid" *ngIf="incident.photos.length > 0">
              <div class="photo-item" *ngFor="let photo of incident.photos; let i = index">
                <div class="photo-preview">
                  <img [src]="photo.preview" [alt]="'Photo ' + (i + 1)" />
                  <div class="photo-overlay">
                    <button 
                      type="button"
                      class="btn-remove-photo" 
                      (click)="removePhoto(i)"
                      title="Remove photo">
                      <i class="material-icons">delete</i>
                    </button>
                    <button 
                      type="button"
                      class="btn-view-photo" 
                      (click)="viewPhoto(photo)"
                      title="View full size">
                      <i class="material-icons">zoom_in</i>
                    </button>
                  </div>
                  <div class="upload-progress" *ngIf="photo.uploadProgress !== undefined && photo.uploadProgress < 100">
                    <div class="progress-bar" [style.width.%]="photo.uploadProgress"></div>
                  </div>
                </div>
                <div class="photo-info">
                  <span class="photo-name">{{ photo.file.name }}</span>
                  <span class="photo-size">{{ formatFileSize(photo.file.size) }}</span>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div class="empty-photos" *ngIf="incident.photos.length === 0">
              <i class="material-icons">photo_library</i>
              <p>No photos added yet</p>
              <span>Add photos to provide visual evidence</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="form-actions">
            <button 
              type="button"
              class="btn btn-secondary" 
              (click)="saveDraft()"
              [disabled]="isSubmitting || isSaving">
              <i class="material-icons">save</i>
              {{ isSaving ? 'Saving...' : 'Save Draft' }}
            </button>
            <button 
              type="submit"
              class="btn btn-primary" 
              [disabled]="!incidentForm.valid || isSubmitting || isSaving || incident.photos.length === 0">
              <i class="material-icons">send</i>
              {{ isSubmitting ? 'Submitting...' : 'Submit Report' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Photo View Modal -->
      <div class="photo-modal" *ngIf="selectedPhoto" (click)="closePhotoModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <button class="btn-close" (click)="closePhotoModal()">
            <i class="material-icons">close</i>
          </button>
          <img [src]="selectedPhoto.preview" [alt]="selectedPhoto.file.name" class="modal-image">
          <div class="modal-info">
            <p class="modal-filename">{{ selectedPhoto.file.name }}</p>
            <p class="modal-filesize">{{ formatFileSize(selectedPhoto.file.size) }}</p>
          </div>
        </div>
      </div>

      <!-- Live camera capture (opens device camera directly instead of file picker) -->
      <div class="camera-modal" *ngIf="showCameraModal">
        <div class="camera-modal-header">
          <h3>Take Photo</h3>
          <button type="button" class="btn-close" (click)="closeCameraCapture()">
            <i class="material-icons">close</i>
          </button>
        </div>
        <p class="camera-error" *ngIf="cameraError">{{ cameraError }}</p>
        <div class="camera-preview-wrap">
          <video
            #cameraVideo
            class="camera-video"
            autoplay
            playsinline
            muted
            [class.hidden]="!cameraActive">
          </video>
          <div class="camera-loading" *ngIf="!cameraActive && !cameraError">
            <i class="material-icons">photo_camera</i>
            <span>Starting camera…</span>
          </div>
        </div>
        <canvas #cameraCanvas class="camera-canvas"></canvas>
        <div class="camera-actions">
          <button type="button" class="btn-camera-cancel" (click)="closeCameraCapture()">Cancel</button>
          <button
            type="button"
            class="btn-camera-shutter"
            (click)="shootPhoto()"
            [disabled]="!cameraActive || isCapturingPhoto">
            <i class="material-icons">camera</i>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .incident-report-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #ff4757 0%, #ee3542 100%);
      color: white;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .back-btn {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s;
    }

    .back-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    .header-content {
      flex: 1;
    }

    .header-content h1 {
      margin: 0 0 4px 0;
      font-size: 20px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-content p {
      margin: 0;
      font-size: 12px;
      opacity: 0.9;
    }

    /* Form Container */
    .form-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .form-section {
      background: white;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }

    .form-section h2 {
      margin: 0 0 20px 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-description {
      margin: -12px 0 16px 0;
      font-size: 13px;
      color: #7f8c8d;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #2c3e50;
    }

    .required {
      color: #e74c3c;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 12px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      border-color: #ff4757;
    }

    .form-group textarea {
      resize: vertical;
      min-height: 100px;
    }

    .char-count {
      text-align: right;
      font-size: 12px;
      color: #95a5a6;
      margin-top: 4px;
    }

    /* Priority Buttons */
    .priority-buttons {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }

    .priority-btn {
      padding: 12px 8px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .priority-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    .priority-btn.active {
      border-width: 3px;
      font-weight: 600;
    }

    .priority-btn.low {
      color: #17a2b8;
    }

    .priority-btn.low.active {
      border-color: #17a2b8;
      background: #e7f3ff;
    }

    .priority-btn.medium {
      color: #ffc107;
    }

    .priority-btn.medium.active {
      border-color: #ffc107;
      background: #fffbf0;
    }

    .priority-btn.high {
      color: #ff9800;
    }

    .priority-btn.high.active {
      border-color: #ff9800;
      background: #fff4e6;
    }

    .priority-btn.urgent {
      color: #e74c3c;
    }

    .priority-btn.urgent.active {
      border-color: #e74c3c;
      background: #ffeaea;
    }

    .priority-btn .material-icons {
      font-size: 24px;
    }

    /* Location */
    .btn-location {
      width: 100%;
      padding: 12px;
      border: 2px dashed #3498db;
      border-radius: 8px;
      background: #e7f3ff;
      color: #3498db;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-location:hover:not(:disabled) {
      background: #d0e7ff;
      border-color: #2980b9;
    }

    .btn-location:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .location-status {
      margin-top: 12px;
      padding: 10px;
      background: #d4edda;
      border-radius: 8px;
      color: #155724;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Photo Upload */
    .photo-upload-area {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }

    .btn-upload-photo,
    .btn-capture-photo {
      flex: 1;
      padding: 12px;
      border: 2px dashed #ff4757;
      border-radius: 8px;
      background: #ffeaea;
      color: #ff4757;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-upload-photo:hover:not(:disabled),
    .btn-capture-photo:hover:not(:disabled) {
      background: #ffd5d5;
      border-color: #ee3542;
    }

    .btn-upload-photo:disabled,
    .btn-capture-photo:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .photos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 12px;
    }

    .photo-item {
      position: relative;
    }

    .photo-preview {
      position: relative;
      width: 100%;
      aspect-ratio: 1;
      border-radius: 8px;
      overflow: hidden;
      background: #f5f7fa;
      border: 2px solid #e9ecef;
    }

    .photo-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .photo-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .photo-item:hover .photo-overlay {
      opacity: 1;
    }

    .btn-remove-photo,
    .btn-view-photo {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: rgba(255,255,255,0.9);
      color: #2c3e50;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .btn-remove-photo:hover {
      background: #e74c3c;
      color: white;
    }

    .btn-view-photo:hover {
      background: #3498db;
      color: white;
    }

    .upload-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: rgba(0,0,0,0.2);
    }

    .progress-bar {
      height: 100%;
      background: #2ed573;
      transition: width 0.3s;
    }

    .photo-info {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .photo-name {
      font-size: 11px;
      color: #2c3e50;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .photo-size {
      font-size: 10px;
      color: #95a5a6;
    }

    .empty-photos {
      text-align: center;
      padding: 40px 20px;
      color: #95a5a6;
    }

    .empty-photos .material-icons {
      font-size: 64px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .empty-photos p {
      margin: 0 0 4px 0;
      font-size: 14px;
      font-weight: 500;
    }

    .empty-photos span {
      font-size: 12px;
    }

    /* Form Actions */
    .form-actions {
      display: flex;
      gap: 12px;
      padding: 24px 0;
    }

    .btn {
      flex: 1;
      padding: 14px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #ff4757;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #ee3542;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(255, 71, 87, 0.3);
    }

    .btn-secondary {
      background: #95a5a6;
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #7f8c8d;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    /* Photo Modal */
    .photo-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      position: relative;
      max-width: 90%;
      max-height: 90%;
      background: white;
      border-radius: 12px;
      overflow: hidden;
    }

    .btn-close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(0,0,0,0.7);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }

    .modal-image {
      max-width: 100%;
      max-height: 70vh;
      object-fit: contain;
      display: block;
    }

    .modal-info {
      padding: 16px;
      text-align: center;
    }

    .modal-filename {
      margin: 0 0 4px 0;
      font-size: 14px;
      font-weight: 500;
      color: #2c3e50;
    }

    .modal-filesize {
      margin: 0;
      font-size: 12px;
      color: #95a5a6;
    }

    /* Live camera overlay */
    .camera-modal {
      position: fixed;
      inset: 0;
      z-index: 2000;
      background: #111;
      display: flex;
      flex-direction: column;
    }

    .camera-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      color: white;
      background: rgba(0, 0, 0, 0.6);
    }

    .camera-modal-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .camera-error {
      margin: 0;
      padding: 10px 16px;
      background: #fee2e2;
      color: #b91c1c;
      font-size: 13px;
    }

    .camera-preview-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
      position: relative;
      min-height: 0;
    }

    .camera-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .camera-video.hidden {
      display: none;
    }

    .camera-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: #cbd5e1;
      font-size: 14px;
    }

    .camera-loading .material-icons {
      font-size: 48px;
    }

    .camera-canvas {
      display: none;
    }

    .camera-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px calc(16px + env(safe-area-inset-bottom, 0px));
      background: rgba(0, 0, 0, 0.75);
    }

    .btn-camera-cancel {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.4);
      color: white;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
    }

    .btn-camera-shutter {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      border: 4px solid white;
      background: #667eea;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .btn-camera-shutter:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-camera-shutter .material-icons {
      font-size: 28px;
    }

    @media (max-width: 768px) {
      .form-container {
        padding: 16px;
      }

      .form-section {
        padding: 16px;
      }

      .priority-buttons {
        grid-template-columns: repeat(2, 1fr);
      }

      .photo-upload-area {
        flex-direction: column;
      }
    }
  `]
})
export class IncidentReportComponent implements OnInit, OnDestroy {
  @ViewChild('cameraVideo') cameraVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('cameraCanvas') cameraCanvas!: ElementRef<HTMLCanvasElement>;

  incident: IncidentReport = {
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    location: '',
    locationDetails: '',
    photos: [],
    reportedBy: 'guard-001', // In real app, get from auth service
    reportedAt: new Date(),
    status: 'draft'
  };

  selectedPhoto: IncidentPhoto | null = null;
  isSubmitting: boolean = false;
  isSaving: boolean = false;
  isUploading: boolean = false;
  isCapturingLocation: boolean = false;
  showCameraModal = false;
  cameraActive = false;
  isCapturingPhoto = false;
  cameraError = '';
  private cameraStream: MediaStream | null = null;

  private destroy$ = new Subject<void>();
  private readonly MAX_PHOTOS = 10;
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  constructor(
    private incidentService: IncidentReportService,
    private session: SessionContextService,
    private mobileAuth: MobileAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.incident.reportedBy = this.session.getCurrentUserId();
    const priority = this.route.snapshot.queryParamMap.get('priority');
    if (priority === 'urgent') {
      this.incident.priority = 'urgent';
    }
    this.loadDraft();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle photo file selection
   */
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const files = Array.from(input.files);
    const remainingSlots = this.MAX_PHOTOS - this.incident.photos.length;
    const filesToProcess = files.slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      if (this.validatePhoto(file)) {
        this.addPhoto(file);
      }
    });

    // Reset input
    input.value = '';
  }

  /**
   * Validate photo file
   */
  validatePhoto(file: File): boolean {
    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return false;
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      alert(`File size exceeds 5MB limit. ${file.name} was not added.`);
      return false;
    }

    return true;
  }

  /**
   * Add photo to incident
   */
  addPhoto(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const photo: IncidentPhoto = {
        id: `photo-${Date.now()}-${Math.random()}`,
        file: file,
        preview: e.target.result,
        uploaded: false
      };
      this.incident.photos.push(photo);
      this.uploadPhoto(photo);
    };
    reader.readAsDataURL(file);
  }

  /**
   * Open live camera UI — uses getUserMedia so mobile opens the camera directly.
   */
  openCameraCapture(): void {
    if (this.incident.photos.length >= this.MAX_PHOTOS) {
      return;
    }
    this.cameraError = '';
    this.showCameraModal = true;
    // Wait for modal video element to render before attaching the stream.
    setTimeout(() => void this.startCamera(), 50);
  }

  /** Close camera overlay and release the device camera. */
  closeCameraCapture(): void {
    this.stopCamera();
    this.showCameraModal = false;
    this.cameraError = '';
  }

  /** Start rear-camera stream for incident evidence photos. */
  private async startCamera(): Promise<void> {
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      const video = this.cameraVideo?.nativeElement;
      if (video) {
        video.srcObject = this.cameraStream;
        await video.play();
        this.cameraActive = true;
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      this.cameraError = 'Unable to access camera. Allow camera permission and try again.';
      this.cameraActive = false;
    }
  }

  /** Stop camera stream and free hardware. */
  private stopCamera(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    const video = this.cameraVideo?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
    this.cameraActive = false;
  }

  /** Capture current video frame and add as incident photo. */
  shootPhoto(): void {
    if (!this.cameraActive || this.isCapturingPhoto) {
      return;
    }
    this.isCapturingPhoto = true;
    const video = this.cameraVideo?.nativeElement;
    const canvas = this.cameraCanvas?.nativeElement;
    const context = canvas?.getContext('2d');
    if (!video || !canvas || !context) {
      this.isCapturingPhoto = false;
      this.cameraError = 'Could not capture photo. Please try again.';
      return;
    }

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const file = this.dataUrlToFile(dataUrl, `incident-${Date.now()}.jpg`);
    if (this.validatePhoto(file)) {
      this.addPhoto(file);
      this.closeCameraCapture();
    }
    this.isCapturingPhoto = false;
  }

  /** Convert canvas JPEG data URL to a File for upload pipeline. */
  private dataUrlToFile(dataUrl: string, filename: string): File {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], filename, { type: mime });
  }

  /**
   * Upload photo
   */
  uploadPhoto(photo: IncidentPhoto): void {
    this.isUploading = true;
    photo.uploadProgress = 0;

    // Simulate upload progress
    const interval = setInterval(() => {
      if (photo.uploadProgress! < 90) {
        photo.uploadProgress! += 10;
      }
    }, 200);

    // Simulate API call
    setTimeout(() => {
      clearInterval(interval);
      photo.uploadProgress = 100;
      photo.uploaded = true;
      this.isUploading = false;
      // In real app, upload to server and get URL
    }, 2000);
  }

  /**
   * Remove photo
   */
  removePhoto(index: number): void {
    this.incident.photos.splice(index, 1);
  }

  /**
   * View photo in modal
   */
  viewPhoto(photo: IncidentPhoto): void {
    this.selectedPhoto = photo;
  }

  /**
   * Close photo modal
   */
  closePhotoModal(): void {
    this.selectedPhoto = null;
  }

  /**
   * Capture GPS location
   */
  captureLocation(): void {
    this.isCapturingLocation = true;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.incident.latitude = position.coords.latitude;
          this.incident.longitude = position.coords.longitude;
          this.isCapturingLocation = false;
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to capture location. Please enter manually.');
          this.isCapturingLocation = false;
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
      this.isCapturingLocation = false;
    }
  }

  /**
   * Save draft
   */
  saveDraft(): void {
    this.isSaving = true;
    this.incident.status = 'draft';

    // Simulate API call
    setTimeout(() => {
      // Save to local storage as backup
      localStorage.setItem('incident_draft', JSON.stringify(this.incident));
      this.isSaving = false;
      alert('Draft saved successfully!');
    }, 1000);
  }

  /**
   * Load draft from storage
   */
  loadDraft(): void {
    const draft = localStorage.getItem('incident_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        // Restore photos previews (files won't be restored, but previews will)
        if (parsed.photos && parsed.photos.length > 0) {
          // In real app, you'd need to handle file restoration differently
          this.incident = { ...parsed, photos: [] };
        } else {
          this.incident = parsed;
        }
      } catch (e) {
        console.error('Error loading draft:', e);
      }
    }
  }

  /**
   * Submit incident report to patrol-incidents API
   */
  submitIncident(): void {
    if (!this.incident.title?.trim() || !this.incident.description?.trim() || !this.incident.category) {
      alert('Please fill in title, category, and description.');
      return;
    }

    this.isSubmitting = true;
    const guardId = this.session.getCurrentUserId();
    const guardName = this.mobileAuth.getCurrentUser()?.name ?? 'Guard';

    this.incidentService
      .createIncident({
        title: this.incident.title.trim(),
        description: this.incident.description.trim(),
        type: this.mapCategoryToType(this.incident.category),
        severity: this.mapPriorityToSeverity(this.incident.priority),
        priority: this.mapPriorityToApi(this.incident.priority),
        location: this.incident.location?.trim() || 'Society premises',
        locationDetails: this.incident.locationDetails,
        latitude: this.incident.latitude,
        longitude: this.incident.longitude,
        reportedByGuardId: guardId,
        reportedByGuardName: guardName,
        incidentDateTime: new Date(),
        attachments: this.incident.photos.map(photo => ({
          id: photo.id,
          type: 'PHOTO' as const,
          url: photo.preview,
          fileName: photo.file.name,
          uploadedAt: new Date()
        })),
        tags: this.incident.photos.length ? ['photo-attached'] : []
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.isSubmitting = false;
          if (res.success) {
            localStorage.removeItem('incident_draft');
            alert('Incident report submitted successfully!');
            this.router.navigate(['/mobile/guard/incidents']);
          } else {
            alert(res.message || 'Failed to submit incident.');
          }
        },
        error: () => {
          this.isSubmitting = false;
          alert('Failed to submit incident. Check API connection.');
        }
      });
  }

  /** Map mobile category slug to backend incident type enum. */
  private mapCategoryToType(category: string): IncidentType {
    const map: Record<string, IncidentType> = {
      security_breach: IncidentType.SECURITY_BREACH,
      unauthorized_entry: IncidentType.UNAUTHORIZED_ACCESS,
      vandalism: IncidentType.VANDALISM,
      theft: IncidentType.THEFT,
      suspicious_activity: IncidentType.SUSPICIOUS_ACTIVITY,
      fire_hazard: IncidentType.FIRE,
      medical_emergency: IncidentType.MEDICAL_EMERGENCY,
      vehicle_incident: IncidentType.VEHICLE_ACCIDENT,
      noise_complaint: IncidentType.OTHER,
      other: IncidentType.OTHER
    };
    return map[category] ?? IncidentType.OTHER;
  }

  private mapPriorityToSeverity(priority: string): IncidentSeverity {
    const map: Record<string, IncidentSeverity> = {
      low: IncidentSeverity.LOW,
      medium: IncidentSeverity.MEDIUM,
      high: IncidentSeverity.HIGH,
      urgent: IncidentSeverity.CRITICAL
    };
    return map[priority] ?? IncidentSeverity.MEDIUM;
  }

  private mapPriorityToApi(priority: string): Priority {
    const map: Record<string, Priority> = {
      low: Priority.LOW,
      medium: Priority.NORMAL,
      high: Priority.HIGH,
      urgent: Priority.URGENT
    };
    return map[priority] ?? Priority.NORMAL;
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Navigate back
   */
  goBack(): void {
    this.router.navigate(['/mobile/guard/incidents']);
  }
}
