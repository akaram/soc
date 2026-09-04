import {
  Pet,
  PetSpecies,
  PetGender,
  RegistrationStatus,
  VaccinationRecord,
  VaccineType,
  HealthRecord,
  HealthRecordType,
  Medication
} from '../models/pet.model';

function parseEnum<T extends Record<string, string>>(enumObj: T, value: string, fallback: T[keyof T]): T[keyof T] {
  const v = (value || '').trim();
  const values = Object.values(enumObj) as string[];
  const hit = values.find(x => x.toLowerCase() === v.toLowerCase());
  return (hit as T[keyof T]) ?? fallback;
}

/** Maps Spring Pet JSON to the mobile Pet model (enums are tolerant of backend casing). */
function resolveOwnerName(raw: Record<string, unknown>): string {
  const direct = String(raw['ownerName'] ?? raw['owner_name'] ?? '').trim();
  if (direct) {
    return direct;
  }
  const owner = raw['owner'] as Record<string, unknown> | undefined;
  if (owner) {
    const fromOwner = `${owner['firstName'] ?? ''} ${owner['lastName'] ?? ''}`.trim();
    if (fromOwner) {
      return fromOwner;
    }
  }
  return '';
}

function resolveFlatNumber(raw: Record<string, unknown>): string {
  const direct = String(raw['flatNumber'] ?? raw['flat_number'] ?? '').trim();
  if (direct) {
    return direct;
  }
  const flat = raw['flat'] as Record<string, unknown> | undefined;
  if (flat?.['flatNumber']) {
    return String(flat['flatNumber']);
  }
  return '';
}

export function mapPetFromApi(raw: Record<string, unknown>): Pet {
  const dobRaw = raw['dateOfBirth'] ?? raw['date_of_birth'];
  const dob = dobRaw ? new Date(String(dobRaw)) : new Date(0);

  const w = raw['weight'];
  const weightNum = w != null && w !== '' ? Number(w) : undefined;

  const emergency =
    raw['emergencyContactName'] || raw['emergency_contact_name']
      ? {
          name: String(raw['emergencyContactName'] ?? raw['emergency_contact_name'] ?? ''),
          relationship: String(raw['emergencyContactRelation'] ?? raw['emergency_contact_relation'] ?? ''),
          phoneNumber: String(raw['emergencyContactPhone'] ?? raw['emergency_contact_phone'] ?? '')
        }
      : undefined;

  return {
    id: String(raw['id'] ?? ''),
    name: String(raw['name'] ?? ''),
    species: parseEnum(PetSpecies, String(raw['species'] ?? ''), PetSpecies.OTHER),
    breed: String(raw['breed'] ?? ''),
    gender: parseEnum(PetGender, String(raw['gender'] ?? ''), PetGender.MALE),
    dateOfBirth: dob,
    age: raw['age'] != null ? String(raw['age']) : undefined,
    color: String(raw['color'] ?? ''),
    weight: Number.isFinite(weightNum as number) ? (weightNum as number) : undefined,
    microchipNumber: raw['microchipNumber'] != null ? String(raw['microchipNumber']) : undefined,
    photoUrl: raw['photoUrl'] != null ? String(raw['photoUrl']) : undefined,
    identificationMarks: raw['identificationMarks'] != null ? String(raw['identificationMarks']) : undefined,
    flatId: String(raw['flatId'] ?? raw['flat_id'] ?? ''),
    flatNumber: resolveFlatNumber(raw),
    ownerId: raw['ownerId'] != null ? String(raw['ownerId']) : raw['owner_id'] != null ? String(raw['owner_id']) : undefined,
    ownerName: resolveOwnerName(raw),
    ownerPhone: String(raw['ownerPhone'] ?? raw['owner_phone'] ?? ''),
    societyId: String(raw['societyId'] ?? raw['society_id'] ?? ''),
    registrationNumber: String(raw['registrationNumber'] ?? raw['registration_number'] ?? ''),
    registrationDate: raw['registrationDate'] ? new Date(String(raw['registrationDate'])) : new Date(0),
    registrationStatus: parseEnum(
      RegistrationStatus,
      String(raw['registrationStatus'] ?? raw['registration_status'] ?? 'Pending'),
      RegistrationStatus.PENDING
    ),
    approvedBy: raw['approvedBy'] != null ? String(raw['approvedBy']) : undefined,
    approvedDate: raw['approvedDate'] ? new Date(String(raw['approvedDate'])) : undefined,
    veterinarianName: raw['veterinarianName'] != null ? String(raw['veterinarianName']) : undefined,
    veterinarianPhone: raw['veterinarianPhone'] != null ? String(raw['veterinarianPhone']) : undefined,
    veterinaryClinic: raw['veterinaryClinic'] != null ? String(raw['veterinaryClinic']) : undefined,
    allergies: Array.isArray(raw['allergies']) ? (raw['allergies'] as string[]) : [],
    medicalConditions: Array.isArray(raw['medicalConditions']) ? (raw['medicalConditions'] as string[]) : [],
    specialNeeds: raw['specialNeeds'] != null ? String(raw['specialNeeds']) : undefined,
    isNeutered: Boolean(raw['isNeutered'] ?? raw['is_neutered']),
    isFriendlyWithPets: raw['isFriendlyWithPets'] !== false && raw['is_friendly_with_pets'] !== false,
    isFriendlyWithChildren: raw['isFriendlyWithChildren'] !== false && raw['is_friendly_with_children'] !== false,
    isAggressive: Boolean(raw['isAggressive'] ?? raw['is_aggressive']),
    behaviorNotes: raw['behaviorNotes'] != null ? String(raw['behaviorNotes']) : undefined,
    hasInsurance: Boolean(raw['hasInsurance'] ?? raw['has_insurance']),
    insuranceProvider: raw['insuranceProvider'] != null ? String(raw['insuranceProvider']) : undefined,
    insurancePolicyNumber: raw['insurancePolicyNumber'] != null ? String(raw['insurancePolicyNumber']) : undefined,
    insuranceExpiryDate: raw['insuranceExpiryDate'] ? new Date(String(raw['insuranceExpiryDate'])) : undefined,
    emergencyContact: emergency,
    createdAt: raw['createdAt'] ? new Date(String(raw['createdAt'])) : new Date(0),
    updatedAt: raw['updatedAt'] ? new Date(String(raw['updatedAt'])) : new Date(0),
    createdBy: String(raw['createdBy'] ?? raw['created_by'] ?? '')
  };
}

