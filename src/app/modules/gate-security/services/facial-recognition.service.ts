import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  FacialProfile,
  FacialRecognitionEntry,
  RecognitionStatus,
  EntryType,
  EntryStatus,
  CreateFacialProfileRequest,
  VerifyFaceRequest,
  FacialRecognitionResponse,
  FacialRecognitionStatistics,
  FacialRecognitionFilter
} from '../models/facial-recognition.model';
import { fileToStableDataUrl } from '../utils/facial-image.util';

@Injectable({
  providedIn: 'root'
})
export class FacialRecognitionService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  /** Active society from Society Setup / session. */
  private societyParams(extra?: HttpParams): HttpParams {
    let params = extra ?? new HttpParams();
    const societyId = this.session.getSocietyId();
    if (societyId) {
      params = params.set('societyId', societyId);
    }
    return params;
  }

  /** Zeroed stats when the API is unavailable so dashboards stay stable. */
  private emptyStatistics(): FacialRecognitionStatistics {
    return {
      totalProfiles: 0,
      activeProfiles: 0,
      totalEntries: 0,
      successfulEntries: 0,
      failedEntries: 0,
      entriesToday: 0,
      byType: {
        resident: 0,
        staff: 0,
        visitor: 0,
        domesticHelp: 0,
        vendor: 0
      },
      byGate: {},
      averageConfidence: 0
    };
  }

  /**
   * Get all facial recognition profiles for the active society only.
   */
  getAllProfiles(filter?: FacialRecognitionFilter): Observable<FacialProfile[]> {
    let params = this.societyParams();
    if (filter?.personType) {
      params = params.set('personType', filter.personType);
    }
    if (filter?.status) {
      params = params.set('status', filter.status);
    }
    if (filter?.searchTerm) {
      params = params.set('searchTerm', filter.searchTerm);
    }

    return this.http.get<any[]>(`${this.apiUrl}/api/facial-recognition/profiles`, { params }).pipe(
      map((response: any[]) => (response ?? []).map(item => this.mapToFacialProfile(item))),
      catchError(error => {
        console.error('Error fetching facial profiles:', error);
        return of([]);
      })
    );
  }

  /**
   * Map API response to FacialProfile
   */
  private mapToFacialProfile(item: any): FacialProfile {
    return {
      id: item.id,
      personId: item.personId,
      personName: item.personName,
      personType: this.mapPersonType(item.personType),
      phone: item.phone || '',
      email: item.email,
      flatNumber: item.flatNumber,
      unitNumber: item.unitNumber,
      faceId: item.faceId || item.id,
      faceImage: item.faceImage,
      confidenceThreshold: item.confidenceThreshold || 85,
      status: this.mapStatus(item.status),
      accessLevel: item.accessLevel || 'FULL',
      allowedGates: item.allowedGates || ['MAIN_GATE'],
      allowedTimeSlots: item.allowedTimeSlots,
      registeredAt: new Date(item.registeredAt),
      registeredBy: item.registeredBy || 'SYSTEM',
      lastVerifiedAt: item.lastVerifiedAt ? new Date(item.lastVerifiedAt) : undefined,
      lastEntryAt: item.lastEntryAt ? new Date(item.lastEntryAt) : undefined,
      totalEntries: item.totalEntries || 0,
      failedAttempts: item.failedAttempts || 0,
      isActive: item.isActive !== false,
      expiresAt: item.expiresAt ? new Date(item.expiresAt) : undefined,
      notes: item.notes
    };
  }

  /** Map backend person type (any case) to EntryType. */
  private mapPersonType(type: string): EntryType {
    if (!type) return EntryType.RESIDENT;
    const u = String(type).toUpperCase();
    const allowed = Object.values(EntryType) as string[];
    return (allowed.includes(u) ? u : EntryType.RESIDENT) as EntryType;
  }

  /** Map backend status string to RecognitionStatus. */
  private mapStatus(status: string): RecognitionStatus {
    if (!status) return RecognitionStatus.ACTIVE;
    const u = String(status).toUpperCase();
    const allowed = Object.values(RecognitionStatus) as string[];
    return (allowed.includes(u) ? u : RecognitionStatus.ACTIVE) as RecognitionStatus;
  }

  /**
   * Get profile by ID
   * Uses real API with fallback
   */
  getProfileById(id: string): Observable<FacialProfile | null> {
    return this.http.get<any>(`${this.apiUrl}/api/facial-recognition/profiles/${id}`).pipe(
      map((item: any) => {
        if (!item) return null;
        return this.mapToFacialProfile(item);
      }),
      catchError(error => {
        console.error('Error fetching facial profile:', error);
        return of(null);
      })
    );
  }

  /** Read image file with stable base64 so enroll + verify fingerprints match. */
  async fileToDataUrl(file: File): Promise<string> {
    return fileToStableDataUrl(file);
  }

  /**
   * Create new facial recognition profile
   * Uses real API
   */
  createProfile(request: CreateFacialProfileRequest): Observable<FacialRecognitionResponse> {
    const enrollRequest = {
      personName: request.personName,
      phone: request.phone,
      email: request.email,
      flatNumber: request.flatNumber,
      personType: request.personType,
      allowedGates: request.allowedGates,
      accessLevel: request.accessLevel,
      deviceId: this.getDeviceId(),
      deviceType: this.getDeviceType(),
      faceImage: request.faceImage,
      confidenceThreshold: request.confidenceThreshold || 85,
      societyId: this.session.getSocietyId() || undefined
    };

    return this.http.post<FacialRecognitionResponse>(
      `${this.apiUrl}/api/facial-recognition/profiles`,
      enrollRequest
    ).pipe(
      map((response: any) => {
        // Convert response to FacialRecognitionResponse format
        return {
          success: response.success || true,
          message: response.message || 'Facial profile created successfully',
          profile: response.profile ? this.mapToFacialProfile(response.profile) : undefined,
          matchFound: false,
          biometricAuthId: response.biometricAuthId
        };
      }),
      catchError(error => {
        console.error('Error creating profile:', error);
        const msg =
          error.error?.message ||
          error.error?.errors?.[0] ||
          'Failed to create facial profile';
        return of({
          success: false,
          message: msg,
          matchFound: false,
          errors: error.error?.errors || [msg]
        });
      })
    );
  }

  /**
   * Get device ID
   */
  private getDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'DEV-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  /**
   * Get device type
   */
  private getDeviceType(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || 
        userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      return 'MOBILE';
    }
    return 'WEB';
  }

  /**
   * Verify face for entry
   * Uses real API
   */
  verifyFace(request: VerifyFaceRequest): Observable<FacialRecognitionResponse> {
    const verifyRequest: any = {
      deviceId: this.getDeviceId(),
      deviceType: this.getDeviceType(),
      faceImage: request.faceImage,
      gateId: request.gateId,
      temperature: request.temperature,
      location: request.location
    };

    return this.http.post<FacialRecognitionResponse>(
      `${this.apiUrl}/api/facial-recognition/verify`,
      verifyRequest
    ).pipe(
      map((response: any): FacialRecognitionResponse => {
        return {
          success: response.success || false,
          message: response.message || 'Face verification completed',
          profile: this.profileFromVerifyResponse(response),
          entry: response.entry,
          confidence: response.confidence,
          matchFound: response.matchFound || false,
          errors: response.errors
        };
      }),
      catchError(error => {
        console.error('Error verifying face:', error);
        const msg = error.error?.message ?? 'Face verification request failed';
        return of({
          success: false,
          message: msg,
          matchFound: false,
          errors: [msg]
        });
      })
    );
  }

  /**
   * Get all entry records
   * Uses real API with fallback
   */
  getAllEntries(filter?: FacialRecognitionFilter): Observable<FacialRecognitionEntry[]> {
    let params = new HttpParams();
    if (filter?.gateId) {
      params = params.set('gateId', filter.gateId);
    }
    if (filter?.dateFrom) {
      params = params.set('dateFrom', filter.dateFrom.toISOString());
    }
    if (filter?.dateTo) {
      params = params.set('dateTo', filter.dateTo.toISOString());
    }

    return this.http.get<any[]>(`${this.apiUrl}/api/facial-recognition/entries`, { params }).pipe(
      map((response: any[]) => (response ?? []).map(item => this.mapToEntry(item))),
      catchError(error => {
        console.error('Error fetching facial entries:', error);
        return of([]);
      })
    );
  }

  /**
   * Map API response to FacialRecognitionEntry
   */
  private mapToEntry(item: any): FacialRecognitionEntry {
    return {
      id: item.id,
      profileId: item.profileId,
      profile: item.profile ? this.mapToFacialProfile(item.profile) : undefined,
      gateId: item.gateId,
      gateName: item.gateName || this.getGateName(item.gateId),
      entryType: item.entryType || 'ENTRY',
      status: this.mapEntryStatus(item.status),
      confidence: item.confidence || 0,
      timestamp: new Date(item.timestamp),
      faceImage: item.faceImage,
      temperature: item.temperature,
      maskDetected: item.maskDetected !== false,
      verificationMethod: item.verificationMethod || 'FACE_ONLY',
      verifiedBy: item.verifiedBy,
      rejectionReason: item.rejectionReason,
      location: item.location
    };
  }

  /** Map entry row status to EntryStatus. */
  private mapEntryStatus(status: string): EntryStatus {
    if (!status) return EntryStatus.SUCCESS;
    const u = String(status).toUpperCase();
    const allowed = Object.values(EntryStatus) as string[];
    return (allowed.includes(u) ? u : EntryStatus.SUCCESS) as EntryStatus;
  }

  getStatistics(): Observable<FacialRecognitionStatistics> {
    return this.http.get<any>(`${this.apiUrl}/api/facial-recognition/statistics`, {
      params: this.societyParams()
    }).pipe(
      map((response: any) => {
        return {
          totalProfiles: response.totalProfiles || 0,
          activeProfiles: response.activeProfiles || 0,
          totalEntries: response.totalEntries || 0,
          successfulEntries: response.successfulEntries || 0,
          failedEntries: response.failedEntries || 0,
          entriesToday: response.entriesToday || 0,
          byType: response.byType || {
            resident: 0,
            staff: 0,
            visitor: 0,
            domesticHelp: 0,
            vendor: 0
          },
          byGate: response.byGate || {},
          averageConfidence: response.averageConfidence || 0
        };
      }),
      catchError(error => {
        console.error('Error fetching facial statistics:', error);
        return of(this.emptyStatistics());
      })
    );
  }

  /**
   * Update profile status
   * Uses real API
   */
  updateProfileStatus(profileId: string, status: RecognitionStatus): Observable<FacialRecognitionResponse> {
    return this.http.patch<any>(
      `${this.apiUrl}/api/facial-recognition/profiles/${profileId}/status`,
      { status: status }
    ).pipe(
      map((response: any) => {
        return {
          success: response.success || true,
          message: response.message || 'Profile status updated successfully',
          matchFound: false
        };
      }),
      catchError(error => {
        console.error('Error updating profile status:', error);
        return of({
          success: false,
          message: error.error?.message || 'Failed to update profile status',
          matchFound: false,
          errors: error.error?.errors || [error.message]
        });
      })
    );
  }

  /**
   * Delete profile
   * Uses real API
   */
  deleteProfile(profileId: string): Observable<FacialRecognitionResponse> {
    return this.http.delete<any>(
      `${this.apiUrl}/api/facial-recognition/profiles/${profileId}`
    ).pipe(
      map((response: any) => {
        return {
          success: response.success || true,
          message: response.message || 'Profile deleted successfully',
          matchFound: false
        };
      }),
      catchError(error => {
        console.error('Error deleting profile:', error);
        return of({
          success: false,
          message: error.error?.message || 'Failed to delete profile',
          matchFound: false,
          errors: error.error?.errors || [error.message]
        });
      })
    );
  }

  /** Build UI profile from gate verify API (matchedPersonName / biometricAuthId). */
  private profileFromVerifyResponse(response: any): FacialProfile | undefined {
    if (response.profile) {
      return this.mapToFacialProfile(response.profile);
    }
    if (!response.matchedPersonName && !response.biometricAuthId) {
      return undefined;
    }
    return {
      id: response.biometricAuthId || '',
      personId: response.userId || response.biometricAuthId || '',
      personName: response.matchedPersonName || 'Matched profile',
      personType: EntryType.RESIDENT,
      phone: response.matchedPersonPhone || '',
      faceId: response.biometricAuthId || '',
      confidenceThreshold: 85,
      status: RecognitionStatus.ACTIVE,
      accessLevel: 'FULL',
      allowedGates: ['MAIN_GATE'],
      registeredAt: new Date(),
      registeredBy: 'SYSTEM',
      totalEntries: 0,
      failedAttempts: 0,
      isActive: true
    };
  }

  private getGateName(gateId: string): string {
    const gates: { [key: string]: string } = {
      'MAIN_GATE': 'Main Gate',
      'SIDE_GATE': 'Side Gate',
      'PARKING_GATE': 'Parking Gate',
      'EMERGENCY_GATE': 'Emergency Gate'
    };
    return gates[gateId] || gateId;
  }
}

