import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  FALLBACK_INDIAN_STATES,
  allFallbackCities,
  fallbackCitiesForState
} from './registration-locations.data';

export interface RegistrationStep1Data {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  userType: string; // OWNER, TENANT, FAMILY_MEMBER, PG_GUEST
  userStatus: string; // ACTIVE, INACTIVE
  password: string;
  confirmPassword: string;
}

export interface RegistrationStep2Data {
  flatNumber: string;
  tower: string;
  society: string;
  societyId?: string;
  city: string;
  state: string;
  pincode: string;
  dateOfBirth: string;
  gender: string;
  occupation: string;
}

/** Society option for registration dropdown (from GET /societies). */
export interface RegistrationSocietyOption {
  id: string;
  name: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface PincodeLookupResult {
  success: boolean;
  message?: string;
  pincode?: string;
  city?: string;
  state?: string;
  areas?: string[];
}

export interface DocumentUpload {
  documentType: string;
  /** User-selected variant, e.g. AADHAAR, ELECTRICITY_BILL */
  selectedDocumentType: string;
  fileName: string;
  fileSize: number;
  uploadDate: Date;
  base64Data: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  validationMessage?: string;
  validationConfidence?: number;
  detectedType?: string;
}

export interface RegistrationData {
  step1: RegistrationStep1Data | null;
  step2: RegistrationStep2Data | null;
  documents: DocumentUpload[];
  currentStep: number;
  registrationId: string;
}

export interface VerificationResult {
  success: boolean;
  message: string;
  documentType: string;
  confidence: number;
  extractedData?: any;
}

/**
 * Registration API Request Interface
 */
export interface RegistrationApiRequest {
  // Step 1: Basic Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  userType: string; // OWNER, TENANT, FAMILY_MEMBER, PG_GUEST
  userStatus: string; // ACTIVE, INACTIVE
  password: string;
  confirmPassword: string;
  
  // Step 2: Address & Personal Details
  flatNumber: string;
  tower: string;
  society: string;
  societyId?: string;
  city: string;
  state: string;
  pincode: string;
  dateOfBirth: string; // Format: yyyy-MM-dd
  gender: string;
  occupation: string;
  
  // Step 3: Documents
  documents: Array<{
    documentType: string;
    fileName: string;
    fileSize: number;
    base64Data: string;
    mimeType: string;
  }>;
  
