import { Component, OnInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SocialAuthService, SocialProvider, SocialLoginResult, SocialUser } from './social-auth.service';
import { MobileAuthService, UserRole } from '../../services/mobile-auth.service';

@Component({
  selector: 'app-social-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="social-login-container" [class.embedded]="embedded">
      <!-- Full Page View -->
      <ng-container *ngIf="!embedded">
        <!-- Animated Background -->
        <div class="mesh-bg">
          <div class="mesh-gradient"></div>
          <div class="glow-orb orb-1"></div>
          <div class="glow-orb orb-2"></div>
          <div class="glow-orb orb-3"></div>
        </div>

        <!-- Header -->
        <header class="social-header">
          <button class="back-btn" (click)="goBack()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="header-title">Continue with</h1>
          <div class="header-spacer"></div>
        </header>

        <!-- Main Content -->
        <main class="social-main">
          <div class="hero-section">
            <div class="hero-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <h2>Welcome to Society App</h2>
            <p>Sign in with your social account to continue</p>
          </div>

          <!-- Social Login Buttons -->
          <div class="social-buttons">
            <!-- Google -->
            <button class="social-btn google" 
                    [class.loading]="loadingProvider === 'google'"
                    [disabled]="!!loadingProvider"
                    (click)="loginWith('google')">
              <div class="btn-content">
                <div class="provider-icon google-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <span class="btn-text">Continue with Google</span>
              </div>
              <div class="btn-loader" *ngIf="loadingProvider === 'google'">
                <div class="spinner"></div>
              </div>
            </button>

            <!-- Apple -->
            <button class="social-btn apple"
                    [class.loading]="loadingProvider === 'apple'"
                    [disabled]="!!loadingProvider"
                    (click)="loginWith('apple')">
              <div class="btn-content">
                <div class="provider-icon apple-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                </div>
                <span class="btn-text">Continue with Apple</span>
              </div>
              <div class="btn-loader" *ngIf="loadingProvider === 'apple'">
                <div class="spinner"></div>
              </div>
            </button>

            <!-- Facebook -->
            <button class="social-btn facebook"
                    [class.loading]="loadingProvider === 'facebook'"
                    [disabled]="!!loadingProvider"
                    (click)="loginWith('facebook')">
              <div class="btn-content">
                <div class="provider-icon facebook-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span class="btn-text">Continue with Facebook</span>
              </div>
              <div class="btn-loader" *ngIf="loadingProvider === 'facebook'">
                <div class="spinner"></div>
              </div>
            </button>
          </div>

          <!-- Error Message -->
          <div class="error-banner" *ngIf="errorMessage">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>{{ errorMessage }}</span>
            <button class="dismiss-btn" (click)="errorMessage = ''">×</button>
          </div>

          <!-- Divider -->
          <div class="divider">
            <span>or</span>
          </div>

          <!-- Alternative Options -->
          <div class="alt-options">
            <button class="alt-btn" (click)="goToEmailLogin()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
              <span>Continue with Email</span>
            </button>
            <button class="alt-btn" (click)="goToPhoneLogin()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
              </svg>
              <span>Continue with Phone</span>
            </button>
          </div>
        </main>

        <!-- Footer -->
        <footer class="social-footer">
          <p class="terms-text">
            By continuing, you agree to our 
            <a href="#">Terms of Service</a> and 
            <a href="#">Privacy Policy</a>
          </p>
          <div class="security-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
            </svg>
            <span>Secure authentication</span>
          </div>
        </footer>
      </ng-container>

      <!-- Embedded Buttons View -->
      <ng-container *ngIf="embedded">
        <div class="embedded-social-buttons" [class.vertical]="layout === 'vertical'" [class.compact]="compact">
          <!-- Google -->
          <button class="embedded-btn google" 
                  [class.loading]="loadingProvider === 'google'"
                  [class.icon-only]="compact"
                  [disabled]="!!loadingProvider"
                  (click)="loginWith('google')">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span *ngIf="!compact">Google</span>
            <div class="mini-spinner" *ngIf="loadingProvider === 'google'"></div>
          </button>

          <!-- Apple -->
          <button class="embedded-btn apple"
                  [class.loading]="loadingProvider === 'apple'"
                  [class.icon-only]="compact"
                  [disabled]="!!loadingProvider"
                  (click)="loginWith('apple')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <span *ngIf="!compact">Apple</span>
            <div class="mini-spinner" *ngIf="loadingProvider === 'apple'"></div>
          </button>

          <!-- Facebook -->
          <button class="embedded-btn facebook"
                  [class.loading]="loadingProvider === 'facebook'"
                  [class.icon-only]="compact"
                  [disabled]="!!loadingProvider"
                  (click)="loginWith('facebook')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span *ngIf="!compact">Facebook</span>
            <div class="mini-spinner" *ngIf="loadingProvider === 'facebook'"></div>
          </button>
        </div>

        <!-- Error (Embedded) -->
        <div class="embedded-error" *ngIf="errorMessage">
          <span>{{ errorMessage }}</span>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    :host {
      --google-color: #4285F4;
      --google-hover: #3367D6;
      --apple-color: #000000;
      --apple-hover: #333333;
      --facebook-color: #1877F2;
      --facebook-hover: #166FE5;
      --accent-start: #6366f1;
      --accent-end: #a855f7;
      --success: #10b981;
      --danger: #ef4444;
      --bg-base: #fafbfc;
      --bg-elevated: #ffffff;
      --bg-glass: rgba(255, 255, 255, 0.9);
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-muted: #94a3b8;
      --border: rgba(0, 0, 0, 0.08);
      display: block;
      font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .social-login-container {
      min-height: 100vh;
      background: var(--bg-base);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    .social-login-container.embedded {
      min-height: auto;
      background: transparent;
    }

    /* Background */
    .mesh-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
    }

    .mesh-gradient {
      position: absolute;
      inset: 0;
      background: 
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
        radial-gradient(ellipse 60% 40% at 0% 50%, rgba(66, 133, 244, 0.1) 0%, transparent 50%),
        radial-gradient(ellipse 60% 40% at 100% 80%, rgba(24, 119, 242, 0.1) 0%, transparent 50%);
    }

    .glow-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      animation: float 20s ease-in-out infinite;
    }

    .orb-1 {
      width: 250px;
      height: 250px;
      background: var(--google-color);
      top: -50px;
      right: -50px;
      opacity: 0.2;
    }

    .orb-2 {
      width: 200px;
      height: 200px;
      background: var(--facebook-color);
      bottom: 30%;
      left: -50px;
      opacity: 0.15;
      animation-delay: -7s;
    }

    .orb-3 {
      width: 150px;
      height: 150px;
      background: var(--apple-color);
      bottom: 10%;
      right: 20%;
      opacity: 0.1;
      animation-delay: -14s;
    }

    @keyframes float {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(-15px, 15px) scale(1.05); }
    }

    /* Header */
    .social-header {
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

    /* Main */
    .social-main {
      flex: 1;
      padding: 32px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      z-index: 10;
    }

    /* Hero Section */
    .hero-section {
      text-align: center;
      margin-bottom: 40px;
    }

    .hero-icon {
      width: 100px;
      height: 100px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
      border-radius: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }

    .hero-icon svg { fill: var(--accent-start); }

    .hero-section h2 {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 8px;
    }

    .hero-section p {
      font-size: 15px;
      color: var(--text-secondary);
      margin: 0;
    }

    /* Social Buttons */
    .social-buttons {
      width: 100%;
      max-width: 360px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .social-btn {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 16px 24px;
      border: none;
      border-radius: 14px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s;
      overflow: hidden;
    }

    .social-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .social-btn.loading .btn-content {
      opacity: 0;
    }

    .btn-content {
      display: flex;
      align-items: center;
      gap: 12px;
      transition: opacity 0.2s;
    }

    .provider-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
    }

    .btn-loader {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Google Button */
    .social-btn.google {
      background: var(--bg-elevated);
      color: var(--text-primary);
      border: 2px solid var(--border);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    .social-btn.google:hover:not(:disabled) {
      border-color: var(--google-color);
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.2);
    }

    .social-btn.google:active:not(:disabled) {
      transform: scale(0.98);
    }

    .social-btn.google .spinner {
      border-color: rgba(66, 133, 244, 0.3);
      border-top-color: var(--google-color);
    }

    /* Apple Button */
    .social-btn.apple {
      background: var(--apple-color);
      color: white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .social-btn.apple:hover:not(:disabled) {
      background: var(--apple-hover);
    }

    .social-btn.apple:active:not(:disabled) {
      transform: scale(0.98);
    }

    .apple-icon svg { fill: white; }

    /* Facebook Button */
    .social-btn.facebook {
      background: var(--facebook-color);
      color: white;
      box-shadow: 0 4px 12px rgba(24, 119, 242, 0.3);
    }

    .social-btn.facebook:hover:not(:disabled) {
      background: var(--facebook-hover);
    }

    .social-btn.facebook:active:not(:disabled) {
      transform: scale(0.98);
    }

    .facebook-icon svg { fill: white; }

    /* Error Banner */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      max-width: 360px;
      padding: 14px 16px;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 12px;
      margin-top: 20px;
    }

    .error-banner svg { fill: var(--danger); flex-shrink: 0; }
    .error-banner span { flex: 1; font-size: 14px; color: var(--danger); }
    
    .dismiss-btn {
      background: none;
      border: none;
      color: var(--danger);
      font-size: 20px;
      cursor: pointer;
      padding: 0 4px;
    }

    /* Divider */
    .divider {
      display: flex;
      align-items: center;
      width: 100%;
      max-width: 360px;
      margin: 32px 0;
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border);
    }

    .divider span {
      padding: 0 16px;
      font-size: 13px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Alternative Options */
    .alt-options {
      width: 100%;
      max-width: 360px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .alt-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 14px 20px;
      background: transparent;
      border: 2px solid var(--border);
      border-radius: 12px;
      font-size: 15px;
      font-weight: 500;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .alt-btn svg { fill: var(--text-muted); }

    .alt-btn:hover {
      border-color: var(--accent-start);
      color: var(--accent-start);
    }

    .alt-btn:hover svg { fill: var(--accent-start); }

    .alt-btn:active { transform: scale(0.98); }

    /* Footer */
    .social-footer {
      padding: 20px 24px;
      text-align: center;
      position: relative;
      z-index: 10;
    }

    .terms-text {
      font-size: 12px;
      color: var(--text-muted);
      margin: 0 0 12px;
      line-height: 1.5;
    }

    .terms-text a {
      color: var(--accent-start);
      text-decoration: none;
    }

    .security-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .security-badge svg { fill: var(--success); }

    /* Embedded Styles */
    .embedded-social-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .embedded-social-buttons.vertical {
      flex-direction: column;
    }

    .embedded-social-buttons.compact {
      gap: 8px;
    }

    .embedded-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 20px;
      border: 2px solid var(--border);
      border-radius: 12px;
      background: var(--bg-elevated);
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }

    .embedded-btn.icon-only {
      padding: 14px;
      min-width: 52px;
    }

    .embedded-btn.icon-only span { display: none; }

    .embedded-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .embedded-btn.loading {
      color: transparent;
    }

    .mini-spinner {
      position: absolute;
      width: 18px;
      height: 18px;
      border: 2px solid rgba(0, 0, 0, 0.1);
      border-top-color: var(--accent-start);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .embedded-btn.google:hover:not(:disabled) {
      border-color: var(--google-color);
      background: rgba(66, 133, 244, 0.05);
    }

    .embedded-btn.apple {
      background: var(--apple-color);
      color: white;
      border-color: var(--apple-color);
    }

    .embedded-btn.apple svg { fill: white; }

    .embedded-btn.apple .mini-spinner {
      border-color: rgba(255, 255, 255, 0.3);
      border-top-color: white;
    }

    .embedded-btn.facebook:hover:not(:disabled) {
      border-color: var(--facebook-color);
      background: rgba(24, 119, 242, 0.05);
    }

    .embedded-error {
      margin-top: 12px;
      padding: 10px 14px;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 8px;
      text-align: center;
    }

    .embedded-error span {
      font-size: 13px;
      color: var(--danger);
    }

    /* Responsive */
    @media (max-width: 380px) {
      .social-main { padding: 24px 16px; }
      .social-buttons { gap: 12px; }
      .social-btn { padding: 14px 20px; font-size: 15px; }
    }
  `]
})
export class SocialLoginComponent implements OnInit, OnDestroy {
  // Inputs for embedded mode
  @Input() embedded = false;
  @Input() layout: 'horizontal' | 'vertical' = 'horizontal';
  @Input() compact = false;

  // Outputs
  @Output() loginSuccess = new EventEmitter<SocialLoginResult>();
  @Output() loginError = new EventEmitter<string>();

  private destroy$ = new Subject<void>();

  loadingProvider: SocialProvider | null = null;
  errorMessage = '';

  constructor(
    private socialAuthService: SocialAuthService,
    private mobileAuthService: MobileAuthService,
    private router: Router
  ) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loginWith(provider: SocialProvider): void {
    if (this.loadingProvider) return;

    this.loadingProvider = provider;
    this.errorMessage = '';

    this.socialAuthService.loginWithProvider(provider)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.loadingProvider = null;

          if (result.success && result.user) {
            console.log('✅ Social login successful:', result.user.email);
            
            // Use the access token or ID token from the social user
            // Prefer ID token if available, otherwise use access token
            const socialToken = result.user.idToken || result.user.accessToken;
            
            if (!socialToken) {
              this.loadingProvider = null;
              this.errorMessage = 'No authentication token received from social provider';
              this.loginError.emit(this.errorMessage);
              return;
            }
            
            // Use the new socialLogin method with token
            this.mobileAuthService.socialLogin(
              provider,
              socialToken
            ).pipe(takeUntil(this.destroy$)).subscribe({
              next: (mobileUser) => {
                this.loadingProvider = null;
                this.loginSuccess.emit(result);
                
                if (!this.embedded) {
                  if (result.isNewUser) {
                    // Navigate to complete profile
                    this.router.navigate(['/mobile/auth/register'], {
                      queryParams: { 
                        social: provider,
                        email: result.user?.email,
                        name: result.user?.name
                      }
                    });
                  } else {
                    // Navigate to appropriate dashboard based on user role
                    this.navigateToDashboard(mobileUser.role);
                  }
                }
              },
              error: (error) => {
                this.loadingProvider = null;
                this.errorMessage = error.message || 'Social login failed';
                this.loginError.emit(this.errorMessage);
              }
            });
          } else {
            this.loadingProvider = null;
            this.errorMessage = result.error || 'Authentication failed';
            this.loginError.emit(this.errorMessage);
          }
        },
        error: (error) => {
          this.loadingProvider = null;
          this.errorMessage = error.message || 'Authentication failed';
          this.loginError.emit(this.errorMessage);
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/mobile/auth/login']);
  }

  goToEmailLogin(): void {
    this.router.navigate(['/mobile/auth/login']);
  }

  goToPhoneLogin(): void {
    this.router.navigate(['/mobile/auth/otp-login']);
  }

  /**
   * Navigate to appropriate dashboard based on user role
   */
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
}
