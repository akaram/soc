import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { OtpVerificationComponent } from './otp-verification.component';
import { OtpService, OtpChannel } from './otp.service';
import { MobileAuthService, UserRole } from '../../services/mobile-auth.service';

type LoginStep = 'input' | 'verify' | 'success';

@Component({
  selector: 'app-otp-login',
  standalone: true,
  imports: [CommonModule, FormsModule, OtpVerificationComponent],
  template: `
    <div class="otp-login-container">
      <!-- Animated Background -->
      <div class="mesh-bg">
        <div class="mesh-gradient"></div>
        <div class="glow-orb orb-1"></div>
        <div class="glow-orb orb-2"></div>
      </div>

      <!-- Header -->
      <header class="login-header">
        <button class="back-btn" (click)="goBack()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div class="header-brand">
          <div class="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
          </div>
          <span>OTP Login</span>
        </div>
        <div class="header-spacer"></div>
      </header>

      <!-- Phone/Email Input Step -->
      <main class="login-main" *ngIf="currentStep === 'input'">
        <div class="hero-section">
          <div class="hero-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
            </svg>
          </div>
          <h1>Login with OTP</h1>
          <p>Enter your registered phone number or email to receive a verification code</p>
        </div>

        <!-- Channel Tabs -->
        <div class="channel-tabs">
          <button class="tab" 
                  [class.active]="selectedChannel === 'sms'"
                  (click)="selectChannel('sms')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
            </svg>
            <span>Phone</span>
          </button>
          <button class="tab"
                  [class.active]="selectedChannel === 'email'"
                  (click)="selectChannel('email')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
            <span>Email</span>
          </button>
        </div>

        <!-- Phone Input -->
        <div class="input-section" *ngIf="selectedChannel === 'sms'">
          <label>Phone Number</label>
          <div class="input-wrapper">
            <div class="country-code">
              <span>+91</span>
            </div>
            <input type="tel" 
                   [(ngModel)]="phoneNumber"
                   placeholder="Enter 10-digit mobile number"
                   maxlength="10"
                   (keyup.enter)="proceedToVerify()"
                   [class.error]="phoneError">
          </div>
          <span class="input-hint" *ngIf="!phoneError">We'll send a 6-digit code to this number</span>
          <span class="input-error" *ngIf="phoneError">{{ phoneError }}</span>
        </div>

        <!-- Email Input -->
        <div class="input-section" *ngIf="selectedChannel === 'email'">
          <label>Email Address</label>
          <div class="input-wrapper email">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
            <input type="email" 
                   [(ngModel)]="emailAddress"
                   placeholder="Enter your email address"
                   (keyup.enter)="proceedToVerify()"
                   [class.error]="emailError">
          </div>
          <span class="input-hint" *ngIf="!emailError">We'll send a 6-digit code to this email</span>
          <span class="input-error" *ngIf="emailError">{{ emailError }}</span>
        </div>

        <!-- Error Message -->
        <div class="error-banner" *ngIf="errorMessage">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Continue Button -->
        <button class="send-btn" 
                [disabled]="!isInputValid()"
                (click)="proceedToVerify()">
          <span>Continue</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
          </svg>
        </button>

        <!-- Alternative Login -->
        <div class="alt-section">
          <span>Remember your password?</span>
          <button class="link-btn" (click)="goToPasswordLogin()">Login with Password</button>
        </div>
      </main>

      <!-- OTP Verification Step (using embedded component) -->
      <div class="verify-wrapper" *ngIf="currentStep === 'verify'">
        <app-otp-verification
          [embedded]="true"
          [useBackendApi]="true"
          [phone]="phoneNumber"
          [email]="emailAddress"
          [purpose]="'login'"
          [preSelectedChannel]="selectedChannel"
          [showChannelSelector]="false"
          (verified)="onVerified($event)"
          (cancelled)="onVerifyCancelled()">
        </app-otp-verification>
      </div>

      <!-- Footer -->
      <footer class="login-footer" *ngIf="currentStep === 'input'">
        <div class="security-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
          </svg>
          <span>Your information is secure and encrypted</span>
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

    .otp-login-container {
      min-height: 100vh;
      background: var(--bg-base);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
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
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.2) 0%, transparent 50%),
        radial-gradient(ellipse 60% 40% at 100% 80%, rgba(16, 185, 129, 0.15) 0%, transparent 50%);
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
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(-20px, 20px); }
    }

    /* Header */
    .login-header {
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
    }

    .back-btn:active { transform: scale(0.95); }

    .header-brand {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    .brand-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .brand-icon svg { fill: white; }

    .header-brand span {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .header-spacer { width: 44px; }

    /* Main */
    .login-main {
      flex: 1;
      padding: 32px 20px;
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
    }

    .verify-wrapper {
      flex: 1;
      position: relative;
      z-index: 10;
    }

    /* Hero Section */
    .hero-section {
      text-align: center;
      margin-bottom: 32px;
    }

    .hero-icon {
      width: 100px;
      height: 100px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
      border-radius: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }

    .hero-icon svg { fill: var(--accent-start); }

    .hero-section h1 {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 8px;
    }

    .hero-section p {
      font-size: 15px;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.5;
    }

    /* Channel Tabs */
    .channel-tabs {
      display: flex;
      gap: 8px;
      background: var(--bg-elevated);
      padding: 6px;
      border-radius: 14px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .tab {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px;
      border: none;
      background: transparent;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 500;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab svg { fill: var(--text-secondary); }

    .tab.active {
      background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
      color: white;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }

    .tab.active svg { fill: white; }

    /* Input Section */
    .input-section {
      margin-bottom: 24px;
    }

    .input-section label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 10px;
    }

    .input-wrapper {
      display: flex;
      align-items: center;
      background: var(--bg-elevated);
      border: 2px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
      transition: border-color 0.2s;
    }

    .input-wrapper:focus-within {
      border-color: var(--accent-start);
    }

    .country-code {
      padding: 16px;
      background: rgba(99, 102, 241, 0.05);
      border-right: 1px solid var(--border);
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .input-wrapper.email {
      padding-left: 16px;
    }

    .input-wrapper.email svg {
      fill: var(--text-muted);
      flex-shrink: 0;
    }

    .input-wrapper input {
      flex: 1;
      border: none;
      background: transparent;
      padding: 16px;
      font-size: 16px;
      color: var(--text-primary);
      outline: none;
    }

    .input-wrapper input::placeholder {
      color: var(--text-muted);
    }

    .input-wrapper input.error {
      color: var(--danger);
    }

    .input-hint {
      display: block;
      margin-top: 8px;
      font-size: 13px;
      color: var(--text-muted);
    }

    .input-error {
      display: block;
      margin-top: 8px;
      font-size: 13px;
      color: var(--danger);
    }

    /* Error Banner */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 12px;
      margin-bottom: 24px;
    }

    .error-banner svg { fill: var(--danger); flex-shrink: 0; }
    .error-banner span { font-size: 14px; color: var(--danger); }

    /* Send Button */
    .send-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 18px 24px;
      background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
      color: white;
      border: none;
      border-radius: 16px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
      transition: all 0.2s;
      margin-bottom: 24px;
    }

    .send-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .send-btn:active:not(:disabled) { transform: scale(0.98); }

    .btn-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Alt Section */
    .alt-section {
      text-align: center;
      margin-top: auto;
    }

    .alt-section span {
      font-size: 14px;
      color: var(--text-muted);
    }

    .link-btn {
      background: none;
      border: none;
      color: var(--accent-start);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      padding: 8px 12px;
      margin-left: 4px;
    }

    /* Footer */
    .login-footer {
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
  `]
})
export class OtpLoginComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentStep: LoginStep = 'input';
  selectedChannel: OtpChannel = 'sms';
  
  phoneNumber = '';
  emailAddress = '';
  
  phoneError = '';
  emailError = '';
  errorMessage = '';
  
  isSending = false;

  constructor(
    private otpService: OtpService,
    private authService: MobileAuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Clear any existing session
    this.otpService.clearSession();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectChannel(channel: OtpChannel): void {
    this.selectedChannel = channel;
    this.clearErrors();
  }

  isInputValid(): boolean {
    if (this.selectedChannel === 'sms') {
      return /^[6-9]\d{9}$/.test(this.phoneNumber);
    } else {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.emailAddress);
    }
  }

  validateInput(): boolean {
    this.clearErrors();

    if (this.selectedChannel === 'sms') {
      if (!this.phoneNumber) {
        this.phoneError = 'Phone number is required';
        return false;
      }
      if (!/^[6-9]\d{9}$/.test(this.phoneNumber)) {
        this.phoneError = 'Please enter a valid 10-digit mobile number';
        return false;
      }
    } else {
      if (!this.emailAddress) {
        this.emailError = 'Email address is required';
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.emailAddress)) {
        this.emailError = 'Please enter a valid email address';
        return false;
      }
    }

    return true;
  }

  clearErrors(): void {
    this.phoneError = '';
    this.emailError = '';
    this.errorMessage = '';
  }

  proceedToVerify(): void {
    if (!this.validateInput()) return;
    this.currentStep = 'verify';
  }

  onVerified(event: { token: string; channel: OtpChannel; otp?: string }): void {
    const phone = this.selectedChannel === 'sms' ? this.phoneNumber : null;
    const email = this.selectedChannel === 'email' ? this.emailAddress : null;
    const otpCode = event.otp || event.token;
    if (!otpCode) {
      this.errorMessage = 'Enter the OTP code sent to your phone or email.';
      this.currentStep = 'input';
      return;
    }

    this.authService.verifyOtpAndLogin(phone, email, otpCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          // Navigate to appropriate dashboard based on role
          this.navigateToDashboard(user.role);
        },
        error: (error) => {
          console.error('OTP login error:', error);
          this.errorMessage = error.message || 'OTP verification failed';
          this.currentStep = 'input';
        }
      });
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

  onVerifyCancelled(): void {
    this.currentStep = 'input';
    this.otpService.clearSession();
  }

  goBack(): void {
    if (this.currentStep === 'verify') {
      this.currentStep = 'input';
      this.otpService.clearSession();
    } else {
      this.router.navigate(['/mobile/auth/login']);
    }
  }

  goToPasswordLogin(): void {
    this.router.navigate(['/mobile/auth/login']);
  }
}
