import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MobileAuthService, UserRole } from '../services/mobile-auth.service';
import { SocialLoginComponent } from './social-login/social-login.component';
import { AppLogoComponent } from '../../core/components/app-logo.component';
import { BRANDING } from '../../core/constants/branding.constants';

@Component({
  selector: 'app-mobile-login',
  standalone: true,
  imports: [CommonModule, FormsModule, SocialLoginComponent, AppLogoComponent],
  template: `
    <div class="mobile-login">
      <!-- Logo Header -->
      <div class="login-header">
        <div class="logo-container">
          <app-logo size="lg" [onDark]="true"></app-logo>
          <p>{{ appTagline }}</p>
        </div>
      </div>

      <!-- Login Form -->
      <div class="login-card">
        <h2>Welcome Back!</h2>
        <p class="subtitle">Sign in to continue</p>

        <!-- Email/Phone Input -->
        <div class="form-group">
          <label>Email or Phone</label>
          <div class="input-wrapper">
            <i class="material-icons">person</i>
            <input type="text" 
                   [(ngModel)]="credentials.email"
                   placeholder="Enter your email or phone"
                   (keyup.enter)="login()">
          </div>
        </div>

        <!-- Password Input -->
        <div class="form-group">
          <label>Password</label>
          <div class="input-wrapper">
            <i class="material-icons">lock</i>
            <input [type]="showPassword ? 'text' : 'password'" 
                   [(ngModel)]="credentials.password"
                   placeholder="Enter your password"
                   (keyup.enter)="login()">
            <button class="toggle-password" (click)="showPassword = !showPassword">
              <i class="material-icons">{{ showPassword ? 'visibility_off' : 'visibility' }}</i>
            </button>
          </div>
        </div>

        <!-- Remember Me & Forgot Password -->
        <div class="form-options">
          <label class="checkbox-label">
            <input type="checkbox" [(ngModel)]="rememberMe">
            <span>Remember me</span>
          </label>
          <a class="forgot-link">Forgot Password?</a>
        </div>

        <!-- Error Message -->
        <div class="error-message" *ngIf="errorMessage">
          <i class="material-icons">error</i>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Login Button -->
        <button class="btn-login" 
                (click)="login()"
                [disabled]="isLoading || !isFormValid()">
          <i class="material-icons" *ngIf="isLoading">hourglass_empty</i>
          <span>{{ isLoading ? 'Signing In...' : 'Sign In' }}</span>
        </button>

        <!-- Alternative Login Methods -->
        <div class="divider">
          <span>or</span>
        </div>

        <div class="alt-login-buttons">
          <button class="btn-biometric" 
                  (click)="navigateToBiometric()"
                  [disabled]="!biometricAvailable">
            <i class="material-icons">fingerprint</i>
            <span>Biometrics</span>
          </button>

          <button class="btn-otp" 
                  (click)="navigateToOtpLogin()">
            <i class="material-icons">sms</i>
            <span>OTP Login</span>
          </button>
        </div>

        <!-- Social Login -->
        <div class="social-section">
          <p class="social-title">Or continue with</p>
          <div class="social-buttons-row">
            <button class="social-btn google" (click)="navigateToSocialLogin()">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </button>
            <button class="social-btn apple" (click)="navigateToSocialLogin()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
            </button>
            <button class="social-btn facebook" (click)="navigateToSocialLogin()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="login-footer">
        <p>Don't have an account? <a>Contact Admin</a></p>
        <p class="version">Version 1.0.0</p>
      </div>
    </div>
  `,
  styles: [`
    .mobile-login {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      display: flex;
      flex-direction: column;
    }

    .login-header {
      text-align: center;
      color: white;
      padding: 40px 20px;
    }

    .logo-container app-logo {
      margin: 0 auto 16px;
    }

    .logo-container p {
      margin: 0;
      font-size: 16px;
      opacity: 0.9;
    }

    .login-card {
      background: white;
      border-radius: 24px;
      padding: 32px 24px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      margin-bottom: 20px;
    }

    .login-card h2 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 700;
      color: #2c3e50;
    }

    .subtitle {
      margin: 0 0 24px 0;
      color: #666;
      font-size: 14px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 8px;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      background: #f5f5f5;
      border-radius: 12px;
      padding: 0 16px;
    }

    .input-wrapper .material-icons {
      color: #999;
      font-size: 20px;
      margin-right: 12px;
    }

    .input-wrapper input {
      flex: 1;
      border: none;
      background: none;
      padding: 16px 0;
      font-size: 15px;
      color: #2c3e50;
      outline: none;
    }

    .input-wrapper input::placeholder {
      color: #999;
    }

    .toggle-password {
      background: none;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 8px;
      margin-left: 8px;
    }

    .toggle-password .material-icons {
      font-size: 20px;
    }

    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #666;
      cursor: pointer;
    }

    .checkbox-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .forgot-link {
      font-size: 14px;
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
      cursor: pointer;
    }

    .error-message {
      background: #ffe5e5;
      color: #c92a2a;
      padding: 12px 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      font-size: 14px;
    }

    .error-message .material-icons {
      font-size: 20px;
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
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      transition: transform 0.2s;
    }

    .btn-login:active {
      transform: scale(0.98);
    }

    .btn-login:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-login .material-icons {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .divider {
      display: flex;
      align-items: center;
      margin: 24px 0;
      color: #999;
      font-size: 14px;
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e0e0e0;
    }

    .divider span {
      padding: 0 16px;
    }

    .btn-biometric {
      width: 100%;
      padding: 16px;
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-biometric:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .btn-biometric:active:not(:disabled) {
      background: #667eea;
      color: white;
    }

    .btn-biometric .material-icons {
      font-size: 24px;
    }

    .alt-login-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .btn-otp {
      padding: 16px;
      background: white;
      color: #10ac84;
      border: 2px solid #10ac84;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-otp:active {
      background: #10ac84;
      color: white;
    }

    .btn-otp .material-icons {
      font-size: 24px;
    }

    /* Social Login Section */
    .social-section {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
    }

    .social-title {
      margin: 0 0 16px 0;
      font-size: 13px;
      color: #999;
      text-align: center;
      font-weight: 500;
    }

    .social-buttons-row {
      display: flex;
      justify-content: center;
      gap: 16px;
    }

    .social-btn {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      border: 2px solid #e0e0e0;
      background: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .social-btn:active {
      transform: scale(0.95);
    }

    .social-btn.google:hover {
      border-color: #4285F4;
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.2);
    }

    .social-btn.apple {
      background: #000;
      border-color: #000;
    }

    .social-btn.apple:hover {
      background: #333;
    }

    .social-btn.facebook {
      background: #1877F2;
      border-color: #1877F2;
    }

    .social-btn.facebook:hover {
      background: #166FE5;
    }

    .login-footer {
      text-align: center;
      color: white;
      margin-top: auto;
    }

    .login-footer p {
      margin: 8px 0;
      font-size: 14px;
      opacity: 0.9;
    }

    .login-footer a {
      color: white;
      font-weight: 600;
      text-decoration: underline;
      cursor: pointer;
    }

    .version {
      font-size: 12px !important;
      opacity: 0.7 !important;
    }
  `]
})
export class MobileLoginComponent {
  readonly appTagline = BRANDING.appTagline;

