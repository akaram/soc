import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FacialRecognitionService, FacePhoto, FaceVerificationResult } from './facial-recognition.service';
import { MobileAuthService } from '../../../services/mobile-auth.service';
import { UserManagementService } from '../../../../modules/user-management/services/user-management.service';
import { User, UserStatus, VerificationStatus } from '../../../../modules/user-management/models/user.model';
import { UserDropdownService } from './user-dropdown.service';
import { webcamErrorMessage } from '../../../../core/utils/profile-photo.util';

@Component({
  selector: 'app-facial-recognition-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './facial-recognition-setup.component.html',
  styleUrls: ['./facial-recognition-setup.component.scss']
})
export class FacialRecognitionSetupComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  private destroy$ = new Subject<void>();
  private stream: MediaStream | null = null;

  // States
  currentStep: 'intro' | 'permission' | 'capture' | 'review' | 'verify' | 'success' = 'intro';
  registrationId = '';
  
  // Camera
  cameraActive = false;
  cameraPermissionGranted = false;
  
  // Capture
  capturedPhotos: FacePhoto[] = [];
  currentAngle: 'front' | 'left' | 'right' | 'smile' = 'front';
  isCapturing = false;
  captureCountdown = 0;
  
  // Required photos
  requiredAngles: Array<{angle: 'front' | 'left' | 'right' | 'smile', label: string, icon: string, instruction: string}> = [
    { angle: 'front', label: 'Front View', icon: '📸', instruction: 'Look straight at the camera' },
    { angle: 'left', label: 'Left Profile', icon: '👈', instruction: 'Turn your face slightly to the left' },
    { angle: 'right', label: 'Right Profile', icon: '👉', instruction: 'Turn your face slightly to the right' },
    { angle: 'smile', label: 'Smile', icon: '😊', instruction: 'Give us your best smile!' }
  ];
  
  // Verification
  verificationResult: FaceVerificationResult | null = null;
  isVerifying = false;
  
  // Messages
  successMessage = '';
  errorMessage = '';
  
  // Loading
  isLoading = false;

  // User selection (for admin)
  users: User[] = [];
  selectedUserId: string | null = null;
  isLoadingUsers = false;
  isAdminMode = false; // True when admin is enrolling for another user
  /** Society currently driving the enrollment dropdown (Society Setup). */
  activeSocietyId = '';

  // Production flag (for debug info)
  production = false; // Set to true in production

  constructor(
    private facialService: FacialRecognitionService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: MobileAuthService,
    private userManagementService: UserManagementService,
    private userDropdownService: UserDropdownService
  ) {}

  targetUserId: string | null = null; // For admin enrolling another user (from query params)

  ngOnInit(): void {
    console.log('FacialRecognitionSetup: Component initialized');
    
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.registrationId = params['registrationId'] || 'REG-' + Date.now();
        this.targetUserId = params['userId'] || null; // Get target userId from query params
        
        console.log('FacialRecognitionSetup: Query params:', { registrationId: this.registrationId, targetUserId: this.targetUserId });
        
        // Check if admin mode (admin logged in but no targetUserId from query params)
        this.checkAdminMode();
        
        console.log('FacialRecognitionSetup: After checkAdminMode - isAdminMode:', this.isAdminMode);
        
        // Load users list ONLY if admin mode is true
        if (this.isAdminMode && !this.targetUserId) {
          console.log('FacialRecognitionSetup: Calling loadUsers()...');
          this.loadUsers();
        } else {
          console.log('FacialRecognitionSetup: NOT loading users - isAdminMode:', this.isAdminMode, 'targetUserId:', this.targetUserId);
        }
        
        // If targetUserId provided, use it directly
        if (this.targetUserId) {
          this.selectedUserId = this.targetUserId;
          console.log('FacialRecognitionSetup: Admin enrolling for user (from query):', this.targetUserId);
        }
        
        this.facialService.initializeSetup(this.registrationId);
      });
  }

  // Check if admin is logged in (for enrolling other users)
  // This ensures dropdown ONLY shows for admin users
  checkAdminMode(): void {
    // Reset admin mode first
    this.isAdminMode = false;

    // Admin session may live in sessionStorage or localStorage (Remember me)
    const adminUserStr =
      sessionStorage.getItem('adminUser') ||
      localStorage.getItem('adminUser') ||
      sessionStorage.getItem('adminSession') ||
      localStorage.getItem('adminSession') ||
      sessionStorage.getItem('currentUser');
    let adminUser: any = null;

    if (adminUserStr) {
      try {
        adminUser = JSON.parse(adminUserStr);
      } catch (e) {
        console.error('FacialRecognitionSetup: Failed to parse admin user', e);
      }
    }

    // Check current logged-in user (mobile login)
    const currentUser = this.authService.getCurrentUser();

    // Determine if user is admin
    let isAdmin = false;

    if (adminUser) {
      isAdmin = this.isAdminRole(adminUser.role || adminUser.userRole);
      console.log('FacialRecognitionSetup: Admin user from storage:', isAdmin, adminUser.role || adminUser.userRole);
    } else if (currentUser) {
      isAdmin = this.isAdminRole(currentUser.role);
      console.log('FacialRecognitionSetup: Current user admin check:', isAdmin, currentUser.role);
    }

    // Admin mode is enabled ONLY if:
    // 1. User is an admin, AND
    // 2. No targetUserId from query params (meaning admin needs to select a user)
    if (isAdmin && !this.targetUserId) {
      this.isAdminMode = true;
      console.log('FacialRecognitionSetup: Admin mode enabled - dropdown will be shown');
    } else {
      this.isAdminMode = false;
      console.log('FacialRecognitionSetup: Admin mode disabled - dropdown will be hidden');
    }
  }

  // Check if user has admin role
  // Only these roles can see the user dropdown
  isAdminRole(role: string | undefined): boolean {
    if (!role) return false;
    const adminRoles = [
      'ADMIN', 
      'SUPER_ADMIN', 
      'SOCIETY_ADMIN', 
      'CHAIRMAN', 
      'SECRETARY', 
      'TREASURER',
      'COMMITTEE_MEMBER'
    ];
    return adminRoles.includes(role.toUpperCase());
  }

  // Load users list for dropdown
  // This service method is ONLY called when admin mode is enabled
  loadUsers(): void {
    console.log('FacialRecognitionSetup: loadUsers() called');
    
    // Double-check admin mode before loading
    if (!this.isAdminMode) {
      console.warn('FacialRecognitionSetup: Cannot load users - not in admin mode');
      return;
    }

    // Prefer Society Setup selection (Sterling Raheja etc.) — not JWT home society.
    // This page lives under /mobile/auth, which previously caused JWT to win incorrectly.
    let societyId =
      sessionStorage.getItem('societyId')?.trim() ||
      localStorage.getItem('societyId')?.trim() ||
      this.userDropdownService.getSocietyId() ||
      '';

    if (!societyId) {
      this.ensureSocietyId();
      societyId =
        sessionStorage.getItem('societyId')?.trim() ||
        localStorage.getItem('societyId')?.trim() ||
        this.userDropdownService.getSocietyId() ||
        '';
    }

    if (!societyId || societyId === 'default-society-id') {
      console.error('FacialRecognitionSetup: Invalid societyId:', societyId);
      this.isLoadingUsers = false;
      this.errorMessage =
        'No society selected. Open Admin → Society Setup, click Select on Sterling Raheja, then reload this page.';
      return;
    }

    console.log('FacialRecognitionSetup: Using societyId:', societyId);
    this.activeSocietyId = societyId;

    this.isLoadingUsers = true;
    this.errorMessage = ''; // Clear previous errors
    
    console.log('FacialRecognitionSetup: Calling userDropdownService.getUsersForEnrollment()...');
    
    // Use the dedicated UserDropdownService which handles all the logic
    this.userDropdownService.getUsersForEnrollment(societyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          console.log('FacialRecognitionSetup: Received users from service:', users.length);
          
          if (!users || users.length === 0) {
            console.warn('FacialRecognitionSetup: No eligible users found');
            this.users = [];
            this.isLoadingUsers = false;
            this.errorMessage = 'No eligible users found. Users must be ACTIVE or have PENDING/UNDER_REVIEW verification status.';
            return;
          }

          this.users = users;
          this.isLoadingUsers = false;
          console.log('FacialRecognitionSetup: Successfully loaded users for dropdown:', this.users.length);
          console.log('FacialRecognitionSetup: Users list:', this.users.map(u => `${u.firstName} ${u.lastName} (${u.id})`));
        },
        error: (error) => {
          console.error('FacialRecognitionSetup: Error loading users:', error);
          
          this.isLoadingUsers = false;
          this.users = [];
          this.errorMessage = error.message || 'Failed to load users list. Please try again or contact support.';
        }
      });
  }

  // Prefer Society Setup / session society — do not overwrite with JWT home society.
  private ensureSocietyId(): void {
    const fromSession = this.userDropdownService.getSocietyId();
    if (fromSession) {
      return;
    }

    const adminUserStr =
      sessionStorage.getItem('adminUser') ||
      localStorage.getItem('adminUser') ||
      sessionStorage.getItem('adminSession') ||
      localStorage.getItem('adminSession');
    if (adminUserStr) {
      try {
        const adminUser = JSON.parse(adminUserStr);
        if (adminUser.societyId) {
          sessionStorage.setItem('societyId', adminUser.societyId);
          console.log('FacialRecognitionSetup: Set societyId from admin user:', adminUser.societyId);
          return;
        }
      } catch (e) {
        console.error('FacialRecognitionSetup: Failed to parse admin user for societyId', e);
      }
    }

    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.societyId) {
      sessionStorage.setItem('societyId', currentUser.societyId);
      console.log('FacialRecognitionSetup: Set societyId from current user:', currentUser.societyId);
      return;
    }

    console.warn('FacialRecognitionSetup: Could not determine societyId. Select a society in Society Setup.');
  }

  // Handle user selection change
  onUserSelectionChange(): void {
    if (this.selectedUserId) {
      this.targetUserId = this.selectedUserId;
      console.log('FacialRecognitionSetup: Selected user for enrollment:', this.selectedUserId);
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Start the setup process — open camera once (do not stop then reopen).
  startSetup(): void {
    this.errorMessage = '';
    this.currentStep = 'permission';
    this.openCameraForCapture();
  }

  /** Retry after user allows camera in browser settings. */
  retryCamera(): void {
    this.errorMessage = '';
    this.openCameraForCapture();
  }

  /**
   * Request camera once, keep the stream, then show the capture step and attach video.
   */
  openCameraForCapture(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.stopCamera();

    this.facialService
      .openCameraStream()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: stream => {
          this.stream = stream;
          this.cameraPermissionGranted = true;
          this.isLoading = false;
          this.currentStep = 'capture';
          // Wait until *ngIf renders <video>, then attach stream.
          this.attachStreamWhenReady(0);
        },
        error: (error: unknown) => {
          this.isLoading = false;
          this.cameraPermissionGranted = false;
          this.currentStep = 'permission';
          this.errorMessage = this.describeCameraError(error);
          console.error('FacialRecognitionSetup: Camera open failed', error);
        }
      });
  }

  /** Attach live stream to the video element (retry while view initializes). */
  private attachStreamWhenReady(attempt: number): void {
    const maxAttempts = 20;
    const video = this.videoElement?.nativeElement;
    if (video && this.stream) {
      video.srcObject = this.stream;
      video.muted = true;
      video.setAttribute('playsinline', 'true');
      video.play().catch(() => {
        /* autoplay can fail until user gesture; stream still shows when ready */
      });
      this.cameraActive = true;
      return;
    }
    if (attempt >= maxAttempts) {
      this.errorMessage = 'Camera opened but preview failed to load. Click Retry camera.';
      this.currentStep = 'permission';
      this.stopCamera();
      return;
    }
    setTimeout(() => this.attachStreamWhenReady(attempt + 1), 50);
  }

  /** User-friendly camera errors (permission, HTTPS, in-use, missing device). */
  private describeCameraError(error: unknown): string {
    const name = error instanceof DOMException ? error.name : '';
    if (name === 'SecurityError') {
      return 'Camera needs a secure page (HTTPS or http://localhost). Open the app via localhost:4200.';
    }
    if (name === 'NotSupportedError') {
      return 'This browser does not support camera access. Try Chrome or Edge.';
    }
    return webcamErrorMessage(error);
  }

  // Stop camera
  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.srcObject = null;
    }
    this.cameraActive = false;
  }

  // Capture photo with countdown
  capturePhoto(): void {
    if (this.isCapturing) return;
    
    this.isCapturing = true;
    this.captureCountdown = 3;
    this.errorMessage = '';

    const countdownInterval = setInterval(() => {
      this.captureCountdown--;
      if (this.captureCountdown === 0) {
        clearInterval(countdownInterval);
        this.takePicture();
      }
    }, 1000);
  }

  // Take picture from video stream
  private takePicture(): void {
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (!context || !video) {
      this.isCapturing = false;
      return;
    }

    // Set canvas dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    // Process the captured photo
    this.processCapturedPhoto(imageData);
  }

  // Process captured photo
  private processCapturedPhoto(imageData: string): void {
    this.facialService.captureFacePhoto(imageData, this.currentAngle)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (photo) => {
          this.isCapturing = false;
          
          if (photo.faceDetected && photo.quality >= 75) {
            this.capturedPhotos.push(photo);
            this.successMessage = `${this.getCurrentAngleLabel()} captured successfully!`;
            
            // Move to next angle
            setTimeout(() => {
              this.successMessage = '';
              this.moveToNextAngle();
            }, 1500);
          } else {
            this.errorMessage = 'Face quality too low or not detected. Please try again in better lighting.';
            setTimeout(() => this.errorMessage = '', 3000);
          }
        },
        error: (error) => {
          this.isCapturing = false;
          this.errorMessage = error.message || 'Error capturing photo';
        }
      });
  }

  // Move to next angle
  private moveToNextAngle(): void {
    const currentIndex = this.requiredAngles.findIndex(a => a.angle === this.currentAngle);
    if (currentIndex < this.requiredAngles.length - 1) {
      this.currentAngle = this.requiredAngles[currentIndex + 1].angle;
    } else {
      // All photos captured
      this.currentStep = 'review';
      this.stopCamera();
    }
  }

  // Get current angle label
  getCurrentAngleLabel(): string {
    const angle = this.requiredAngles.find(a => a.angle === this.currentAngle);
    return angle ? angle.label : '';
  }

  // Get current angle instruction
  getCurrentAngleInstruction(): string {
    const angle = this.requiredAngles.find(a => a.angle === this.currentAngle);
    return angle ? angle.instruction : '';
  }

  // Get current angle icon
  getCurrentAngleIcon(): string {
    const angle = this.requiredAngles.find(a => a.angle === this.currentAngle);
    return angle ? angle.icon : '📸';
  }

  // Check if angle is captured
  isAngleCaptured(angle: 'front' | 'left' | 'right' | 'smile'): boolean {
    return this.capturedPhotos.some(p => p.angle === angle);
  }

  // Get photo for angle
  getPhotoForAngle(angle: 'front' | 'left' | 'right' | 'smile'): FacePhoto | undefined {
    return this.capturedPhotos.find(p => p.angle === angle);
  }

  // Recapture photo
  recapturePhoto(angle: 'front' | 'left' | 'right' | 'smile'): void {
    this.capturedPhotos = this.capturedPhotos.filter(p => p.angle !== angle);
    this.currentAngle = angle;
    this.currentStep = 'capture';
    this.openCameraForCapture();
  }

  // Proceed to verification
  proceedToVerification(): void {
    if (this.capturedPhotos.length < 3) {
      this.errorMessage = 'Please capture at least 3 photos';
      return;
    }
    this.currentStep = 'verify';
    this.verifyPhotos();
  }

  // Verify all photos
  private verifyPhotos(): void {
    this.isVerifying = true;
    this.errorMessage = '';

    this.facialService.verifyFacePhotos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.isVerifying = false;
          this.verificationResult = result;
          
          if (result.success) {
            // Automatically save to database when verification succeeds
            console.log('FacialRecognitionSetup: Verification successful, saving to database...');
            this.saveEnrollment();
          } else {
            this.errorMessage = result.message;
          }
        },
        error: (error) => {
          this.isVerifying = false;
          this.errorMessage = error.message || 'Verification failed';
        }
      });
  }

  // Save enrollment to database
  private saveEnrollment(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const userIdToUse = this.selectedUserId || this.targetUserId || undefined;

    this.facialService.submitFacialSetup(userIdToUse)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (!response.success) {
            this.errorMessage = response.message || 'Failed to save enrollment.';
            this.currentStep = 'review';
            return;
          }
          this.successMessage = response.message || 'Facial recognition enrolled successfully!';
          setTimeout(() => {
            this.currentStep = 'success';
          }, 1000);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err?.message || err?.error?.message || 'Failed to save enrollment. Please try again.';
          this.currentStep = 'review';
        }
      });
  }

  // Complete setup - NOW SAVES TO DATABASE
  completeSetup(): void {
    if (!this.verificationResult || !this.verificationResult.success) {
      this.errorMessage = 'Please complete verification first';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    console.log('FacialRecognitionSetup: Starting enrollment submission...');
    console.log('FacialRecognitionSetup: Captured photos:', this.capturedPhotos.length);
    console.log('FacialRecognitionSetup: Target userId:', this.targetUserId);

    // Use selectedUserId if available, otherwise use targetUserId from query params
    const userIdToUse = this.selectedUserId || this.targetUserId || undefined;
    
    if (!userIdToUse && !this.isUserLoggedIn()) {
      this.errorMessage = 'Please select a user or log in to enroll facial recognition.';
      this.isLoading = false;
      return;
    }
    
    // Pass userId to enrollment service
    this.facialService.submitFacialSetup(userIdToUse || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('FacialRecognitionSetup: Enrollment successful:', response);
          this.isLoading = false;
          this.successMessage = response.message || 'Facial recognition enrolled successfully!';
          
          // Navigate back or to next step
          setTimeout(() => {
            // If coming from admin panel, go back to admin
            const fromAdmin = sessionStorage.getItem('fromAdmin') === 'true';
            if (fromAdmin) {
              this.router.navigate(['/admin/users']);
            } else {
              this.router.navigate(['/mobile/auth/registration-success'], {
                queryParams: { registrationId: this.registrationId }
              });
            }
          }, 2000);
        },
        error: (error) => {
          console.error('FacialRecognitionSetup: Enrollment error:', error);
          this.isLoading = false;
          const errorMsg = error.message || error.error?.message || 'Failed to complete setup.';
          
          // Check if it's a login required error
          if (errorMsg.includes('not logged in') || errorMsg.includes('log in first')) {
            this.errorMessage = errorMsg + ' Please log in first, then try again.';
            // Show login prompt
            setTimeout(() => {
              if (confirm('You need to be logged in to enroll facial recognition. Would you like to go to the login page?')) {
                this.router.navigate(['/mobile/auth/login'], {
                  queryParams: { returnUrl: '/mobile/auth/facial-recognition' }
                });
              }
            }, 1000);
          } else {
            this.errorMessage = errorMsg + ' Please try again.';
          }
        }
      });
  }

  // Skip facial recognition — do not show registration success (user already registered)
  skipSetup(): void {
    if (confirm('Skip facial recognition for now? You can set it up later from Settings or Biometric Setup.')) {
      const fromAdmin = sessionStorage.getItem('fromAdmin') === 'true';
      if (fromAdmin) {
        this.router.navigate(['/admin/users-list']);
        return;
      }
      const loggedIn = this.isUserLoggedIn();
      this.router.navigate([loggedIn ? '/mobile/dashboard' : '/mobile/auth/login'], {
        queryParams: loggedIn ? { facialSkipped: 'true' } : undefined
      });
    }
  }

  // Restart setup
  restartSetup(): void {
    this.capturedPhotos = [];
    this.currentAngle = 'front';
    this.verificationResult = null;
    this.facialService.resetSetup();
    this.currentStep = 'capture';
    this.openCameraForCapture();
  }

  // Get progress percentage
  getProgress(): number {
    return (this.capturedPhotos.length / this.requiredAngles.length) * 100;
  }

  // Check if user is logged in
  isUserLoggedIn(): boolean {
    // Check MobileAuthService first
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.id) {
      return true;
    }
    
    // Check multiple sources for user ID
    const mobileUser = localStorage.getItem('mobileUser');
    const authToken = localStorage.getItem('authToken');
    const adminUser = sessionStorage.getItem('adminUser') || sessionStorage.getItem('currentUser');
    
    if (mobileUser || authToken || adminUser) {
      return true;
    }
    
    // Also check if we can extract user ID from JWT token
    if (authToken) {
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        if (payload.userId) {
          return true;
        }
      } catch (e) {
        // Token parsing failed
      }
    }
    
    return false;
  }

  // Navigate to login page
  goToLogin(): void {
    const returnUrl = this.router.url;
    this.router.navigate(['/mobile/auth/login'], {
      queryParams: { returnUrl: returnUrl }
    });
  }
}
