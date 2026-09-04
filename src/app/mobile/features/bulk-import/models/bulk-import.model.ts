export interface BulkImportSession {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: 'excel' | 'csv';
  uploadedAt: Date;
  uploadedBy: string;
  societyId: string;
  status: ImportStatus;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  processedRecords: number;
  successfulImports: number;
  failedImports: number;
  startedAt?: Date;
  completedAt?: Date;
  errors: ImportError[];
  warnings: ImportWarning[];
}

export enum ImportStatus {
  UPLOADED = 'Uploaded',
  VALIDATING = 'Validating',
  VALIDATION_FAILED = 'Validation Failed',
  READY_TO_IMPORT = 'Ready to Import',
  IMPORTING = 'Importing',
  COMPLETED = 'Completed',
  PARTIALLY_COMPLETED = 'Partially Completed',
  FAILED = 'Failed'
}

export interface ResidentImportData {
  rowNumber: number;
  isValid: boolean;
  validationErrors: string[];
  validationWarnings: string[];
  
  // Basic Information
  flatNumber: string;
  block?: string;
  floor?: string;
  ownerName: string;
  email: string;
  phoneNumber: string;
  alternatePhone?: string;
  
  // Resident Type
  residentType: ResidentType;
  
  // Family Members
  familyMemberCount?: number;
  familyMembers?: FamilyMemberImport[];
  
  // Vehicle Information
  vehicleCount?: number;
  vehicles?: VehicleImport[];
  
  // Additional Details
  occupancyDate?: Date;
  leaseStartDate?: Date;
  leaseEndDate?: Date;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  
  // System Fields
  status?: 'pending' | 'success' | 'failed';
  importedAt?: Date;
  errorMessage?: string;
}

export enum ResidentType {
  OWNER = 'Owner',
  TENANT = 'Tenant',
  FAMILY_MEMBER = 'Family Member'
}

export interface FamilyMemberImport {
  name: string;
  relationship: string;
  age?: number;
  phoneNumber?: string;
}

export interface VehicleImport {
  vehicleType: VehicleType;
  registrationNumber: string;
  brand?: string;
  model?: string;
  color?: string;
}

export enum VehicleType {
  TWO_WHEELER = 'Two Wheeler',
  FOUR_WHEELER = 'Four Wheeler',
  BICYCLE = 'Bicycle'
}

export interface ImportError {
  rowNumber: number;
  field: string;
  value: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ImportWarning {
  rowNumber: number;
  field: string;
  message: string;
}

export interface ImportValidationResult {
  isValid: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  data: ResidentImportData[];
}

export interface ImportProgress {
  sessionId: string;
  total: number;
  processed: number;
  successful: number;
  failed: number;
  currentRecord?: number;
  percentage: number;
  estimatedTimeRemaining?: string;
}

export interface ImportSummary {
  sessionId: string;
  fileName: string;
  totalRecords: number;
  successfulImports: number;
  failedImports: number;
  duration: string;
  completedAt: Date;
  successfulRecords: ResidentImportData[];
  failedRecords: ResidentImportData[];
}

// Excel Template Structure
export interface ExcelTemplateColumn {
  header: string;
  field: string;
  required: boolean;
  dataType: 'text' | 'email' | 'phone' | 'date' | 'number';
  validation?: string;
  example: string;
}

export const EXCEL_TEMPLATE_COLUMNS: ExcelTemplateColumn[] = [
  { header: 'Flat Number', field: 'flatNumber', required: true, dataType: 'text', validation: 'A-101, B-202, etc.', example: 'A-101' },
  { header: 'Block', field: 'block', required: false, dataType: 'text', example: 'A' },
  { header: 'Floor', field: 'floor', required: false, dataType: 'number', example: '1' },
  { header: 'Owner Name', field: 'ownerName', required: true, dataType: 'text', example: 'Rajesh Sharma' },
  { header: 'Email', field: 'email', required: true, dataType: 'email', validation: 'Valid email format', example: 'rajesh@example.com' },
  { header: 'Phone Number', field: 'phoneNumber', required: true, dataType: 'phone', validation: '+91 XXXXX XXXXX', example: '+91 9876543210' },
  { header: 'Alternate Phone', field: 'alternatePhone', required: false, dataType: 'phone', example: '+91 9876543211' },
  { header: 'Resident Type', field: 'residentType', required: true, dataType: 'text', validation: 'Owner/Tenant', example: 'Owner' },
  { header: 'Occupancy Date', field: 'occupancyDate', required: false, dataType: 'date', validation: 'DD/MM/YYYY', example: '01/01/2024' },
  { header: 'Lease Start Date', field: 'leaseStartDate', required: false, dataType: 'date', validation: 'DD/MM/YYYY (for tenants)', example: '01/01/2024' },
  { header: 'Lease End Date', field: 'leaseEndDate', required: false, dataType: 'date', validation: 'DD/MM/YYYY (for tenants)', example: '31/12/2024' },
  { header: 'Emergency Contact Name', field: 'emergencyContactName', required: false, dataType: 'text', example: 'Priya Sharma' },
  { header: 'Emergency Contact Phone', field: 'emergencyContactPhone', required: false, dataType: 'phone', example: '+91 9876543212' },
  { header: 'Family Member 1 Name', field: 'familyMember1Name', required: false, dataType: 'text', example: 'Priya Sharma' },
  { header: 'Family Member 1 Relationship', field: 'familyMember1Relationship', required: false, dataType: 'text', example: 'Spouse' },
  { header: 'Family Member 1 Age', field: 'familyMember1Age', required: false, dataType: 'number', example: '35' },
  { header: 'Family Member 2 Name', field: 'familyMember2Name', required: false, dataType: 'text', example: 'Rohan Sharma' },
  { header: 'Family Member 2 Relationship', field: 'familyMember2Relationship', required: false, dataType: 'text', example: 'Son' },
  { header: 'Family Member 2 Age', field: 'familyMember2Age', required: false, dataType: 'number', example: '10' },
  { header: 'Vehicle 1 Type', field: 'vehicle1Type', required: false, dataType: 'text', validation: 'Two Wheeler/Four Wheeler/Bicycle', example: 'Four Wheeler' },
  { header: 'Vehicle 1 Registration', field: 'vehicle1Registration', required: false, dataType: 'text', example: 'MH12AB1234' },
  { header: 'Vehicle 1 Brand', field: 'vehicle1Brand', required: false, dataType: 'text', example: 'Honda' },
  { header: 'Vehicle 1 Model', field: 'vehicle1Model', required: false, dataType: 'text', example: 'City' },
  { header: 'Vehicle 2 Type', field: 'vehicle2Type', required: false, dataType: 'text', example: 'Two Wheeler' },
  { header: 'Vehicle 2 Registration', field: 'vehicle2Registration', required: false, dataType: 'text', example: 'MH12CD5678' }
];

// CSV/Excel Parsing Configuration
export interface ParseConfig {
  delimiter?: string; // For CSV: comma, semicolon, tab
  hasHeaders?: boolean;
  skipEmptyRows?: boolean;
  trimValues?: boolean;
  dateFormat?: string;
}

export interface FileUploadResponse {
  sessionId: string;
  fileName: string;
  fileSize: number;
  totalRecords: number;
  message: string;
}
