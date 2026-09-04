/**
 * E-Intercom Models
 * For calling without showing phone numbers
 */

export enum CallStatus {
  IDLE = 'IDLE',
  RINGING = 'RINGING',
  CONNECTED = 'CONNECTED',
  ENDED = 'ENDED',
  MISSED = 'MISSED',
  REJECTED = 'REJECTED',
  BUSY = 'BUSY'
}

export enum CallDirection {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING'
}

export enum ContactType {
  RESIDENT = 'RESIDENT',
  STAFF = 'STAFF',
  SECURITY = 'SECURITY',
  MANAGEMENT = 'MANAGEMENT',
  EMERGENCY = 'EMERGENCY',
  VENDOR = 'VENDOR'
}

export interface IntercomContact {
  id: string;
  name: string;
  contactType: ContactType;
  flatNumber?: string;
  unitNumber?: string;
  displayName: string; // Name shown instead of phone number
  phoneNumber: string; // Hidden, not shown in UI
  extension?: string; // Internal extension number
  isActive: boolean;
  isAvailable: boolean; // Available to receive calls
  avatar?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntercomCall {
  id: string;
  contactId: string;
  contact?: IntercomContact;
  direction: CallDirection;
  status: CallStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  gateId?: string;
  gateName?: string;
  callerName?: string; // For incoming calls
  recordingUrl?: string; // If call was recorded
  notes?: string;
  createdAt: Date;
}

export interface MakeCallRequest {
  contactId: string;
  gateId?: string;
}

export interface CallResponse {
  success: boolean;
  message: string;
  call?: IntercomCall;
  errors?: string[];
}

export interface EIntercomStatistics {
  totalCalls: number;
  callsToday: number;
  activeCalls: number;
  missedCalls: number;
  averageCallDuration: number; // in seconds
  totalContacts: number;
  availableContacts: number;
  byContactType: {
    resident: number;
    staff: number;
    security: number;
    management: number;
    emergency: number;
    vendor: number;
  };
  byGate: {
    [gateId: string]: number;
  };
}

export interface IntercomFilter {
  contactType?: ContactType;
  searchTerm?: string;
  gateId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

