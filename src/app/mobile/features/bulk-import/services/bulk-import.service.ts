import { Injectable } from '@angular/core';
import { Observable, of, delay, throwError, interval } from 'rxjs';
import { map, take } from 'rxjs/operators';
import {
  BulkImportSession,
  ImportStatus,
  ResidentImportData,
  ImportValidationResult,
  ImportError,
  ImportWarning,
  ImportProgress,
  ImportSummary,
  ResidentType,
  VehicleType,
  FileUploadResponse,
  EXCEL_TEMPLATE_COLUMNS
} from '../models/bulk-import.model';

@Injectable({
  providedIn: 'root'
})
export class BulkImportService {
  private importSessions: BulkImportSession[] = [];
  
  // Dummy data for testing
  private dummyImportData: ResidentImportData[] = [
    {
      rowNumber: 2,
      isValid: true,
      validationErrors: [],
      validationWarnings: [],
      flatNumber: 'A-101',
      block: 'A',
      floor: '1',
      ownerName: 'Rajesh Sharma',
      email: 'rajesh.sharma@example.com',
      phoneNumber: '+91 9876543210',
      alternatePhone: '+91 9876543211',
      residentType: ResidentType.OWNER,
      familyMemberCount: 2,
      familyMembers: [
        { name: 'Priya Sharma', relationship: 'Spouse', age: 35, phoneNumber: '+91 9876543212' },
        { name: 'Rohan Sharma', relationship: 'Son', age: 10 }
      ],
      vehicleCount: 2,
      vehicles: [
        { vehicleType: VehicleType.FOUR_WHEELER, registrationNumber: 'MH12AB1234', brand: 'Honda', model: 'City', color: 'Silver' },
        { vehicleType: VehicleType.TWO_WHEELER, registrationNumber: 'MH12CD5678', brand: 'Hero', model: 'Splendor' }
      ],
      occupancyDate: new Date('2024-01-15'),
      emergencyContactName: 'Amit Sharma',
      emergencyContactPhone: '+91 9876543213',
      status: 'pending'
    },
    {
      rowNumber: 3,
      isValid: true,
      validationErrors: [],
      validationWarnings: ['Alternate phone number not provided'],
      flatNumber: 'A-102',
      block: 'A',
      floor: '1',
      ownerName: 'Priya Mehta',
      email: 'priya.mehta@example.com',
      phoneNumber: '+91 9988776655',
      residentType: ResidentType.OWNER,
      familyMemberCount: 3,
      familyMembers: [
        { name: 'Rohit Mehta', relationship: 'Spouse', age: 38 },
        { name: 'Aarav Mehta', relationship: 'Son', age: 12 },
        { name: 'Diya Mehta', relationship: 'Daughter', age: 8 }
      ],
      vehicleCount: 1,
      vehicles: [
        { vehicleType: VehicleType.FOUR_WHEELER, registrationNumber: 'MH12EF9012', brand: 'Maruti', model: 'Swift' }
      ],
      occupancyDate: new Date('2024-02-01'),
      emergencyContactName: 'Neha Mehta',
      emergencyContactPhone: '+91 9988776656',
      status: 'pending'
    },
    {
      rowNumber: 4,
      isValid: false,
      validationErrors: ['Invalid email format', 'Phone number must start with +91'],
      validationWarnings: [],
      flatNumber: 'B-201',
      block: 'B',
      floor: '2',
      ownerName: 'Amit Desai',
      email: 'amit.desai@invalid', // Invalid email
      phoneNumber: '7766554433', // Missing country code
      residentType: ResidentType.TENANT,
      leaseStartDate: new Date('2024-03-01'),
      leaseEndDate: new Date('2025-02-28'),
      familyMemberCount: 1,
      familyMembers: [
        { name: 'Sneha Desai', relationship: 'Spouse', age: 32 }
      ],
      status: 'pending'
    },
    {
      rowNumber: 5,
      isValid: true,
      validationErrors: [],
      validationWarnings: [],
      flatNumber: 'B-202',
      block: 'B',
      floor: '2',
      ownerName: 'Neha Gupta',
      email: 'neha.gupta@example.com',
      phoneNumber: '+91 8899001122',
      residentType: ResidentType.TENANT,
      leaseStartDate: new Date('2024-04-01'),
      leaseEndDate: new Date('2025-03-31'),
      vehicleCount: 1,
      vehicles: [
        { vehicleType: VehicleType.TWO_WHEELER, registrationNumber: 'MH12GH3456', brand: 'Honda', model: 'Activa' }
      ],
      occupancyDate: new Date('2024-04-01'),
      emergencyContactName: 'Rahul Gupta',
      emergencyContactPhone: '+91 8899001123',
      status: 'pending'
    },
    {
      rowNumber: 6,
      isValid: false,
      validationErrors: ['Flat number is required', 'Owner name is required'],
      validationWarnings: [],
      flatNumber: '', // Missing
      ownerName: '', // Missing
      email: 'test@example.com',
      phoneNumber: '+91 7755443322',
      residentType: ResidentType.OWNER,
      status: 'pending'
    },
    {
      rowNumber: 7,
      isValid: true,
      validationErrors: [],
      validationWarnings: [],
      flatNumber: 'C-301',
      block: 'C',
      floor: '3',
      ownerName: 'Suresh Patel',
      email: 'suresh.patel@example.com',
      phoneNumber: '+91 7755443322',
      residentType: ResidentType.OWNER,
      familyMemberCount: 4,
      familyMembers: [
        { name: 'Manjula Patel', relationship: 'Spouse', age: 42 },
        { name: 'Karan Patel', relationship: 'Son', age: 18 },
        { name: 'Riya Patel', relationship: 'Daughter', age: 15 },
        { name: 'Arjun Patel', relationship: 'Son', age: 12 }
      ],
      vehicleCount: 2,
      vehicles: [
        { vehicleType: VehicleType.FOUR_WHEELER, registrationNumber: 'MH12IJ7890', brand: 'Toyota', model: 'Innova', color: 'White' },
        { vehicleType: VehicleType.TWO_WHEELER, registrationNumber: 'MH12KL1234', brand: 'Bajaj', model: 'Pulsar' }
      ],
      occupancyDate: new Date('2024-05-15'),
      status: 'pending'
    }
  ];

