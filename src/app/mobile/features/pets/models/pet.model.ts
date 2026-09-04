export interface Pet {
  id: string;
  name: string;
  species: PetSpecies;
  breed: string;
  gender: PetGender;
  dateOfBirth: Date;
  age?: string; // Calculated: "2 years 3 months"
  color: string;
  weight?: number; // in kg
  microchipNumber?: string;
  photoUrl?: string;
  identificationMarks?: string;
  
  // Owner/Flat Information
  flatId: string;
  flatNumber: string;
  ownerId?: string;
  ownerName: string;
  ownerPhone: string;
  societyId: string;
  
  // Registration Details
  registrationNumber: string; // Unique registration number
  registrationDate: Date;
  registrationStatus: RegistrationStatus;
  approvedBy?: string;
  approvedDate?: Date;
  
  // Veterinary Information
  veterinarianName?: string;
  veterinarianPhone?: string;
  veterinaryClinic?: string;
  
  // Health Information
  allergies?: string[];
  medicalConditions?: string[];
  specialNeeds?: string;
  isNeutered: boolean;
  
  // Behavioral Information
  isFriendlyWithPets: boolean;
  isFriendlyWithChildren: boolean;
  isAggressive: boolean;
  behaviorNotes?: string;
  
  // Insurance
  hasInsurance: boolean;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: Date;
  
  // Emergency Contact
  emergencyContact?: EmergencyContact;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
}

export enum PetSpecies {
  DOG = 'Dog',
  CAT = 'Cat',
  BIRD = 'Bird',
  RABBIT = 'Rabbit',
  HAMSTER = 'Hamster',
  GUINEA_PIG = 'Guinea Pig',
  FISH = 'Fish',
  TURTLE = 'Turtle',
  OTHER = 'Other'
}

export enum PetGender {
  MALE = 'Male',
  FEMALE = 'Female'
}

export enum RegistrationStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  EXPIRED = 'Expired'
}

// Vaccination Records
export interface VaccinationRecord {
  id: string;
  petId: string;
  petName: string;
  vaccineName: string;
  vaccineType: VaccineType;
  administeredDate: Date;
  nextDueDate?: Date;
  batchNumber?: string;
  veterinarianName: string;
  veterinaryClinic: string;
  certificateUrl?: string;
  notes?: string;
  reminderSent: boolean;
  createdAt: Date;
  updatedBy: string;
}

export enum VaccineType {
  // Dogs
  RABIES = 'Rabies',
  DHPP = 'DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)',
  BORDETELLA = 'Bordetella (Kennel Cough)',
  LEPTOSPIROSIS = 'Leptospirosis',
  LYME_DISEASE = 'Lyme Disease',
  CANINE_INFLUENZA = 'Canine Influenza',
  
  // Cats
  FVRCP = 'FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)',
  FELINE_LEUKEMIA = 'Feline Leukemia (FeLV)',
  
  // Birds
  POLYOMAVIRUS = 'Polyomavirus',
  PACHECO_DISEASE = 'Pacheco\'s Disease',
  
  // Rabbits
  MYXOMATOSIS = 'Myxomatosis',
  RABBIT_HEMORRHAGIC_DISEASE = 'Rabbit Hemorrhagic Disease',
  
  // General
  OTHER = 'Other'
}

// Health Records
export interface HealthRecord {
  id: string;
  petId: string;
  petName: string;
  recordType: HealthRecordType;
  date: Date;
  veterinarianName: string;
  veterinaryClinic: string;
  diagnosis?: string;
  treatment?: string;
  medications?: Medication[];
  followUpDate?: Date;
  documentUrl?: string;
  notes?: string;
  createdAt: Date;
}

export enum HealthRecordType {
  CHECKUP = 'Regular Checkup',
  ILLNESS = 'Illness',
  SURGERY = 'Surgery',
  INJURY = 'Injury',
  DENTAL = 'Dental Care',
  GROOMING = 'Grooming',
  DEWORMING = 'Deworming',
  FLEA_TICK = 'Flea & Tick Treatment',
  OTHER = 'Other'
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
}

// Pet Pass/ID Card
export interface PetPass {
  id: string;
  petId: string;
  passNumber: string;
  issueDate: Date;
  expiryDate: Date;
  qrCode: string;
  status: PassStatus;
}

export enum PassStatus {
  ACTIVE = 'Active',
  EXPIRED = 'Expired',
  REVOKED = 'Revoked'
}

// Pet Activity Log
export interface PetActivityLog {
  id: string;
  petId: string;
  petName: string;
  activityType: PetActivityType;
  activityDate: Date;
  description: string;
  performedBy: string;
  notes?: string;
}

export enum PetActivityType {
  WALK = 'Walk',
  GROOMING = 'Grooming',
  VET_VISIT = 'Vet Visit',
  TRAINING = 'Training',
  COMPLAINT = 'Complaint Reported',
  INCIDENT = 'Incident',
  OTHER = 'Other'
}

// Pet Complaint
export interface PetComplaint {
  id: string;
  petId: string;
  petName: string;
  flatNumber: string;
  complaintType: PetComplaintType;
  description: string;
  incidentDate: Date;
  reportedBy: string;
  reportedDate: Date;
  status: ComplaintStatus;
  resolution?: string;
  resolvedDate?: Date;
  attachments?: string[];
}

export enum PetComplaintType {
  NOISE = 'Excessive Noise/Barking',
  AGGRESSION = 'Aggressive Behavior',
  HYGIENE = 'Hygiene Issues',
  UNLEASHED = 'Pet Unleashed in Common Areas',
  DAMAGE = 'Property Damage',
  OTHER = 'Other'
}

export enum ComplaintStatus {
  OPEN = 'Open',
  UNDER_REVIEW = 'Under Review',
  RESOLVED = 'Resolved',
  CLOSED = 'Closed'
}

// Vaccination Reminder
export interface VaccinationReminder {
  id: string;
  petId: string;
  petName: string;
  vaccineName: string;
  dueDate: Date;
  reminderSentDates: Date[];
  isCompleted: boolean;
  completedDate?: Date;
}

// Pet Statistics
export interface PetStatistics {
  totalPets: number;
  totalDogs: number;
  totalCats: number;
  totalOther: number;
  pendingRegistrations: number;
  upcomingVaccinations: number;
  expiredVaccinations: number;
  activeComplaints: number;
}