  // Device information
  deviceId: string;
  deviceType: string;
}

/**
 * Registration API Response Interface
 */
export interface RegistrationApiResponse {
  userId: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  emailVerificationRequired: boolean;
  phoneVerificationRequired: boolean;
  sessionToken?: string;
  refreshToken?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {
  private registrationData: RegistrationData = {
    step1: null,
    step2: null,
    documents: [],
    currentStep: 1,
    registrationId: this.generateRegistrationId()
  };

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  private generateRegistrationId(): string {
    return 'REG-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  // Save Step 1 Data
  saveStep1Data(data: RegistrationStep1Data): Observable<{ success: boolean; message: string }> {
    return new Observable(observer => {
      setTimeout(() => {
        this.registrationData.step1 = data;
        this.registrationData.currentStep = 2;
        observer.next({ 
          success: true, 
          message: 'Basic information saved successfully' 
        });
        observer.complete();
      }, 1000);
    });
  }

  // Save Step 2 Data
  saveStep2Data(data: RegistrationStep2Data): Observable<{ success: boolean; message: string }> {
    return new Observable(observer => {
      setTimeout(() => {
        this.registrationData.step2 = data;
        this.registrationData.currentStep = 3;
        observer.next({ 
          success: true, 
          message: 'Address details saved successfully' 
        });
        observer.complete();
      }, 1000);
    });
  }

  // Upload Document — stores only after caller validates via AI service
  uploadDocument(
    file: File,
    documentType: string,
    selectedDocumentType: string,
    base64Data: string,
    validation: { message: string; confidence: number; detectedType?: string }
  ): Observable<{ success: boolean; message: string; document: DocumentUpload }> {
    return new Observable(observer => {
      // Remove prior upload for same slot
      this.registrationData.documents = this.registrationData.documents.filter(
        d => d.documentType !== documentType
      );

      const document: DocumentUpload = {
        documentType,
        selectedDocumentType,
        fileName: file.name,
        fileSize: file.size,
        uploadDate: new Date(),
        base64Data,
        verificationStatus: 'pending',
        validationMessage: validation.message,
        validationConfidence: validation.confidence,
        detectedType: validation.detectedType
      };

      this.registrationData.documents.push(document);

      observer.next({
        success: true,
        message: validation.message || `${documentType} uploaded successfully`,
        document
      });
      observer.complete();
    });
  }

  // Verify Documents — re-check stored validation confidence
  verifyDocuments(): Observable<VerificationResult[]> {
    return new Observable(observer => {
      setTimeout(() => {
        const results: VerificationResult[] = this.registrationData.documents.map(doc => {
          const confidence = doc.validationConfidence ?? 0;
          const isVerified = confidence >= 70 && doc.verificationStatus !== 'rejected';

          doc.verificationStatus = isVerified ? 'verified' : 'rejected';

          return {
            success: isVerified,
            message: isVerified
              ? (doc.validationMessage || `${doc.documentType} verified successfully`)
              : (doc.validationMessage || `${doc.documentType} verification failed — please re-upload the correct document`),
            documentType: doc.documentType,
            confidence,
            extractedData: this.getExtractedDummyData(doc.documentType, doc.selectedDocumentType)
          };
        });

        this.registrationData.currentStep = 4;

        observer.next(results);
        observer.complete();
      }, 1500);
    });
  }

  // Get Extracted Dummy Data based on Document Type
  private getExtractedDummyData(documentType: string, selectedType?: string): any {
    const variant = (selectedType || documentType).toUpperCase();
    switch (documentType) {
      case 'Aadhar Card':
      case 'ID Proof':
        return {
          documentVariant: variant,
          name: this.registrationData.step1?.firstName + ' ' + this.registrationData.step1?.lastName,
          idNumber: 'XXXX-XXXX-' + Math.floor(1000 + Math.random() * 9000),
          dob: this.registrationData.step2?.dateOfBirth,
          address: `${this.registrationData.step2?.flatNumber}, ${this.registrationData.step2?.tower}`
        };
      
      case 'Address Proof':
        return {
          address: `${this.registrationData.step2?.flatNumber}, ${this.registrationData.step2?.tower}, ${this.registrationData.step2?.city}`,
          pincode: this.registrationData.step2?.pincode,
          state: this.registrationData.step2?.state
        };
      
      case 'Photo':
        return {
          faceDetected: true,
          quality: 'Good',
          matchWithId: Math.random() > 0.2 // 80% match rate
        };
      
      default:
        return {};
    }
  }

  /**
   * Submit Final Registration - Calls Backend API
   * 
   * POST http://localhost:9999/api/auth/register
   * 
   * Sends all collected registration data from Steps 1-5 to the backend:
   * - Step 1: Basic information (name, email, phone, password)
   * - Step 2: Address & personal details (flat, society, city, DOB, gender, occupation)
   * - Step 3: Documents (base64 encoded)
   * - Device information (deviceId, deviceType)
   * 
   * @returns Observable with success status, message, and registration ID
   */
  submitRegistration(): Observable<{ success: boolean; message: string; registrationId: string }> {
    // Check if all required data is present
    if (!this.registrationData.step1 || !this.registrationData.step2) {
      return throwError(() => new Error('Please complete all steps before submitting'));
    }

    // Check if all documents are verified
    const allVerified = this.registrationData.documents.every(
      doc => doc.verificationStatus === 'verified'
    );

    if (!allVerified && this.registrationData.documents.length > 0) {
      return throwError(() => new Error('Please ensure all documents are verified before submitting'));
    }

    // Prepare registration request with all data
    const registrationRequest: RegistrationApiRequest = {
      // Step 1: Basic Information
      firstName: this.registrationData.step1.firstName,
      lastName: this.registrationData.step1.lastName,
      email: this.registrationData.step1.email,
      phone: this.registrationData.step1.phone,
      userType: this.registrationData.step1.userType || 'OWNER', // Default to OWNER if not provided
      userStatus: this.registrationData.step1.userStatus || 'INACTIVE', // Default to INACTIVE if not provided
      password: this.registrationData.step1.password,
      confirmPassword: this.registrationData.step1.confirmPassword,
      
      // Step 2: Address & Personal Details
      flatNumber: this.registrationData.step2.flatNumber,
      tower: this.registrationData.step2.tower,
      society: this.registrationData.step2.society,
      societyId: this.registrationData.step2.societyId,
      city: this.registrationData.step2.city,
      state: this.registrationData.step2.state,
      pincode: this.registrationData.step2.pincode,
      dateOfBirth: this.formatDateOfBirth(this.registrationData.step2.dateOfBirth), // Ensure yyyy-MM-dd format
      gender: this.registrationData.step2.gender,
      occupation: this.registrationData.step2.occupation,
      
      // Step 3: Documents - Map frontend document types to backend enum values
      documents: this.registrationData.documents.map(doc => ({
        documentType: this.mapFrontendDocumentTypeToBackend(
          doc.selectedDocumentType || doc.documentType
        ),
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        base64Data: this.extractBase64Data(doc.base64Data), // Remove data:image/jpeg;base64, prefix
        mimeType: this.getMimeTypeFromBase64(doc.base64Data)
      })),
      
      // Device information
      deviceId: this.getDeviceId(),
      deviceType: this.getDeviceType()
    };

    // Call backend registration API
    // Endpoint: POST /auth/register (uses RegistrationRequest DTO)
    // Note: /users/register expects User entity, not RegistrationRequest - use /auth/register instead
    return this.http.post<RegistrationApiResponse>('/auth/register', registrationRequest).pipe(
      map(response => ({
        success: true,
        message: response.message || 'Registration completed successfully! Your account is under review.',
        registrationId: response.userId || this.registrationData.registrationId
      })),
      catchError(error => {
        console.error('Registration error:', error);
        const errorMessage = error.error?.message || error.message || 'Registration failed. Please try again.';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Format date of birth to yyyy-MM-dd format
   */
  private formatDateOfBirth(dateString: string): string {
    if (!dateString) return '';
    
    // If already in yyyy-MM-dd format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Try to parse and format
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return as is if invalid
      }
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.warn('Error formatting dateOfBirth:', e);
      return dateString; // Return as is if parsing fails
    }
  }

  /**
   * Extract base64 data from data URL
   */
  private extractBase64Data(dataUrl: string): string {
    if (!dataUrl) return '';
    
    // If it's already just base64 data, return as is
    if (!dataUrl.includes(',')) {
      return dataUrl;
    }
    
    // Extract base64 part after comma
    const parts = dataUrl.split(',');
    return parts.length > 1 ? parts[1] : dataUrl;
  }

  /**
   * Map frontend document type to backend enum value
   * Backend expects: AADHAAR, PAN, PASSPORT, DRIVING_LICENSE, VOTER_ID,
   *                 ELECTRICITY_BILL, RENT_AGREEMENT, SALE_DEED, PHOTO
   */
  private mapFrontendDocumentTypeToBackend(frontendType: string): string {
    const type = frontendType.toUpperCase().trim();

    const directTypes = [
      'AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID',
      'ELECTRICITY_BILL', 'RENT_AGREEMENT', 'SALE_DEED', 'PHOTO'
    ];
    if (directTypes.includes(type)) {
      return type;
    }
    
    // Aadhar Card / ID Proof
    if (type.includes('AADHAR') || type.includes('AADHAAR') || type.includes('ID_PROOF') || type.includes('ID PROOF')) {
      return 'AADHAAR';
    }
    
    // Address Proof
    if (type.includes('ADDRESS_PROOF') || type.includes('ADDRESS PROOF')) {
      if (type.includes('ELECTRICITY') || type.includes('BILL')) {
        return 'ELECTRICITY_BILL';
      }
      if (type.includes('RENT') || type.includes('AGREEMENT')) {
        return 'RENT_AGREEMENT';
      }
      return 'ELECTRICITY_BILL'; // Default for address proof
    }
    
    // Photo
    if (type.includes('PHOTO') || type.includes('PICTURE') || type.includes('PASSPORT SIZE')) {
      return 'PHOTO';
    }
    
    // Other document types
    if (type.includes('PAN')) {
      return 'PAN';
    }
    if (type.includes('PASSPORT')) {
      return 'PASSPORT';
    }
    if (type.includes('DRIVING') || type.includes('LICENSE')) {
      return 'DRIVING_LICENSE';
    }
    if (type.includes('VOTER')) {
      return 'VOTER_ID';
    }
    if (type.includes('SALE') || type.includes('DEED')) {
      return 'SALE_DEED';
    }
    
    // Default to PHOTO if unknown
    console.warn(`Unknown document type: ${frontendType}, defaulting to PHOTO`);
    return 'PHOTO';
  }

  /**
   * Get MIME type from base64 data URL
   */
  private getMimeTypeFromBase64(base64Data: string): string {
    if (base64Data.startsWith('data:')) {
      const mimeMatch = base64Data.match(/data:([^;]+)/);
      return mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    }
    
    // Try to detect from file extension or default
    // For now, default to image/jpeg for images, application/pdf for PDFs
    if (base64Data.includes('image')) {
      return 'image/jpeg';
    }
    if (base64Data.includes('pdf')) {
      return 'application/pdf';
    }
    
    return 'application/octet-stream';
  }

  /**
   * Get device ID
   */
  private getDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  /**
   * Get device type
   */
  private getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPad/.test(ua)) {
      return 'MOBILE';
    }
    return 'WEB';
  }

  // Check Email Availability - Calls Backend API
  checkEmailAvailability(email: string): Observable<{ available: boolean }> {
    if (!email || email.trim() === '') {
      return of({ available: false });
    }

    // Call backend to check email availability
    // Endpoint: GET /users/email/{email}/available
    // Returns: { available: boolean, message: string }
    return this.http.get<{ available: boolean; message: string }>(
      `/users/email/${encodeURIComponent(email)}/available`
    ).pipe(
      map(response => ({ available: response.available })),
      catchError(error => {
        console.error('Error checking email availability:', error);
        // For errors, assume available to not block registration
        return of({ available: true });
      })
    );
  }

  // Check Phone Availability - Calls Backend API
  checkPhoneAvailability(phone: string): Observable<{ available: boolean }> {
    if (!phone || phone.trim() === '') {
      return of({ available: false });
    }

    // Call backend to check phone availability
    // Endpoint: GET /users/phone/{phone}/available
    // Returns: { available: boolean, message: string }
    return this.http.get<{ available: boolean; message: string }>(
      `/users/phone/${encodeURIComponent(phone)}/available`
    ).pipe(
      map(response => ({ available: response.available })),
      catchError(error => {
        console.error('Error checking phone availability:', error);
        // For errors, assume available to not block registration
        return of({ available: true });
      })
    );
  }

  // Get Registration Data
  getRegistrationData(): RegistrationData {
    return this.registrationData;
  }

  // Get Current Step
  getCurrentStep(): number {
    return this.registrationData.currentStep;
  }

  // Set Current Step
  setCurrentStep(step: number): void {
    this.registrationData.currentStep = step;
  }

  // Get Uploaded Documents
  getUploadedDocuments(): DocumentUpload[] {
    return this.registrationData.documents;
  }

  // Remove Document
  removeDocument(fileName: string): void {
    this.registrationData.documents = this.registrationData.documents.filter(
      doc => doc.fileName !== fileName
    );
  }

  // Reset Registration Data
  resetRegistration(): void {
    this.registrationData = {
      step1: null,
      step2: null,
      documents: [],
      currentStep: 1,
      registrationId: this.generateRegistrationId()
    };
  }

  /** Live societies from backend (Society Setup). */
  getSocietiesList(): Observable<RegistrationSocietyOption[]> {
    return this.http.get<Array<Record<string, unknown>>>('/societies').pipe(
      map(rows =>
        (rows ?? [])
          .filter(s => String(s['status'] ?? 'ACTIVE').toUpperCase() !== 'INACTIVE')
          .map(s => ({
            id: String(s['id'] ?? ''),
            name: String(s['name'] ?? ''),
            city: s['city'] != null ? String(s['city']) : undefined,
            state: s['state'] != null ? String(s['state']) : undefined,
            pincode: s['pincode'] != null ? String(s['pincode']) : undefined
          }))
          .filter(s => s.id && s.name)
          .sort((a, b) => a.name.localeCompare(b.name))
      ),
      catchError(err => {
        console.error('Failed to load societies:', err);
        return of([]);
      })
    );
  }

  /** Indian states from backend location API (fallback list if API unreachable). */
  getStatesList(): Observable<string[]> {
    return this.http.get<string[]>('/locations/states').pipe(
      map(rows => (rows?.length ? rows : [...FALLBACK_INDIAN_STATES])),
      catchError(err => {
        console.error('Failed to load states, using fallback list:', err);
        return of([...FALLBACK_INDIAN_STATES]);
      })
    );
  }

  /** Cities for a state (or all) from backend location API (fallback if API unreachable). */
  getCitiesList(state?: string): Observable<string[]> {
    let url = '/locations/cities';
    if (state?.trim()) {
      url += `?state=${encodeURIComponent(state.trim())}`;
    }
    return this.http.get<string[]>(url).pipe(
      map(rows => {
        const apiRows = rows ?? [];
        if (apiRows.length > 0) {
          return apiRows;
        }
        return state?.trim() ? fallbackCitiesForState(state) : allFallbackCities();
      }),
      catchError(err => {
        console.error('Failed to load cities, using fallback list:', err);
        return of(state?.trim() ? fallbackCitiesForState(state) : allFallbackCities());
      })
    );
  }

  /** Auto-fill city/state from India Post pincode API (via backend proxy). */
  lookupPincode(pincode: string): Observable<PincodeLookupResult> {
    return this.http.get<PincodeLookupResult>(`/locations/pincode/${encodeURIComponent(pincode)}`).pipe(
      catchError(() => of({ success: false, message: 'Pincode lookup failed' }))
    );
  }
}