  constructor() {
    // Create a dummy session for testing
    this.createDummySession();
  }

  private createDummySession() {
    const validRecords = this.dummyImportData.filter(d => d.isValid).length;
    const invalidRecords = this.dummyImportData.filter(d => !d.isValid).length;
    
    const dummySession: BulkImportSession = {
      id: 'SESSION001',
      fileName: 'residents_sample.xlsx',
      fileSize: 45678,
      fileType: 'excel',
      uploadedAt: new Date('2024-12-18T10:30:00'),
      uploadedBy: 'Admin User',
      societyId: 'SOC001',
      status: ImportStatus.READY_TO_IMPORT,
      totalRecords: this.dummyImportData.length,
      validRecords: validRecords,
      invalidRecords: invalidRecords,
      processedRecords: 0,
      successfulImports: 0,
      failedImports: 0,
      errors: this.extractErrors(this.dummyImportData),
      warnings: this.extractWarnings(this.dummyImportData)
    };

    this.importSessions.push(dummySession);
  }

  // File Upload Simulation
  uploadFile(file: File, societyId: string): Observable<FileUploadResponse> {
    console.log('Uploading file:', file.name, 'Size:', file.size);
    
    // Simulate file processing delay
    return of({
      sessionId: `SESSION${String(this.importSessions.length + 1).padStart(3, '0')}`,
      fileName: file.name,
      fileSize: file.size,
      totalRecords: this.dummyImportData.length,
      message: 'File uploaded successfully. Starting validation...'
    }).pipe(delay(1500));
  }

  // Parse and Validate File
  validateImportData(sessionId: string): Observable<ImportValidationResult> {
    const validRecords = this.dummyImportData.filter(d => d.isValid).length;
    const invalidRecords = this.dummyImportData.filter(d => !d.isValid).length;

    const result: ImportValidationResult = {
      isValid: invalidRecords === 0,
      totalRecords: this.dummyImportData.length,
      validRecords: validRecords,
      invalidRecords: invalidRecords,
      errors: this.extractErrors(this.dummyImportData),
      warnings: this.extractWarnings(this.dummyImportData),
      data: this.dummyImportData
    };

    // Update session
    const session = this.importSessions.find(s => s.id === sessionId);
    if (session) {
      session.status = result.isValid ? ImportStatus.READY_TO_IMPORT : ImportStatus.VALIDATION_FAILED;
      session.validRecords = validRecords;
      session.invalidRecords = invalidRecords;
      session.errors = result.errors;
      session.warnings = result.warnings;
    }

    return of(result).pipe(delay(2000));
  }

