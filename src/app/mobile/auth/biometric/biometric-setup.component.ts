import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, switchMap } from 'rxjs';
import { 
  BiometricAuthService, 
  BiometricType, 
  BiometricCapabilities
} from './biometric-auth.service';
import { FaceCaptureService } from './face-capture.service';
import { MobileAuthService } from '../../services/mobile-auth.service';

type SetupStep = 'intro' | 'select' | 'enroll' | 'verify' | 'success';

@Component({
  selector: 'app-biometric-setup',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="setup-container" [class.embedded]="embedded">
      <!-- Animated Background -->
      <div class="mesh-bg" *ngIf="!embedded">
        <div class="mesh-gradient"></div>
        <div class="glow-orb orb-1"></div>
        <div class="glow-orb orb-2"></div>
      </div>

      <!-- Header (Standalone Mode) -->
      <header class="setup-header" *ngIf="!embedded">
        <button class="icon-btn" (click)="goBack()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 class="header-title">Biometric Setup</h1>
        <div class="header-spacer"></div>
      </header>

      <!-- Progress Stepper -->
      <div class="progress-stepper" *ngIf="currentStep !== 'intro'">
        <div class="stepper-track">
          <div class="stepper-fill" [style.width]="getProgressWidth()"></div>
        </div>
        <div class="stepper-steps">
          <div class="step-item" *ngFor="let step of stepLabels; let i = index"
               [class.active]="getStepIndex() >= i + 1" 
               [class.complete]="getStepIndex() > i + 1">
            <div class="step-circle">
              <svg *ngIf="getStepIndex() > i + 1" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <span *ngIf="getStepIndex() <= i + 1">{{ i + 1 }}</span>
            </div>
            <span class="step-label">{{ step }}</span>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <main class="setup-main">

        <!-- ========== STEP: INTRO ========== -->
        <section class="step-content intro-step" *ngIf="currentStep === 'intro'">
          <div class="intro-hero">
            <div class="hero-visual">
              <div class="visual-bg"></div>
              <div class="visual-ring ring-1"></div>
              <div class="visual-ring ring-2"></div>
              <svg class="hero-icon" width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.81,4.47C17.73,4.47 17.65,4.45 17.58,4.41C15.66,3.42 14,3 12,3C10.03,3 8.15,3.47 6.44,4.41C6.2,4.54 5.9,4.45 5.76,4.21C5.63,3.97 5.72,3.66 5.96,3.53C7.82,2.5 9.86,2 12,2C14.14,2 16,2.47 18.04,3.5C18.29,3.65 18.38,3.95 18.25,4.19C18.16,4.37 18,4.47 17.81,4.47M3.5,9.72C3.4,9.72 3.3,9.69 3.21,9.63C3,9.47 2.93,9.16 3.09,8.93C4.08,7.53 5.34,6.43 6.84,5.66C10,4.04 14,4.03 17.15,5.65C18.65,6.42 19.91,7.5 20.9,8.9C21.06,9.12 21,9.44 20.78,9.6C20.55,9.76 20.24,9.71 20.08,9.5C19.18,8.22 18.04,7.23 16.69,6.54C13.82,5.07 10.15,5.07 7.29,6.55C5.93,7.25 4.79,8.25 3.89,9.5C3.81,9.65 3.66,9.72 3.5,9.72M9.75,21.79C9.62,21.79 9.5,21.74 9.4,21.64C8.53,20.77 8.06,20.21 7.39,19C6.7,17.77 6.34,16.27 6.34,14.66C6.34,11.69 8.88,9.27 12,9.27C15.12,9.27 17.66,11.69 17.66,14.66A0.5,0.5 0 0,1 17.16,15.16A0.5,0.5 0 0,1 16.66,14.66C16.66,12.24 14.57,10.27 12,10.27C9.43,10.27 7.34,12.24 7.34,14.66C7.34,16.1 7.66,17.43 8.27,18.5C8.91,19.66 9.35,20.15 10.12,20.93C10.31,21.13 10.31,21.44 10.12,21.64C10,21.74 9.88,21.79 9.75,21.79Z"/>
              </svg>
              <div class="floating-badge badge-face">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9,11.75A1.25,1.25 0 0,0 7.75,13A1.25,1.25 0 0,0 9,14.25A1.25,1.25 0 0,0 10.25,13A1.25,1.25 0 0,0 9,11.75M15,11.75A1.25,1.25 0 0,0 13.75,13A1.25,1.25 0 0,0 15,14.25A1.25,1.25 0 0,0 16.25,13A1.25,1.25 0 0,0 15,11.75M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                </svg>
              </div>
              <div class="floating-badge badge-shield">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="intro-content">
            <h2>Secure Your Account</h2>
            <p>Enable biometric authentication for faster and more secure login. Your biometric data stays on your device and is never sent to our servers.</p>
          </div>

          <div class="feature-grid">
            <div class="feature-card">
              <div class="feature-icon speed">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
                </svg>
              </div>
              <div class="feature-text">
                <strong>Instant Access</strong>
                <span>Login in under a second</span>
              </div>
            </div>
            <div class="feature-card">
              <div class="feature-icon security">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                </svg>
              </div>
              <div class="feature-text">
                <strong>Bank-Level Security</strong>
                <span>Protected by encryption</span>
              </div>
            </div>
            <div class="feature-card">
              <div class="feature-icon privacy">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14zm-4.2-5.78v1.75l3.2-2.99L12.8 9v1.7c-3.11.43-4.35 2.56-4.8 4.7 1.11-1.5 2.58-2.18 4.8-2.18z"/>
                </svg>
              </div>
              <div class="feature-text">
                <strong>Device Secure</strong>
                <span>Data never leaves phone</span>
              </div>
            </div>
          </div>

          <div class="intro-actions">
            <button class="primary-btn" (click)="startSetup()">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.81,4.47C17.73,4.47 17.65,4.45 17.58,4.41C15.66,3.42 14,3 12,3C10.03,3 8.15,3.47 6.44,4.41C6.2,4.54 5.9,4.45 5.76,4.21C5.63,3.97 5.72,3.66 5.96,3.53C7.82,2.5 9.86,2 12,2C14.14,2 16,2.47 18.04,3.5C18.29,3.65 18.38,3.95 18.25,4.19C18.16,4.37 18,4.47 17.81,4.47Z"/>
              </svg>
              <span>Enable Biometrics</span>
            </button>
            <button class="ghost-btn" (click)="skipSetup()">Skip for Now</button>
          </div>
        </section>

        <!-- ========== STEP: SELECT ========== -->
        <section class="step-content select-step" *ngIf="currentStep === 'select'">
          <div class="step-header">
            <h2>Choose Method</h2>
            <p>Select your preferred biometric authentication</p>
          </div>

          <div class="method-cards">
            <button class="method-card" 
                    [class.selected]="selectedType === 'fingerprint'"
                    [class.disabled]="!capabilities?.hasFingerprint"
                    [disabled]="!capabilities?.hasFingerprint"
                    (click)="selectType('fingerprint')">
              <div class="card-visual fingerprint">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.81,4.47C17.73,4.47 17.65,4.45 17.58,4.41C15.66,3.42 14,3 12,3C10.03,3 8.15,3.47 6.44,4.41C6.2,4.54 5.9,4.45 5.76,4.21C5.63,3.97 5.72,3.66 5.96,3.53C7.82,2.5 9.86,2 12,2C14.14,2 16,2.47 18.04,3.5C18.29,3.65 18.38,3.95 18.25,4.19C18.16,4.37 18,4.47 17.81,4.47M3.5,9.72C3.4,9.72 3.3,9.69 3.21,9.63C3,9.47 2.93,9.16 3.09,8.93C4.08,7.53 5.34,6.43 6.84,5.66C10,4.04 14,4.03 17.15,5.65C18.65,6.42 19.91,7.5 20.9,8.9C21.06,9.12 21,9.44 20.78,9.6C20.55,9.76 20.24,9.71 20.08,9.5C19.18,8.22 18.04,7.23 16.69,6.54C13.82,5.07 10.15,5.07 7.29,6.55C5.93,7.25 4.79,8.25 3.89,9.5C3.81,9.65 3.66,9.72 3.5,9.72M9.75,21.79C9.62,21.79 9.5,21.74 9.4,21.64C8.53,20.77 8.06,20.21 7.39,19C6.7,17.77 6.34,16.27 6.34,14.66C6.34,11.69 8.88,9.27 12,9.27C15.12,9.27 17.66,11.69 17.66,14.66A0.5,0.5 0 0,1 17.16,15.16A0.5,0.5 0 0,1 16.66,14.66C16.66,12.24 14.57,10.27 12,10.27C9.43,10.27 7.34,12.24 7.34,14.66C7.34,16.1 7.66,17.43 8.27,18.5C8.91,19.66 9.35,20.15 10.12,20.93C10.31,21.13 10.31,21.44 10.12,21.64C10,21.74 9.88,21.79 9.75,21.79Z"/>
                </svg>
              </div>
              <div class="card-info">
                <h3>Fingerprint</h3>
                <p>Use your fingerprint sensor</p>
                <div class="availability-tag" [class.available]="capabilities?.hasFingerprint">
                  <span class="dot"></span>
                  <span>{{ capabilities?.hasFingerprint ? 'Available' : 'Not available' }}</span>
                </div>
              </div>
              <div class="card-check" *ngIf="selectedType === 'fingerprint'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
            </button>

            <button class="method-card"
                    [class.selected]="selectedType === 'face_id'"
                    [class.disabled]="!capabilities?.hasFaceId"
                    [disabled]="!capabilities?.hasFaceId"
                    (click)="selectType('face_id')">
              <div class="card-visual face-id">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9,11.75A1.25,1.25 0 0,0 7.75,13A1.25,1.25 0 0,0 9,14.25A1.25,1.25 0 0,0 10.25,13A1.25,1.25 0 0,0 9,11.75M15,11.75A1.25,1.25 0 0,0 13.75,13A1.25,1.25 0 0,0 15,14.25A1.25,1.25 0 0,0 16.25,13A1.25,1.25 0 0,0 15,11.75M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,17.23C10.25,17.23 8.71,16.5 7.81,15.42L9.23,14C9.68,14.72 10.75,15.23 12,15.23C13.25,15.23 14.32,14.72 14.77,14L16.19,15.42C15.29,16.5 13.75,17.23 12,17.23Z"/>
                </svg>
              </div>
              <div class="card-info">
                <h3>Face ID</h3>
                <p>Use facial recognition</p>
                <div class="availability-tag" [class.available]="capabilities?.hasFaceId">
                  <span class="dot"></span>
                  <span>{{ capabilities?.hasFaceId ? 'Available' : 'Not available' }}</span>
                </div>
              </div>
              <div class="card-check" *ngIf="selectedType === 'face_id'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
            </button>
          </div>

          <button class="primary-btn" [disabled]="!selectedType" (click)="proceedToEnroll()">
            <span>Continue</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
            </svg>
          </button>
        </section>

        <!-- ========== STEP: ENROLL ========== -->
        <section class="step-content enroll-step" *ngIf="currentStep === 'enroll'">
          <div class="step-header">
            <h2>{{ selectedType === 'face_id' ? 'Set Up Face ID' : 'Register Fingerprint' }}</h2>
            <p>{{ getEnrollInstructions() }}</p>
          </div>

          <div class="enroll-visual" [class.active]="isEnrolling">
            <!-- Fingerprint Visual -->
            <div class="sensor-animation fingerprint-sensor" *ngIf="selectedType === 'fingerprint'">
              <div class="sensor-outer">
                <div class="sensor-ring" [class.pulse]="isEnrolling"></div>
                <div class="sensor-inner">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.81,4.47C17.73,4.47 17.65,4.45 17.58,4.41C15.66,3.42 14,3 12,3C10.03,3 8.15,3.47 6.44,4.41C6.2,4.54 5.9,4.45 5.76,4.21C5.63,3.97 5.72,3.66 5.96,3.53C7.82,2.5 9.86,2 12,2C14.14,2 16,2.47 18.04,3.5C18.29,3.65 18.38,3.95 18.25,4.19C18.16,4.37 18,4.47 17.81,4.47M3.5,9.72C3.4,9.72 3.3,9.69 3.21,9.63C3,9.47 2.93,9.16 3.09,8.93C4.08,7.53 5.34,6.43 6.84,5.66C10,4.04 14,4.03 17.15,5.65C18.65,6.42 19.91,7.5 20.9,8.9C21.06,9.12 21,9.44 20.78,9.6C20.55,9.76 20.24,9.71 20.08,9.5C19.18,8.22 18.04,7.23 16.69,6.54C13.82,5.07 10.15,5.07 7.29,6.55C5.93,7.25 4.79,8.25 3.89,9.5C3.81,9.65 3.66,9.72 3.5,9.72Z"/>
                  </svg>
                </div>
                <div class="scan-wave" *ngIf="isEnrolling"></div>
              </div>
            </div>

            <!-- Face ID Visual -->
            <div class="sensor-animation face-sensor" *ngIf="selectedType === 'face_id'">
              <div class="face-frame" [class.scanning]="isEnrolling">
                <div class="corner tl"></div>
                <div class="corner tr"></div>
                <div class="corner bl"></div>
                <div class="corner br"></div>
                <svg width="72" height="72" viewBox="0 0 24 24" fill="currentColor" class="face-icon">
                  <path d="M9,11.75A1.25,1.25 0 0,0 7.75,13A1.25,1.25 0 0,0 9,14.25A1.25,1.25 0 0,0 10.25,13A1.25,1.25 0 0,0 9,11.75M15,11.75A1.25,1.25 0 0,0 13.75,13A1.25,1.25 0 0,0 15,14.25A1.25,1.25 0 0,0 16.25,13A1.25,1.25 0 0,0 15,11.75M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                </svg>
                <div class="scan-line" *ngIf="isEnrolling"></div>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="enroll-progress" *ngIf="isEnrolling">
              <div class="progress-track">
                <div class="progress-fill" [style.width.%]="enrollProgress"></div>
              </div>
              <span class="progress-text">{{ enrollProgress }}% complete</span>
            </div>
          </div>

          <div class="status-text" [class.error]="errorMessage">
            {{ errorMessage || getEnrollStatus() }}
          </div>

          <button class="primary-btn" 
                  [class.loading]="isEnrolling"
                  [disabled]="isEnrolling" 
                  (click)="startEnrollment()">
            <div class="btn-spinner" *ngIf="isEnrolling"></div>
            <svg *ngIf="!isEnrolling && selectedType === 'fingerprint'" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.81,4.47C17.73,4.47 17.65,4.45 17.58,4.41C15.66,3.42 14,3 12,3C10.03,3 8.15,3.47 6.44,4.41z"/>
            </svg>
            <svg *ngIf="!isEnrolling && selectedType === 'face_id'" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9,11.75A1.25,1.25 0 0,0 7.75,13A1.25,1.25 0 0,0 9,14.25z"/>
            </svg>
            <span>{{ isEnrolling ? 'Enrolling...' : 'Start Enrollment' }}</span>
          </button>
        </section>

        <!-- ========== STEP: VERIFY ========== -->
        <section class="step-content verify-step" *ngIf="currentStep === 'verify'">
          <div class="step-header">
            <h2>Verify Setup</h2>
            <p>Let's make sure everything works correctly</p>
          </div>

          <div class="verify-visual" [class.success]="verifySuccess" [class.scanning]="isVerifying">
            <div class="verify-circle">
              <svg *ngIf="!isVerifying && !verifySuccess" width="64" height="64" viewBox="0 0 24 24" fill="currentColor" class="verify-icon">
                <path *ngIf="selectedType === 'fingerprint'" d="M17.81,4.47C17.73,4.47 17.65,4.45 17.58,4.41C15.66,3.42 14,3 12,3C10.03,3 8.15,3.47 6.44,4.41z"/>
                <path *ngIf="selectedType === 'face_id'" d="M9,11.75A1.25,1.25 0 0,0 7.75,13A1.25,1.25 0 0,0 9,14.25z"/>
              </svg>
              <div class="verify-spinner" *ngIf="isVerifying"></div>
              <svg *ngIf="verifySuccess" width="64" height="64" viewBox="0 0 24 24" fill="currentColor" class="success-icon">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
          </div>

          <p class="verify-text">
            {{ isVerifying ? 'Verifying...' : (verifySuccess ? 'Verification successful!' : 'Authenticate to verify your setup') }}
          </p>

          <button class="primary-btn" *ngIf="!verifySuccess" [disabled]="isVerifying" (click)="verifySetup()">
            <span>Verify Now</span>
          </button>

          <button class="primary-btn" *ngIf="verifySuccess" (click)="completeSetup()">
            <span>Continue</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
            </svg>
          </button>
        </section>

        <!-- ========== STEP: SUCCESS ========== -->
        <section class="step-content success-step" *ngIf="currentStep === 'success'">
          <div class="success-visual">
            <div class="success-circle">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div class="confetti-container">
              <div class="confetti" *ngFor="let i of [1,2,3,4,5,6,7,8]" [attr.data-index]="i"></div>
            </div>
          </div>

          <div class="success-content">
            <h2>You're All Set! 🎉</h2>
            <p>Biometric authentication is now enabled. You can login securely using your {{ selectedType === 'face_id' ? 'Face ID' : 'fingerprint' }}.</p>
          </div>

          <button class="primary-btn" (click)="finish()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/>
            </svg>
            <span>Go to Login</span>
          </button>
        </section>
      </main>
    </div>
  `,
  styles: [`
    :host {
      --accent-start: #6366f1;
      --accent-mid: #8b5cf6;
      --accent-end: #a855f7;
      --success: #10b981;
      --danger: #ef4444;
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

    .setup-container {
      min-height: 100vh;
      background: var(--bg-base);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    .setup-container.embedded {
      min-height: auto;
      background: transparent;
    }

    .mesh-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
    }

    .mesh-gradient {
      position: absolute;
      inset: 0;
      background: 
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.2) 0%, transparent 50%),
        radial-gradient(ellipse 60% 40% at 100% 50%, rgba(168, 85, 247, 0.12) 0%, transparent 50%);
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
      background: linear-gradient(225deg, var(--accent-mid), var(--accent-end));
      bottom: 20%;
      left: -50px;
      opacity: 0.25;
      animation-delay: -10s;
    }

    @keyframes float {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(-20px, 20px) scale(1.05); }
    }

    .setup-header {
      display: flex;
      align-items: center;
      padding: 16px 20px;
      position: relative;
      z-index: 10;
      background: var(--bg-glass);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
    }

    .icon-btn {
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

    .icon-btn:active {
      transform: scale(0.95);
    }

    .header-title {
      flex: 1;
      text-align: center;
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .header-spacer { width: 44px; }

    .progress-stepper {
      padding: 24px 20px;
      position: relative;
      z-index: 10;
    }

    .stepper-track {
      height: 4px;
      background: var(--border);
      border-radius: 2px;
      margin-bottom: 16px;
      overflow: hidden;
    }

    .stepper-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent-start), var(--accent-end));
      border-radius: 2px;
      transition: width 0.4s ease;
    }

    .stepper-steps {
      display: flex;
      justify-content: space-between;
    }

    .step-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .step-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--bg-elevated);
      border: 2px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      transition: all 0.3s;
    }

    .step-item.active .step-circle {
      background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
      border-color: transparent;
      color: white;
    }

    .step-item.complete .step-circle {
      background: var(--success);
      border-color: transparent;
      color: white;
    }

    .step-label {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-muted);
      transition: color 0.3s;
    }

    .step-item.active .step-label {
      color: var(--accent-start);
    }

    .setup-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 20px;
      position: relative;
      z-index: 10;
    }

    .step-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .step-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .step-header h2 {
      font-size: 26px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 8px 0;
      letter-spacing: -0.02em;
    }

    .step-header p {
      font-size: 15px;
      color: var(--text-secondary);
      margin: 0;
    }

    /* Intro Step */
    .intro-hero {
      display: flex;
      justify-content: center;
      margin-bottom: 28px;
    }

    .hero-visual {
      position: relative;
      width: 180px;
      height: 180px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .visual-bg {
      position: absolute;
      inset: 20px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
      border-radius: 50%;
    }

    .visual-ring {
      position: absolute;
      border-radius: 50%;
      border: 2px solid;
      border-color: rgba(99, 102, 241, 0.2);
      animation: pulse-ring 3s ease-out infinite;
    }

    .ring-1 { inset: 10px; animation-delay: 0s; }
    .ring-2 { inset: 0; animation-delay: 1.5s; }

    @keyframes pulse-ring {
      0% { transform: scale(0.8); opacity: 1; }
      100% { transform: scale(1.2); opacity: 0; }
    }

    .hero-icon {
      fill: var(--accent-start);
      z-index: 1;
    }

    .floating-badge {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: var(--bg-elevated);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: float-badge 3s ease-in-out infinite;
    }

    .badge-face { top: 0; right: 10px; }
    .badge-face svg { fill: #ec4899; }
    .badge-shield { bottom: 10px; left: 0; animation-delay: 1.5s; }
    .badge-shield svg { fill: var(--success); }

    @keyframes float-badge {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    .intro-content {
      text-align: center;
      margin-bottom: 28px;
    }

    .intro-content h2 {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 12px 0;
    }

    .intro-content p {
      font-size: 15px;
      color: var(--text-secondary);
      line-height: 1.6;
      margin: 0;
    }

    .feature-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 32px;
    }

    .feature-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--bg-elevated);
      border-radius: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .feature-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .feature-icon.speed {
      background: rgba(99, 102, 241, 0.1);
    }
    .feature-icon.speed svg { fill: var(--accent-start); }

    .feature-icon.security {
      background: rgba(16, 185, 129, 0.1);
    }
    .feature-icon.security svg { fill: var(--success); }

    .feature-icon.privacy {
      background: rgba(236, 72, 153, 0.1);
    }
    .feature-icon.privacy svg { fill: #ec4899; }

    .feature-text {
      display: flex;
      flex-direction: column;
    }

    .feature-text strong {
      font-size: 15px;
      color: var(--text-primary);
      margin-bottom: 2px;
    }

    .feature-text span {
      font-size: 13px;
      color: var(--text-muted);
    }

    .intro-actions {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Buttons */
    .primary-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
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

    .primary-btn:active:not(:disabled) {
      transform: scale(0.98);
    }

    .primary-btn.loading {
      background: var(--bg-glass);
      color: var(--text-secondary);
      box-shadow: none;
    }

    .btn-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(0, 0, 0, 0.1);
      border-top-color: var(--accent-start);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .ghost-btn {
      width: 100%;
      padding: 16px 24px;
      background: transparent;
      color: var(--text-secondary);
      border: none;
      border-radius: 16px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
    }

    /* Select Step */
    .method-cards {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 32px;
    }

    .method-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: var(--bg-elevated);
      border: 2px solid var(--border);
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.25s;
      position: relative;
      text-align: left;
    }

    .method-card.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .method-card.selected {
      border-color: var(--accent-start);
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.03));
    }

    .method-card:active:not(.disabled) {
      transform: scale(0.98);
    }

    .card-visual {
      width: 72px;
      height: 72px;
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.25s;
    }

    .card-visual.fingerprint {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
    }
    .card-visual.fingerprint svg { fill: var(--accent-start); }

    .card-visual.face-id {
      background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(168, 85, 247, 0.1));
    }
    .card-visual.face-id svg { fill: #ec4899; }

    .method-card.selected .card-visual {
      background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
      box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
    }

    .method-card.selected .card-visual svg {
      fill: white;
    }

    .card-info {
      flex: 1;
    }

    .card-info h3 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 4px 0;
    }

    .card-info p {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0 0 8px 0;
    }

    .availability-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .availability-tag .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--text-muted);
    }

    .availability-tag.available .dot {
      background: var(--success);
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
    }

    .availability-tag.available {
      color: var(--success);
    }

    .card-check {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    /* Enroll Step */
    .enroll-visual {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 24px;
    }

    .sensor-animation {
      width: 200px;
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sensor-outer {
      position: relative;
      width: 160px;
      height: 160px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sensor-ring {
      position: absolute;
      inset: 0;
      border: 4px solid var(--border);
      border-radius: 50%;
      transition: all 0.3s;
    }

    .sensor-ring.pulse {
      border-color: var(--accent-start);
      animation: sensor-pulse 1.5s ease-out infinite;
    }

    @keyframes sensor-pulse {
      0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
      100% { box-shadow: 0 0 0 20px rgba(99, 102, 241, 0); }
    }

    .sensor-inner {
      width: 100px;
      height: 100px;
      background: var(--bg-glass);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
    }

    .sensor-inner svg {
      fill: var(--accent-start);
    }

    .scan-wave {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%);
      animation: wave-pulse 1s ease-out infinite;
    }

    @keyframes wave-pulse {
      0% { transform: scale(1); opacity: 1; }
      100% { transform: scale(1.3); opacity: 0; }
    }

    .face-frame {
      width: 160px;
      height: 200px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .face-frame .corner {
      position: absolute;
      width: 30px;
      height: 30px;
      border: 4px solid var(--border);
      transition: all 0.3s;
    }

    .face-frame.scanning .corner {
      border-color: var(--accent-start);
    }

    .corner.tl { top: 0; left: 0; border-right: none; border-bottom: none; border-radius: 8px 0 0 0; }
    .corner.tr { top: 0; right: 0; border-left: none; border-bottom: none; border-radius: 0 8px 0 0; }
    .corner.bl { bottom: 0; left: 0; border-right: none; border-top: none; border-radius: 0 0 0 8px; }
    .corner.br { bottom: 0; right: 0; border-left: none; border-top: none; border-radius: 0 0 8px 0; }

    .face-icon {
      fill: var(--text-muted);
      transition: fill 0.3s;
    }

    .face-frame.scanning .face-icon {
      fill: var(--accent-start);
    }

    .face-frame .scan-line {
      position: absolute;
      left: 20px;
      right: 20px;
      height: 3px;
      background: linear-gradient(90deg, transparent, var(--accent-start), transparent);
      animation: face-scan 2s ease-in-out infinite;
    }

    @keyframes face-scan {
      0%, 100% { top: 20px; }
      50% { top: calc(100% - 20px); }
    }

    .enroll-progress {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      margin-top: 24px;
      width: 200px;
    }

    .progress-track {
      width: 100%;
      height: 6px;
      background: var(--border);
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent-start), var(--accent-end));
      border-radius: 3px;
      transition: width 0.3s;
    }

    .progress-text {
      font-size: 14px;
      color: var(--text-secondary);
    }

    .status-text {
      text-align: center;
      font-size: 15px;
      color: var(--text-secondary);
      margin-bottom: 24px;
    }

    .status-text.error {
      color: var(--danger);
    }

    /* Verify Step */
    .verify-visual {
      display: flex;
      justify-content: center;
      margin-bottom: 28px;
    }

    .verify-circle {
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background: var(--bg-glass);
      border: 4px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
    }

    .verify-visual.scanning .verify-circle {
      border-color: var(--accent-start);
    }

    .verify-visual.success .verify-circle {
      background: rgba(16, 185, 129, 0.1);
      border-color: var(--success);
    }

    .verify-icon {
      fill: var(--text-muted);
    }

    .verify-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid var(--border);
      border-top-color: var(--accent-start);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .success-icon {
      fill: var(--success);
      animation: pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes pop-in {
      0% { transform: scale(0); }
      70% { transform: scale(1.15); }
      100% { transform: scale(1); }
    }

    .verify-text {
      text-align: center;
      font-size: 16px;
      color: var(--text-secondary);
      margin-bottom: 32px;
    }

    /* Success Step */
    .success-visual {
      display: flex;
      justify-content: center;
      position: relative;
      margin-bottom: 32px;
    }

    .success-circle {
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .success-circle svg {
      fill: var(--success);
      animation: success-bounce 0.6s ease-out;
    }

    @keyframes success-bounce {
      0% { transform: scale(0); }
      50% { transform: scale(1.2); }
      70% { transform: scale(0.9); }
      100% { transform: scale(1); }
    }

    .confetti-container {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .confetti {
      position: absolute;
      width: 10px;
      height: 10px;
      border-radius: 2px;
      animation: confetti-fall 1s ease-out forwards;
    }

    .confetti[data-index="1"] { left: 25%; top: 30%; background: #6366f1; animation-delay: 0s; }
    .confetti[data-index="2"] { left: 60%; top: 25%; background: #ec4899; animation-delay: 0.1s; }
    .confetti[data-index="3"] { left: 75%; top: 45%; background: #10b981; animation-delay: 0.2s; }
    .confetti[data-index="4"] { left: 15%; top: 55%; background: #f59e0b; animation-delay: 0.15s; }
    .confetti[data-index="5"] { left: 45%; top: 20%; background: #8b5cf6; animation-delay: 0.25s; }
    .confetti[data-index="6"] { left: 35%; top: 65%; background: #06b6d4; animation-delay: 0.05s; }
    .confetti[data-index="7"] { left: 80%; top: 35%; background: #f43f5e; animation-delay: 0.3s; }
    .confetti[data-index="8"] { left: 10%; top: 40%; background: #84cc16; animation-delay: 0.35s; }

    @keyframes confetti-fall {
      0% { transform: scale(0) rotate(0deg); opacity: 1; }
      100% { transform: scale(1) rotate(720deg) translateY(-30px); opacity: 0; }
    }

    .success-content {
      text-align: center;
      margin-bottom: 32px;
    }

    .success-content h2 {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 12px 0;
    }

    .success-content p {
      font-size: 15px;
      color: var(--text-secondary);
      line-height: 1.6;
      margin: 0;
    }
  `]
})
export class BiometricSetupComponent implements OnInit, OnDestroy {
  @Input() embedded = false;
  @Input() userId = '';
  @Output() setupComplete = new EventEmitter<boolean>();
  @Output() setupSkipped = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  private actualUserId: string = '';

  currentStep: SetupStep = 'intro';
  selectedType: BiometricType | null = null;
  capabilities: BiometricCapabilities | null = null;
  stepLabels = ['Select', 'Enroll', 'Verify', 'Done'];

  isEnrolling = false;
  enrollProgress = 0;
  errorMessage = '';

  isVerifying = false;
  verifySuccess = false;

  constructor(
    private biometricService: BiometricAuthService,
    private router: Router,
    private faceCapture: FaceCaptureService,
    private authService: MobileAuthService
  ) {}

  ngOnInit(): void {
    // Get actual user ID from auth service
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.id) {
      this.actualUserId = currentUser.id;
      console.log('Biometric Setup: Using user ID:', this.actualUserId);
    } else if (this.userId) {
      this.actualUserId = this.userId;
      console.log('Biometric Setup: Using input user ID:', this.actualUserId);
    } else {
      console.warn('Biometric Setup: No user ID found! Enrollment may fail.');
      // Try to get from localStorage as fallback
      const storedUser = localStorage.getItem('mobileUser');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          if (user && user.id) {
            this.actualUserId = user.id;
            console.log('Biometric Setup: Using stored user ID:', this.actualUserId);
          }
        } catch (e) {
          console.error('Biometric Setup: Failed to parse stored user', e);
        }
      }
    }
    
    this.loadCapabilities();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCapabilities(): void {
    this.biometricService.checkBiometricCapabilities()
      .pipe(takeUntil(this.destroy$))
      .subscribe(caps => {
        this.capabilities = caps;
        if (caps.preferredType !== 'none') {
          this.selectedType = caps.preferredType;
        }
      });
  }

  getStepIndex(): number {
    const steps: SetupStep[] = ['intro', 'select', 'enroll', 'verify', 'success'];
    return steps.indexOf(this.currentStep);
  }

  getProgressWidth(): string {
    const stepIndex = this.getStepIndex();
    if (stepIndex <= 1) return '0%';
    return ((stepIndex - 1) / 3 * 100) + '%';
  }

  startSetup(): void {
    this.currentStep = 'select';
  }

  skipSetup(): void {
    if (this.embedded) {
      this.setupSkipped.emit();
    } else {
      this.router.navigate(['/mobile/auth/login']);
    }
  }

  selectType(type: BiometricType): void {
    if (type === 'fingerprint' && !this.capabilities?.hasFingerprint) return;
    if (type === 'face_id' && !this.capabilities?.hasFaceId) return;
    this.selectedType = type;
  }

  proceedToEnroll(): void {
    if (!this.selectedType) return;
    this.currentStep = 'enroll';
  }

  getEnrollInstructions(): string {
    if (this.selectedType === 'face_id') {
      return 'Position your face within the frame and hold still';
    }
    return 'Place your finger on the sensor when prompted';
  }

  getEnrollStatus(): string {
    if (this.isEnrolling) {
      return 'Processing biometric data...';
    }
    return 'Tap the button below to start enrollment';
  }

  startEnrollment(): void {
    if (this.isEnrolling || !this.selectedType) return;

    this.isEnrolling = true;
    this.enrollProgress = 0;
    this.errorMessage = '';

    const progressInterval = setInterval(() => {
      this.enrollProgress += 5;
      if (this.enrollProgress >= 100) {
        clearInterval(progressInterval);
      }
    }, 100);

    // For face_id, capture face image first
    if (this.selectedType === 'face_id') {
      this.enrollFaceId(progressInterval);
    } else {
      // For fingerprint, use existing flow
      this.enrollFingerprint(progressInterval);
    }
  }

  /**
   * Enroll Face ID - captures face image and enrolls
   */
  private enrollFaceId(progressInterval: any): void {
    // Capture multiple face images for better accuracy
    this.faceCapture.captureMultipleFaceImages(3, { quality: 0.8, maxWidth: 640, maxHeight: 480 })
      .pipe(
        switchMap(faceImages => {
          // Validate all captured images
          const validImages = faceImages.filter(img => this.faceCapture.validateFaceImage(img));
          
          if (validImages.length === 0) {
            throw new Error('Failed to capture valid face images. Please try again.');
          }

          // Use first image for enrollment (or all images if API supports multiple)
          const imageToEnroll = validImages.length > 0 ? validImages[0] : faceImages[0];
          
          // Get user ID - use actualUserId if available, otherwise fallback
          const userIdToUse = this.actualUserId || this.userId;
          if (!userIdToUse) {
            throw new Error('User ID is required for enrollment. Please log in first.');
          }
          
          console.log('Biometric Setup: Starting Face ID enrollment for user:', userIdToUse);
          console.log('Biometric Setup: Face image captured, size:', imageToEnroll?.length || 0, 'chars');
          
          // Enroll with captured face image
          return this.biometricService.enrollBiometric(
            userIdToUse,
            'face_id',
            imageToEnroll
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (result) => {
          clearInterval(progressInterval);
          this.isEnrolling = false;
          console.log('Biometric Setup: Enrollment result:', result);
          if (result.success) {
            console.log('Biometric Setup: Enrollment successful!');
            this.currentStep = 'verify';
          } else {
            console.error('Biometric Setup: Enrollment failed:', result.message);
            this.errorMessage = result.message || 'Face enrollment failed';
          }
        },
        error: (error) => {
          clearInterval(progressInterval);
          this.isEnrolling = false;
          console.error('Biometric Setup: Enrollment error:', error);
          this.errorMessage = error.message || error.error?.message || 'Face enrollment failed. Please ensure good lighting and try again.';
        }
      });
  }

  /**
   * Enroll fingerprint
   */
  private enrollFingerprint(progressInterval: any): void {
    const userIdToUse = this.actualUserId || this.userId;
    if (!userIdToUse) {
      this.errorMessage = 'User ID is required for enrollment. Please log in first.';
      clearInterval(progressInterval);
      this.isEnrolling = false;
      return;
    }
    
    this.biometricService.enrollBiometric(userIdToUse, 'fingerprint')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          clearInterval(progressInterval);
          this.isEnrolling = false;
          if (result.success) {
            this.currentStep = 'verify';
          } else {
            this.errorMessage = result.message;
          }
        },
        error: (error) => {
          clearInterval(progressInterval);
          this.isEnrolling = false;
          this.errorMessage = error.message || 'Enrollment failed';
        }
      });
  }

  verifySetup(): void {
    if (this.isVerifying || !this.selectedType) return;

    this.isVerifying = true;
    this.errorMessage = '';

    // For face_id, capture face image first
    if (this.selectedType === 'face_id') {
      this.verifyFaceId();
    } else {
      // For fingerprint, use existing flow
      this.verifyFingerprint();
    }
  }

  /**
   * Verify Face ID - captures face image and verifies
   */
  private verifyFaceId(): void {
    this.faceCapture.captureFaceImage({ quality: 0.8, maxWidth: 640, maxHeight: 480 })
      .pipe(
        switchMap(faceImage => {
          // Validate captured image
          if (!this.faceCapture.validateFaceImage(faceImage)) {
            throw new Error('Invalid face image captured. Please try again.');
          }

          // Verify with captured face image
          return this.biometricService.authenticateWithBiometric('face_id', faceImage);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (result) => {
          this.isVerifying = false;
          this.verifySuccess = result.success;
          if (!result.success) {
            this.errorMessage = result.message || 'Face verification failed';
          }
        },
        error: (error) => {
          this.isVerifying = false;
          this.verifySuccess = false;
          this.errorMessage = error.message || 'Face verification failed. Please try again.';
        }
      });
  }

  /**
   * Verify fingerprint
   */
  private verifyFingerprint(): void {
    this.biometricService.authenticateWithBiometric('fingerprint')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.isVerifying = false;
          this.verifySuccess = result.success;
          if (!result.success) {
            this.errorMessage = result.message;
          }
        },
        error: () => {
          this.isVerifying = false;
          this.errorMessage = 'Verification failed';
        }
      });
  }

  completeSetup(): void {
    this.currentStep = 'success';
  }

  finish(): void {
    if (this.embedded) {
      this.setupComplete.emit(true);
    } else {
      this.router.navigate(['/mobile/auth/biometric']);
    }
  }

  goBack(): void {
    if (this.currentStep === 'intro') {
      this.router.navigate(['/mobile/auth/login']);
    } else if (this.currentStep === 'select') {
      this.currentStep = 'intro';
    } else if (this.currentStep === 'enroll') {
      this.currentStep = 'select';
    } else if (this.currentStep === 'verify') {
      this.currentStep = 'enroll';
    }
  }
}
