import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, switchMap } from 'rxjs';
import { 
  BiometricAuthService, 
  BiometricType, 
  BiometricCapabilities,
  StoredBiometricUser,
  BiometricAuthResult
} from './biometric-auth.service';
import { MobileAuthService, UserRole } from '../../services/mobile-auth.service';
import { FaceCaptureService } from './face-capture.service';

type AuthState = 'idle' | 'scanning' | 'success' | 'failed' | 'locked';

@Component({
  selector: 'app-biometric-login',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="biometric-container" [class.dark-mode]="isDarkMode">
      <!-- Animated Mesh Gradient Background -->
      <div class="mesh-bg">
        <div class="mesh-gradient"></div>
        <div class="noise-overlay"></div>
        <div class="glow-orb orb-1"></div>
        <div class="glow-orb orb-2"></div>
        <div class="glow-orb orb-3"></div>
        <!-- Floating Particles -->
        <div class="particles">
          <span *ngFor="let i of [1,2,3,4,5,6,7,8]" class="particle" [attr.data-delay]="i"></span>
        </div>
      </div>

      <!-- Glass Header -->
      <header class="glass-header">
        <button class="icon-btn" (click)="goBack()" aria-label="Go back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        
        <div class="brand-mark">
          <div class="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
            </svg>
          </div>
          <span class="brand-text">SecureAuth</span>
        </div>
        
        <button class="icon-btn" (click)="toggleTheme()" [attr.aria-label]="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'">
          <svg *ngIf="!isDarkMode" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
          </svg>
          <svg *ngIf="isDarkMode" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z"/>
          </svg>
        </button>
      </header>

      <!-- Main Content -->
      <main class="auth-main">
        <!-- User Profile Card -->
        <section class="profile-section" *ngIf="storedUser">
          <div class="avatar-container" [class.scanning]="authState === 'scanning'" [class.success]="authState === 'success'">
            <!-- Animated Ring -->
            <svg class="progress-ring" viewBox="0 0 140 140">
              <defs>
                <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="var(--accent-start)" />
                  <stop offset="100%" stop-color="var(--accent-end)" />
                </linearGradient>
              </defs>
              <circle class="ring-bg" cx="70" cy="70" r="66" />
              <circle class="ring-progress" cx="70" cy="70" r="66" 
                      [style.stroke-dashoffset]="415 - (415 * scanProgress / 100)" />
            </svg>
            
            <!-- Avatar Image -->
            <div class="avatar-frame">
              <img [src]="storedUser?.profilePhoto || getAvatarUrl()" 
                   [alt]="storedUser?.name || 'User'"
                   (error)="onAvatarError($event)">
              <div class="avatar-glow"></div>
            </div>
            
            <!-- Status Indicator -->
            <div class="status-indicator" [class]="authState">
              <svg *ngIf="authState === 'idle'" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
              <div *ngIf="authState === 'scanning'" class="spinner"></div>
              <svg *ngIf="authState === 'success'" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <svg *ngIf="authState === 'failed'" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <svg *ngIf="authState === 'locked'" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
              </svg>
            </div>
          </div>
          
          <!-- User Info -->
          <div class="user-info">
            <h1 class="user-name">{{ storedUser?.name }}</h1>
            <div class="user-meta">
              <span class="unit-badge" *ngIf="storedUser?.flatNumber">{{ storedUser?.flatNumber }}</span>
              <span class="society-name">{{ (storedUser?.societyName) || '' }}</span>
            </div>
          </div>

          <button class="switch-account-btn" (click)="switchUser()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"/>
            </svg>
            <span>Not you? Switch account</span>
          </button>
        </section>

        <!-- No User State -->
        <section class="empty-state" *ngIf="!storedUser && !isLoading">
          <div class="empty-illustration">
            <div class="empty-icon-bg"></div>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" class="empty-icon">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
          </div>
          <h2>No Biometric Account</h2>
          <p>Sign in with your credentials first, then enable biometric authentication from settings.</p>
          <button class="primary-btn" routerLink="/mobile/auth/login">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/>
            </svg>
            <span>Sign In with Password</span>
          </button>
        </section>

        <!-- Biometric Authentication Panel -->
        <section class="auth-panel" *ngIf="storedUser">
          <!-- Status Message -->
          <div class="status-message" [class]="authState">
            <span *ngIf="authState === 'idle'">{{ getIdleMessage() }}</span>
            <span *ngIf="authState === 'scanning'">{{ getScanningMessage() }}</span>
            <span *ngIf="authState === 'success'">Authentication Successful!</span>
            <span *ngIf="authState === 'failed'">{{ errorMessage }}</span>
            <span *ngIf="authState === 'locked'">{{ lockoutMessage }}</span>
          </div>

          <!-- Biometric Method Selector -->
          <div class="method-selector" *ngIf="showMethodSelector()">
            <!-- Fingerprint Option -->
            <button class="method-card" 
                    [class.selected]="selectedType === 'fingerprint'"
                    [class.available]="capabilities?.hasFingerprint"
                    [disabled]="isMethodDisabled('fingerprint')"
                    (click)="selectBiometricType('fingerprint')">
              <div class="method-icon fingerprint">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.81,4.47C17.73,4.47 17.65,4.45 17.58,4.41C15.66,3.42 14,3 12,3C10.03,3 8.15,3.47 6.44,4.41C6.2,4.54 5.9,4.45 5.76,4.21C5.63,3.97 5.72,3.66 5.96,3.53C7.82,2.5 9.86,2 12,2C14.14,2 16,2.47 18.04,3.5C18.29,3.65 18.38,3.95 18.25,4.19C18.16,4.37 18,4.47 17.81,4.47M3.5,9.72C3.4,9.72 3.3,9.69 3.21,9.63C3,9.47 2.93,9.16 3.09,8.93C4.08,7.53 5.34,6.43 6.84,5.66C10,4.04 14,4.03 17.15,5.65C18.65,6.42 19.91,7.5 20.9,8.9C21.06,9.12 21,9.44 20.78,9.6C20.55,9.76 20.24,9.71 20.08,9.5C19.18,8.22 18.04,7.23 16.69,6.54C13.82,5.07 10.15,5.07 7.29,6.55C5.93,7.25 4.79,8.25 3.89,9.5C3.81,9.65 3.66,9.72 3.5,9.72M9.75,21.79C9.62,21.79 9.5,21.74 9.4,21.64C8.53,20.77 8.06,20.21 7.39,19C6.7,17.77 6.34,16.27 6.34,14.66C6.34,11.69 8.88,9.27 12,9.27C15.12,9.27 17.66,11.69 17.66,14.66A0.5,0.5 0 0,1 17.16,15.16A0.5,0.5 0 0,1 16.66,14.66C16.66,12.24 14.57,10.27 12,10.27C9.43,10.27 7.34,12.24 7.34,14.66C7.34,16.1 7.66,17.43 8.27,18.5C8.91,19.66 9.35,20.15 10.12,20.93C10.31,21.13 10.31,21.44 10.12,21.64C10,21.74 9.88,21.79 9.75,21.79Z"/>
                </svg>
              </div>
              <div class="method-info">
                <span class="method-title">Fingerprint</span>
                <span class="method-subtitle">Touch sensor to verify</span>
              </div>
              <div class="method-status">
                <span class="status-dot" [class.available]="capabilities?.hasFingerprint"></span>
              </div>
            </button>

            <!-- Face ID Option -->
            <button class="method-card"
                    [class.selected]="selectedType === 'face_id'"
                    [class.available]="capabilities?.hasFaceId"
                    [disabled]="isMethodDisabled('face_id')"
                    (click)="selectBiometricType('face_id')">
              <div class="method-icon face-id">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9,11.75A1.25,1.25 0 0,0 7.75,13A1.25,1.25 0 0,0 9,14.25A1.25,1.25 0 0,0 10.25,13A1.25,1.25 0 0,0 9,11.75M15,11.75A1.25,1.25 0 0,0 13.75,13A1.25,1.25 0 0,0 15,14.25A1.25,1.25 0 0,0 16.25,13A1.25,1.25 0 0,0 15,11.75M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,17.23C10.25,17.23 8.71,16.5 7.81,15.42L9.23,14C9.68,14.72 10.75,15.23 12,15.23C13.25,15.23 14.32,14.72 14.77,14L16.19,15.42C15.29,16.5 13.75,17.23 12,17.23Z"/>
                </svg>
              </div>
              <div class="method-info">
                <span class="method-title">Face ID</span>
                <span class="method-subtitle">Look at camera to verify</span>
              </div>
              <div class="method-status">
                <span class="status-dot" [class.available]="capabilities?.hasFaceId"></span>
              </div>
            </button>
          </div>

          <!-- Main Authentication Button -->
          <button class="auth-button"
                  [class.scanning]="authState === 'scanning'"
                  [class.success]="authState === 'success'"
                  [class.failed]="authState === 'failed'"
                  [disabled]="!selectedType || authState === 'scanning' || authState === 'locked'"
                  (click)="authenticate()">
            <div class="btn-bg"></div>
            <div class="btn-glow"></div>
            <div class="btn-content">
              <div class="btn-icon-wrapper">
                <!-- Idle State Icons -->
                <svg *ngIf="authState === 'idle' && selectedType === 'fingerprint'" 
                     width="48" height="48" viewBox="0 0 24 24" fill="currentColor" class="btn-icon">
                  <path d="M17.81,4.47C17.73,4.47 17.65,4.45 17.58,4.41C15.66,3.42 14,3 12,3C10.03,3 8.15,3.47 6.44,4.41C6.2,4.54 5.9,4.45 5.76,4.21C5.63,3.97 5.72,3.66 5.96,3.53C7.82,2.5 9.86,2 12,2C14.14,2 16,2.47 18.04,3.5C18.29,3.65 18.38,3.95 18.25,4.19C18.16,4.37 18,4.47 17.81,4.47M3.5,9.72C3.4,9.72 3.3,9.69 3.21,9.63C3,9.47 2.93,9.16 3.09,8.93C4.08,7.53 5.34,6.43 6.84,5.66C10,4.04 14,4.03 17.15,5.65C18.65,6.42 19.91,7.5 20.9,8.9C21.06,9.12 21,9.44 20.78,9.6C20.55,9.76 20.24,9.71 20.08,9.5C19.18,8.22 18.04,7.23 16.69,6.54C13.82,5.07 10.15,5.07 7.29,6.55C5.93,7.25 4.79,8.25 3.89,9.5C3.81,9.65 3.66,9.72 3.5,9.72M9.75,21.79C9.62,21.79 9.5,21.74 9.4,21.64C8.53,20.77 8.06,20.21 7.39,19C6.7,17.77 6.34,16.27 6.34,14.66C6.34,11.69 8.88,9.27 12,9.27C15.12,9.27 17.66,11.69 17.66,14.66A0.5,0.5 0 0,1 17.16,15.16A0.5,0.5 0 0,1 16.66,14.66C16.66,12.24 14.57,10.27 12,10.27C9.43,10.27 7.34,12.24 7.34,14.66C7.34,16.1 7.66,17.43 8.27,18.5C8.91,19.66 9.35,20.15 10.12,20.93C10.31,21.13 10.31,21.44 10.12,21.64C10,21.74 9.88,21.79 9.75,21.79Z"/>
                </svg>
                <svg *ngIf="authState === 'idle' && selectedType === 'face_id'" 
                     width="48" height="48" viewBox="0 0 24 24" fill="currentColor" class="btn-icon">
                  <path d="M9,11.75A1.25,1.25 0 0,0 7.75,13A1.25,1.25 0 0,0 9,14.25A1.25,1.25 0 0,0 10.25,13A1.25,1.25 0 0,0 9,11.75M15,11.75A1.25,1.25 0 0,0 13.75,13A1.25,1.25 0 0,0 15,14.25A1.25,1.25 0 0,0 16.25,13A1.25,1.25 0 0,0 15,11.75M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,17.23C10.25,17.23 8.71,16.5 7.81,15.42L9.23,14C9.68,14.72 10.75,15.23 12,15.23C13.25,15.23 14.32,14.72 14.77,14L16.19,15.42C15.29,16.5 13.75,17.23 12,17.23Z"/>
                </svg>
                
                <!-- Scanning Animation -->
                <div *ngIf="authState === 'scanning'" class="scan-animation">
                  <div class="scan-circle"></div>
                  <div class="scan-circle delay-1"></div>
                  <div class="scan-circle delay-2"></div>
                  <div class="scan-line"></div>
                </div>
                
                <!-- Success Check -->
                <svg *ngIf="authState === 'success'" width="48" height="48" viewBox="0 0 24 24" fill="currentColor" class="btn-icon success-icon">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                
                <!-- Retry Icon -->
                <svg *ngIf="authState === 'failed'" width="48" height="48" viewBox="0 0 24 24" fill="currentColor" class="btn-icon">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
              </div>
              <span class="btn-text">{{ getButtonText() }}</span>
            </div>
          </button>

          <!-- Retry Warning -->
          <div class="retry-warning" *ngIf="attemptsRemaining !== null && attemptsRemaining < 5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
            <span>{{ attemptsRemaining }} attempts remaining</span>
          </div>

          <!-- Enrollment Prompt (when Face ID not enrolled) -->
          <div class="enrollment-prompt" *ngIf="authState === 'failed' && errorMessage.includes('not enrolled')">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <p>Face ID is not set up for this device. Would you like to enroll now?</p>
            <button class="enroll-btn" (click)="goToEnrollment()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9,11.75A1.25,1.25 0 0,0 7.75,13A1.25,1.25 0 0,0 9,14.25A1.25,1.25 0 0,0 10.25,13A1.25,1.25 0 0,0 9,11.75M15,11.75A1.25,1.25 0 0,0 13.75,13A1.25,1.25 0 0,0 15,14.25A1.25,1.25 0 0,0 16.25,13A1.25,1.25 0 0,0 15,11.75M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
              </svg>
              <span>Set Up Face ID</span>
            </button>
          </div>
        </section>
      </main>

      <!-- Footer -->
      <footer class="auth-footer">
        <button class="alt-login" routerLink="/mobile/auth/login">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.5 18.5v-1c0-1.4 3-2.1 4.5-2.1s4.5.7 4.5 2.1v1h-9zm9-6c0 1.7-1.3 3-3 3s-3-1.3-3-3 1.3-3 3-3 3 1.3 3 3zm3 6.5h9v-1c0-1.4-3-2.1-4.5-2.1-1 0-2.4.3-3.3.8.5.6.8 1.4.8 2.3zm4.5-6.5c0 1.7-1.3 3-3 3s-3-1.3-3-3 1.3-3 3-3 3 1.3 3 3z"/>
          </svg>
          <span>Use Password Instead</span>
        </button>

        <div class="security-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
          </svg>
          <span>Your biometric data never leaves this device</span>
        </div>
      </footer>

      <!-- Loading Overlay -->
      <div class="loading-overlay" *ngIf="isLoading">
        <div class="loader">
          <div class="loader-ring"></div>
          <span>Initializing...</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --accent-start: #6366f1;
      --accent-mid: #8b5cf6;
      --accent-end: #a855f7;
      --success: #10b981;
      --success-soft: rgba(16, 185, 129, 0.15);
      --danger: #ef4444;
      --danger-soft: rgba(239, 68, 68, 0.15);
      --warning: #f59e0b;
      --warning-soft: rgba(245, 158, 11, 0.15);
      --bg-base: #fafbfc;
      --bg-elevated: #ffffff;
      --bg-glass: rgba(255, 255, 255, 0.7);
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-muted: #94a3b8;
      --border: rgba(0, 0, 0, 0.08);
      --shadow-color: 0, 0, 0;
      display: block;
      height: 100%;
      font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .dark-mode {
      --bg-base: #0c0f1a;
      --bg-elevated: #151929;
      --bg-glass: rgba(21, 25, 41, 0.8);
      --text-primary: #f1f5f9;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --border: rgba(255, 255, 255, 0.08);
    }

    .biometric-container {
      min-height: 100vh;
      background: var(--bg-base);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    .mesh-bg { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
    .mesh-gradient {
      position: absolute; inset: 0;
      background: 
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.25) 0%, transparent 50%),
        radial-gradient(ellipse 60% 40% at 100% 50%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
        radial-gradient(ellipse 50% 30% at 0% 80%, rgba(139, 92, 246, 0.12) 0%, transparent 50%);
    }
    .noise-overlay { position: absolute; inset: 0; opacity: 0.03; }
    .glow-orb { position: absolute; border-radius: 50%; filter: blur(100px); animation: float 20s ease-in-out infinite; }
    .orb-1 { width: 400px; height: 400px; background: linear-gradient(135deg, var(--accent-start), var(--accent-mid)); top: -150px; right: -100px; opacity: 0.4; }
    .orb-2 { width: 300px; height: 300px; background: linear-gradient(225deg, var(--accent-mid), var(--accent-end)); bottom: 30%; left: -100px; opacity: 0.3; animation-delay: -7s; }
    .orb-3 { width: 200px; height: 200px; background: linear-gradient(180deg, var(--accent-end), var(--success)); bottom: -50px; right: 15%; opacity: 0.25; animation-delay: -14s; }
    @keyframes float { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-25px, 30px) scale(0.95); } }

    .particles { position: absolute; inset: 0; overflow: hidden; }
    .particle { position: absolute; width: 4px; height: 4px; background: var(--accent-mid); border-radius: 50%; opacity: 0.3; animation: rise 15s ease-in-out infinite; }
    .particle:nth-child(1) { left: 10%; } .particle:nth-child(2) { left: 25%; animation-delay: -2s; }
    .particle:nth-child(3) { left: 40%; animation-delay: -4s; } .particle:nth-child(4) { left: 55%; animation-delay: -6s; }
    .particle:nth-child(5) { left: 70%; animation-delay: -8s; } .particle:nth-child(6) { left: 85%; animation-delay: -10s; }
    @keyframes rise { 0% { bottom: -20px; opacity: 0; } 50% { opacity: 0.4; } 100% { bottom: 110%; opacity: 0; } }

    .glass-header {
      display: flex; align-items: center; justify-content: space-between; padding: 16px 20px;
      position: relative; z-index: 10; background: var(--bg-glass);
      backdrop-filter: blur(20px); border-bottom: 1px solid var(--border);
    }
    .icon-btn {
      width: 44px; height: 44px; border-radius: 14px; border: 1px solid var(--border);
      background: var(--bg-elevated); color: var(--text-primary);
      display: flex; align-items: center; justify-content: center; cursor: pointer;
    }
    .icon-btn:active { transform: scale(0.94); }
    .brand-mark { display: flex; align-items: center; gap: 10px; }
    .brand-icon {
      width: 36px; height: 36px; border-radius: 10px;
      background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
      display: flex; align-items: center; justify-content: center; color: white;
    }
    .brand-text { font-size: 17px; font-weight: 700; color: var(--text-primary); }

    .auth-main { flex: 1; display: flex; flex-direction: column; padding: 24px 20px; position: relative; z-index: 10; overflow-y: auto; }

    .profile-section { display: flex; flex-direction: column; align-items: center; margin-bottom: 28px; }
    .avatar-container { position: relative; width: 140px; height: 140px; margin-bottom: 20px; }
    .progress-ring { position: absolute; inset: 0; transform: rotate(-90deg); }
    .ring-bg { fill: none; stroke: var(--border); stroke-width: 4; }
    .ring-progress { fill: none; stroke: url(#ringGradient); stroke-width: 4; stroke-linecap: round; stroke-dasharray: 415; stroke-dashoffset: 415; opacity: 0; }
    .avatar-container.scanning .ring-progress { opacity: 1; animation: ring-rotate 2s linear infinite; }
    @keyframes ring-rotate { to { transform: rotate(360deg); } }
    .avatar-frame { position: absolute; inset: 8px; border-radius: 50%; overflow: hidden; background: var(--bg-elevated); box-shadow: 0 8px 32px rgba(var(--shadow-color), 0.12); }
    .avatar-frame img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-glow { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), transparent); opacity: 0; }
    .avatar-container.scanning .avatar-glow { opacity: 1; animation: pulse-glow 1.5s ease-in-out infinite; }
    @keyframes pulse-glow { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.5; } }

    .status-indicator {
      position: absolute; bottom: 8px; right: 8px; width: 40px; height: 40px; border-radius: 50%;
      background: var(--bg-elevated); border: 3px solid var(--bg-base);
      display: flex; align-items: center; justify-content: center; color: var(--text-muted);
    }
    .status-indicator.scanning { background: linear-gradient(135deg, var(--accent-start), var(--accent-end)); color: white; animation: pulse-indicator 1s ease-in-out infinite; }
    .status-indicator.success { background: var(--success); color: white; }
    .status-indicator.failed { background: var(--danger); color: white; }
    .status-indicator.locked { background: var(--warning); color: white; }
    @keyframes pulse-indicator { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
    .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .user-info { text-align: center; margin-bottom: 12px; }
    .user-name { font-size: 26px; font-weight: 700; color: var(--text-primary); margin: 0 0 10px 0; }
    .user-meta { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; }
    .unit-badge { background: linear-gradient(135deg, var(--accent-start), var(--accent-end)); color: white; padding: 5px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; }
    .society-name { color: var(--text-secondary); font-size: 14px; font-weight: 500; }
    .switch-account-btn { display: flex; align-items: center; gap: 6px; background: transparent; border: none; color: var(--accent-start); font-size: 14px; font-weight: 500; cursor: pointer; padding: 10px 18px; border-radius: 10px; }
    .switch-account-btn:active { background: rgba(99, 102, 241, 0.08); }

    .empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 20px; }
    .empty-illustration { position: relative; width: 120px; height: 120px; margin-bottom: 28px; }
    .empty-icon-bg { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1)); border-radius: 50%; animation: pulse-slow 3s ease-in-out infinite; }
    @keyframes pulse-slow { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.1); opacity: 0.8; } }
    .empty-icon { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: var(--text-muted); }
    .empty-state h2 { font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 0 0 10px 0; }
    .empty-state p { font-size: 15px; color: var(--text-secondary); line-height: 1.6; margin: 0 0 28px 0; max-width: 300px; }

    .auth-panel { flex: 1; display: flex; flex-direction: column; align-items: center; }
    .status-message { text-align: center; font-size: 16px; color: var(--text-secondary); margin-bottom: 28px; min-height: 24px; font-weight: 500; }
    .status-message.scanning { color: var(--accent-mid); }
    .status-message.success { color: var(--success); font-weight: 600; }
    .status-message.failed { color: var(--danger); }
    .status-message.locked { color: var(--warning); }

    .method-selector { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 380px; margin-bottom: 32px; }
    .method-card { display: flex; align-items: center; gap: 16px; padding: 18px 20px; background: var(--bg-elevated); border: 2px solid var(--border); border-radius: 18px; cursor: pointer; transition: all 0.25s; }
    .method-card:disabled { opacity: 0.5; cursor: not-allowed; }
    .method-card.selected { border-color: var(--accent-start); background: linear-gradient(135deg, rgba(99, 102, 241, 0.06), rgba(139, 92, 246, 0.04)); }
    .method-card:active:not(:disabled) { transform: scale(0.98); }
    .method-icon { width: 52px; height: 52px; border-radius: 14px; background: var(--bg-glass); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .method-card.selected .method-icon { background: linear-gradient(135deg, var(--accent-start), var(--accent-end)); }
    .method-icon svg { width: 28px; height: 28px; fill: var(--text-secondary); }
    .method-card.selected .method-icon svg { fill: white; }
    .method-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .method-title { font-size: 16px; font-weight: 600; color: var(--text-primary); }
    .method-subtitle { font-size: 13px; color: var(--text-muted); }
    .method-status { display: flex; align-items: center; }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--text-muted); }
    .status-dot.available { background: var(--success); box-shadow: 0 0 8px rgba(16, 185, 129, 0.5); }

    .auth-button { position: relative; width: 180px; height: 180px; border-radius: 50%; border: none; cursor: pointer; background: transparent; padding: 0; overflow: visible; }
    .auth-button:disabled { opacity: 0.6; cursor: not-allowed; }
    .auth-button:active:not(:disabled) { transform: scale(0.95); }
    .btn-bg { position: absolute; inset: 0; border-radius: 50%; background: linear-gradient(135deg, var(--accent-start), var(--accent-end)); box-shadow: 0 12px 40px rgba(99, 102, 241, 0.4); }
    .auth-button.scanning .btn-bg { animation: pulse-btn 1.5s ease-in-out infinite; }
    .auth-button.success .btn-bg { background: linear-gradient(135deg, #10b981, #34d399); box-shadow: 0 12px 40px rgba(16, 185, 129, 0.4); }
    .auth-button.failed .btn-bg { background: linear-gradient(135deg, var(--danger), #f87171); }
    @keyframes pulse-btn { 0%, 100% { box-shadow: 0 12px 40px rgba(99, 102, 241, 0.4), 0 0 0 0 rgba(99, 102, 241, 0.3); } 50% { box-shadow: 0 16px 50px rgba(99, 102, 241, 0.5), 0 0 0 20px rgba(99, 102, 241, 0); } }
    .btn-glow { position: absolute; inset: -20px; border-radius: 50%; background: radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%); opacity: 0; }
    .auth-button.scanning .btn-glow { opacity: 1; animation: glow-pulse 1.5s ease-in-out infinite; }
    @keyframes glow-pulse { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.2); opacity: 0.8; } }
    .btn-content { position: relative; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; z-index: 1; }
    .btn-icon-wrapper { width: 80px; height: 80px; border-radius: 50%; background: rgba(255, 255, 255, 0.15); display: flex; align-items: center; justify-content: center; position: relative; }
    .btn-icon { color: white; fill: white; }
    .success-icon { animation: pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
    @keyframes pop-in { 0% { transform: scale(0); } 100% { transform: scale(1); } }
    .scan-animation { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
    .scan-circle { position: absolute; inset: 0; border: 2px solid rgba(255, 255, 255, 0.4); border-radius: 50%; animation: scan-circle 1.5s ease-out infinite; }
    .scan-circle.delay-1 { animation-delay: 0.5s; } .scan-circle.delay-2 { animation-delay: 1s; }
    @keyframes scan-circle { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
    .scan-line { position: absolute; left: 10%; right: 10%; height: 3px; background: linear-gradient(90deg, transparent, white, transparent); border-radius: 2px; animation: scan-sweep 1.2s ease-in-out infinite; }
    @keyframes scan-sweep { 0%, 100% { top: 20%; opacity: 0; } 50% { top: 80%; opacity: 1; } }
    .btn-text { color: white; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; }
    .retry-warning { display: flex; align-items: center; gap: 8px; margin-top: 20px; padding: 12px 20px; background: var(--warning-soft); border-radius: 12px; color: var(--warning); font-size: 14px; font-weight: 500; }
    .enrollment-prompt { display: flex; flex-direction: column; align-items: center; gap: 16px; margin-top: 24px; padding: 20px; background: var(--bg-elevated); border: 2px solid var(--accent-start); border-radius: 16px; text-align: center; max-width: 320px; }
    .enrollment-prompt svg { color: var(--accent-start); margin-bottom: 8px; }
    .enrollment-prompt p { color: var(--text-secondary); font-size: 14px; line-height: 1.5; margin: 0; }
    .enroll-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 24px; background: linear-gradient(135deg, var(--accent-start), var(--accent-end)); color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; }
    .enroll-btn:active { transform: scale(0.97); }
    .enroll-btn svg { fill: white; }
    .primary-btn { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; max-width: 300px; padding: 16px 28px; background: linear-gradient(135deg, var(--accent-start), var(--accent-end)); color: white; border: none; border-radius: 16px; font-size: 16px; font-weight: 600; cursor: pointer; }
    .primary-btn:active { transform: scale(0.97); }

    .auth-footer { padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 16px; position: relative; z-index: 10; }
    .alt-login { display: flex; align-items: center; gap: 10px; padding: 14px 24px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 14px; color: var(--text-primary); font-size: 15px; font-weight: 500; cursor: pointer; }
    .alt-login:active { transform: scale(0.98); }
    .alt-login svg { fill: var(--accent-start); }
    .security-badge { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-muted); }
    .security-badge svg { fill: var(--success); }

    .loading-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .loader { display: flex; flex-direction: column; align-items: center; gap: 20px; }
    .loader-ring { width: 56px; height: 56px; border: 4px solid rgba(255, 255, 255, 0.2); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }
    .loader span { color: white; font-size: 16px; font-weight: 500; }

    @media (max-height: 700px) {
      .avatar-container { width: 120px; height: 120px; }
      .user-name { font-size: 22px; }
      .auth-button { width: 150px; height: 150px; }
    }
  `]
})
export class BiometricLoginComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  authState: AuthState = 'idle';
  isLoading = true;
  isDarkMode = false;
  storedUser: StoredBiometricUser | null = null;
  capabilities: BiometricCapabilities | null = null;
  selectedType: BiometricType = 'fingerprint';
  scanProgress = 0;
  errorMessage = '';
  lockoutMessage = '';
  attemptsRemaining: number | null = null;

  constructor(
    private biometricService: BiometricAuthService,
    private authService: MobileAuthService,
    private router: Router,
    private faceCapture: FaceCaptureService
  ) {}

  ngOnInit(): void {
    this.isDarkMode = localStorage.getItem('darkMode') === 'true';
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    this.biometricService.checkBiometricCapabilities()
      .pipe(takeUntil(this.destroy$))
      .subscribe(caps => {
        this.capabilities = caps;
        this.selectedType = caps.preferredType !== 'none' ? caps.preferredType : 'fingerprint';
      });

    this.biometricService.getStoredUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.storedUser = user;
        this.isLoading = false;
        if (user?.biometricType) {
          this.selectedType = user.biometricType;
        }
      });
  }

  getAvatarUrl(): string {
    const name = this.storedUser?.name || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=200&font-size=0.4&bold=true`;
  }

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = this.getAvatarUrl();
  }

  selectBiometricType(type: BiometricType): void {
    if (this.authState !== 'idle' && this.authState !== 'failed') return;
    this.selectedType = type;
    this.authState = 'idle';
    this.errorMessage = '';
  }

  authenticate(): void {
    if (!this.storedUser || !this.selectedType) return;

    this.authState = 'scanning';
    this.scanProgress = 0;
    this.errorMessage = '';

    // Simulate scan progress
    const progressInterval = setInterval(() => {
      this.scanProgress += 10;
      if (this.scanProgress >= 100) {
        clearInterval(progressInterval);
      }
    }, 150);

    // For face_id, capture face image first
    if (this.selectedType === 'face_id') {
      this.authenticateWithFaceId(progressInterval);
    } else {
      // For fingerprint, use existing flow
      this.authenticateWithFingerprint(progressInterval);
    }
  }

  /**
   * Authenticate with Face ID - captures face image and verifies
   */
  private authenticateWithFaceId(progressInterval: any): void {
    // Capture face image from camera
    this.faceCapture.captureFaceImage({ quality: 0.8, maxWidth: 640, maxHeight: 480 })
      .pipe(
        switchMap(faceImage => {
          // Validate captured image
          if (!this.faceCapture.validateFaceImage(faceImage)) {
            throw new Error('Invalid face image captured. Please try again.');
          }

          // Authenticate with captured face image
          return this.biometricService.authenticateWithBiometric('face_id', faceImage);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (result) => {
          clearInterval(progressInterval);
          this.scanProgress = 100;
          this.handleAuthResult(result);
        },
        error: (error: any) => {
          clearInterval(progressInterval);
          this.authState = 'failed';
          
          // Check if error is due to not being enrolled
          if (error.errorCode === 'NOT_ENROLLED' || 
              error.message?.includes('No enrolled face') ||
              error.message?.includes('not enrolled')) {
            this.errorMessage = 'Face ID not enrolled. Please set up Face ID first.';
            // Optionally, we could redirect to enrollment here
            // this.router.navigate(['/mobile/auth/biometric-setup']);
          } else {
            this.errorMessage = error.message || 'Face capture or verification failed';
          }
          console.error('Face ID authentication error:', error);
        }
      });
  }

  /**
   * Authenticate with fingerprint
   */
  private authenticateWithFingerprint(progressInterval: any): void {
    this.biometricService.authenticateWithBiometric('fingerprint')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          clearInterval(progressInterval);
          this.scanProgress = 100;
          this.handleAuthResult(result);
        },
        error: (error) => {
          clearInterval(progressInterval);
          this.authState = 'failed';
          this.errorMessage = error.message || 'Fingerprint authentication failed';
        }
      });
  }

  /**
   * Handle authentication result
   */
  private handleAuthResult(result: BiometricAuthResult): void {
    if (result.success) {
      this.authState = 'success';
      this.attemptsRemaining = null;

      // Login using backend API
      this.authService.biometricLogin(
        result.userId!,
        this.selectedType === 'face_id' ? 'FACE_ID' : 'FINGERPRINT',
        result.token || ''
      ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          // Navigate to appropriate dashboard
          setTimeout(() => {
            this.navigateToDashboard(user.role);
          }, 1000);
        },
        error: (error) => {
          console.error('Biometric login error:', error);
          this.authState = 'failed';
          this.errorMessage = error.message || 'Biometric login failed';
        }
      });
    } else {
      this.authState = 'failed';
      this.errorMessage = result.message || 'Biometric authentication failed';
      this.attemptsRemaining = result.attemptsRemaining || null;

      if (result.errorCode === 'LOCKED_OUT') {
        this.authState = 'locked';
        this.lockoutMessage = result.message || 'Account temporarily locked';
      }
    }
  }

  private navigateToDashboard(role: UserRole): void {
    const dashboards: Record<UserRole, string> = {
      [UserRole.SUPER_ADMIN]: '/mobile/admin/dashboard',
      [UserRole.SOCIETY_ADMIN]: '/mobile/admin/dashboard',
      [UserRole.GUARD]: '/mobile/guard/dashboard',
      [UserRole.SECURITY_STAFF]: '/mobile/guard/dashboard',
      [UserRole.FACILITY_MANAGER]: '/mobile/staff/dashboard',
      [UserRole.ACCOUNTANT]: '/mobile/staff/dashboard',
      [UserRole.COMMITTEE_MEMBER]: '/mobile/admin/dashboard',
      [UserRole.OWNER]: '/mobile/dashboard',
      [UserRole.TENANT]: '/mobile/dashboard',
      [UserRole.DOMESTIC_STAFF]: '/mobile/staff/dashboard'
    };

    const route = dashboards[role] || '/mobile/dashboard';
    this.router.navigate([route]);
  }

  private startScanAnimation(): void {
    this.scanProgress = 0;
    const interval = setInterval(() => {
      this.scanProgress += 2;
      if (this.scanProgress >= 100 || this.authState !== 'scanning') clearInterval(interval);
    }, 30);
  }

  switchUser(): void {
    this.biometricService.clearStoredUser();
    this.router.navigate(['/mobile/auth/login']);
  }

  goToEnrollment(): void {
    // Navigate to biometric setup with Face ID pre-selected
    this.router.navigate(['/mobile/auth/biometric-setup'], {
      queryParams: { type: 'face_id', userId: this.storedUser?.userId }
    });
  }

  goBack(): void { this.router.navigate(['/mobile/auth/login']); }
  toggleTheme(): void { this.isDarkMode = !this.isDarkMode; localStorage.setItem('darkMode', String(this.isDarkMode)); }
  getIdleMessage(): string { return !this.selectedType ? 'Select authentication method' : this.selectedType === 'face_id' ? 'Position your face in front of the camera' : 'Place your finger on the sensor'; }
  getScanningMessage(): string { return this.selectedType === 'face_id' ? 'Scanning face...' : 'Scanning fingerprint...'; }
  getButtonText(): string { 
    switch (this.authState) { 
      case 'scanning': return 'Verifying'; 
      case 'success': return 'Success!'; 
      case 'failed': return 'Try Again'; 
      case 'locked': return 'Locked'; 
      default: return 'Authenticate'; 
    } 
  }

  showMethodSelector(): boolean {
    return this.authState === 'idle' || this.authState === 'failed';
  }

  isMethodDisabled(type: 'fingerprint' | 'face_id'): boolean {
    if (this.authState === 'locked') return true;
    if (type === 'fingerprint') return !this.capabilities?.hasFingerprint;
    return !this.capabilities?.hasFaceId;
  }
}
