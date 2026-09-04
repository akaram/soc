import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AppLogoComponent } from '../../core/components/app-logo.component';
import { BRANDING } from '../../core/constants/branding.constants';

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  societyId: string;
  societyName: string;
  sessionToken: string;
  refreshToken: string;
  expiresIn: number;
  profilePhoto?: string;
  biometricEnabled: boolean;
}

/** Dev bootstrap credentials (application-dev.yml); kept in TS to avoid @ in template. */
const DEV_LOGIN_EMAIL = 'devlogin@local.test';
const DEV_LOGIN_PASSWORD = 'DevLogin123!';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, AppLogoComponent],
  template: `
    <div class="admin-login-container">
      <!-- Left Side - Branding & Info -->
      <div class="login-left">
        <div class="brand-section">
          <div class="logo">
            <app-logo size="xl" [onDark]="true"></app-logo>
          </div>
          <h1>{{ appName }}</h1>
          <p class="tagline">Professional Admin Portal</p>
        </div>

        <div class="features-list">
          <div class="feature-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <div>
              <h3>Secure Access</h3>
              <p>Enterprise-grade security</p>
            </div>
          </div>
          <div class="feature-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <div>
              <h3>User Management</h3>
              <p>Complete control over residents</p>
            </div>
          </div>
          <div class="feature-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <div>
              <h3>Gate Security</h3>
              <p>Advanced access control</p>
            </div>
          </div>
        </div>

        <div class="footer-info">
          <p>© 2026 {{ companyName }}</p>
          <p class="version">Version 2.0.0</p>
        </div>
      </div>

      <!-- Right Side - Login Form -->
      <div class="login-right">
        <div class="login-card">
          <div class="card-header">
            <h2>Welcome Back</h2>
            <p>Sign in to your admin account</p>
          </div>

          <!-- Error Message -->
          <div class="error-alert" *ngIf="errorMessage">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{{ errorMessage }}</span>
          </div>

          <div class="success-alert" *ngIf="successMessage">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>{{ successMessage }}</span>
          </div>

          <ng-container *ngIf="!forgotMode">
          <!-- Login Form -->
          <form (ngSubmit)="login()" class="login-form">
            <div class="form-group">
              <label for="email">Email Address</label>
              <div class="input-wrapper">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <input 
                  type="email" 
                  id="email"
                  [(ngModel)]="credentials.email"
                  name="email"
                  placeholder="admin@example.com"
                  required
                  [disabled]="isLoading"
                  (keyup.enter)="login()">
              </div>
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <div class="input-wrapper">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <input 
                  [type]="showPassword ? 'text' : 'password'"
                  id="password"
                  [(ngModel)]="credentials.password"
                  name="password"
                  placeholder="Enter your password"
                  required
                  [disabled]="isLoading"
                  (keyup.enter)="login()">
                <button 
                  type="button"
                  class="toggle-password"
                  (click)="showPassword = !showPassword"
                  [disabled]="isLoading">
                  <svg *ngIf="!showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <svg *ngIf="showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                </button>
              </div>
            </div>

            <div class="form-options">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  [(ngModel)]="rememberMe"
                  name="rememberMe"
                  [disabled]="isLoading">
                <span>Remember me</span>
              </label>
              <a class="forgot-link" href="#" (click)="$event.preventDefault(); startForgotPassword()">Forgot password?</a>
            </div>

            <button 
              type="submit"
              class="btn-login"
              [disabled]="isLoading || !isFormValid()">
              <span *ngIf="!isLoading">Sign In</span>
              <span *ngIf="isLoading" class="loading-text">
                <svg class="spinner" width="20" height="20" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" stroke-dasharray="32" stroke-dashoffset="32">
                    <animate attributeName="stroke-dasharray" dur="2s" values="0 32;16 16;0 32;0 32" repeatCount="indefinite"/>
                    <animate attributeName="stroke-dashoffset" dur="2s" values="0;-16;-32;-32" repeatCount="indefinite"/>
                  </circle>
                </svg>
                Signing in...
              </span>
            </button>
          </form>

          <p class="dev-login-hint" *ngIf="!environment.production">
            Local dev: start backend on port <strong>9999</strong> with Spring profile
            <code>dev</code>. Login: <strong>{{ devLoginEmail }}</strong> / <strong>{{ devLoginPassword }}</strong>
          </p>

          <!-- Divider -->
          <div class="divider">
            <span>or</span>
          </div>

          <!-- Alternative Login Options -->
          <div class="alt-login-options">
            <button class="btn-alt" (click)="navigateToMobileLogin()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
              </svg>
              <span>Mobile Login</span>
            </button>
          </div>
          </ng-container>

          <!-- Forgot password: request OTP then set new password (admin / super_admin only on server) -->
          <div *ngIf="forgotMode" class="forgot-panel">
            <h3 class="forgot-title">Reset admin password</h3>
            <p class="forgot-hint">Enter your admin email. You will receive a verification code, then choose a new password.</p>

            <div *ngIf="forgotStep === 1" class="login-form">
              <div class="form-group">
                <label for="reset-email">Email</label>
                <div class="input-wrapper">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  <input type="email" id="reset-email" name="resetEmail" [(ngModel)]="resetEmail"
                    placeholder="admin@example.com" [disabled]="isLoading" />
                </div>
              </div>
              <button type="button" class="btn-login" [disabled]="isLoading || !resetEmail.trim()"
                (click)="requestAdminResetCode()">
                <span *ngIf="!isLoading">Send reset code</span>
                <span *ngIf="isLoading" class="loading-text">Sending…</span>
              </button>
            </div>

            <div *ngIf="forgotStep === 2" class="login-form">
              <p class="forgot-info">{{ forgotInfoMessage }}</p>
              <div class="form-group">
                <label for="reset-otp">Verification code</label>
                <div class="input-wrapper">
                  <input type="text" id="reset-otp" name="resetOtp" [(ngModel)]="resetOtp" inputmode="numeric" autocomplete="one-time-code"
                    placeholder="6-digit code" maxlength="10" [disabled]="isLoading" />
                </div>
              </div>
              <div class="form-group">
                <label for="reset-new">New password</label>
                <div class="input-wrapper">
                  <input [type]="showResetPassword ? 'text' : 'password'" id="reset-new" name="resetNew" [(ngModel)]="resetNewPassword"
                    placeholder="New password" [disabled]="isLoading" />
                  <button type="button" class="toggle-password" (click)="showResetPassword = !showResetPassword" [disabled]="isLoading">
                    <span class="sr-only">Toggle visibility</span>
                    <svg *ngIf="!showResetPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <svg *ngIf="showResetPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label for="reset-confirm">Confirm password</label>
                <div class="input-wrapper">
                  <input [type]="showResetPassword ? 'text' : 'password'" id="reset-confirm" name="resetConfirm" [(ngModel)]="resetConfirmPassword"
                    placeholder="Confirm password" [disabled]="isLoading" />
                </div>
              </div>
              <button type="button" class="btn-login" [disabled]="isLoading || !canSubmitPasswordReset()"
                (click)="submitAdminPasswordReset()">
                <span *ngIf="!isLoading">Update password</span>
                <span *ngIf="isLoading" class="loading-text">Updating…</span>
              </button>
            </div>

            <button type="button" class="btn-alt back-signin" (click)="exitForgotPassword()" [disabled]="isLoading">
              ← Back to sign in
            </button>
          </div>

          <!-- Help Section -->
          <div class="help-section">
            <p>Need help? <a (click)="contactSupport()">Contact Support</a></p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-login-container {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1fr 1fr;
      background: #f8fafc;
    }

    /* Left Side - Branding */
    .login-left {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 60px 50px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }

    .login-left::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      animation: pulse 20s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }

    .brand-section {
      position: relative;
      z-index: 1;
    }

    .logo {
      margin-bottom: 30px;
    }

    .logo app-logo {
      display: block;
    }

    .brand-section h1 {
      font-size: 42px;
      font-weight: 700;
      margin: 0 0 10px 0;
      letter-spacing: -1px;
    }

    .tagline {
      font-size: 18px;
      opacity: 0.9;
      margin: 0;
    }

    .features-list {
      position: relative;
      z-index: 1;
      margin-top: 60px;
    }

    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 20px;
      margin-bottom: 30px;
    }

    .feature-item svg {
      flex-shrink: 0;
      margin-top: 4px;
    }

    .feature-item h3 {
      margin: 0 0 5px 0;
      font-size: 18px;
      font-weight: 600;
    }

    .feature-item p {
      margin: 0;
      opacity: 0.8;
      font-size: 14px;
    }

    .footer-info {
      position: relative;
      z-index: 1;
      margin-top: auto;
      padding-top: 40px;
    }

    .footer-info p {
      margin: 5px 0;
      opacity: 0.8;
      font-size: 14px;
    }

    .version {
      font-size: 12px;
      opacity: 0.6;
    }

    /* Right Side - Login Form */
    .login-right {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      background: #ffffff;
    }

    .login-card {
      width: 100%;
      max-width: 440px;
    }

    .card-header {
      text-align: center;
      margin-bottom: 40px;
    }

    .card-header h2 {
      font-size: 32px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 8px 0;
    }

    .card-header p {
      font-size: 16px;
      color: #64748b;
      margin: 0;
    }

    .error-alert {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 10px;
      color: #dc2626;
      margin-bottom: 24px;
      font-size: 14px;
    }

    .error-alert svg {
      flex-shrink: 0;
    }

    .success-alert {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 10px;
      color: #047857;
      margin-bottom: 24px;
      font-size: 14px;
    }

    .success-alert svg {
      flex-shrink: 0;
    }

    .forgot-panel {
      margin-bottom: 24px;
    }

    .forgot-title {
      margin: 0 0 8px 0;
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
    }

    .forgot-hint,
    .forgot-info {
      font-size: 14px;
      color: #64748b;
      margin: 0 0 20px 0;
      line-height: 1.5;
    }

    .back-signin {
      margin-top: 16px;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .login-form {
      margin-bottom: 24px;
    }

    .form-group {
      margin-bottom: 24px;
    }

    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 0 16px;
      transition: all 0.2s;
    }

    .input-wrapper:focus-within {
      border-color: #667eea;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .input-wrapper svg {
      color: #94a3b8;
      margin-right: 12px;
      flex-shrink: 0;
    }

    .input-wrapper:focus-within svg {
      color: #667eea;
    }

    .input-wrapper input {
      flex: 1;
      border: none;
      background: none;
      padding: 16px 0;
      font-size: 15px;
      color: #1e293b;
      outline: none;
    }

    .input-wrapper input::placeholder {
      color: #94a3b8;
    }

    .input-wrapper input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .toggle-password {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 8px;
      margin-left: 8px;
      display: flex;
      align-items: center;
      transition: color 0.2s;
    }

    .toggle-password:hover:not(:disabled) {
      color: #667eea;
    }

    .toggle-password:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #64748b;
      cursor: pointer;
    }

    .checkbox-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: #667eea;
    }

    .forgot-link {
      font-size: 14px;
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
      cursor: pointer;
      transition: color 0.2s;
    }

    .forgot-link:hover {
      color: #5568d3;
      text-decoration: underline;
    }

    .btn-login {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    .btn-login:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
    }

    .btn-login:active:not(:disabled) {
      transform: translateY(0);
    }

    .dev-login-hint {
      margin: 12px 0 0;
      padding: 10px 12px;
      font-size: 12px;
      line-height: 1.5;
      color: #64748b;
      background: #f1f5f9;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .dev-login-hint code {
      font-size: 11px;
      background: #e2e8f0;
      padding: 1px 4px;
      border-radius: 4px;
    }

    .btn-login:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .loading-text {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .divider {
      display: flex;
      align-items: center;
      margin: 28px 0;
      color: #94a3b8;
      font-size: 14px;
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e2e8f0;
    }

    .divider span {
      padding: 0 16px;
    }

    .alt-login-options {
      margin-bottom: 24px;
    }

    .btn-alt {
      width: 100%;
      padding: 14px;
      background: #ffffff;
      color: #667eea;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    .btn-alt:hover {
      border-color: #667eea;
      background: #f8fafc;
    }

    .btn-alt svg {
      color: #667eea;
    }

    .help-section {
      text-align: center;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
    }

    .help-section p {
      margin: 0;
      font-size: 14px;
      color: #64748b;
    }

    .help-section a {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
      cursor: pointer;
    }

    .help-section a:hover {
      text-decoration: underline;
    }

    /* Responsive */
    @media (max-width: 968px) {
      .admin-login-container {
        grid-template-columns: 1fr;
      }

      .login-left {
        display: none;
      }

      .login-right {
        padding: 20px;
      }
    }

    @media (max-width: 480px) {
      .login-card {
        max-width: 100%;
      }

      .card-header h2 {
        font-size: 28px;
      }
    }
  `]
})
export class AdminLoginComponent {
  /** Exposed for dev-only login hint in template. */
  readonly environment = environment;
  readonly devLoginEmail = DEV_LOGIN_EMAIL;
  readonly devLoginPassword = DEV_LOGIN_PASSWORD;
  readonly appName = BRANDING.appName;
  readonly companyName = BRANDING.companyName;

