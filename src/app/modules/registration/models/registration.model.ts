export interface BasicInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: Date | null;
  gender: 'male' | 'female' | 'other' | '';
}

export interface AddressInfo {
  flatNumber: string;
  building: string;
  society: string;
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface DocumentInfo {
  idProofType: string;
  idProofNumber: string;
  idProofFile: File | null;
  idProofFileUrl?: string;
  addressProofType: string;
  addressProofNumber: string;
  addressProofFile: File | null;
  addressProofFileUrl?: string;
  verified: boolean;
  verificationStatus: 'pending' | 'approved' | 'rejected' | '';
}

export interface RegistrationData {
  basicInfo: BasicInfo;
  addressInfo: AddressInfo;
  documentInfo: DocumentInfo;
  currentStep: number;
  registrationId?: string;
  createdAt?: Date;
}

export interface DocumentType {
  value: string;
  label: string;
  acceptedFormats: string[];
}

export interface RegistrationResponse {
  success: boolean;
  message: string;
  data?: {
    userId: string;
    registrationId: string;
    verificationStatus: string;
    estimatedVerificationTime: string;
  };
  error?: string;
}

export interface DocumentVerificationResponse {
  success: boolean;
  documentType: string;
  verified: boolean;
  confidence: number;
  extractedData?: any;
  issues?: string[];
}
