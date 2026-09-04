import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

/**
 * Face Capture Service
 * Handles camera access and face image capture for facial recognition
 */

export interface CaptureOptions {
  quality?: number; // Image quality (0-1, default: 0.8)
  maxWidth?: number; // Maximum image width
  maxHeight?: number; // Maximum image height
  facingMode?: 'user' | 'environment'; // Camera facing mode
}

@Injectable({
  providedIn: 'root'
})
export class FaceCaptureService {

  /**
   * Capture face image from camera
   * 
   * @param options Capture options
   * @returns Observable with base64 encoded image
   */
  captureFaceImage(options: CaptureOptions = {}): Observable<string> {
    const opts: CaptureOptions = {
      quality: options.quality || 0.8,
      maxWidth: options.maxWidth || 640,
      maxHeight: options.maxHeight || 480,
      facingMode: options.facingMode || 'user' // Front camera by default for face
    };

    return from(this.getUserMedia(opts)).pipe(
      switchMap((stream: MediaStream) => {
        // Create video element to display camera feed
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');

        return new Promise<string>((resolve, reject) => {
          video.onloadedmetadata = () => {
            video.play().then(() => {
              // Wait for video to be ready
              setTimeout(() => {
                // Capture frame from video
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                  stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
                  reject(new Error('Could not get canvas context'));
                  return;
                }

                // Draw video frame to canvas
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Stop video stream
                stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());

                // Convert to base64
                const base64Image = canvas.toDataURL('image/jpeg', opts.quality);
                resolve(base64Image.split(',')[1]); // Remove data:image/jpeg;base64, prefix
              }, 500); // Give video time to stabilize
            }).catch((error: any) => {
              stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
              reject(new Error('Failed to play video: ' + error.message));
            });
          };

          video.onerror = (error: any) => {
            stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
            reject(new Error('Failed to load video stream'));
          };
        });
      }),
      catchError(error => {
        console.error('Face capture error:', error);
        return throwError(() => new Error(
          error.message || 'Failed to capture face image. Please ensure camera permissions are granted.'
        ));
      })
    );
  }

  /**
   * Capture multiple face images for better accuracy
   * 
   * @param count Number of images to capture
   * @param options Capture options
   * @returns Observable with array of base64 encoded images
   */
  captureMultipleFaceImages(count: number = 3, options: CaptureOptions = {}): Observable<string[]> {
    const images: string[] = [];
    
    return new Observable(observer => {
      let captured = 0;
      const captureNext = () => {
        this.captureFaceImage(options).subscribe({
          next: (image) => {
            images.push(image);
            captured++;
            
            if (captured < count) {
              // Wait a bit before capturing next image
              setTimeout(captureNext, 1000);
            } else {
              observer.next(images);
              observer.complete();
            }
          },
          error: (error) => {
            observer.error(error);
          }
        });
      };

      captureNext();
    });
  }

  /**
   * Get user media (camera access)
   * 
   * @param options Capture options
   * @returns Promise with media stream
   */
  private async getUserMedia(options: CaptureOptions): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: options.facingMode || 'user',
        width: { ideal: options.maxWidth },
        height: { ideal: options.maxHeight }
      },
      audio: false
    };

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } else {
        // Fallback for older browsers
        const getUserMedia = (navigator as any).getUserMedia ||
                            (navigator as any).webkitGetUserMedia ||
                            (navigator as any).mozGetUserMedia ||
                            (navigator as any).msGetUserMedia;
        
        if (getUserMedia) {
          return new Promise<MediaStream>((resolve, reject) => {
            getUserMedia.call(navigator, constraints, resolve, reject);
          });
        } else {
          throw new Error('getUserMedia is not supported in this browser');
        }
      }
    } catch (error: any) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('No camera found. Please connect a camera and try again.');
      } else {
        throw new Error('Failed to access camera: ' + error.message);
      }
    }
  }

  /**
   * Convert File/Blob to base64
   * 
   * @param file File or Blob to convert
   * @returns Observable with base64 encoded string
   */
  fileToBase64(file: File | Blob): Observable<string> {
    return new Observable(observer => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix if present
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        observer.next(base64);
        observer.complete();
      };
      
      reader.onerror = (error) => {
        observer.error(new Error('Failed to read file: ' + error));
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Validate face image
   * Basic validation - checks if image is valid and has reasonable size
   * 
   * @param base64Image Base64 encoded image
   * @returns True if image is valid
   */
  validateFaceImage(base64Image: string): boolean {
    if (!base64Image || base64Image.length < 100) {
      return false; // Too small to be a valid image
    }

    // Check if it's a valid base64 string
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    if (!base64Regex.test(base64Image)) {
      return false;
    }

    // Estimate image size (rough calculation)
    const sizeInBytes = (base64Image.length * 3) / 4;
    const minSize = 10 * 1024; // 10KB minimum
    const maxSize = 5 * 1024 * 1024; // 5MB maximum

    return sizeInBytes >= minSize && sizeInBytes <= maxSize;
  }

  /**
   * Check if camera is available
   * 
   * @returns Observable with availability status
   */
  checkCameraAvailability(): Observable<boolean> {
    return new Observable(observer => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        observer.next(false);
        observer.complete();
        return;
      }

      // Try to enumerate devices
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const hasVideoInput = devices.some(device => device.kind === 'videoinput');
          observer.next(hasVideoInput);
          observer.complete();
        })
        .catch(() => {
          // If enumeration fails, try to get media (will fail if no camera)
          navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
              stream.getTracks().forEach(track => track.stop());
              observer.next(true);
              observer.complete();
            })
            .catch(() => {
              observer.next(false);
              observer.complete();
            });
        });
    });
  }
}