/** Build POST /pets body from a partial UI pet (server assigns id). */
export function buildPetCreateBody(input: {
  societyId: string;
  flatId: string;
  ownerId: string;
  createdBy: string;
  name: string;
  species: string;
  breed: string;
  gender: string;
  dateOfBirth?: string;
  color?: string;
  weight?: number;
  microchipNumber?: string;
  registrationNumber: string;
  isNeutered?: boolean;
  identificationMarks?: string;
}): Record<string, unknown> {
  return {
    societyId: input.societyId,
    flatId: input.flatId,
    ownerId: input.ownerId,
    createdBy: input.createdBy,
    name: input.name,
    species: input.species,
    breed: input.breed,
    gender: input.gender,
    dateOfBirth: input.dateOfBirth || null,
    color: input.color ?? '',
    weight: input.weight ?? null,
    microchipNumber: input.microchipNumber ?? null,
    registrationNumber: input.registrationNumber,
    registrationStatus: 'Pending',
    isNeutered: input.isNeutered ?? false,
    isFriendlyWithPets: true,
    isFriendlyWithChildren: true,
    isAggressive: false,
    hasInsurance: false,
    identificationMarks: input.identificationMarks ?? null
  };
}

function parseApiLocalDate(value: unknown): Date {
  if (value == null || value === '') return new Date(0);
  if (typeof value === 'string') return new Date(value + 'T00:00:00');
  return new Date(String(value));
}

/** Map GET /pets/:id/vaccinations or society vaccination DTO rows to VaccinationRecord. */
export function mapVaccinationFromApi(raw: Record<string, unknown>, petName: string): VaccinationRecord {
  const typeStr = String(raw['vaccineType'] ?? '');
  const values = Object.values(VaccineType) as string[];
  const vaccineType = (values.includes(typeStr) ? typeStr : VaccineType.OTHER) as VaccineType;
  const nameFromDto = raw['petName'] != null ? String(raw['petName']) : '';
  return {
    id: String(raw['id'] ?? ''),
    petId: String(raw['petId'] ?? ''),
    petName: nameFromDto || petName,
    vaccineName: String(raw['vaccineName'] ?? ''),
    vaccineType,
    administeredDate: parseApiLocalDate(raw['administeredDate'] ?? raw['administered_date']),
    nextDueDate:
      raw['nextDueDate'] != null || raw['next_due_date'] != null
        ? parseApiLocalDate(raw['nextDueDate'] ?? raw['next_due_date'])
        : undefined,
    batchNumber: raw['batchNumber'] != null ? String(raw['batchNumber']) : undefined,
    veterinarianName: String(raw['veterinarianName'] ?? ''),
    veterinaryClinic: String(raw['clinicName'] ?? raw['veterinaryClinic'] ?? ''),
    certificateUrl: raw['certificateUrl'] != null ? String(raw['certificateUrl']) : undefined,
    notes: raw['notes'] != null ? String(raw['notes']) : undefined,
    reminderSent: false,
    createdAt: raw['createdAt'] ? new Date(String(raw['createdAt'])) : new Date(0),
    updatedBy: ''
  };
}

