import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { FacialRecognitionApiService, FacialEnrollRequest } from '../../biometric/facial-recognition-api.service';
import { MobileAuthService } from '../../../services/mobile-auth.service';

export interface FacePhoto {
  id: string;
  photoData: string; // base64
  angle: 'front' | 'left' | 'right' | 'smile';
  timestamp: Date;
  quality: number;
  faceDetected: boolean;
  livenessScore: number;
}

export interface FaceVerificationResult {
  success: boolean;
  message: string;
  confidence: number;
  faceQuality: 'excellent' | 'good' | 'fair' | 'poor';
  livenessDetected: boolean;
  faceFeatures: {
    eyesOpen: boolean;
    smileDetected: boolean;
    faceAngle: string;
    faceSize: string;
    lighting: 'good' | 'poor';
  };
}

export interface FacialRecognitionSetup {
  photos: FacePhoto[];
  primaryPhoto?: FacePhoto;
  setupComplete: boolean;
  registrationId: string;
  verificationResult?: FaceVerificationResult;
}

@Injectable({
  providedIn: 'root'
})
export class FacialRecognitionService {
  private setupData: FacialRecognitionSetup = {
    photos: [],
    setupComplete: false,
    registrationId: ''
  };

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private facialRecognitionApi: FacialRecognitionApiService,
    private authService: MobileAuthService
  ) {}

  // Initialize facial recognition setup
  initializeSetup(registrationId: string): void {
    this.setupData = {
      photos: [],
      setupComplete: false,
      registrationId: registrationId
    };
  }

  // Capture face photo
  captureFacePhoto(photoData: string, angle: 'front' | 'left' | 'right' | 'smile'): Observable<FacePhoto> {
    return new Observable(observer => {
      setTimeout(() => {
        // Simulate face detection and quality analysis
        const quality = Math.random() * 30 + 70; // 70-100 quality score
        const livenessScore = Math.random() * 20 + 80; // 80-100 liveness score
        
        const photo: FacePhoto = {
          id: 'FACE-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
          photoData: photoData,
          angle: angle,
          timestamp: new Date(),
          quality: quality,
          faceDetected: quality > 75, // Faces detected if quality > 75
          livenessScore: livenessScore
        };

        this.setupData.photos.push(photo);

        observer.next(photo);
        observer.complete();
      }, 1500); // Simulate processing time
    });
  }

  // Verify all captured photos
  verifyFacePhotos(): Observable<FaceVerificationResult> {
    return new Observable(observer => {
      setTimeout(() => {
        const photos = this.setupData.photos;
        
        if (photos.length < 3) {
          observer.error({
            success: false,
            message: 'Please capture at least 3 photos'
          });
          return;
        }

        // Calculate average quality
        const avgQuality = photos.reduce((sum, p) => sum + p.quality, 0) / photos.length;
        const avgLiveness = photos.reduce((sum, p) => sum + p.livenessScore, 0) / photos.length;
        
        // Determine face quality
        let faceQuality: 'excellent' | 'good' | 'fair' | 'poor';
        if (avgQuality >= 90) faceQuality = 'excellent';
        else if (avgQuality >= 80) faceQuality = 'good';
        else if (avgQuality >= 70) faceQuality = 'fair';
        else faceQuality = 'poor';

        const result: FaceVerificationResult = {
          success: avgQuality >= 75 && avgLiveness >= 80,
          message: avgQuality >= 75 
            ? 'Face recognition setup completed successfully!'
            : 'Face quality is too low. Please recapture photos in better lighting.',
          confidence: avgQuality,
          faceQuality: faceQuality,
          livenessDetected: avgLiveness >= 80,
          faceFeatures: {
            eyesOpen: Math.random() > 0.1, // 90% chance
            smileDetected: photos.some(p => p.angle === 'smile'),
            faceAngle: 'Multiple angles captured',
            faceSize: 'Optimal',
            lighting: avgQuality >= 85 ? 'good' : 'poor'
          }
        };

        this.setupData.verificationResult = result;
        this.setupData.setupComplete = result.success;

        if (result.success) {
          // Set primary photo (front view with highest quality)
          const frontPhotos = photos.filter(p => p.angle === 'front');
          if (frontPhotos.length > 0) {
            this.setupData.primaryPhoto = frontPhotos.reduce((best, current) => 
              current.quality > best.quality ? current : best
            );
          }
        }

        observer.next(result);
        observer.complete();
      }, 3000); // Simulate 3 second verification process
    });
  }

  // Submit facial recognition setup - NOW CALLS REAL API
  submitFacialSetup(targetUserId?: string): Observable<{ success: boolean; message: string; setupId: string }> {
    if (!this.setupData.setupComplete) {
      return throwError(() => ({
        success: false,
        message: 'Please complete facial verification first'
      }));
    }

    // Get current user ID - try multiple sources for Admin users
    let userId: string | null = null;
    let userName: string | null = null;

    // Priority 1: Use targetUserId if provided (for admin enrolling another user)
    if (targetUserId) {
      userId = targetUserId;
      console.log('FacialRecognitionService: Using targetUserId (admin enrolling for user):', userId);
    }

    // Try 1: Get from MobileAuthService (mobile users) - only if no targetUserId
    if (!userId) {
      const currentUser = this.authService.getCurrentUser();
      if (currentUser && currentUser.id) {
        userId = currentUser.id;
        userName = currentUser.name || (currentUser.email || 'User');
        console.log('FacialRecognitionService: Using MobileAuthService user:', userId);
      }
    }

    // Try 2-4: Fallback sources (only if no targetUserId and no currentUser)
    if (!userId) {
      // Try 2: Get from localStorage (admin users or stored session)
      const storedUser = localStorage.getItem('mobileUser');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          if (user && user.id) {
            userId = user.id;
            // Get user name - try name first, then firstName+lastName, then email
            if (user.name) {
              userName = user.name;
            } else if (user.firstName) {
              userName = user.firstName + (user.lastName ? ' ' + user.lastName : '');
            } else {
              userName = user.email || 'User';
            }
            console.log('FacialRecognitionService: Using stored user from localStorage:', userId);
          }
        } catch (e) {
          console.error('FacialRecognitionService: Failed to parse stored user', e);
        }
      }

      // Try 3: Get from authToken (JWT) if available
      if (!userId) {
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
          try {
            // Decode JWT token to get user ID (simple base64 decode)
            const payload = JSON.parse(atob(authToken.split('.')[1]));
            if (payload.userId) {
              userId = payload.userId;
              console.log('FacialRecognitionService: Using user ID from JWT token:', userId);
            }
          } catch (e) {
            console.error('FacialRecognitionService: Failed to decode JWT token', e);
          }
        }
      }

      // Try 4: adminSession / sessionStorage admin payload
      if (!userId) {
        for (const key of ['adminSession', 'adminUser', 'currentUser'] as const) {
          const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
          if (!raw) continue;
          try {
            const user = JSON.parse(raw) as { id?: string; userId?: string; firstName?: string; name?: string; lastName?: string };
            const id = user.userId ?? user.id;
            if (id) {
              userId = id;
              userName = user.name || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
              break;
            }
          } catch {
            /* try next key */
          }
        }
      }
    }

    // If still no user ID, show helpful error
    if (!userId) {
      console.error('FacialRecognitionService: No user ID found. Available storage:', {
        mobileUser: !!localStorage.getItem('mobileUser'),
        authToken: !!localStorage.getItem('authToken'),
        adminUser: !!sessionStorage.getItem('adminUser'),
        currentUser: !!sessionStorage.getItem('currentUser')
      });
      
      return throwError(() => ({
        success: false,
        message: 'User not logged in. Please log in first to enroll facial recognition. Admin users should log in through the login page.'
      }));
    }

    // Get primary photo (front view) or first photo
    const primaryPhoto = this.setupData.primaryPhoto || this.setupData.photos[0];
    if (!primaryPhoto) {
      return throwError(() => ({
        success: false,
        message: 'No photos captured. Please capture at least one photo.'
      }));
    }

    // Get device ID
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'DEV-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }

    // Get device type
    const userAgent = navigator.userAgent;
    const deviceType = (userAgent.includes('Mobile') || userAgent.includes('Android') || 
                       userAgent.includes('iPhone') || userAgent.includes('iPad')) ? 'MOBILE' : 'WEB';

    // Prepare enrollment request
    const enrollRequest: FacialEnrollRequest = {
      userId: userId, // Use resolved user ID
      deviceId: deviceId,
      deviceType: deviceType,
      faceImage: primaryPhoto.photoData, // Use primary photo (front view)
      faceImages: this.setupData.photos.map(p => p.photoData), // Send all photos for better accuracy
      confidenceThreshold: 85
    };

    console.log('FacialRecognitionService: Submitting enrollment to API:', {
      userId: enrollRequest.userId,
      deviceId: enrollRequest.deviceId,
      photoCount: enrollRequest.faceImages?.length || 0
    });

    // Call real API
    return this.facialRecognitionApi.enrollFace(enrollRequest).pipe(
      map(response => {
        console.log('FacialRecognitionService: Enrollment API response:', response);
        if (response.success) {
          return {
            success: true,
            message: response.message || 'Facial recognition setup saved successfully!',
            setupId: response.biometricAuthId || 'FACE-SETUP-' + Date.now()
          };
        } else {
          throw new Error(response.message || 'Failed to save facial recognition setup');
        }
      }),
      catchError(error => {
        console.error('FacialRecognitionService: Enrollment error:', error);
        return throwError(() => ({
          success: false,
          message: error.error?.message || error.message || 'Failed to save facial recognition setup',
          setupId: ''
        }));
      })
    );
  }

  // Get setup data
  getSetupData(): FacialRecognitionSetup {
    return this.setupData;
  }

  // Remove a captured photo
  removePhoto(photoId: string): void {
    this.setupData.photos = this.setupData.photos.filter(p => p.id !== photoId);
  }

  // Reset setup
  resetSetup(): void {
    this.setupData = {
      photos: [],
      setupComplete: false,
      registrationId: this.setupData.registrationId
    };
  }

  // Check if browser supports camera APIs (requires secure context: localhost or HTTPS).
  checkCameraPermission(): Observable<boolean> {
    const supported =
      typeof window !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      (window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
    return of(supported);
  }

  /**
   * Open webcam once and return the live stream.
   * Callers must keep the stream (do not stop tracks until capture is done).
   */
  openCameraStream(): Observable<MediaStream> {
    return new Observable(observer => {
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        observer.error(new DOMException('Camera API not available', 'NotSupportedError'));
        return;
      }
      if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        observer.error(
          new DOMException('Camera requires HTTPS or localhost', 'SecurityError')
        );
        return;
      }

      const tryOpen = (constraints: MediaStreamConstraints) =>
        navigator.mediaDevices.getUserMedia(constraints);

      // Prefer front camera; fall back to any camera if facingMode fails.
      tryOpen({
        audio: false,
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
        .catch(() => tryOpen({ audio: false, video: true }))
        .then(stream => {
          observer.next(stream);
          observer.complete();
        })
        .catch(error => observer.error(error));
    });
  }

  /** @deprecated Prefer openCameraStream — kept for older callers. */
  requestCameraPermission(): Observable<boolean> {
    return this.openCameraStream().pipe(
      map(stream => {
        // Legacy API expected a boolean; stop immediately so callers that only
        // check permission do not leave the camera on.
        stream.getTracks().forEach(t => t.stop());
        return true;
      }),
      catchError(() => of(false))
    );
  }

  // Validate face in frame (dummy - for real-time feedback)
  validateFaceInFrame(imageData: string): Observable<{
    faceDetected: boolean;
    facePosition: 'center' | 'left' | 'right' | 'too-close' | 'too-far';
    quality: 'good' | 'poor';
    message: string;
  }> {
    const positions: Array<'center' | 'left' | 'right'> = ['center', 'left', 'right'];
    const selectedPosition = positions[Math.floor(Math.random() * 3)];
    const qualityValue: 'good' | 'poor' = Math.random() > 0.3 ? 'good' : 'poor';
    
    return of({
      faceDetected: Math.random() > 0.2, // 80% success rate
      facePosition: selectedPosition,
      quality: qualityValue,
      message: 'Position your face in the center'
    }).pipe(delay(200));
  }
}
