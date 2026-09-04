import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
/**
 * Facial Recognition API Service
 * Handles all API calls for facial recognition enrollment and verification.
 * Uses relative /auth paths so nginx proxy and dev proxy both work.
 */

export interface FacialEnrollRequest {
  userId: string;
  deviceId: string;
  deviceType: string;
  faceImage?: string; // Base64 encoded image
  faceImages?: string[]; // Multiple images for better accuracy
  faceEncoding?: string; // Pre-computed face embedding
  confidenceThreshold?: number;
}

export interface FacialVerifyRequest {
  userId?: string; // Optional: if provided, verify against specific user
  deviceId: string;
  deviceType: string;
  faceImage?: string; // Base64 encoded image
  faceEncoding?: string; // Pre-computed face embedding
  gateId?: string;
  location?: string;
}

export interface FacialRecognitionResponse {
  success: boolean;
  message: string;
  biometricAuthId?: string;
  matchFound?: boolean;
  confidence?: number; // Confidence score (0-100)
  userId?: string;
  isVerified?: boolean;
  isEnrolled?: boolean;
  errorCode?: string;
  errors?: string[];
  loginResponse?: any; // Login response if verification used for login
}

@Injectable({
  providedIn: 'root'
})
export class FacialRecognitionApiService {
  private readonly authBase = '/auth/facial';

  constructor(private http: HttpClient) {}

  /**
   * Enroll user's face for facial recognition
   * 
   * @param request Enrollment request with face image/encoding
   * @returns Observable with enrollment response
   */
  enrollFace(request: FacialEnrollRequest): Observable<FacialRecognitionResponse> {
    return this.http.post<FacialRecognitionResponse>(
      `${this.authBase}/enroll`,
      request
    ).pipe(
      catchError(error => {
        console.error('Facial enrollment error:', error);
        return throwError(() => ({
          success: false,
          message: error.error?.message || 'Failed to enroll face',
          errorCode: error.error?.errorCode || 'ENROLLMENT_ERROR',
          errors: error.error?.errors || [error.message]
        }));
      })
    );
  }

  /**
   * Verify user's face (without login)
   * 
   * @param request Verification request with face image/encoding
   * @returns Observable with verification response
   */
  verifyFace(request: FacialVerifyRequest): Observable<FacialRecognitionResponse> {
    return this.http.post<FacialRecognitionResponse>(
      `${this.authBase}/verify`,
      request
    ).pipe(
      catchError(error => {
        console.error('Facial verification error:', error);
        return throwError(() => ({
          success: false,
          message: error.error?.message || 'Failed to verify face',
          matchFound: false,
          isVerified: false,
          errorCode: error.error?.errorCode || 'VERIFICATION_ERROR',
          errors: error.error?.errors || [error.message]
        }));
      })
    );
  }

  /**
   * Verify face and login (combined operation)
   * 
   * @param request Verification request with face image/encoding
   * @returns Observable with verification and login response
   */
  verifyFaceAndLogin(request: FacialVerifyRequest): Observable<FacialRecognitionResponse> {
    return this.http.post<FacialRecognitionResponse>(
      `${this.authBase}/login`,
      request
    ).pipe(
      catchError(error => {
        console.error('Facial login error:', error);
        return throwError(() => ({
          success: false,
          message: error.error?.message || 'Failed to verify face and login',
          matchFound: false,
          isVerified: false,
          errorCode: error.error?.errorCode || 'LOGIN_ERROR',
          errors: error.error?.errors || [error.message]
        }));
      })
    );
  }

  /**
   * Remove facial recognition enrollment
   * 
   * @param userId User ID
   * @param deviceId Device ID
   * @returns Observable with removal status
   */
  removeEnrollment(userId: string, deviceId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.authBase}/enroll/${userId}/${deviceId}`
    ).pipe(
      catchError(error => {
        console.error('Remove enrollment error:', error);
        return throwError(() => ({
          success: false,
          message: error.error?.message || 'Failed to remove enrollment'
        }));
      })
    );
  }

  /**
   * Check if user has facial recognition enrolled
   * 
   * @param userId User ID
   * @param deviceId Device ID
   * @returns Observable with enrollment status
   */
  checkEnrollment(userId: string, deviceId: string): Observable<{ isEnrolled: boolean }> {
    return this.http.get<{ userId: string; deviceId: string; isEnrolled: boolean }>(
      `${this.authBase}/enrolled/${userId}/${deviceId}`
    ).pipe(
      map(response => ({ isEnrolled: response.isEnrolled })),
      catchError(error => {
        console.error('Check enrollment error:', error);
        return throwError(() => ({ isEnrolled: false }));
      })
    );
  }
}


