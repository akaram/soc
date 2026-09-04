/**
 * IVR (Interactive Voice Response) Models
 * For voice-based approvals and gate access management
 */

export enum IVRCallStatus {
  INITIATED = 'INITIATED',
  RINGING = 'RINGING',
  ANSWERED = 'ANSWERED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
  ABANDONED = 'ABANDONED'
}

export enum IVRCallType {
  APPROVAL_REQUEST = 'APPROVAL_REQUEST',
  VISITOR_ENTRY = 'VISITOR_ENTRY',
  DELIVERY_ENTRY = 'DELIVERY_ENTRY',
  EMERGENCY = 'EMERGENCY',
  INFORMATION = 'INFORMATION'
}

export enum IVRAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  TRANSFER = 'TRANSFER',
  REPEAT = 'REPEAT',
  MAIN_MENU = 'MAIN_MENU',
  HANGUP = 'HANGUP'
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

export interface IVRCall {
  id: string;
  callerPhone: string;
  callerName?: string;
  callType: IVRCallType;
  status: IVRCallStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  
  // IVR Flow
  currentMenu?: string;
  selectedOptions: string[]; // DTMF selections
  lastPrompt?: string;
  
  // Approval Request
  approvalRequestId?: string;
  approvalRequest?: ApprovalRequest;
  approvalAction?: IVRAction;
  approvalStatus?: ApprovalStatus;
  
  // Call Details
  gateId?: string;
  gateName?: string;
  transferredTo?: string;
  recordingUrl?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalRequest {
  id: string;
  requestType: 'VISITOR' | 'DELIVERY' | 'VENDOR' | 'EMERGENCY';
  requesterName: string;
  requesterPhone: string;
  visitorName?: string;
  visitorPhone?: string;
  vehicleNumber?: string;
  purpose?: string;
  flatNumber?: string;
  unitNumber?: string;
  
  // Approval Details
  status: ApprovalStatus;
  requestedAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  approvedBy?: string;
  rejectionReason?: string;
  
  // IVR Details
  ivrCallId?: string;
  ivrApproved: boolean;
  ivrApprovalMethod?: 'VOICE' | 'DTMF';
  
  // Gate Details
  gateId: string;
  gateName: string;
  
  expiresAt?: Date;
  notes?: string;
}

export interface IVRMenu {
  id: string;
  name: string;
  prompt: string; // Text to speech
  options: IVRMenuOption[];
  timeout: number; // seconds
  maxAttempts: number;
}

export interface IVRMenuOption {
  key: string; // DTMF key (1-9, 0, *, #)
  action: IVRAction;
  label: string; // What to say
  nextMenuId?: string;
  handler?: string; // Function to call
}

export interface IVRFlow {
  id: string;
  name: string;
  description: string;
  startMenuId: string;
  menus: IVRMenu[];
  isActive: boolean;
}

export interface InitiateIVRCallRequest {
  callerPhone: string;
  callerName?: string;
  callType: IVRCallType;
  approvalRequestId?: string;
  gateId?: string;
}

export interface IVRResponse {
  success: boolean;
  message: string;
  call?: IVRCall;
  nextMenu?: IVRMenu;
  errors?: string[];
}

export interface IVRStatistics {
  totalCalls: number;
  callsToday: number;
  activeCalls: number;
  completedCalls: number;
  failedCalls: number;
  averageCallDuration: number; // in seconds
  totalApprovals: number;
  approvedViaIVR: number;
  rejectedViaIVR: number;
  byCallType: {
    approvalRequest: number;
    visitorEntry: number;
    deliveryEntry: number;
    emergency: number;
    information: number;
  };
  byGate: {
    [gateId: string]: number;
  };
}

export interface IVRFilter {
  callType?: IVRCallType;
  status?: IVRCallStatus;
  gateId?: string;
  searchTerm?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

