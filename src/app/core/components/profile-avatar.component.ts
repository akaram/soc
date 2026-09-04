import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  captureDataUrlFromVideo,
  compressProfileImage,
  getProfileInitials,
  isValidProfilePhoto,
  webcamErrorMessage
} from '../utils/profile-photo.util';

/**
 * Circular profile avatar: shows photo when available, otherwise initials.
 * Editable mode opens gallery picker or live webcam capture.
 */
@Component({
  selector: 'app-profile-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="profile-avatar" [class.size-sm]="size === 'sm'" [class.size-md]="size === 'md'" [class.size-lg]="size === 'lg'">
      <img
        *ngIf="showPhoto"
        [src]="photoUrl!"
        [alt]="name || 'Profile'"
        class="avatar-photo"
        (error)="onImageError()"
      />
      <div *ngIf="!showPhoto" class="avatar-fallback" [style.background]="fallbackGradient">
        <span>{{ initials }}</span>
      </div>

      <ng-container *ngIf="editable">
        <input
          #galleryInput
          type="file"
          accept="image/*"
          class="hidden-input"
          (change)="onFileSelected($event, galleryInput)"
        />
        <button
          type="button"
          class="avatar-edit"
          [disabled]="uploading"
          aria-label="Change profile photo"
          (click)="openPhotoPicker()"
        >
          <i class="material-icons">{{ uploading ? 'hourglass_empty' : 'photo_camera' }}</i>
        </button>
      </ng-container>
    </div>

    <!-- Gallery vs webcam choice -->
    <div class="photo-picker-backdrop" *ngIf="showPicker" (click)="closePicker()" role="presentation">
      <div class="photo-picker-sheet" role="dialog" aria-labelledby="photo-picker-title" (click)="$event.stopPropagation()">
        <h4 id="photo-picker-title">Update profile photo</h4>
        <p class="photo-picker-hint">Choose how you want to add your photo</p>

        <button type="button" class="picker-option" (click)="chooseFromGallery()">
          <i class="material-icons">photo_library</i>
          <span>
            <strong>Choose from device</strong>
            <small>Pick an existing image from laptop or phone gallery</small>
          </span>
        </button>

        <button type="button" class="picker-option" (click)="takePhotoNow()">
          <i class="material-icons">photo_camera</i>
          <span>
            <strong>Take photo now</strong>
            <small>Open webcam and capture immediately</small>
          </span>
        </button>

        <button type="button" class="picker-cancel" (click)="closePicker()">Cancel</button>
      </div>
    </div>

    <!-- Live webcam capture (works on laptop + phone browsers) -->
    <div class="webcam-backdrop" *ngIf="showWebcam" role="presentation">
      <div class="webcam-modal" role="dialog" aria-labelledby="webcam-title">
        <div class="webcam-header">
          <h4 id="webcam-title">Take photo</h4>
          <button type="button" class="webcam-close" aria-label="Close camera" (click)="closeWebcam()">
            <i class="material-icons">close</i>
          </button>
        </div>

        <div class="webcam-preview-wrap">
          <video #webcamVideo class="webcam-video" autoplay playsinline muted></video>
          <p class="webcam-loading" *ngIf="webcamStarting">Starting camera…</p>
          <p class="webcam-error" *ngIf="webcamError">{{ webcamError }}</p>
        </div>

        <div class="webcam-actions">
          <button type="button" class="webcam-cancel" (click)="closeWebcam()">Cancel</button>
          <button
            type="button"
            class="webcam-capture"
            [disabled]="webcamStarting || !!webcamError || uploading"
            (click)="captureFromWebcam()"
          >
            <i class="material-icons">camera</i>
            Capture
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-avatar {
      position: relative;
      width: 100px;
      height: 100px;
      flex-shrink: 0;
    }

    .size-sm { width: 48px; height: 48px; }
    .size-md { width: 64px; height: 64px; }
    .size-lg { width: 100px; height: 100px; }

    .avatar-photo,
    .avatar-fallback {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid #f5f5f5;
      box-sizing: border-box;
    }

    .avatar-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 700;
      font-size: 28px;
      user-select: none;
    }

    .size-sm .avatar-fallback { font-size: 16px; border-width: 2px; }
    .size-md .avatar-fallback { font-size: 22px; border-width: 3px; }

    .avatar-edit {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #667eea;
      color: white;
      border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .avatar-edit:disabled { opacity: 0.7; cursor: wait; }
    .size-sm .avatar-edit { width: 24px; height: 24px; border-width: 2px; }
    .size-sm .avatar-edit .material-icons { font-size: 14px; }
    .avatar-edit .material-icons { font-size: 18px; }
    .hidden-input { display: none; }

    .photo-picker-backdrop,
    .webcam-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      z-index: 10050;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: 16px;
    }

    .webcam-backdrop {
      align-items: center;
    }

    .photo-picker-sheet {
      width: min(420px, 100%);
      background: #fff;
      border-radius: 16px 16px 12px 12px;
      padding: 20px 16px 12px;
      box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.18);
      animation: sheet-up 0.22s ease-out;
    }

    .webcam-modal {
      width: min(480px, 100%);
      background: #0f172a;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
      animation: sheet-up 0.22s ease-out;
    }

    @keyframes sheet-up {
      from { transform: translateY(24px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .photo-picker-sheet h4,
    .webcam-header h4 {
      margin: 0;
      font-size: 18px;
      color: #1e293b;
    }

    .webcam-header h4 { color: #fff; }

    .photo-picker-hint {
      margin: 4px 0 16px;
      text-align: center;
      font-size: 13px;
      color: #64748b;
    }

    .picker-option {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px;
      margin-bottom: 8px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #f8fafc;
      cursor: pointer;
      text-align: left;
    }

    .picker-option .material-icons { font-size: 28px; color: #667eea; flex-shrink: 0; }
    .picker-option span { display: flex; flex-direction: column; gap: 2px; }
    .picker-option strong { font-size: 15px; color: #1e293b; }
    .picker-option small { font-size: 12px; color: #64748b; }

    .picker-cancel,
    .webcam-cancel {
      padding: 14px;
      border: none;
      border-radius: 12px;
      background: transparent;
      color: #64748b;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
    }

    .picker-cancel { width: 100%; margin-top: 4px; }
    .picker-cancel:hover { background: #f1f5f9; }

    .webcam-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      background: #1e293b;
    }

    .webcam-close {
      background: none;
      border: none;
      color: #cbd5e1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .webcam-preview-wrap {
      position: relative;
      background: #000;
      aspect-ratio: 4 / 3;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .webcam-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scaleX(-1);
    }

    .webcam-loading,
    .webcam-error {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      text-align: center;
      margin: 0;
      font-size: 14px;
    }

    .webcam-loading { color: #e2e8f0; background: rgba(0,0,0,0.35); }
    .webcam-error { color: #fecaca; background: rgba(127,29,29,0.75); }

    .webcam-actions {
      display: flex;
      gap: 10px;
      padding: 14px 16px;
      background: #1e293b;
    }

    .webcam-cancel {
      flex: 1;
      color: #cbd5e1;
    }

    .webcam-capture {
      flex: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px;
      border: none;
      border-radius: 12px;
      background: #667eea;
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
    }

    .webcam-capture:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
  `]
})
export class ProfileAvatarComponent implements OnDestroy {
  @ViewChild('galleryInput') galleryInput?: ElementRef<HTMLInputElement>;
  @ViewChild('webcamVideo') webcamVideo?: ElementRef<HTMLVideoElement>;

  @Input() photoUrl?: string | null;
  @Input() name = 'User';
  @Input() role?: string;
  @Input() size: 'sm' | 'md' | 'lg' = 'lg';
  @Input() editable = false;
  @Input() preferCamera = false;
  @Input() fallbackGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

  @Output() photoChange = new EventEmitter<string>();
  @Output() uploadError = new EventEmitter<string>();

  showPicker = false;
  showWebcam = false;
  webcamStarting = false;
  webcamError = '';
  imageBroken = false;
  uploading = false;

  private mediaStream: MediaStream | null = null;

  get initials(): string {
    return getProfileInitials(this.name);
  }

  get showPhoto(): boolean {
    return isValidProfilePhoto(this.photoUrl) && !this.imageBroken;
  }

  ngOnDestroy(): void {
    this.stopWebcam();
  }

  onImageError(): void {
    this.imageBroken = true;
  }

  openPhotoPicker(): void {
    this.showPicker = true;
  }

  closePicker(): void {
    this.showPicker = false;
  }

  /** Browse files on laptop / gallery on phone. */
  chooseFromGallery(): void {
    this.closePicker();
    this.galleryInput?.nativeElement.click();
  }

  /** Open live webcam using getUserMedia (works on desktop + mobile browsers). */
  async takePhotoNow(): Promise<void> {
    this.closePicker();
    this.showWebcam = true;
    this.webcamError = '';
    this.webcamStarting = true;

    // Wait for video element to render before attaching stream.
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException('Camera API not supported', 'NotSupportedError');
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      const video = this.webcamVideo?.nativeElement;
      if (!video) {
        throw new Error('Video element missing');
      }

      video.srcObject = this.mediaStream;
      await video.play();
      this.webcamStarting = false;
    } catch (error) {
      this.webcamStarting = false;
      this.webcamError = webcamErrorMessage(error);
      this.stopWebcam();
    }
  }

  captureFromWebcam(): void {
    const video = this.webcamVideo?.nativeElement;
    if (!video) {
      return;
    }

    this.uploading = true;
    try {
      const dataUrl = captureDataUrlFromVideo(video);
      this.imageBroken = false;
      this.photoChange.emit(dataUrl);
      this.closeWebcam();
    } catch {
      this.uploadError.emit('Could not capture photo. Wait for camera preview and try again.');
    } finally {
      this.uploading = false;
    }
  }

  closeWebcam(): void {
    this.showWebcam = false;
    this.webcamStarting = false;
    this.webcamError = '';
    this.stopWebcam();
  }

  /** Release camera hardware when modal closes. */
  private stopWebcam(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    const video = this.webcamVideo?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
  }

  async onFileSelected(event: Event, input: HTMLInputElement): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.uploadError.emit('Please select an image file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      this.uploadError.emit('Image is too large. Use a photo under 8 MB.');
      return;
    }

    this.uploading = true;
    try {
      const dataUrl = await compressProfileImage(file);
      this.imageBroken = false;
      this.photoChange.emit(dataUrl);
    } catch {
      this.uploadError.emit('Could not process image.');
    } finally {
      this.uploading = false;
    }
  }
}