  // Start Import Process
  startImport(sessionId: string): Observable<ImportProgress> {
    const session = this.importSessions.find(s => s.id === sessionId);
    if (!session) {
      return throwError(() => new Error('Session not found'));
    }

    session.status = ImportStatus.IMPORTING;
    session.startedAt = new Date();

    const validData = this.dummyImportData.filter(d => d.isValid);
    const totalRecords = validData.length;
    
    // Simulate progressive import with interval
    return interval(500).pipe(
      take(totalRecords + 1),
      map(index => {
        const progress: ImportProgress = {
          sessionId: sessionId,
          total: totalRecords,
          processed: index,
          successful: index,
          failed: 0,
          currentRecord: index + 1,
          percentage: Math.round((index / totalRecords) * 100),
          estimatedTimeRemaining: this.calculateETA(index, totalRecords)
        };

        // Update session on completion
        if (index === totalRecords) {
          session.status = ImportStatus.COMPLETED;
          session.completedAt = new Date();
          session.processedRecords = totalRecords;
          session.successfulImports = totalRecords;
          session.failedImports = 0;
          
          // Mark all valid records as success
          validData.forEach(d => {
            d.status = 'success';
            d.importedAt = new Date();
          });
          
          // Mark invalid records as failed
          this.dummyImportData.filter(d => !d.isValid).forEach(d => {
            d.status = 'failed';
            d.errorMessage = d.validationErrors.join(', ');
          });
        }

        return progress;
      })
    );
  }

  // Get Import Summary
  getImportSummary(sessionId: string): Observable<ImportSummary> {
    const session = this.importSessions.find(s => s.id === sessionId);
    if (!session) {
      return throwError(() => new Error('Session not found'));
    }

    const duration = this.calculateDuration(session.startedAt!, session.completedAt!);
    
    const summary: ImportSummary = {
      sessionId: sessionId,
      fileName: session.fileName,
      totalRecords: session.totalRecords,
      successfulImports: session.successfulImports,
      failedImports: session.failedImports,
      duration: duration,
      completedAt: session.completedAt!,
      successfulRecords: this.dummyImportData.filter(d => d.status === 'success'),
      failedRecords: this.dummyImportData.filter(d => d.status === 'failed')
    };

    return of(summary).pipe(delay(500));
  }

  // Get Session by ID
  getSession(sessionId: string): Observable<BulkImportSession | undefined> {
    return of(this.importSessions.find(s => s.id === sessionId))
      .pipe(delay(300));
  }

  // Get All Sessions
  getAllSessions(societyId: string): Observable<BulkImportSession[]> {
    return of(this.importSessions.filter(s => s.societyId === societyId))
      .pipe(delay(400));
  }

  // Download Excel Template
  downloadTemplate(): Observable<Blob> {
    // In real implementation, generate actual Excel file
    const csvContent = this.generateCSVTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    return of(blob).pipe(delay(300));
  }

  // Download Sample Data
  downloadSampleData(): Observable<Blob> {
    const csvContent = this.generateSampleCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    return of(blob).pipe(delay(300));
  }

  // Get Validation Rules
  getValidationRules(): Observable<any> {
    const rules = {
      flatNumber: {
        required: true,
        pattern: '^[A-Z]-[0-9]{3}$',
        example: 'A-101',
        description: 'Format: Block-Number (e.g., A-101)'
      },
      ownerName: {
        required: true,
        minLength: 2,
        maxLength: 100,
        example: 'Rajesh Sharma'
      },
      email: {
        required: true,
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        example: 'rajesh@example.com'
      },
      phoneNumber: {
        required: true,
        pattern: '^\\+91[0-9]{10}$',
        example: '+91 9876543210',
        description: 'Must start with +91 followed by 10 digits'
      },
      residentType: {
        required: true,
        allowedValues: ['Owner', 'Tenant'],
        example: 'Owner'
      },
      vehicleRegistration: {
        pattern: '^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$',
        example: 'MH12AB1234',
        description: 'Format: StateCode + District + Series + Number'
      }
    };

    return of(rules).pipe(delay(200));
  }