  credentials: LoginCredentials = {
    email: '',
    password: ''
  };

  showPassword = false;
  /** Toggle for new-password fields on the reset flow. */
  showResetPassword = false;
  rememberMe = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  /** In-place forgot-password flow (server limits to admin roles). */
  forgotMode = false;
  forgotStep: 1 | 2 = 1;
  resetEmail = '';
  resetOtp = '';
  resetNewPassword = '';
  resetConfirmPassword = '';
  forgotInfoMessage = '';

  private returnUrl: string = '/admin/dashboard';

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Pre-fill dev bootstrap user (must match application-dev.yml exactly, including !).
    if (!environment.production) {
      this.credentials.email = DEV_LOGIN_EMAIL;
      this.credentials.password = DEV_LOGIN_PASSWORD;
    }

    // Get return URL from route parameters or default to dashboard
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || '/admin/dashboard';
    });
  }

  isFormValid(): boolean {
    return !!(this.credentials.email && this.credentials.password);
  }

  /** Roles allowed to use the desktop admin SPA (all staff roles except guards/residents). */
  private isAdminPortalRole(role: string | undefined | null): boolean {
    if (!role || !role.trim()) {
      return false;
    }
    const normalized = role.trim().toUpperCase();
    if (normalized === 'RESIDENT') {
      return false;
    }
    // Guards use the mobile guard app
    if (normalized === 'SECURITY_GUARD' || normalized === 'GUARD' || normalized === 'SECURITY_STAFF') {
      return false;
    }
    return true;
  }

  login(): void {
    if (!this.isFormValid()) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const loginRequest = {
      email: (this.credentials.email || '').trim(),
      password: this.credentials.password
    };

    // Use relative URL so nginx same-origin proxy avoids CORS and interceptors can attach headers consistently.
    this.http.post<LoginResponse>('/auth/login', loginRequest)
      .subscribe({
        next: (response) => {
          this.isLoading = false;

          // Clear stale ADMIN tokens only — keep mobileAuthToken so the mobile tab still works.
          sessionStorage.removeItem('authToken');
          sessionStorage.removeItem('adminAuthToken');
          localStorage.removeItem('adminAuthToken');
          if (this.rememberMe) {
            localStorage.removeItem('authToken');
          }
          localStorage.removeItem('societyId');
          sessionStorage.removeItem('societyId');

          // Store session
          if (this.rememberMe) {
            localStorage.setItem('adminSession', JSON.stringify(response));
            sessionStorage.removeItem('adminSession');
          } else {
            sessionStorage.setItem('adminSession', JSON.stringify(response));
            localStorage.removeItem('adminSession');
          }

          // Persist token/society in the same storage as the session.
          const store = this.rememberMe ? localStorage : sessionStorage;
          store.setItem('authToken', response.sessionToken);
          store.setItem('adminAuthToken', response.sessionToken);
          if (response.societyId) {
            store.setItem('societyId', response.societyId);
          }
          // Keep adminUser in the same storage as authToken (guard checks both).
          store.setItem(
            'adminUser',
            JSON.stringify({
              id: response.userId,
              name: response.name,
              email: response.email,
              role: response.role,
              societyId: response.societyId,
              societyName: response.societyName,
              phone: response.phone
            })
          );
          if (this.rememberMe) {
            sessionStorage.removeItem('adminUser');
          } else {
            localStorage.removeItem('adminUser');
          }

          // Web admin: allow staff roles except guards (guards use mobile app).
          if (this.isAdminPortalRole(response.role)) {
            this.router.navigate([this.returnUrl]);
          } else {
            const roleUpper = (response.role || '').trim().toUpperCase();
            this.errorMessage =
              roleUpper === 'SECURITY_GUARD' || roleUpper === 'GUARD' || roleUpper === 'SECURITY_STAFF'
                ? 'Security guards must sign in via the mobile app at /mobile/auth/login (not the admin portal).'
                : 'Access denied. Your account role is RESIDENT — the admin portal requires STAFF, ADMIN, or committee roles. ' +
                  'For testing, sign in with devlogin@local.test / DevLogin123! (backend: spring.profiles.active=dev, or set APP_BOOTSTRAP_DEV_LOGIN_ENABLED=true on the VM). ' +
                  'To use your own email, update users.user_role in the database (e.g. STAFF or SUPER_ADMIN).';
          }
        },
        error: (error) => {
          this.isLoading = false;
          // Backend returns 400 + { message } for bad password (GlobalExceptionHandler).
          const msg =
            error.error?.message ||
            (typeof error.error === 'string' ? error.error : null) ||
            (error.status === 0 ? 'Network error — check URL, nginx proxy, and that the API is running.' : null);
          this.errorMessage = msg || 'Invalid credentials. Please try again.';
        }
      });
  }

  /** Open forgot-password panel, seeded with the email field when present. */
  startForgotPassword(): void {
    this.forgotMode = true;
    this.forgotStep = 1;
    this.errorMessage = '';
    this.successMessage = '';
    this.forgotInfoMessage = '';
    this.resetOtp = '';
    this.resetNewPassword = '';
    this.resetConfirmPassword = '';
    this.resetEmail = (this.credentials.email || '').trim();
  }

  exitForgotPassword(): void {
    this.forgotMode = false;
    this.forgotStep = 1;
    this.isLoading = false;
    this.forgotInfoMessage = '';
  }

  /** Step 1: request PASSWORD_RESET OTP for an admin account (generic message if not eligible). */
  requestAdminResetCode(): void {
    const email = (this.resetEmail || '').trim();
    if (!email) {
      this.errorMessage = 'Please enter your email';
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    this.http
      .post<{ message: string }>('/auth/admin/forgot-password', { email })
      .subscribe({
        next: (body) => {
          this.isLoading = false;
          this.forgotStep = 2;
          this.forgotInfoMessage = body.message || 'Continue with your verification code.';
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Could not start reset. Try again.';
        }
      });
  }

  canSubmitPasswordReset(): boolean {
    return !!(
      this.resetOtp?.trim() &&
      this.resetNewPassword &&
      this.resetNewPassword === this.resetConfirmPassword
    );
  }

  /** Step 2: verify OTP and persist new password hash. */
  submitAdminPasswordReset(): void {
    if (!this.canSubmitPasswordReset()) {
      this.errorMessage = 'Enter the code and matching new passwords.';
      return;
    }
    const email = (this.resetEmail || '').trim();
    const payload = {
      email,
      otpCode: this.resetOtp.trim(),
      newPassword: this.resetNewPassword,
      confirmPassword: this.resetConfirmPassword
    };
    this.isLoading = true;
    this.errorMessage = '';
    this.http
      .post<{ message: string }>('/auth/admin/reset-password', payload)
      .subscribe({
        next: (body) => {
          this.isLoading = false;
          this.exitForgotPassword();
          this.successMessage = body.message || 'Password updated. You can sign in now.';
          this.credentials.password = '';
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Reset failed. Check the code and try again.';
        }
      });
  }

  navigateToMobileLogin(): void {
    this.router.navigate(['/mobile/auth/login']);
  }

  contactSupport(): void {
    alert('Support: admin@societymanagement.com\nPhone: +91-XXXX-XXXXXX');
  }
}