/** POST /pets/:petId/vaccinations JSON body (camelCase for Jackson). */
export function buildVaccinationCreateBody(input: {
  vaccineName: string;
  vaccineType: string;
  administeredDate: string;
  nextDueDate?: string;
  batchNumber?: string;
  veterinarianName: string;
  clinicName: string;
  certificateUrl?: string;
  notes?: string;
}): Record<string, unknown> {
  return {
    vaccineName: input.vaccineName,
    vaccineType: input.vaccineType,
    administeredDate: input.administeredDate,
    nextDueDate: input.nextDueDate || null,
    batchNumber: input.batchNumber || null,
    veterinarianName: input.veterinarianName,
    clinicName: input.clinicName,
    certificateUrl: input.certificateUrl || null,
    notes: input.notes || null
  };
}

function mapMedicationsFromApi(raw: unknown): Medication[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: Medication[] = [];
  for (const m of raw) {
    if (!m || typeof m !== 'object') continue;
    const o = m as Record<string, unknown>;
    out.push({
      name: String(o['name'] ?? ''),
      dosage: String(o['dosage'] ?? ''),
      frequency: String(o['frequency'] ?? ''),
      startDate: parseApiLocalDate(o['startDate'] ?? o['start_date']),
      endDate:
        o['endDate'] != null || o['end_date'] != null
          ? parseApiLocalDate(o['endDate'] ?? o['end_date'])
          : undefined
    });
  }
  return out.length ? out : undefined;
}

/** Map GET /pets/:id/health-records (or society follow-up DTO) to HealthRecord. */
export function mapHealthFromApi(raw: Record<string, unknown>, petName: string): HealthRecord {
  const typeStr = String(raw['recordType'] ?? raw['record_type'] ?? '');
  const allowed = Object.values(HealthRecordType) as string[];
  const recordType = (allowed.includes(typeStr) ? typeStr : HealthRecordType.OTHER) as HealthRecordType;
  const nameFromDto = raw['petName'] != null ? String(raw['petName']) : '';
  return {
    id: String(raw['id'] ?? ''),
    petId: String(raw['petId'] ?? ''),
    petName: nameFromDto || petName,
    recordType,
    date: parseApiLocalDate(raw['recordDate'] ?? raw['record_date']),
    veterinarianName: String(raw['veterinarianName'] ?? ''),
    veterinaryClinic: String(raw['clinicName'] ?? raw['veterinaryClinic'] ?? ''),
    diagnosis: raw['diagnosis'] != null ? String(raw['diagnosis']) : undefined,
    treatment: raw['treatment'] != null ? String(raw['treatment']) : undefined,
    medications: mapMedicationsFromApi(raw['medications']),
    followUpDate:
      raw['followUpDate'] != null || raw['follow_up_date'] != null
        ? parseApiLocalDate(raw['followUpDate'] ?? raw['follow_up_date'])
        : undefined,
    documentUrl: raw['documentUrl'] != null ? String(raw['documentUrl']) : undefined,
    notes: raw['notes'] != null ? String(raw['notes']) : undefined,
    createdAt: raw['createdAt'] ? new Date(String(raw['createdAt'])) : new Date(0)
  };
}

/** POST /pets/:petId/health-records JSON body. */
export function buildHealthCreateBody(input: {
  recordType: string;
  recordDate: string;
  veterinarianName: string;
  clinicName: string;
  diagnosis?: string;
  treatment?: string;
  followUpDate?: string;
  documentUrl?: string;
  notes?: string;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    startDate: string;
    endDate?: string;
  }>;
}): Record<string, unknown> {
  return {
    recordType: input.recordType,
    recordDate: input.recordDate,
    veterinarianName: input.veterinarianName,
    clinicName: input.clinicName,
    diagnosis: input.diagnosis || null,
    treatment: input.treatment || null,
    followUpDate: input.followUpDate || null,
    documentUrl: input.documentUrl || null,
    notes: input.notes || null,
    medications: input.medications && input.medications.length ? input.medications : []
  };
}
