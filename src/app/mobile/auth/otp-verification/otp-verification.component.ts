import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, interval } from 'rxjs';
import { 
  OtpService, 
  OtpChannel, 
  OtpPurpose, 
  OtpSession,
  OtpSendResult,
  OtpVerifyResult 
} from './otp.service';
import { MobileAuthService } from '../../services/mobile-auth.service';

type VerificationState = 'input' | 'sending' | 'verifying' | 'success' | 'error' | 'expired';

@Component({
  selector: 'app-otp-verification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="otp-container" [class.embedded]="embedded" [class.dark-mode]="isDarkMode">
      <!-- Animated Background -->
      <div class="mesh-bg" *ngIf="!embedded">
        <div class="mesh-gradient"></div>
        <div class="glow-orb orb-1"></div>
        <div class="glow-orb orb-2"></div>
        <div class="floating-shapes">
          <div class="shape shape-1"></div>
          <div class="shape shape-2"></div>
          <div class="shape shape-3"></div>
        </div>
      </div>

      <!-- Header -->
      <header class="otp-header" *ngIf="!embedded">
        <button class="back-btn" (click)="goBack()" aria-label="Go back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 class="header-title">Verification</h1>
        <div class="header-spacer"></div>
      </header>

      <!-- Main Content -->
      <main class="otp-main">
        <!-- Channel Selection (if not pre-selected) -->
        <section class="channel-section" *ngIf="!session && showChannelSelector">
          <div class="section-icon">
            <div class="icon-bg">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </div>
          </div>
          
          <h2>Verify Your Identity</h2>
          <p class="section-desc">Choose how you'd like to receive your verification code</p>

          <div class="channel-options">
            <button class="channel-card" 
                    [class.selected]="selectedChannel === 'sms'"
                    [class.disabled]="!phone"
                    (click)="selectChannel('sms')">
              <div class="channel-icon sms">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
                </svg>
              </div>
              <div class="channel-info">
                <span class="channel-title">SMS</span>
                <span class="channel-detail">{{ maskedPhone || 'No phone provided' }}</span>
              </div>
              <div class="channel-check" *ngIf="selectedChannel === 'sms'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
            </button>

            <button class="channel-card"
                    [class.selected]="selectedChannel === 'email'"
                    [class.disabled]="!email"
                    (click)="selectChannel('email')">
              <div class="channel-icon email">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </div>
              <div class="channel-info">
                <span class="channel-title">Email</span>
                <span class="channel-detail">{{ maskedEmail || 'No email provided' }}</span>
              </div>
              <div class="channel-check" *ngIf="selectedChannel === 'email'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
            </button>

            <button class="channel-card"
                    [class.selected]="selectedChannel === 'both'"
                    [class.disabled]="!phone || !email"
                    (click)="selectChannel('both')">
              <div class="channel-icon both">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div class="channel-info">
                <span class="channel-title">Both</span>
                <span class="channel-detail">SMS & Email</span>
              </div>
              <div class="channel-check" *ngIf="selectedChannel === 'both'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
            </button>
          </div>

          <button class="primary-btn" 
                  [disabled]="!selectedChannel || isSending"
                  (click)="sendOtp()">
            <div class="btn-spinner" *ngIf="isSending"></div>
            <svg *ngIf="!isSending" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
            <span>{{ isSending ? 'Sending...' : 'Send Verification Code' }}</span>
          </button>
        </section>

        <!-- OTP Input Section -->
        <section class="otp-input-section" *ngIf="showOtpInputSection()">
          <div class="section-icon" [class.pulse]="state === 'verifying'">
            <div class="icon-bg" [class.error]="state === 'error'">
              <svg *ngIf="showLockIcon()" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
              <svg *ngIf="state === 'error'" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
          </div>

          <h2>Enter Verification Code</h2>
          <p class="section-desc">
            <span *ngIf="getSessionChannel() === 'sms'">Code sent to {{ getSessionPhone() }}</span>
            <span *ngIf="getSessionChannel() === 'email'">Code sent to {{ getSessionEmail() }}</span>
            <span *ngIf="getSessionChannel() === 'both'">Code sent to your phone and email</span>
          </p>

          <!-- OTP Input Boxes -->
          <div class="otp-input-container">
            <input
              *ngFor="let digit of otpDigits; let i = index"
              #otpInput
              type="text"
              inputmode="numeric"
              maxlength="1"
              class="otp-box"
              [class.filled]="digit"
              [class.error]="hasError"
              [(ngModel)]="otpDigits[i]"
              (input)="onOtpInput($event, i)"
              (keydown)="onOtpKeydown($event, i)"
              (paste)="onOtpPaste($event)"
              (focus)="onOtpFocus(i)"
              [disabled]="isInputDisabled()"
            />
          </div>

          <!-- Timer & Attempts -->
          <div class="otp-meta">
            <div class="timer" [class.expired]="expirySeconds === 0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
              </svg>
              <span>{{ expirySeconds > 0 ? formatTime(expirySeconds) : 'Expired' }}</span>
            </div>
            <div class="attempts" *ngIf="getSessionAttempts() > 0">
              <span>{{ getRemainingAttempts() }} attempts left</span>
            </div>
          </div>

          <!-- Error Message -->
          <div class="error-message" *ngIf="errorMessage">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Verify Button -->
          <button class="primary-btn verify-btn"
                  [class.loading]="state === 'verifying'"
                  [disabled]="!isOtpComplete() || state === 'verifying' || expirySeconds === 0"
                  (click)="verifyOtp()">
            <div class="btn-spinner" *ngIf="state === 'verifying'"></div>
            <svg *ngIf="state !== 'verifying'" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span>{{ state === 'verifying' ? 'Verifying...' : 'Verify Code' }}</span>
          </button>

          <!-- Resend Section -->
          <div class="resend-section">
            <span class="resend-text">Didn't receive the code?</span>
            <button class="resend-btn" 
                    [disabled]="!canResend || isSending"
                    (click)="resendOtp()">
              <span *ngIf="!canResend && resendCooldown > 0">Resend in {{ resendCooldown }}s</span>
              <span *ngIf="canResend && !isSending">Resend Code</span>
              <span *ngIf="isSending">Sending...</span>
            </button>
          </div>

          <!-- Change Channel -->
          <button class="change-channel-btn" *ngIf="showChannelSelector" (click)="changeChannel()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"/>
            </svg>
            <span>Use different method</span>
          </button>
        </section>

        <!-- Success Section -->
        <section class="success-section" *ngIf="state === 'success'">
          <div class="success-visual">
            <div class="success-circle">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <div class="success-rings">
              <div class="ring ring-1"></div>
              <div class="ring ring-2"></div>
              <div class="ring ring-3"></div>
            </div>
          </div>

          <h2>Verification Complete!</h2>
          <p class="section-desc">Your {{ session?.channel === 'sms' ? 'phone number' : session?.channel === 'email' ? 'email' : 'identity' }} has been verified successfully.</p>

          <button class="primary-btn" (click)="onSuccess()">
            <span>Continue</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
            </svg>
          </button>
        </section>
      </main>

      <!-- Footer Security Badge -->
      <footer class="otp-footer" *ngIf="!embedded">
        <div class="security-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
          </svg>
          <span>Secured with end-to-end encryption</span>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      --accent-start: #6366f1;
      --accent-mid: #8b5cf6;
      --accent-end: #a855f7;
      --success: #10b981;
      --success-light: rgba(16, 185, 129, 0.1);
      --danger: #ef4444;
      --danger-light: rgba(239, 68, 68, 0.1);
      --warning: #f59e0b;
      --bg-base: #fafbfc;
      --bg-elevated: #ffffff;
      --bg-glass: rgba(255, 255, 255, 0.8);
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-muted: #94a3b8;
      --border: rgba(0, 0, 0, 0.08);
      display: block;
      height: 100%;
      font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .dark-mode {
      --bg-base: #0c0f1a;
      --bg-elevated: #151929;
      --bg-glass: rgba(21, 25, 41, 0.85);
      --text-primary: #f1f5f9;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --border: rgba(255, 255, 255, 0.08);
    }

    .otp-container {
      min-height: 100vh;
      background: var(--bg-base);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    .otp-container.embedded {
      min-height: auto;
      background: transparent;
    }

    /* Background Effects */
    .mesh-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      overflow: hidden;
    }

    .mesh-gradient {
      position: absolute;
      inset: 0;
      background: 
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.2) 0%, transparent 50%),
        radial-gradient(ellipse 60% 40% at 100% 50%, rgba(168, 85, 247, 0.15) 0%, transparent 50%);
    }

    .glow-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      animation: float 20s ease-in-out infinite;
    }

    .orb-1 {
      width: 300px;
      height: 300px;
      background: linear-gradient(135deg, var(--accent-start), var(--accent-mid));
      top: -100px;
      right: -50px;
      opacity: 0.3;
    }

    .orb-2 {
      width: 200px;
      height: 200px;
      background: linear-gradient(225deg, var(--success), var(--accent-end));
      bottom: 20%;
      left: -50px;
      opacity: 0.25;
      animation-delay: -10s;
    }

    @keyframes float {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(-20px, 20px) scale(1.05); }
    }

    .floating-shapes {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .shape {
      position: absolute;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
      animation: shape-float 15s ease-in-out infinite;
    }

    .shape-1 { width: 60px; height: 60px; top: 15%; left: 10%; }
    .shape-2 { width: 40px; height: 40px; top: 60%; right: 15%; animation-delay: -5s; }
    .shape-3 { width: 80px; height: 80px; bottom: 20%; left: 20%; animation-delay: -10s; }

    @keyframes shape-float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(180deg); }
    }

    /* Header */
    .otp-header {
      display: flex;
      align-items: center;
      padding: 16px 20px;
      position: relative;
      z-index: 10;
      background: var(--bg-glass);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
    }

    .back-btn {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--bg-elevated);
      color: var(--text-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .back-btn:active { transform: scale(0.95); }

    .header-title {
      flex: 1;
      text-align: center;
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .header-spacer { width: 44px; }

    /* Main Content */
    .otp-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 20px;
      position: relative;
      z-index: 10;
    }

    /* Section Icon */
    .section-icon {
      margin-bottom: 24px;
    }

    .section-icon.pulse .icon-bg {
      animation: pulse-icon 1.5s ease-in-out infinite;
    }

    @keyframes pulse-icon {
      0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
      50% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(99, 102, 241, 0); }
    }

    .icon-bg {
      width: 100px;
      height: 100px;
      border-radius: 28px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
    }

    .icon-bg svg { fill: var(--accent-start); }

    .icon-bg.success {
      background: var(--success-light);
    }
    .icon-bg.success svg { fill: var(--success); }

    .icon-bg.error {
      background: var(--danger-light);
    }
    .icon-bg.error svg { fill: var(--danger); }

    h2 {
      font-size: 26px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 8px 0;
      text-align: center;
    }

    .section-desc {
      font-size: 15px;
      color: var(--text-secondary);
      margin: 0 0 32px 0;
      text-align: center;
      line-height: 1.5;
    }

    /* Channel Options */
    .channel-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      max-width: 360px;
      margin-bottom: 32px;
    }

    .channel-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 18px 20px;
      background: var(--bg-elevated);
      border: 2px solid var(--border);
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.25s;
      position: relative;
      text-align: left;
    }

    .channel-card.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .channel-card.selected {
      border-color: var(--accent-start);
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.03));
    }

    .channel-card:active:not(.disabled) { transform: scale(0.98); }

    .channel-icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.25s;
    }

    .channel-icon.sms {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
    }
    .channel-icon.sms svg { fill: var(--accent-start); }

    .channel-icon.email {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.1));
    }
    .channel-icon.email svg { fill: var(--success); }

    .channel-icon.both {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 191, 36, 0.1));
    }
    .channel-icon.both svg { fill: var(--warning); }

    .channel-card.selected .channel-icon {
      background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
    }
    .channel-card.selected .channel-icon svg { fill: white; }

    .channel-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .channel-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .channel-detail {
      font-size: 13px;
      color: var(--text-muted);
    }

    .channel-check {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .channel-check svg { fill: white; }

    /* OTP Input */
    .otp-input-container {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }

    .otp-box {
      width: 52px;
      height: 64px;
      border: 2px solid var(--border);
      border-radius: 14px;
      background: var(--bg-elevated);
      font-size: 28px;
      font-weight: 700;
      text-align: center;
      color: var(--text-primary);
      outline: none;
      transition: all 0.2s;
      caret-color: var(--accent-start);
    }

    .otp-box:focus {
      border-color: var(--accent-start);
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
    }

    .otp-box.filled {
      border-color: var(--accent-start);
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.03));
    }

    .otp-box.error {
      border-color: var(--danger);
      animation: shake 0.4s ease-in-out;
    }

    .otp-box.success {
      border-color: var(--success);
      background: var(--success-light);
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-8px); }
      75% { transform: translateX(8px); }
    }

    /* OTP Meta */
    .otp-meta {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      margin-bottom: 24px;
    }

    .timer {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .timer svg { fill: var(--accent-start); }

    .timer.expired {
      color: var(--danger);
    }
    .timer.expired svg { fill: var(--danger); }

    .attempts {
      font-size: 13px;
      color: var(--text-muted);
    }

    /* Error Message */
    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--danger-light);
      border-radius: 12px;
      margin-bottom: 24px;
      max-width: 360px;
    }

    .error-message svg { fill: var(--danger); flex-shrink: 0; }
    .error-message span { font-size: 14px; color: var(--danger); }

    /* Buttons */
    .primary-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      max-width: 360px;
      padding: 16px 24px;
      background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
      color: white;
      border: none;
      border-radius: 16px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
      transition: all 0.25s;
    }

    .primary-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .primary-btn:active:not(:disabled) { transform: scale(0.98); }

    .primary-btn.loading {
      background: var(--bg-glass);
      color: var(--text-secondary);
      box-shadow: none;
    }

    .verify-btn { margin-bottom: 24px; }

    .btn-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .primary-btn.loading .btn-spinner {
      border-color: rgba(0, 0, 0, 0.1);
      border-top-color: var(--accent-start);
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Resend Section */
    .resend-section {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }

    .resend-text {
      font-size: 14px;
      color: var(--text-muted);
    }

    .resend-btn {
      background: none;
      border: none;
      color: var(--accent-start);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      padding: 8px 12px;
      border-radius: 8px;
      transition: background 0.2s;
    }

    .resend-btn:disabled {
      color: var(--text-muted);
      cursor: not-allowed;
    }

    .resend-btn:active:not(:disabled) {
      background: rgba(99, 102, 241, 0.1);
    }

    .change-channel-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 14px;
      cursor: pointer;
      padding: 10px 16px;
      border-radius: 10px;
      transition: all 0.2s;
    }

    .change-channel-btn svg { fill: var(--text-secondary); }

    .change-channel-btn:active {
      background: var(--bg-elevated);
    }

    /* Success Section */
    .success-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .success-visual {
      position: relative;
      width: 140px;
      height: 140px;
      margin-bottom: 32px;
    }

    .success-circle {
      position: absolute;
      inset: 20px;
      background: var(--success-light);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
    }

    .success-circle svg {
      fill: var(--success);
      animation: success-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes success-pop {
      0% { transform: scale(0); }
      70% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }

    .success-rings {
      position: absolute;
      inset: 0;
    }

    .ring {
      position: absolute;
      inset: 0;
      border: 2px solid var(--success);
      border-radius: 50%;
      opacity: 0;
      animation: ring-expand 1.5s ease-out forwards;
    }

    .ring-1 { animation-delay: 0s; }
    .ring-2 { animation-delay: 0.3s; }
    .ring-3 { animation-delay: 0.6s; }

    @keyframes ring-expand {
      0% { transform: scale(0.7); opacity: 0.8; }
      100% { transform: scale(1.5); opacity: 0; }
    }

    /* Footer */
    .otp-footer {
      padding: 20px;
      display: flex;
      justify-content: center;
      position: relative;
      z-index: 10;
    }

    .security-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .security-badge svg { fill: var(--success); }

    /* Responsive */
    @media (max-width: 380px) {
      .otp-box {
        width: 44px;
        height: 56px;
        font-size: 24px;
      }

      .otp-input-container { gap: 8px; }
    }
  `]
})
export class OtpVerificationComponent implements OnInit, OnDestroy {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef>;

  // Input properties for embedded use
  @Input() embedded = false;
  @Input() phone = '';
  @Input() email = '';
  @Input() purpose: OtpPurpose = 'registration';
  @Input() preSelectedChannel: OtpChannel | null = null;
  @Input() showChannelSelector = true;
  /** When true, OTP is sent/verified via POST /auth/otp/* (login flow). */
  @Input() useBackendApi = false;

  // Output events
  @Output() verified = new EventEmitter<{ token: string; channel: OtpChannel; otp?: string }>();
  @Output() cancelled = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  // State
  state: VerificationState = 'input';
  isDarkMode = false;
  session: OtpSession | null = null;

  // Channel selection
  selectedChannel: OtpChannel | null = null;
  maskedPhone = '';
  maskedEmail = '';

  // OTP input
  otpDigits: string[] = ['', '', '', '', '', ''];
  hasError = false;

  // Loading states
  isSending = false;
  isVerifying = false;

  // Timer
  expirySeconds = 0;
  private expiryInterval: any;

  // Resend
  canResend = false;
  resendCooldown = 0;
  private resendInterval: any;

  // Messages
  errorMessage = '';
  successMessage = '';

  constructor(
    private otpService: OtpService,
    private authService: MobileAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    // Get query params if not embedded
    if (!this.embedded) {
      this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
        this.phone = params['phone'] || this.phone;
        this.email = params['email'] || this.email;
        this.purpose = params['purpose'] || this.purpose;
      });
    }

    // Mask values
    if (this.phone) this.maskedPhone = this.maskPhone(this.phone);
    if (this.email) this.maskedEmail = this.maskEmail(this.email);

    // Pre-select channel if specified
    if (this.preSelectedChannel) {
      this.selectedChannel = this.preSelectedChannel;
      this.showChannelSelector = false;
      this.sendOtp();
    }

    // Check for existing session
    this.otpService.getCurrentSession()
      .pipe(takeUntil(this.destroy$))
      .subscribe(session => {
        if (session && session.status === 'pending') {
          this.session = session;
          this.selectedChannel = session.channel;
          this.startExpiryTimer();
          this.startResendTimer();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearTimers();
  }

  // ============================================================================
  // CHANNEL SELECTION
  // ============================================================================

  selectChannel(channel: OtpChannel): void {
    if (channel === 'sms' && !this.phone) return;
    if (channel === 'email' && !this.email) return;
    if (channel === 'both' && (!this.phone || !this.email)) return;

    this.selectedChannel = channel;
    this.errorMessage = '';
  }

  changeChannel(): void {
    this.otpService.clearSession();
    this.session = null;
    this.selectedChannel = null;
    this.resetOtpInput();
    this.clearTimers();
    this.state = 'input';
    this.showChannelSelector = true;
  }

  // ============================================================================
  // SEND OTP
  // ============================================================================

  sendOtp(): void {
    if (!this.selectedChannel) return;

    this.isSending = true;
    this.state = 'sending';
    this.errorMessage = '';

    if (this.useBackendApi) {
      const phone = this.selectedChannel === 'sms' ? this.phone : null;
      const email = this.selectedChannel === 'email' ? this.email : null;
      this.authService
        .generateOtp(phone, email, 'LOGIN')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: result => {
            this.isSending = false;
            this.state = 'input';
            this.session = {
              otpId: 'backend-login',
              channel: this.selectedChannel!,
              phone: this.phone,
              email: this.email,
              purpose: 'login',
              expiresAt: new Date(Date.now() + 10 * 60 * 1000),
              createdAt: new Date(),
              attempts: 0,
              maxAttempts: 5,
              status: 'pending',
              verified: false
            } as OtpSession;
            this.successMessage = result.otp
              ? `${result.message} (Dev OTP: ${result.otp})`
              : result.message;
            this.startExpiryTimer();
            this.startResendTimer();
            setTimeout(() => this.focusInput(0), 100);
          },
          error: err => {
            this.isSending = false;
            this.state = 'error';
            this.errorMessage = err?.message || 'Failed to send OTP';
          }
        });
      return;
    }

    this.otpService.sendOtp({
      channel: this.selectedChannel,
      purpose: this.purpose,
      phone: this.phone,
      email: this.email
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.isSending = false;
        this.state = 'input';
        this.session = this.otpService.getSessionSync();
        this.successMessage = result.message;
        this.startExpiryTimer();
        this.startResendTimer();

        // Focus first input
        setTimeout(() => {
          this.focusInput(0);
        }, 100);
      },
      error: (error) => {
        this.isSending = false;
        this.state = 'error';
        this.errorMessage = error.message || 'Failed to send OTP';
      }
    });
  }

  resendOtp(): void {
    if (!this.canResend) return;

    if (this.useBackendApi) {
      this.sendOtp();
      return;
    }

    this.isSending = true;
    this.resetOtpInput();
    this.hasError = false;
    this.errorMessage = '';

    this.otpService.resendOtp()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.isSending = false;
          this.session = this.otpService.getSessionSync();
          this.successMessage = result.message;
          this.startExpiryTimer();
          this.startResendTimer();
          this.focusInput(0);
        },
        error: (error) => {
          this.isSending = false;
          this.errorMessage = error.message || 'Failed to resend OTP';
        }
      });
  }

  // ============================================================================
  // VERIFY OTP
  // ============================================================================

  verifyOtp(): void {
    if (!this.session || !this.isOtpComplete()) return;

    const otp = this.otpDigits.join('');
    
    this.state = 'verifying';
    this.errorMessage = '';
    this.hasError = false;

    if (this.useBackendApi && this.session) {
      this.state = 'success';
      this.clearTimers();
      setTimeout(() => {
        this.verified.emit({
          token: '',
          channel: this.session!.channel,
          otp
        });
      }, 800);
      return;
    }

    this.otpService.verifyOtp({
      otpId: this.session.otpId,
      otp,
      channel: this.session.channel
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        if (result.verified) {
          this.state = 'success';
          this.session = this.otpService.getSessionSync();
          this.clearTimers();

          // Emit success after animation
          setTimeout(() => {
            this.verified.emit({
              token: result.token || '',
              channel: this.session!.channel
            });
          }, 2000);
        } else {
          this.state = 'input';
          this.hasError = true;
          this.errorMessage = result.message;
          this.session = this.otpService.getSessionSync();
          
          // Clear input after error
          setTimeout(() => {
            this.resetOtpInput();
            this.focusInput(0);
          }, 1000);
        }
      },
      error: (error) => {
        this.state = 'error';
        this.hasError = true;
        this.errorMessage = error.message || 'Verification failed';
        this.session = this.otpService.getSessionSync();
      }
    });
  }

  // ============================================================================
  // OTP INPUT HANDLING
  // ============================================================================

  onOtpInput(event: any, index: number): void {
    const value = event.target.value;
    
    // Only allow digits
    if (!/^\d*$/.test(value)) {
      this.otpDigits[index] = '';
      return;
    }

    // Take only last character if multiple typed
    this.otpDigits[index] = value.slice(-1);

    // Clear error state on input
    this.hasError = false;
    this.errorMessage = '';

    // Auto-focus next input
    if (value && index < 5) {
      this.focusInput(index + 1);
    }

    // Auto-verify when complete
    if (this.isOtpComplete()) {
      setTimeout(() => this.verifyOtp(), 300);
    }
  }

  onOtpKeydown(event: KeyboardEvent, index: number): void {
    // Handle backspace
    if (event.key === 'Backspace') {
      if (!this.otpDigits[index] && index > 0) {
        this.focusInput(index - 1);
      }
      this.otpDigits[index] = '';
    }

    // Handle arrow keys
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusInput(index - 1);
    }
    if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault();
      this.focusInput(index + 1);
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);

    if (digits.length > 0) {
      for (let i = 0; i < 6; i++) {
        this.otpDigits[i] = digits[i] || '';
      }

      // Focus last filled or next empty
      const lastIndex = Math.min(digits.length - 1, 5);
      this.focusInput(lastIndex);

      // Auto-verify if complete
      if (this.isOtpComplete()) {
        setTimeout(() => this.verifyOtp(), 300);
      }
    }
  }

  onOtpFocus(index: number): void {
    // Select all text in the input
    const inputs = this.otpInputs.toArray();
    if (inputs[index]) {
      (inputs[index].nativeElement as HTMLInputElement).select();
    }
  }

  private focusInput(index: number): void {
    const inputs = this.otpInputs.toArray();
    if (inputs[index]) {
      inputs[index].nativeElement.focus();
    }
  }

  private resetOtpInput(): void {
    this.otpDigits = ['', '', '', '', '', ''];
    this.hasError = false;
  }

  isOtpComplete(): boolean {
    return this.otpDigits.every(d => d !== '');
  }

  // ============================================================================
  // TIMERS
  // ============================================================================

  private startExpiryTimer(): void {
    this.clearExpiryTimer();
    
    if (!this.session) return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((this.session!.expiresAt.getTime() - Date.now()) / 1000));
      this.expirySeconds = remaining;

      if (remaining === 0) {
        this.clearExpiryTimer();
        this.state = 'expired';
      }
    };

    updateTimer();
    this.expiryInterval = setInterval(updateTimer, 1000);
  }

  private clearExpiryTimer(): void {
    if (this.expiryInterval) {
      clearInterval(this.expiryInterval);
      this.expiryInterval = null;
    }
  }

  private startResendTimer(): void {
    this.clearResendTimer();
    
    const cooldown = this.otpService.getResendCooldown();
    this.resendCooldown = cooldown.remainingSeconds;
    this.canResend = cooldown.canResend;

    if (!this.canResend) {
      this.resendInterval = setInterval(() => {
        const cooldown = this.otpService.getResendCooldown();
        this.resendCooldown = cooldown.remainingSeconds;
        this.canResend = cooldown.canResend;

        if (this.canResend) {
          this.clearResendTimer();
        }
      }, 1000);
    }
  }

  private clearResendTimer(): void {
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
      this.resendInterval = null;
    }
  }

  private clearTimers(): void {
    this.clearExpiryTimer();
    this.clearResendTimer();
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  maskPhone(phone: string): string {
    if (phone.length < 4) return phone;
    return phone.slice(0, 2) + '*'.repeat(phone.length - 4) + phone.slice(-2);
  }

  maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    return local[0] + '*'.repeat(Math.min(local.length - 2, 5)) + local.slice(-1) + '@' + domain;
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  goBack(): void {
    if (this.embedded) {
      this.cancelled.emit();
    } else {
      this.otpService.clearSession();
      this.router.navigate(['/mobile/auth/login']);
    }
  }

  onSuccess(): void {
    if (this.embedded) {
      // Already emitted in verifyOtp
    } else {
      this.router.navigate(['/mobile/dashboard']);
    }
  }

  // ============================================================================
  // HELPER METHODS (to avoid type narrowing issues in templates)
  // ============================================================================

  showOtpInputSection(): boolean {
    return this.session !== null && this.state !== 'success';
  }

  showLockIcon(): boolean {
    return this.state !== 'success' && this.state !== 'error';
  }

  isInputDisabled(): boolean {
    return this.state === 'verifying' || this.state === 'success';
  }

  getSessionChannel(): string {
    return this.session?.channel || '';
  }

  getSessionPhone(): string {
    return this.session?.phone ? this.maskPhone(this.session.phone) : '';
  }

  getSessionEmail(): string {
    return this.session?.email ? this.maskEmail(this.session.email) : '';
  }

  getSessionAttempts(): number {
    return this.session?.attempts || 0;
  }

  getRemainingAttempts(): number {
    if (!this.session) return 0;
    return this.session.maxAttempts - this.session.attempts;
  }
}