  credentials = {
    email: '',
    password: ''
  };
  
  showPassword = false;
  rememberMe = false;
  isLoading = false;
  errorMessage = '';
  biometricAvailable = true;

  private returnUrl: string = '';

  constructor(
    private authService: MobileAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Check if biometric is available (would use actual API)
    // this.checkBiometricAvailability();

    // Get return URL from route parameters
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || '';
    });
  }


  navigateToRoleDashboard(role: UserRole) {
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

    const route = dashboards[role];
    if (route) {
      this.router.navigate([route]);
    }
  }

  isFormValid(): boolean {
    return !!(
      this.credentials.email && 
      this.credentials.password
    );
  }

  login() {
    if (!this.isFormValid()) {
      this.errorMessage = 'Please fill all fields';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Login without role - backend will determine role from user account
    this.authService.login(
      this.credentials.email,
      this.credentials.password
    ).subscribe({
      next: (user) => {
        this.isLoading = false;
        this.navigateToDashboard(user.role);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Invalid credentials. Please try again.';
      }
    });
  }

  biometricLogin() {
    // In a real app, use Capacitor Biometric API
    // import { BiometricAuth } from '@capacitor/biometric-auth';
    
    this.isLoading = true;
    
    // Simulate biometric authentication
    setTimeout(() => {
      this.authService.login(
        'biometric@user.com',
        'biometric'
      ).subscribe({
        next: (user) => {
          this.isLoading = false;
          this.navigateToDashboard(user.role);
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'Biometric authentication failed';
        }
      });
    }, 1000);
  }

  navigateToBiometric() {
    this.router.navigate(['/mobile/auth/biometric']);
  }

  navigateToOtpLogin() {
    this.router.navigate(['/mobile/auth/otp-login']);
  }

  navigateToSocialLogin() {
    this.router.navigate(['/mobile/auth/social']);
  }

  navigateToDashboard(role: UserRole) {
    // If there's a return URL, navigate there; otherwise use role-based dashboard
    if (this.returnUrl) {
      this.router.navigate([this.returnUrl]);
    } else {
      this.navigateToRoleDashboard(role);
    }
  }
}
