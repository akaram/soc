import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError, timer } from 'rxjs';
import { delay, map, tap, switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export type OtpChannel = 'sms' | 'email' | 'both';
export type OtpPurpose = 'registration' | 'login' | 'password_reset' | 'phone_change' | 'email_change' | 'transaction';
export type OtpStatus = 'pending' | 'verified' | 'expired' | 'max_attempts';

export interface OtpRequest {
  channel: OtpChannel;
  purpose: OtpPurpose;
  phone?: string;
  email?: string;
  userId?: string;
}

export interface OtpSendResult {
  success: boolean;
  message: string;
  otpId: string;
  expiresAt: Date;
  maskedPhone?: string;
  maskedEmail?: string;
  channel: OtpChannel;
  retryAfter?: number; // seconds until can resend
}

export interface OtpVerifyRequest {
  otpId: string;
  otp: string;
  channel: OtpChannel;
}

export interface OtpVerifyResult {
  success: boolean;
  message: string;
  verified: boolean;
  attemptsRemaining?: number;
  token?: string; // Auth token on successful verification
}

export interface OtpSession {
  otpId: string;
  phone?: string;
  email?: string;
  channel: OtpChannel;
  purpose: OtpPurpose;
  expiresAt: Date;
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
  status: OtpStatus;
  verified: boolean;
}

export interface ResendCooldown {
  canResend: boolean;
  remainingSeconds: number;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable({
  providedIn: 'root'
})
export class OtpService {
  
  // Configuration
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_SECONDS = 300; // 5 minutes
  private readonly MAX_ATTEMPTS = 5;
  private readonly RESEND_COOLDOWN_SECONDS = 30;
  private readonly MAX_RESEND_COUNT = 5;

  // State
  private currentSession$ = new BehaviorSubject<OtpSession | null>(null);
  private resendCount = 0;
  private lastSendTime: Date | null = null;

  // Dummy OTP for testing (in production, this comes from backend)
  private testOtp = '123456';

  constructor() {
    this.loadSession();
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  private loadSession(): void {
    const savedSession = localStorage.getItem('otpSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession) as OtpSession;
        session.expiresAt = new Date(session.expiresAt);
        session.createdAt = new Date(session.createdAt);
        
        // Check if session is still valid
        if (new Date() < session.expiresAt && session.status === 'pending') {
          this.currentSession$.next(session);
        } else {
          this.clearSession();
        }
      } catch {
        this.clearSession();
      }
    }
  }

  private saveSession(session: OtpSession): void {
    localStorage.setItem('otpSession', JSON.stringify(session));
    this.currentSession$.next(session);
  }

  clearSession(): void {
    localStorage.removeItem('otpSession');
    this.currentSession$.next(null);
    this.resendCount = 0;
    this.lastSendTime = null;
  }

  getCurrentSession(): Observable<OtpSession | null> {
    return this.currentSession$.asObservable();
  }

  getSessionSync(): OtpSession | null {
    return this.currentSession$.value;
  }

  // ============================================================================
  // SEND OTP
  // ============================================================================

  /**
   * Send OTP via SMS, Email, or both
   * 
   * API Endpoint: POST /api/v1/otp/send
   * Body: { channel, purpose, phone?, email? }
   */
  sendOtp(request: OtpRequest): Observable<OtpSendResult> {
    // Check resend cooldown
    if (this.lastSendTime) {
      const secondsSinceLastSend = (Date.now() - this.lastSendTime.getTime()) / 1000;
      if (secondsSinceLastSend < this.RESEND_COOLDOWN_SECONDS) {
        return throwError(() => ({
          success: false,
          message: `Please wait ${Math.ceil(this.RESEND_COOLDOWN_SECONDS - secondsSinceLastSend)} seconds before requesting a new OTP`,
          retryAfter: Math.ceil(this.RESEND_COOLDOWN_SECONDS - secondsSinceLastSend)
        }));
      }
    }

    // Check max resend limit
    if (this.resendCount >= this.MAX_RESEND_COUNT) {
      return throwError(() => ({
        success: false,
        message: 'Maximum OTP requests exceeded. Please try again later.',
      }));
    }

    // Validate request
    if (request.channel === 'sms' && !request.phone) {
      return throwError(() => ({
        success: false,
        message: 'Phone number is required for SMS OTP'
      }));
    }

    if (request.channel === 'email' && !request.email) {
      return throwError(() => ({
        success: false,
        message: 'Email address is required for Email OTP'
      }));
    }

    if (request.channel === 'both' && (!request.phone || !request.email)) {
      return throwError(() => ({
        success: false,
        message: 'Both phone and email are required'
      }));
    }

    // Simulate API call
    return of(null).pipe(
      delay(1500), // Simulate network delay
      map(() => {
        const otpId = 'OTP-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
        const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_SECONDS * 1000);

        // Generate test OTP (in production, backend generates and sends)
        this.testOtp = this.generateOtp();
        console.log('🔐 Test OTP:', this.testOtp); // For development testing

        // Create session
        const session: OtpSession = {
          otpId,
          phone: request.phone,
          email: request.email,
          channel: request.channel,
          purpose: request.purpose,
          expiresAt,
          createdAt: new Date(),
          attempts: 0,
          maxAttempts: this.MAX_ATTEMPTS,
          status: 'pending',
          verified: false
        };

        this.saveSession(session);
        this.resendCount++;
        this.lastSendTime = new Date();

        const result: OtpSendResult = {
          success: true,
          message: this.getSendSuccessMessage(request.channel),
          otpId,
          expiresAt,
          channel: request.channel,
          retryAfter: this.RESEND_COOLDOWN_SECONDS
        };

        if (request.phone) {
          result.maskedPhone = this.maskPhone(request.phone);
        }
        if (request.email) {
          result.maskedEmail = this.maskEmail(request.email);
        }

        return result;
      })
    );

    /*
    // ACTUAL API IMPLEMENTATION:
    return this.http.post<OtpSendResult>(`${API_URL}/otp/send`, request);
    */
  }

  /**
   * Resend OTP
   */
  resendOtp(): Observable<OtpSendResult> {
    const session = this.currentSession$.value;
    if (!session) {
      return throwError(() => ({
        success: false,
        message: 'No active OTP session found'
      }));
    }

    return this.sendOtp({
      channel: session.channel,
      purpose: session.purpose,
      phone: session.phone,
      email: session.email
    });
  }

  // ============================================================================
  // VERIFY OTP
  // ============================================================================

  /**
   * Verify OTP code
   * 
   * API Endpoint: POST /api/v1/otp/verify
   * Body: { otpId, otp, channel }
   */
  verifyOtp(request: OtpVerifyRequest): Observable<OtpVerifyResult> {
    const session = this.currentSession$.value;

    if (!session) {
      return throwError(() => ({
        success: false,
        verified: false,
        message: 'No active OTP session found'
      }));
    }

    if (session.otpId !== request.otpId) {
      return throwError(() => ({
        success: false,
        verified: false,
        message: 'Invalid OTP session'
      }));
    }

    // Check expiry
    if (new Date() > session.expiresAt) {
      session.status = 'expired';
      this.saveSession(session);
      return throwError(() => ({
        success: false,
        verified: false,
        message: 'OTP has expired. Please request a new one.'
      }));
    }

    // Check max attempts
    if (session.attempts >= session.maxAttempts) {
      session.status = 'max_attempts';
      this.saveSession(session);
      return throwError(() => ({
        success: false,
        verified: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.'
      }));
    }

    // Increment attempts
    session.attempts++;
    this.saveSession(session);

    // Simulate API call
    return of(null).pipe(
      delay(1000),
      map(() => {
        // Verify OTP (in production, backend verifies)
        const isValid = request.otp === this.testOtp;

        if (isValid) {
          session.status = 'verified';
          session.verified = true;
          this.saveSession(session);

          return {
            success: true,
            verified: true,
            message: 'OTP verified successfully!',
            token: this.generateAuthToken()
          };
        } else {
          const attemptsRemaining = session.maxAttempts - session.attempts;
          return {
            success: false,
            verified: false,
            message: attemptsRemaining > 0 
              ? `Invalid OTP. ${attemptsRemaining} attempts remaining.`
              : 'Maximum attempts exceeded. Please request a new OTP.',
            attemptsRemaining
          };
        }
      })
    );

    /*
    // ACTUAL API IMPLEMENTATION:
    return this.http.post<OtpVerifyResult>(`${API_URL}/otp/verify`, request);
    */
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Generate 6-digit OTP
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate dummy auth token
   */
  private generateAuthToken(): string {
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 
           btoa(JSON.stringify({ exp: Date.now() + 3600000, iat: Date.now(), verified: true })) + 
           '.otp_verified_' + Math.random().toString(36);
  }

  /**
   * Mask phone number
   */
  private maskPhone(phone: string): string {
    if (phone.length < 4) return phone;
    return phone.slice(0, 2) + '*'.repeat(phone.length - 4) + phone.slice(-2);
  }

  /**
   * Mask email address
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    return local[0] + '*'.repeat(Math.min(local.length - 2, 5)) + local.slice(-1) + '@' + domain;
  }

  /**
   * Get success message based on channel
   */
  private getSendSuccessMessage(channel: OtpChannel): string {
    switch (channel) {
      case 'sms':
        return 'OTP sent to your mobile number';
      case 'email':
        return 'OTP sent to your email address';
      case 'both':
        return 'OTP sent to your mobile and email';
    }
  }

  /**
   * Check if can resend OTP
   */
  getResendCooldown(): ResendCooldown {
    if (!this.lastSendTime) {
      return { canResend: true, remainingSeconds: 0 };
    }

    const secondsSinceLastSend = (Date.now() - this.lastSendTime.getTime()) / 1000;
    const remainingSeconds = Math.max(0, Math.ceil(this.RESEND_COOLDOWN_SECONDS - secondsSinceLastSend));

    return {
      canResend: remainingSeconds === 0,
      remainingSeconds
    };
  }

  /**
   * Get remaining time until OTP expires
   */
  getExpiryCountdown(): Observable<number> {
    return timer(0, 1000).pipe(
      map(() => {
        const session = this.currentSession$.value;
        if (!session) return 0;
        
        const remaining = Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
        return remaining;
      })
    );
  }

  /**
   * Format seconds to MM:SS
   */
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get OTP length for input validation
   */
  getOtpLength(): number {
    return this.OTP_LENGTH;
  }

  /**
   * Validate OTP format
   */
  isValidOtpFormat(otp: string): boolean {
    return /^\d{6}$/.test(otp);
  }
}
