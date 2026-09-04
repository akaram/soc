import { Injectable } from '@angular/core';
import { Observable, of, delay, throwError } from 'rxjs';
import {
  RegistrationData,
  RegistrationResponse,
  DocumentVerificationResponse,
  DocumentType,
  BasicInfo,
  AddressInfo,
  DocumentInfo
} from '../models/registration.model';

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {
  
  private registrationData: RegistrationData = this.getInitialRegistrationData();

  constructor() { }

  // Document types configuration
  getIdProofTypes(): DocumentType[] {
    return [
      { value: 'passport', label: 'Passport', acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'] },
      { value: 'driving_license', label: 'Driving License', acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'] },
      { value: 'aadhaar', label: 'Aadhaar Card', acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'] },
      { value: 'voter_id', label: 'Voter ID Card', acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'] },
      { value: 'pan', label: 'PAN Card', acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'] }
    ];
  }

  getAddressProofTypes(): DocumentType[] {
    return [
      { value: 'utility_bill', label: 'Utility Bill', acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'] },
      { value: 'bank_statement', label: 'Bank Statement', acceptedFormats: ['application/pdf'] },
      { value: 'rental_agreement', label: 'Rental Agreement', acceptedFormats: ['application/pdf'] },
      { value: 'property_tax', label: 'Property Tax Receipt', acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'] },
      { value: 'aadhaar', label: 'Aadhaar Card', acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'] }
    ];
  }

  // Initialize registration data
  private getInitialRegistrationData(): RegistrationData {
    return {
      basicInfo: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        dateOfBirth: null,
        gender: ''
      },
      addressInfo: {
        flatNumber: '',
        building: '',
        society: '',
        street: '',
        area: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      },
      documentInfo: {
        idProofType: '',
        idProofNumber: '',
        idProofFile: null,
        addressProofType: '',
        addressProofNumber: '',
        addressProofFile: null,
        verified: false,
        verificationStatus: ''
      },
      currentStep: 0
    };
  }

  // Get current registration data
  getRegistrationData(): RegistrationData {
    return { ...this.registrationData };
  }

  // Update registration data
  updateRegistrationData(data: Partial<RegistrationData>): void {
    this.registrationData = { ...this.registrationData, ...data };
  }

  // Save basic info (Step 1)
  saveBasicInfo(basicInfo: BasicInfo): Observable<{ success: boolean; message: string }> {
    // Simulate API call with delay
    return of({
      success: true,
      message: 'Basic information saved successfully'
    }).pipe(delay(1000));
  }

  // Validate email (dummy check)
  validateEmail(email: string): Observable<{ available: boolean; message: string }> {
    // Simulate API call
    const existingEmails = ['test@example.com', 'admin@society.com'];
    const isAvailable = !existingEmails.includes(email.toLowerCase());
    
    return of({
      available: isAvailable,
      message: isAvailable ? 'Email is available' : 'Email already exists'
    }).pipe(delay(500));
  }

  // Validate phone (dummy check)
  validatePhone(phone: string): Observable<{ available: boolean; message: string }> {
    // Simulate API call
    const existingPhones = ['9876543210', '1234567890'];
    const isAvailable = !existingPhones.includes(phone);
    
    return of({
      available: isAvailable,
      message: isAvailable ? 'Phone number is available' : 'Phone number already registered'
    }).pipe(delay(500));
  }

  // Save address info (Step 2)
  saveAddressInfo(addressInfo: AddressInfo): Observable<{ success: boolean; message: string }> {
    // Simulate API call with delay
    return of({
      success: true,
      message: 'Address information saved successfully'
    }).pipe(delay(1000));
  }

  // Upload and verify document
  uploadDocument(file: File, documentType: string): Observable<{ 
    success: boolean; 
    fileUrl: string; 
    message: string;
  }> {
    // Simulate file upload
    const fileUrl = `https://storage.society.com/documents/${Date.now()}_${file.name}`;
    
    return of({
      success: true,
      fileUrl: fileUrl,
      message: 'Document uploaded successfully'
    }).pipe(delay(2000));
  }

  // Verify document (AI/ML simulation)
  verifyDocument(
    file: File, 
    documentType: string, 
    documentNumber: string
  ): Observable<DocumentVerificationResponse> {
    // Simulate document verification with AI
    // In real implementation, this would call an AI service
    
    return of({
      success: true,
      documentType: documentType,
      verified: true,
      confidence: 0.95,
      extractedData: {
        documentNumber: documentNumber,
        name: 'John Doe',
        dateOfBirth: '1990-01-01',
        address: '123 Main Street, City',
        expiryDate: '2030-12-31'
      },
      issues: []
    }).pipe(delay(3000));
  }

  // Save document info (Step 3)
  saveDocumentInfo(documentInfo: DocumentInfo): Observable<{ success: boolean; message: string }> {
    // Simulate API call with delay
    return of({
      success: true,
      message: 'Documents saved successfully'
    }).pipe(delay(1000));
  }

  // Submit complete registration
  submitRegistration(registrationData: RegistrationData): Observable<RegistrationResponse> {
    // Simulate final registration submission
    const registrationId = 'REG' + Date.now();
    
    // Simulate some scenarios
    const random = Math.random();
    
    if (random > 0.9) {
      // Simulate error scenario (10% chance)
      return throwError(() => ({
        success: false,
        message: 'Registration failed',
        error: 'Unable to process registration. Please try again.'
      })).pipe(delay(2000));
    }
    
    return of({
      success: true,
      message: 'Registration completed successfully',
      data: {
        userId: 'USR' + Date.now(),
        registrationId: registrationId,
        verificationStatus: 'pending',
        estimatedVerificationTime: '24-48 hours'
      }
    }).pipe(delay(2000));
  }

  // Reset registration data
  resetRegistration(): void {
    this.registrationData = this.getInitialRegistrationData();
  }

  // Get registration by ID (for tracking)
  getRegistrationStatus(registrationId: string): Observable<{
    status: string;
    message: string;
    data: any;
  }> {
    // Simulate fetching registration status
    const statuses = ['pending', 'under_review', 'approved', 'rejected'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    return of({
      status: randomStatus,
      message: `Your registration is currently ${randomStatus}`,
      data: {
        registrationId: registrationId,
        submittedAt: new Date(Date.now() - 86400000).toISOString(),
        currentStatus: randomStatus,
        statusHistory: [
          { status: 'submitted', timestamp: new Date(Date.now() - 86400000).toISOString() },
          { status: 'under_review', timestamp: new Date(Date.now() - 43200000).toISOString() },
          { status: randomStatus, timestamp: new Date().toISOString() }
        ]
      }
    }).pipe(delay(1500));
  }
}
