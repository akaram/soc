/**
 * Video Calling Models
 * For video calling with security guards
 */

export enum VideoCallStatus {
  IDLE = 'IDLE',
  RINGING = 'RINGING',
  CONNECTED = 'CONNECTED',
  ENDED = 'ENDED',
  MISSED = 'MISSED',
  REJECTED = 'REJECTED',
  BUSY = 'BUSY',
  FAILED = 'FAILED'
}

export enum VideoCallDirection {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING'
}

export enum GuardStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
  ON_PATROL = 'ON_PATROL',
  ON_BREAK = 'ON_BREAK'
}

export interface Guard {
  id: string;
  name: string;
  badgeNumber?: string;
  phoneNumber: string;
  email?: string;
  photoUrl?: string;
  gateId?: string;
  gateName?: string;
  shift?: string; // 'MORNING', 'AFTERNOON', 'NIGHT'
  status: GuardStatus;
  isActive: boolean;
  lastSeen?: Date;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoCall {
  id: string;
  guardId: string;
  guard?: Guard;
  direction: VideoCallDirection;
  status: VideoCallStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  gateId?: string;
  gateName?: string;
  callerName?: string; // For incoming calls
  callerId?: string; // Resident/staff ID who initiated the call
  callerType?: 'RESIDENT' | 'STAFF' | 'VISITOR' | 'MANAGEMENT';
  // Video stream properties
  localStreamId?: string;
  remoteStreamId?: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isRemoteVideoEnabled: boolean;
  isRemoteAudioEnabled: boolean;
  // Recording
  recordingUrl?: string;
  isRecording: boolean;
  // Quality metrics
  videoQuality?: 'LOW' | 'MEDIUM' | 'HIGH';
  connectionQuality?: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  // Metadata
  notes?: string;
  createdAt: Date;
}

export interface MakeVideoCallRequest {
  guardId: string;
  gateId?: string;
  callerId?: string;
  callerName?: string;
  callerType?: 'RESIDENT' | 'STAFF' | 'VISITOR' | 'MANAGEMENT';
  enableVideo?: boolean;
  enableAudio?: boolean;
}

export interface VideoCallResponse {
  success: boolean;
  message: string;
  call?: VideoCall;
  errors?: string[];
}

export interface VideoCallStatistics {
  totalCalls: number;
  callsToday: number;
  activeCalls: number;
  missedCalls: number;
  averageCallDuration: number; // in seconds
  totalGuards: number;
  availableGuards: number;
  byGate: {
    [gateId: string]: number;
  };
  byGuard: {
    [guardId: string]: number;
  };
  byCallerType: {
    resident: number;
    staff: number;
    visitor: number;
    management: number;
  };
}

export interface VideoCallFilter {
  guardId?: string;
  gateId?: string;
  status?: VideoCallStatus;
  direction?: VideoCallDirection;
  dateFrom?: Date;
  dateTo?: Date;
  callerType?: 'RESIDENT' | 'STAFF' | 'VISITOR' | 'MANAGEMENT';
}

