import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { VisitorPhotoService } from '../services/visitor-photo.service';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  PhotoCaptureSource,
  CapturePhotoRequest
} from '../models/visitor-photo.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-visitor-photo-capture',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="photo-capture-container" [class.mobile-walk-in]="isMobileWalkIn">
      <div class="page-header" *ngIf="!isMobileWalkIn">
        <h1><i class="material-icons">camera_alt</i> Visitor Photo Capture</h1>
        <p>Capture visitor photos at gate entry/exit</p>
      </div>
      <p class="mobile-hint" *ngIf="isMobileWalkIn">Take a photo and enter visitor details for walk-in entry.</p>

      <div class="capture-content">
        <!-- Camera Section -->
        <div class="camera-section">
          <div class="camera-container">
            <video 
              #videoElement 
              class="camera-video" 
              autoplay 
              playsinline
              [class.hidden]="capturedPhoto || !cameraActive">
            </video>
            
            <canvas #canvasElement class="hidden"></canvas>
            
            <!-- Captured Photo Preview -->
            <div class="photo-preview" *ngIf="capturedPhoto && !cameraActive">
              <img [src]="capturedPhoto" alt="Captured Photo" class="preview-image">
              <div class="preview-overlay">
                <button class="btn-retake" (click)="retakePhoto()">
                  <i class="material-icons">refresh</i>
                  Retake
                </button>
              </div>
            </div>

            <!-- Countdown Overlay -->
            <div class="countdown-overlay" *ngIf="captureCountdown > 0">
              <div class="countdown-number">{{ captureCountdown }}</div>
            </div>

            <!-- Error/Success Messages -->
            <div class="message-overlay error" *ngIf="errorMessage">
              <i class="material-icons">error</i>
              <span>{{ errorMessage }}</span>
            </div>
            <div class="message-overlay success" *ngIf="successMessage">
              <i class="material-icons">check_circle</i>
              <span>{{ successMessage }}</span>
            </div>
          </div>

          <!-- Camera Controls -->
          <div class="camera-controls" *ngIf="!capturedPhoto">
            <button 
              class="btn-capture" 
              (click)="startCamera()"
              [disabled]="cameraActive || isCapturing">
              <i class="material-icons">videocam</i>
              Start Camera
            </button>
            <button 
              class="btn-capture primary" 
              (click)="capturePhoto()"
              [disabled]="!cameraActive || isCapturing">
              <i class="material-icons">camera</i>
              Capture Photo
            </button>
            <button 
              class="btn-capture" 
              (click)="stopCamera()"
              [disabled]="!cameraActive">
              <i class="material-icons">stop</i>
              Stop Camera
            </button>
          </div>
        </div>

        <!-- Visitor Information Form -->
        <div class="info-section">
          <div class="form-card">
            <h2>Visitor Information</h2>
            <form (ngSubmit)="savePhoto()">
              <div class="form-group">
                <label>Visitor Name *</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.visitorName"
                  name="visitorName"
                  placeholder="Enter visitor name"
                  required
                  class="form-input">
              </div>

              <div class="form-group">
                <label>Visitor Phone</label>
                <input 
                  type="tel" 
                  [(ngModel)]="formData.visitorPhone"
                  name="visitorPhone"
                  placeholder="Enter phone number"
                  class="form-input">
              </div>

              <div class="form-group">
                <label>Visiting Flat</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.visitingFlat"
                  name="visitingFlat"
                  placeholder="e.g., A-101"
                  class="form-input">
              </div>

              <div class="form-group">
                <label>Host Name</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.hostName"
                  name="hostName"
                  placeholder="Enter host name"
                  class="form-input">
              </div>

              <div class="form-group">
                <label>Capture Source *</label>
                <select 
                  [(ngModel)]="formData.captureSource"
                  name="captureSource"
                  required
                  class="form-select">
                  <option [value]="PhotoCaptureSource.GATE_ENTRY">Gate Entry</option>
                  <option [value]="PhotoCaptureSource.GATE_EXIT">Gate Exit</option>
                  <option [value]="PhotoCaptureSource.MANUAL_CAPTURE">Manual Capture</option>
                </select>
              </div>

              <div class="form-group">
                <label>Gate</label>
                <select 
                  [(ngModel)]="formData.gateId"
                  name="gateId"
                  class="form-select">
                  <option value="">Select Gate</option>
                  <option value="MAIN_GATE">Main Gate</option>
                  <option value="SIDE_GATE">Side Gate</option>
                  <option value="PARKING_GATE">Parking Gate</option>
                  <option value="EMERGENCY_GATE">Emergency Gate</option>
                </select>
              </div>

              <div class="form-group">
                <label>Notes</label>
                <textarea 
                  [(ngModel)]="formData.notes"
                  name="notes"
                  placeholder="Additional notes..."
                  rows="3"
                  class="form-textarea"></textarea>
              </div>

              <div class="form-actions">
                <button 
                  type="submit" 
                  class="btn-save"
                  [disabled]="!capturedPhoto || isSaving">
                  <i class="material-icons">save</i>
                  {{ isSaving ? 'Saving...' : 'Save Photo' }}
                </button>
                <button 
                  type="button" 
                  class="btn-cancel"
                  (click)="resetForm()">
                  <i class="material-icons">clear</i>
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .photo-capture-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .page-header h1 {
      font-size: 28px;
      margin: 0 0 8px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 15px;
    }

    .capture-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .camera-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .camera-container {
      position: relative;
      width: 100%;
      aspect-ratio: 16/9;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 16px;
    }

    .camera-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .camera-video.hidden {
      display: none;
    }

    .photo-preview {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .preview-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000;
    }

    .preview-overlay {
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 12px;
    }

    .btn-retake {
      padding: 12px 24px;
      background: rgba(255, 255, 255, 0.9);
      color: #2c3e50;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-retake:hover {
      background: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    .countdown-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }

    .countdown-number {
      font-size: 120px;
      font-weight: 700;
      color: white;
      text-shadow: 0 0 20px rgba(255,255,255,0.5);
    }

    .message-overlay {
      position: absolute;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 20px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 10;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .message-overlay.error {
      background: #dc3545;
      color: white;
    }

    .message-overlay.success {
      background: #28a745;
      color: white;
    }

    .camera-controls {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .btn-capture {
      padding: 12px 24px;
      background: #f5f5f5;
      color: #2c3e50;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-capture:hover:not(:disabled) {
      background: #e0e0e0;
      transform: translateY(-2px);
    }

    .btn-capture:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-capture.primary {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }

    .btn-capture.primary:hover:not(:disabled) {
      background: #5568d3;
      border-color: #5568d3;
    }

    .info-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .form-card h2 {
      margin: 0 0 20px 0;
      font-size: 20px;
      color: #2c3e50;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
    }

    .form-input,
    .form-select,
    .form-textarea {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.2s;
    }

    .form-input:focus,
    .form-select:focus,
    .form-textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-textarea {
      resize: vertical;
      font-family: inherit;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .btn-save {
      flex: 1;
      padding: 14px 24px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-save:hover:not(:disabled) {
      background: #218838;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    }

    .btn-save:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-cancel {
      padding: 14px 24px;
      background: #f5f5f5;
      color: #2c3e50;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-cancel:hover {
      background: #e0e0e0;
    }

    .hidden {
      display: none;
    }

    @media (max-width: 1024px) {
      .capture-content {
        grid-template-columns: 1fr;
      }
    }

    .mobile-walk-in {
      padding: 12px 12px 24px;
      max-width: 100%;
    }

    .mobile-hint {
      margin: 0 0 12px;
      padding: 10px 12px;
      background: #eef2ff;
      border-radius: 10px;
      color: #475569;
      font-size: 13px;
      line-height: 1.4;
    }

    @media (max-width: 768px) {
      .photo-capture-container {
        padding: 12px;
      }

      .mobile-walk-in .camera-section,
      .mobile-walk-in .info-section {
        padding: 14px;
        border-radius: 12px;
      }

      .mobile-walk-in .camera-container {
        aspect-ratio: 4 / 3;
      }

      .mobile-walk-in .camera-controls {
        display: grid;
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .mobile-walk-in .btn-capture {
        width: 100%;
        justify-content: center;
        padding: 12px 14px;
        font-size: 13px;
      }

      .mobile-walk-in .btn-capture .material-icons {
        font-size: 20px;
      }

      .mobile-walk-in .form-card h2 {
        font-size: 17px;
        margin-bottom: 14px;
      }

      .mobile-walk-in .form-group {
        margin-bottom: 14px;
      }

      .mobile-walk-in .form-actions {
        flex-direction: column;
      }

      .mobile-walk-in .btn-save,
      .mobile-walk-in .btn-cancel {
        width: 100%;
      }

      .mobile-walk-in .countdown-number {
        font-size: 72px;
      }
    }
  `]
})
export class VisitorPhotoCaptureComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  cameraActive = false;
  isCapturing = false;
  isSaving = false;
  captureCountdown = 0;
  capturedPhoto: string | null = null;
  errorMessage = '';
  successMessage = '';
  stream: MediaStream | null = null;

  PhotoCaptureSource = PhotoCaptureSource;

  formData: CapturePhotoRequest = {
    visitorName: '',
    visitorPhone: '',
    visitingFlat: '',
    hostName: '',
    captureSource: PhotoCaptureSource.GATE_ENTRY,
    gateId: '',
    capturedBy: 'Guard 1', // In real app, get from auth service
    notes: ''
  };

  private destroy$ = new Subject<void>();

  /** True when opened from guard mobile walk-in route. */
  get isMobileWalkIn(): boolean {
    return this.router.url.includes('/mobile/guard/walk-in');
  }

  constructor(
    private photoService: VisitorPhotoService,
    private session: SessionContextService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.formData.capturedBy = this.session.getCurrentUserId() || 'Gate Desk';
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Start camera stream
   */
  async startCamera(): Promise<void> {
    try {
      this.errorMessage = '';
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          // Rear camera on phones for visitor photos at the gate.
          facingMode: this.isMobileWalkIn ? 'environment' : 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
        this.cameraActive = true;
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      this.errorMessage = 'Unable to access camera. Please check permissions.';
      this.cameraActive = false;
    }
  }

  /**
   * Stop camera stream
   */
  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.cameraActive = false;
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.srcObject = null;
    }
  }

  /**
   * Capture photo with countdown
   */
  capturePhoto(): void {
    if (this.isCapturing || !this.cameraActive) return;

    this.isCapturing = true;
    this.captureCountdown = 3;
    this.errorMessage = '';
    this.successMessage = '';

    const countdownInterval = setInterval(() => {
      this.captureCountdown--;
      if (this.captureCountdown === 0) {
        clearInterval(countdownInterval);
        this.takePicture();
      }
    }, 1000);
  }

  /**
   * Take picture from video stream
   */
  private takePicture(): void {
    const video = this.videoElement?.nativeElement;
    const canvas = this.canvasElement?.nativeElement;
    const context = canvas?.getContext('2d');

    if (!context || !video || !canvas) {
      this.isCapturing = false;
      this.errorMessage = 'Error capturing photo';
      return;
    }

    // Set canvas dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    this.capturedPhoto = imageData;
    this.isCapturing = false;
    this.stopCamera();
  }

  /**
   * Retake photo
   */
  retakePhoto(): void {
    this.capturedPhoto = null;
    this.errorMessage = '';
    this.successMessage = '';
  }

  /**
   * Save captured photo
   */
  savePhoto(): void {
    if (!this.capturedPhoto || !this.formData.visitorName) {
      this.errorMessage = 'Please capture a photo and enter visitor name';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.photoService.capturePhoto(this.formData, this.capturedPhoto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSaving = false;
          if (response.success) {
            this.successMessage = 'Photo captured and saved successfully!';
            setTimeout(() => {
              this.resetForm();
              const returnUrl =
                this.route.snapshot.queryParamMap.get('returnUrl') ||
                (this.isMobileWalkIn
                  ? '/mobile/guard/dashboard'
                  : '/admin/gate-security/visitor-photos');
              this.router.navigateByUrl(returnUrl);
            }, 2000);
          } else {
            this.errorMessage = response.message || 'Failed to save photo';
          }
        },
        error: (error) => {
          this.isSaving = false;
          this.errorMessage = error.message || 'Error saving photo';
          console.error('Error saving photo:', error);
        }
      });
  }

  /**
   * Reset form
   */
  resetForm(): void {
    this.capturedPhoto = null;
    this.formData = {
      visitorName: '',
      visitorPhone: '',
      visitingFlat: '',
      hostName: '',
      captureSource: PhotoCaptureSource.GATE_ENTRY,
      gateId: '',
      capturedBy: 'Guard 1',
      notes: ''
    };
    this.errorMessage = '';
    this.successMessage = '';
    this.stopCamera();
  }
}

