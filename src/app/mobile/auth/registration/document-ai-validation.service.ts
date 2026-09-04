import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/** Document variant the user selects before uploading. */
export type RegistrationDocumentVariant =
  | 'AADHAAR'
  | 'PAN'
  | 'PASSPORT'
  | 'DRIVING_LICENSE'
  | 'VOTER_ID'
  | 'ELECTRICITY_BILL'
  | 'RENT_AGREEMENT'
  | 'PHOTO';

export interface DocumentValidationResult {
  valid: boolean;
  message: string;
  confidence: number;
  expectedType: string;
  detectedType?: string;
}

/** Options shown per upload slot on registration step 3. */
export interface DocumentSlotConfig {
  type: string;
  label: string;
  required: boolean;
  icon: string;
  variants: Array<{ value: RegistrationDocumentVariant; label: string }>;
  defaultVariant: RegistrationDocumentVariant;
}

/**
 * Calls backend AI/heuristic document validation before accepting uploads.
 */
@Injectable({ providedIn: 'root' })
export class DocumentAiValidationService {
  constructor(private http: HttpClient) {}

  /** Slot definitions with selectable document types per category. */
  getDocumentSlots(): DocumentSlotConfig[] {
    return [
      {
        type: 'Aadhar Card',
        label: 'Aadhar Card / ID Proof',
        required: true,
        icon: '🪪',
        defaultVariant: 'AADHAAR',
        variants: [
          { value: 'AADHAAR', label: 'Aadhaar Card' },
          { value: 'PAN', label: 'PAN Card' },
          { value: 'PASSPORT', label: 'Passport' },
          { value: 'DRIVING_LICENSE', label: 'Driving Licence' },
          { value: 'VOTER_ID', label: 'Voter ID Card' }
        ]
      },
      {
        type: 'Address Proof',
        label: 'Address Proof (Electricity Bill/Rent Agreement)',
        required: true,
        icon: '📄',
        defaultVariant: 'ELECTRICITY_BILL',
        variants: [
          { value: 'ELECTRICITY_BILL', label: 'Electricity Bill' },
          { value: 'RENT_AGREEMENT', label: 'Rent Agreement' }
        ]
      },
      {
        type: 'Photo',
        label: 'Passport Size Photo',
        required: true,
        icon: '📸',
        defaultVariant: 'PHOTO',
        variants: [{ value: 'PHOTO', label: 'Passport Size Photo' }]
      }
    ];
  }

  /**
   * Validate file against expected slot + selected document type via POST /documents/validate-upload.
   */
  validateFile(
    file: File,
    slotType: string,
    selectedDocumentType: RegistrationDocumentVariant,
    base64Data: string
  ): Observable<DocumentValidationResult> {
    const body = {
      slotType,
      selectedDocumentType,
      fileName: file.name,
      mimeType: file.type,
      base64Data
    };

    return this.http.post<Record<string, unknown>>('/auth/register/validate-document', body).pipe(
      map(raw => ({
        valid: Boolean(raw['valid']),
        message: String(raw['message'] ?? 'Validation completed'),
        confidence: Number(raw['confidence'] ?? 0),
        expectedType: String(raw['expectedType'] ?? selectedDocumentType),
        detectedType: raw['detectedType'] != null ? String(raw['detectedType']) : undefined
      })),
      catchError(() =>
        of({
          valid: false,
          message:
            'Document validation service unavailable. Start the backend API and try again.',
          confidence: 0,
          expectedType: selectedDocumentType
        })
      )
    );
  }

  /** Read file as data URL for validation + storage. */
  readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsDataURL(file);
    });
  }
}
