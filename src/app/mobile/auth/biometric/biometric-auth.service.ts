import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of, delay, throwError } from 'rxjs';
import { map, tap, switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { FacialRecognitionApiService, FacialEnrollRequest, FacialVerifyRequest } from './facial-recognition-api.service';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export type BiometricType = 'fingerprint' | 'face_id' | 'none';
export type BiometricStatus = 'available' | 'not_available' | 'not_enrolled' | 'locked_out' | 'permission_denied';

export interface BiometricCapabilities {
  hasFingerprint: boolean;
  hasFaceId: boolean;
  isAvailable: boolean;
  preferredType: BiometricType;
  securityLevel: 'strong' | 'weak' | 'none';
}

export interface BiometricCredential {
  id: string;
  userId: string;
  type: BiometricType;
  deviceId: string;
  deviceName: string;
  enrolledAt: Date;
  lastUsedAt: Date;
  isActive: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  type: BiometricType;
  message: string;
  userId?: string;
  token?: string;
  errorCode?: string;
  attemptsRemaining?: number;
}

export interface BiometricEnrollmentResult {
  success: boolean;
  credentialId?: string;
  message: string;
  errorCode?: string;
}

export interface StoredBiometricUser {
  userId: string;
  email: string;
  name: string;
  profilePhoto?: string;
  role: string;
  flatNumber?: string;
  societyName: string;
  biometricEnabled: boolean;
  biometricType: BiometricType;
  lastBiometricAuth?: Date;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable({
  providedIn: 'root'
})
export class BiometricAuthService {
  private apiUrl = environment.apiUrl;
  
  // State management
  private biometricStatus$ = new BehaviorSubject<BiometricStatus>('available');
  private enrolledCredentials$ = new BehaviorSubject<BiometricCredential[]>([]);
  private authAttempts = 0;
  private maxAttempts = 5;
  private lockoutEndTime: Date | null = null;

  constructor(
    private http: HttpClient,
    private facialRecognitionApi: FacialRecognitionApiService
  ) {
    this.loadEnrolledCredentials();
  }

  // ============================================================================
  // DUMMY DATA - Replace API calls with actual endpoints
  // ============================================================================
  
  private dummyEnrolledUsers: StoredBiometricUser[] = [
    {
      userId: 'USR001',
      email: 'mohammed.ali@example.com',
      name: 'Mohammed Ali',
      profilePhoto: 'assets/avatars/owner.jpg',
      role: 'OWNER',
      flatNumber: 'A-501',
      societyName: 'Green Valley Residency',
      biometricEnabled: true,
      biometricType: 'fingerprint',
      lastBiometricAuth: new Date('2025-01-10T09:30:00')
    },
    {
      userId: 'USR002',
      email: 'fatima.khan@example.com',
      name: 'Fatima Khan',
      profilePhoto: 'assets/avatars/tenant.jpg',
      role: 'TENANT',
      flatNumber: 'B-302',
      societyName: 'Green Valley Residency',
      biometricEnabled: true,
      biometricType: 'face_id',
      lastBiometricAuth: new Date('2025-01-11T14:15:00')
    },
    {
      userId: 'USR003',
      email: 'ahmed.hassan@example.com',
      name: 'Ahmed Hassan',
      profilePhoto: 'assets/avatars/guard.jpg',
      role: 'GUARD',
      societyName: 'Green Valley Residency',
      biometricEnabled: true,
      biometricType: 'fingerprint',
      lastBiometricAuth: new Date('2025-01-12T06:00:00')
    },
    {
      userId: 'USR004',
      email: 'abdullah.ibrahim@example.com',
      name: 'Abdullah Ibrahim',
      profilePhoto: 'assets/avatars/admin.jpg',
      role: 'SOCIETY_ADMIN',
      societyName: 'Green Valley Residency',
      biometricEnabled: true,
      biometricType: 'face_id',
      lastBiometricAuth: new Date('2025-01-12T10:30:00')
    }
  ];

  private dummyCredentials: BiometricCredential[] = [
    {
      id: 'CRED001',
      userId: 'USR001',
      type: 'fingerprint',
      deviceId: 'DEV-SAMSUNG-A54',
      deviceName: 'Samsung Galaxy A54',
      enrolledAt: new Date('2024-12-01'),
      lastUsedAt: new Date('2025-01-10'),
      isActive: true
    },
    {
      id: 'CRED002',
      userId: 'USR002',
      type: 'face_id',
      deviceId: 'DEV-IPHONE-15',
      deviceName: 'iPhone 15 Pro',
      enrolledAt: new Date('2024-11-15'),
      lastUsedAt: new Date('2025-01-11'),
      isActive: true
    }
  ];

  // ============================================================================
  // DEVICE CAPABILITIES CHECK
  // ============================================================================

  /**
   * Check device biometric capabilities
   * TODO: Replace with actual device API (Capacitor/Cordova plugin)
   * 
   * API Endpoint: GET /api/v1/biometric/capabilities
   */
  checkBiometricCapabilities(): Observable<BiometricCapabilities> {
    // Simulate device capability check
    return of({
      hasFingerprint: true,
      hasFaceId: true,
      isAvailable: true,
      preferredType: 'fingerprint' as BiometricType,
      securityLevel: 'strong' as const
    }).pipe(delay(300));

    /* 
    // ACTUAL API IMPLEMENTATION:
    return this.http.get<BiometricCapabilities>(`${API_URL}/biometric/capabilities`);
    */
  }

  /**
   * Get current biometric status
   */
  getBiometricStatus(): Observable<BiometricStatus> {
    return this.biometricStatus$.asObservable();
  }

  /**
   * Check if biometrics are available on this device
   */
  isBiometricAvailable(): Observable<boolean> {
    return this.checkBiometricCapabilities().pipe(
      map(caps => caps.isAvailable && (caps.hasFingerprint || caps.hasFaceId))
    );
  }

  // ============================================================================
  // BIOMETRIC AUTHENTICATION
  // ============================================================================

  /**
   * Authenticate user with biometrics
   * Uses real API for face_id, falls back to simulation for fingerprint
   * 
   * @param type Biometric type (fingerprint or face_id)
   * @param faceImage Optional: Base64 encoded face image for face_id
   * @returns Observable with authentication result
   */
  authenticateWithBiometric(type: BiometricType, faceImage?: string): Observable<BiometricAuthResult> {
    // Check lockout
    if (this.isLockedOut()) {
      const remainingTime = this.getLockoutRemainingTime();
      return throwError(() => ({
        success: false,
        type,
        message: `Too many failed attempts. Try again in ${remainingTime} seconds.`,
        errorCode: 'LOCKED_OUT'
      }));
    }

    // Use real API for facial recognition
    if (type === 'face_id') {
      return this.authenticateWithFaceId(faceImage);
    }

    // For fingerprint, use existing simulation (can be updated later with real API)
    return this.authenticateWithFingerprint();
  }

  /**
   * Authenticate with Face ID using real API
   */
  private authenticateWithFaceId(faceImage?: string): Observable<BiometricAuthResult> {
    // Get stored user ID if available
    const storedUserId = localStorage.getItem('lastBiometricUserId');
    
    // Create verification request
    const verifyRequest: FacialVerifyRequest = {
      userId: storedUserId || undefined,
      deviceId: this.getDeviceId(),
      deviceType: this.getDeviceType(),
      faceImage: faceImage
    };

    // Verify face and login
    return this.facialRecognitionApi.verifyFaceAndLogin(verifyRequest).pipe(
      map(response => {
        if (response.success && response.isVerified && response.loginResponse) {
          this.authAttempts = 0;
          
          // Store user data from login response
          if (response.userId) {
            this.updateLastBiometricAuth(response.userId);
            localStorage.setItem('authToken', response.loginResponse.sessionToken);
            if (response.loginResponse.refreshToken) {
              localStorage.setItem('refreshToken', response.loginResponse.refreshToken);
            }
          }

          return {
            success: true,
            type: 'face_id' as BiometricType,
            message: 'Face ID verified successfully',
            userId: response.userId,
            token: response.loginResponse.sessionToken
          };
        } else {
          this.authAttempts++;
          if (this.authAttempts >= this.maxAttempts) {
            this.lockoutEndTime = new Date(Date.now() + 30000);
            this.biometricStatus$.next('locked_out');
          }

          return {
            success: false,
            type: 'face_id' as BiometricType,
            message: response.message || 'Face verification failed',
            errorCode: response.errorCode || 'AUTH_FAILED',
            attemptsRemaining: this.maxAttempts - this.authAttempts
          };
        }
      }),
      catchError((error: any) => {
        this.authAttempts++;
        if (this.authAttempts >= this.maxAttempts) {
          this.lockoutEndTime = new Date(Date.now() + 30000);
          this.biometricStatus$.next('locked_out');
        }

        return throwError(() => ({
          success: false,
          type: 'face_id' as BiometricType,
          message: error.message || 'Face verification failed',
          errorCode: error.errorCode || 'AUTH_FAILED',
          attemptsRemaining: this.maxAttempts - this.authAttempts
        }));
      })
    );
  }

  /**
   * Authenticate with fingerprint — requires prior Biometric Setup on this device.
   */
  private authenticateWithFingerprint(): Observable<BiometricAuthResult> {
    const storedRaw = localStorage.getItem('lastBiometricUser');
    let userId = localStorage.getItem('lastBiometricUserId') || '';
    if (storedRaw) {
      try {
        const parsed = JSON.parse(storedRaw) as StoredBiometricUser;
        if (parsed?.userId) {
          userId = parsed.userId;
        }
      } catch {
        /* ignore */
      }
    }
    if (!userId) {
      return of({
        success: false,
        type: 'fingerprint' as BiometricType,
        message: 'Sign in with password first, then complete Biometric Setup.',
        errorCode: 'NOT_ENROLLED'
      });
    }

    const deviceId = this.getDeviceId();
    return this.isUserEnrolled(userId, 'fingerprint').pipe(
      switchMap(enrolled => {
        if (!enrolled) {
          return of({
            success: false,
            type: 'fingerprint' as BiometricType,
            message: 'Fingerprint not enrolled on this device. Open Biometric Setup to enable it.',
            errorCode: 'NOT_ENROLLED',
            attemptsRemaining: this.maxAttempts - this.authAttempts
          });
        }
        this.authAttempts = 0;
        return of({
          success: true,
          type: 'fingerprint' as BiometricType,
          message: 'Fingerprint verified',
          userId,
          token: `bio-${deviceId}`
        });
      }),
      catchError(() =>
        of({
          success: false,
          type: 'fingerprint' as BiometricType,
          message: 'Could not verify fingerprint enrollment. Try Biometric Setup again.',
          errorCode: 'AUTH_FAILED'
        })
      )
    );
  }

  /**
   * Authenticate with specific user (for multi-user devices)
   */
  authenticateUser(userId: string, type: BiometricType): Observable<BiometricAuthResult> {
    return new Observable(observer => {
      setTimeout(() => {
        const user = this.dummyEnrolledUsers.find(u => u.userId === userId);
        
        if (!user) {
          observer.next({
            success: false,
            type,
            message: 'User not found or biometrics not enrolled',
            errorCode: 'USER_NOT_FOUND'
          });
          observer.complete();
          return;
        }

        if (!user.biometricEnabled) {
          observer.next({
            success: false,
            type,
            message: 'Biometric authentication not enabled for this user',
            errorCode: 'BIOMETRIC_NOT_ENABLED'
          });
          observer.complete();
          return;
        }

        // Simulate successful auth
        observer.next({
          success: true,
          type,
          message: 'Authentication successful',
          userId: user.userId,
          token: this.generateDummyToken()
        });
        observer.complete();
      }, 1500);
    });
  }

  // ============================================================================
  // BIOMETRIC ENROLLMENT
  // ============================================================================

  /**
   * Enroll user's biometric data
   * Uses real API for face_id, falls back to simulation for fingerprint
   * 
   * @param userId User ID to enroll
   * @param type Biometric type (fingerprint or face_id)
   * @param faceImage Optional: Base64 encoded face image(s) for face_id
   * @returns Observable with enrollment result
   */
  enrollBiometric(userId: string, type: BiometricType, faceImage?: string | string[]): Observable<BiometricEnrollmentResult> {
    // Use real API for facial recognition
    if (type === 'face_id') {
      return this.enrollFaceId(userId, faceImage);
    }

    // For fingerprint, use existing simulation (can be updated later with real API)
    return this.enrollFingerprint(userId);
  }

  /**
   * Enroll Face ID using real API
   */
  private enrollFaceId(userId: string, faceImage?: string | string[]): Observable<BiometricEnrollmentResult> {
    const enrollRequest: FacialEnrollRequest = {
      userId: userId,
      deviceId: this.getDeviceId(),
      deviceType: this.getDeviceType(),
      faceImage: typeof faceImage === 'string' ? faceImage : undefined,
      faceImages: Array.isArray(faceImage) ? faceImage : undefined
    };

    console.log('BiometricAuthService: Enrolling Face ID with request:', {
      userId: enrollRequest.userId,
      deviceId: enrollRequest.deviceId,
      deviceType: enrollRequest.deviceType,
      hasFaceImage: !!enrollRequest.faceImage,
      hasFaceImages: !!enrollRequest.faceImages,
      imageCount: enrollRequest.faceImages?.length || 0
    });

    return this.facialRecognitionApi.enrollFace(enrollRequest).pipe(
      map(response => {
        console.log('BiometricAuthService: Enrollment API response:', response);
        if (response.success && response.biometricAuthId) {
          // Update local credentials
          const newCredential: BiometricCredential = {
            id: response.biometricAuthId,
            userId: userId,
            type: 'face_id',
            deviceId: this.getDeviceId(),
            deviceName: this.getDeviceName(),
            enrolledAt: new Date(),
            lastUsedAt: new Date(),
            isActive: true
          };

          this.dummyCredentials.push(newCredential);
          this.enrolledCredentials$.next([...this.dummyCredentials]);

          return {
            success: true,
            credentialId: response.biometricAuthId,
            message: response.message || 'Face ID enrolled successfully'
          };
        } else {
          return {
            success: false,
            message: response.message || 'Failed to enroll Face ID',
            errorCode: response.errorCode || 'ENROLLMENT_ERROR'
          };
        }
      }),
      catchError((error: any) => {
        console.error('BiometricAuthService: Enrollment API error:', error);
        console.error('BiometricAuthService: Error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          message: error.message,
          url: error.url
        });
        return throwError(() => ({
          success: false,
          message: error.error?.message || error.message || 'Failed to enroll Face ID',
          errorCode: error.error?.errorCode || error.errorCode || 'ENROLLMENT_ERROR',
          errors: error.error?.errors || []
        }));
      })
    );
  }

  /**
   * Enroll fingerprint using the backend biometric_auth table.
   */
  private enrollFingerprint(userId: string): Observable<BiometricEnrollmentResult> {
    const body = {
      userId,
      deviceId: this.getDeviceId(),
      biometricType: 'FINGERPRINT',
      deviceType: this.getDeviceType()
    };
    return this.http.post<{ success?: string; message?: string }>('/auth/biometric/enroll', body).pipe(
      map(res => ({
        success: true,
        credentialId: `FP-${userId}-${this.getDeviceId()}`,
        message: res.message || 'Fingerprint enrolled successfully'
      })),
      catchError((error: any) =>
        throwError(() => ({
          success: false,
          message: error.error?.message || error.message || 'Failed to enroll fingerprint',
          errorCode: 'ENROLLMENT_ERROR'
        }))
      )
    );
  }

  /**
   * Remove enrolled biometric
   * Uses real API for face_id, falls back to simulation for fingerprint
   * 
   * @param credentialId Credential ID or userId for face_id
   * @param type Biometric type
   * @returns Observable with removal status
   */
  removeBiometricCredential(credentialId: string, type?: BiometricType): Observable<{ success: boolean; message: string }> {
    // Find credential to get userId
    const credential = this.dummyCredentials.find(c => c.id === credentialId);
    if (!credential) {
      return throwError(() => ({ success: false, message: 'Credential not found' }));
    }

    // Use real API for face_id
    if (type === 'face_id' || credential.type === 'face_id') {
      return this.facialRecognitionApi.removeEnrollment(credential.userId, this.getDeviceId()).pipe(
        map(response => {
          if (response.success) {
            const index = this.dummyCredentials.findIndex(c => c.id === credentialId);
            if (index >= 0) {
              this.dummyCredentials.splice(index, 1);
              this.enrolledCredentials$.next([...this.dummyCredentials]);
            }
          }
          return response;
        })
      );
    }

    // For fingerprint, use simulation
    return new Observable(observer => {
      setTimeout(() => {
        const index = this.dummyCredentials.findIndex(c => c.id === credentialId);
        if (index >= 0) {
          this.dummyCredentials.splice(index, 1);
          this.enrolledCredentials$.next([...this.dummyCredentials]);
          observer.next({ success: true, message: 'Biometric credential removed' });
        } else {
          observer.next({ success: false, message: 'Credential not found' });
        }
        observer.complete();
      }, 500);
    });
  }

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  /**
   * Get users with biometrics enrolled on this device
   */
  getEnrolledUsers(): Observable<StoredBiometricUser[]> {
    return of(this.dummyEnrolledUsers.filter(u => u.biometricEnabled)).pipe(delay(300));
  }

  /**
   * Get enrolled credentials for a user
   */
  getUserCredentials(userId: string): Observable<BiometricCredential[]> {
    return of(this.dummyCredentials.filter(c => c.userId === userId)).pipe(delay(300));
  }

  /**
   * Check if user has biometrics enrolled
   * Uses real API for face_id check
   * 
   * @param userId User ID
   * @param type Optional: Biometric type to check
   * @returns Observable with enrollment status
   */
  isUserEnrolled(userId: string, type?: BiometricType): Observable<boolean> {
    const deviceId = this.getDeviceId();
    if (type === 'face_id') {
      return this.facialRecognitionApi.checkEnrollment(userId, deviceId).pipe(
        map(response => response.isEnrolled),
        catchError(() => of(false))
      );
    }
    const bioType = type === 'fingerprint' ? 'FINGERPRINT' : 'FINGERPRINT';
    return this.http
      .get<{ isEnrolled: boolean }>(`/auth/biometric/enrolled/${encodeURIComponent(userId)}/${encodeURIComponent(deviceId)}`, {
        params: { type: bioType }
      })
      .pipe(
        map(res => Boolean(res.isEnrolled)),
        catchError(() => of(false))
      );
  }

  /**
   * Get stored user for quick login display (real user from last password/OTP login).
   */
  getStoredUser(): Observable<StoredBiometricUser | null> {
    const storedRaw = localStorage.getItem('lastBiometricUser');
    if (storedRaw) {
      try {
        const parsed = JSON.parse(storedRaw) as StoredBiometricUser;
        if (parsed?.userId) {
          return of(parsed).pipe(delay(100));
        }
      } catch {
        /* fall through */
      }
    }
    const storedUserId = localStorage.getItem('lastBiometricUserId');
    const mobileUserRaw = localStorage.getItem('mobileUser');
    if (mobileUserRaw) {
      try {
        const u = JSON.parse(mobileUserRaw) as { id: string; email: string; name: string; role: string; flatNumber?: string; societyName?: string; profilePhoto?: string };
        if (u?.id) {
          const mapped: StoredBiometricUser = {
            userId: u.id,
            email: u.email,
            name: u.name,
            profilePhoto: u.profilePhoto,
            role: String(u.role),
            flatNumber: u.flatNumber,
            societyName: u.societyName || '',
            biometricEnabled: true,
            biometricType: 'fingerprint'
          };
          this.storeUserForBiometric(mapped);
          return of(mapped).pipe(delay(100));
        }
      } catch {
        /* ignore */
      }
    }
    if (storedUserId) {
      const hit = this.dummyEnrolledUsers.find(u => u.userId === storedUserId);
      if (hit) {
        return of(hit).pipe(delay(200));
      }
    }
    return of(null).pipe(delay(100));
  }

  /**
   * Get user by ID
   */
  getUserById(userId: string): StoredBiometricUser | null {
    return this.dummyEnrolledUsers.find(u => u.userId === userId) || null;
  }

  /**
   * Store user for quick biometric login
   */
  storeUserForBiometric(user: StoredBiometricUser): void {
    console.log('Storing biometric user:', user.name, user.role);
    localStorage.setItem('lastBiometricUserId', user.userId);
    localStorage.setItem('lastBiometricUser', JSON.stringify(user));
  }

  /**
   * Clear stored biometric user (for logout/switch account)
   */
  clearStoredUser(): void {
    console.log('Clearing stored biometric user');
    localStorage.removeItem('lastBiometricUserId');
    localStorage.removeItem('lastBiometricUser');
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private loadEnrolledCredentials(): void {
    this.enrolledCredentials$.next(this.dummyCredentials);
  }

  private isLockedOut(): boolean {
    if (!this.lockoutEndTime) return false;
    if (new Date() >= this.lockoutEndTime) {
      this.lockoutEndTime = null;
      this.authAttempts = 0;
      this.biometricStatus$.next('available');
      return false;
    }
    return true;
  }

  private getLockoutRemainingTime(): number {
    if (!this.lockoutEndTime) return 0;
    return Math.ceil((this.lockoutEndTime.getTime() - Date.now()) / 1000);
  }

  private generateDummyToken(): string {
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 
           btoa(JSON.stringify({ exp: Date.now() + 3600000, iat: Date.now() })) + 
           '.dummy_signature_' + Math.random().toString(36);
  }

  private updateLastBiometricAuth(userId: string): void {
    const userIndex = this.dummyEnrolledUsers.findIndex(u => u.userId === userId);
    if (userIndex >= 0) {
      this.dummyEnrolledUsers[userIndex].lastBiometricAuth = new Date();
    }
  }

  private getDeviceName(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    return 'Unknown Device';
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'DEV-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  /**
   * Get device type (MOBILE or WEB)
   */
  private getDeviceType(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || 
        userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      return 'MOBILE';
    }
    return 'WEB';
  }

  // ============================================================================
  // NATIVE BIOMETRIC PROMPTS (Simulated)
  // ============================================================================

  /**
   * Show native fingerprint prompt
   * TODO: Replace with actual native plugin
   */
  showFingerprintPrompt(): Observable<boolean> {
    return new Observable(observer => {
      // In real app, this would trigger native fingerprint dialog
      // Using Capacitor: BiometricAuth.authenticate()
      setTimeout(() => {
        observer.next(Math.random() > 0.1); // 90% success
        observer.complete();
      }, 2000);
    });
  }

  /**
   * Show native Face ID prompt
   * TODO: Replace with actual native plugin
   */
  showFaceIdPrompt(): Observable<boolean> {
    return new Observable(observer => {
      setTimeout(() => {
        observer.next(Math.random() > 0.1); // 90% success
        observer.complete();
      }, 2000);
    });
  }

  // ============================================================================
  // SETTINGS & PREFERENCES
  // ============================================================================

  /**
   * Enable/disable biometric for user
   */
  toggleBiometric(userId: string, enabled: boolean): Observable<{ success: boolean }> {
    return new Observable(observer => {
      setTimeout(() => {
        const userIndex = this.dummyEnrolledUsers.findIndex(u => u.userId === userId);
        if (userIndex >= 0) {
          this.dummyEnrolledUsers[userIndex].biometricEnabled = enabled;
          observer.next({ success: true });
        } else {
          observer.next({ success: false });
        }
        observer.complete();
      }, 500);
    });
  }

  /**
   * Get biometric preference type
   */
  getBiometricPreference(): BiometricType {
    return (localStorage.getItem('biometricPreference') as BiometricType) || 'fingerprint';
  }

  /**
   * Set biometric preference type
   */
  setBiometricPreference(type: BiometricType): void {
    localStorage.setItem('biometricPreference', type);
  }
}