  // Retry Failed Records
  retryFailedRecords(sessionId: string): Observable<ImportProgress> {
    const session = this.importSessions.find(s => s.id === sessionId);
    if (!session) {
      return throwError(() => new Error('Session not found'));
    }

    const failedData = this.dummyImportData.filter(d => d.status === 'failed' && d.isValid);
    
    // Simulate retry
    return of({
      sessionId: sessionId,
      total: failedData.length,
      processed: failedData.length,
      successful: failedData.length,
      failed: 0,
      percentage: 100
    } as ImportProgress).pipe(delay(2000));
  }

  // Helper Methods
  private extractErrors(data: ResidentImportData[]): ImportError[] {
    const errors: ImportError[] = [];
    data.forEach(row => {
      row.validationErrors.forEach(error => {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'multiple',
          value: '',
          message: error,
          severity: 'error'
        });
      });
    });
    return errors;
  }

  private extractWarnings(data: ResidentImportData[]): ImportWarning[] {
    const warnings: ImportWarning[] = [];
    data.forEach(row => {
      row.validationWarnings.forEach(warning => {
        warnings.push({
          rowNumber: row.rowNumber,
          field: 'multiple',
          message: warning
        });
      });
    });
    return warnings;
  }

  private calculateETA(current: number, total: number): string {
    if (current === 0) return 'Calculating...';
    const remaining = total - current;
    const seconds = remaining * 0.5; // 0.5 seconds per record
    
    if (seconds < 60) {
      return `${Math.round(seconds)} seconds`;
    } else {
      return `${Math.round(seconds / 60)} minutes`;
    }
  }

  private calculateDuration(start: Date, end: Date): string {
    const diff = end.getTime() - start.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes === 0) {
      return `${seconds} seconds`;
    } else {
      return `${minutes} min ${remainingSeconds} sec`;
    }
  }

  private generateCSVTemplate(): string {
    const headers = EXCEL_TEMPLATE_COLUMNS.map(col => col.header).join(',');
    const examples = EXCEL_TEMPLATE_COLUMNS.map(col => col.example || '').join(',');
    return `${headers}\n${examples}\n`;
  }

  private generateSampleCSV(): string {
    const headers = EXCEL_TEMPLATE_COLUMNS.map(col => col.header).join(',');
    const rows = [
      'A-101,A,1,Rajesh Sharma,rajesh@example.com,+91 9876543210,+91 9876543211,Owner,01/01/2024,,,Amit Sharma,+91 9876543213,Priya Sharma,Spouse,35,Rohan Sharma,Son,10,Four Wheeler,MH12AB1234,Honda,City,Two Wheeler,MH12CD5678',
      'A-102,A,1,Priya Mehta,priya@example.com,+91 9988776655,,Owner,01/02/2024,,,Neha Mehta,+91 9988776656,Rohit Mehta,Spouse,38,Aarav Mehta,Son,12,Four Wheeler,MH12EF9012,Maruti,Swift,,',
      'B-201,B,2,Amit Desai,amit@example.com,+91 7766554433,,Tenant,,01/03/2024,28/02/2025,Sneha Desai,+91 7766554434,Sneha Desai,Spouse,32,,,,,,,,,'
    ];
    
    return `${headers}\n${rows.join('\n')}\n`;
  }

  // Validate Individual Field
  validateField(fieldName: string, value: any): string[] {
    const errors: string[] = [];

    switch (fieldName) {
      case 'flatNumber':
        if (!value || value.trim() === '') {
          errors.push('Flat number is required');
        } else if (!/^[A-Z]-[0-9]{3}$/.test(value)) {
          errors.push('Invalid flat number format. Use: A-101');
        }
        break;

      case 'ownerName':
        if (!value || value.trim() === '') {
          errors.push('Owner name is required');
        } else if (value.length < 2) {
          errors.push('Name must be at least 2 characters');
        }
        break;

      case 'email':
        if (!value || value.trim() === '') {
          errors.push('Email is required');
        } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
          errors.push('Invalid email format');
        }
        break;

      case 'phoneNumber':
        if (!value || value.trim() === '') {
          errors.push('Phone number is required');
        } else if (!/^\+91[0-9]{10}$/.test(value.replace(/\s/g, ''))) {
          errors.push('Phone number must start with +91 followed by 10 digits');
        }
        break;

      case 'residentType':
        if (!value || value.trim() === '') {
          errors.push('Resident type is required');
        } else if (!['Owner', 'Tenant'].includes(value)) {
          errors.push('Resident type must be Owner or Tenant');
        }
        break;
    }

    return errors;
  }
}
