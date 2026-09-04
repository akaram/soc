/**
 * Maps between IVR UI models and the live {@code /ivr} + {@code /visitors} APIs.
 */

import {
  IVRCall,
  ApprovalRequest,
  IVRFlow,
  IVRMenu,
  IVRMenuOption,
  IVRCallStatus,
  IVRCallType,
  IVRAction,
  ApprovalStatus,
  IVRFilter,
  IVRStatistics,
  InitiateIVRCallRequest
} from '../models/ivr.model';
import { Visitor, ApprovalStatus as VisitorApprovalStatus } from '../../visitor-management/models/visitor.model';

/** Parse API date strings into Date objects */
export function parseApiDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Parse JSON array fields returned as string or array from the API */
export function parseJsonArray<T = string>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

const GATE_NAMES: Record<string, string> = {
  MAIN_GATE: 'Main Gate',
  SIDE_GATE: 'Side Gate',
  PARKING_GATE: 'Parking Gate',
  EMERGENCY_GATE: 'Emergency Gate'
};

export function resolveGateName(gateId?: string): string {
  if (!gateId) return '';
  return GATE_NAMES[gateId] ?? gateId;
}

/** Raw IVR call row from GET/POST /ivr/calls */
export function apiToIvrCall(raw: Record<string, unknown>, approval?: ApprovalRequest): IVRCall {
  return {
    id: String(raw['id'] ?? ''),
    callerPhone: String(raw['callerPhone'] ?? ''),
    callerName: raw['callerName'] ? String(raw['callerName']) : undefined,
    callType: String(raw['callType'] ?? IVRCallType.APPROVAL_REQUEST) as IVRCallType,
    status: String(raw['status'] ?? IVRCallStatus.INITIATED) as IVRCallStatus,
    startTime: parseApiDate(raw['startTime']) ?? new Date(),
    endTime: parseApiDate(raw['endTime']),
    duration: raw['duration'] != null ? Number(raw['duration']) : undefined,
    currentMenu: raw['currentMenu'] ? String(raw['currentMenu']) : undefined,
    selectedOptions: parseJsonArray<string>(raw['selectedOptions']),
    lastPrompt: raw['lastPrompt'] ? String(raw['lastPrompt']) : undefined,
    approvalRequestId: raw['approvalRequestId'] ? String(raw['approvalRequestId']) : undefined,
    approvalRequest: approval,
    approvalAction: raw['approvalAction'] ? (String(raw['approvalAction']) as IVRAction) : undefined,
    approvalStatus: raw['approvalStatus'] ? (String(raw['approvalStatus']) as ApprovalStatus) : undefined,
    gateId: raw['gateId'] ? String(raw['gateId']) : undefined,
    gateName: raw['gateName'] ? String(raw['gateName']) : resolveGateName(raw['gateId'] ? String(raw['gateId']) : undefined),
    transferredTo: raw['transferredTo'] ? String(raw['transferredTo']) : undefined,
    recordingUrl: raw['recordingUrl'] ? String(raw['recordingUrl']) : undefined,
    createdAt: parseApiDate(raw['createdAt']) ?? new Date(),
    updatedAt: parseApiDate(raw['updatedAt'] ?? raw['lastModified']) ?? new Date()
  };
}

/** Map pending visitor to IVR approval request */
export function visitorToApprovalRequest(visitor: Visitor): ApprovalRequest {
  return {
    id: visitor.id,
    requestType: 'VISITOR',
    requesterName: visitor.hostName,
    requesterPhone: visitor.hostPhone,
    visitorName: visitor.name,
    visitorPhone: visitor.phone,
    vehicleNumber: visitor.vehicleNumber,
    purpose: visitor.purpose,
    flatNumber: visitor.visitingFlat,
    unitNumber: visitor.visitingUnit,
    status: ApprovalStatus.PENDING,
    requestedAt: parseApiDate(visitor.createdAt) ?? new Date(),
    ivrApproved: false,
    gateId: 'MAIN_GATE',
    gateName: 'Main Gate'
  };
}

/** Raw flow JSON from GET /ivr/flows/society/{id} */
export function apiToIvrFlow(raw: Record<string, unknown>): IVRFlow {
  const menusRaw = parseJsonArray<Record<string, unknown>>(raw['menus']);
  const menus: IVRMenu[] = menusRaw.map(m => ({
    id: String(m['id'] ?? ''),
    name: String(m['name'] ?? ''),
    prompt: String(m['prompt'] ?? ''),
    timeout: Number(m['timeout'] ?? 10),
    maxAttempts: Number(m['maxAttempts'] ?? 3),
    options: parseJsonArray<Record<string, unknown>>(m['options']).map(o => ({
      key: String(o['key'] ?? ''),
      action: String(o['action'] ?? IVRAction.HANGUP) as IVRAction,
      label: String(o['label'] ?? ''),
      nextMenuId: o['nextMenuId'] ? String(o['nextMenuId']) : undefined,
      handler: o['handler'] ? String(o['handler']) : undefined
    })) as IVRMenuOption[]
  }));

  return {
    id: String(raw['id'] ?? ''),
    name: String(raw['name'] ?? ''),
    description: String(raw['description'] ?? ''),
    startMenuId: String(raw['startMenuId'] ?? ''),
    menus,
    isActive: Boolean(raw['isActive'])
  };
}

/** Build POST body for initiating an IVR call */
export function initiateCallToApiBody(
  request: InitiateIVRCallRequest,
  societyId: string
): Record<string, unknown> {
  return {
    societyId,
    callerPhone: request.callerPhone,
    callerName: request.callerName,
    callType: request.callType,
    approvalRequestId: request.approvalRequestId,
    gateId: request.gateId ?? 'MAIN_GATE'
  };
}

/** Map API statistics DTO to UI model */
export function apiToIvrStatistics(raw: Record<string, unknown>): IVRStatistics {
  const toCountMap = (obj: unknown): { [key: string]: number } => {
    if (!obj || typeof obj !== 'object') return {};
    const out: { [key: string]: number } = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = Number(v ?? 0);
    }
    return out;
  };

  const byCallType = toCountMap(raw['byCallType']);
  return {
    totalCalls: Number(raw['totalCalls'] ?? 0),
    callsToday: Number(raw['callsToday'] ?? 0),
    activeCalls: Number(raw['activeCalls'] ?? 0),
    completedCalls: Number(raw['completedCalls'] ?? 0),
    failedCalls: Number(raw['failedCalls'] ?? 0),
    averageCallDuration: Number(raw['averageCallDuration'] ?? 0),
    totalApprovals: Number(raw['totalApprovals'] ?? 0),
    approvedViaIVR: Number(raw['approvedViaIVR'] ?? 0),
    rejectedViaIVR: Number(raw['rejectedViaIVR'] ?? 0),
    byCallType: {
      approvalRequest: byCallType['APPROVAL_REQUEST'] ?? 0,
      visitorEntry: byCallType['VISITOR_ENTRY'] ?? 0,
      deliveryEntry: byCallType['DELIVERY_ENTRY'] ?? 0,
      emergency: byCallType['EMERGENCY'] ?? 0,
      information: byCallType['INFORMATION'] ?? 0
    },
    byGate: toCountMap(raw['byGate'])
  };
}

/** Apply client-side filters on calls loaded from API */
export function applyIvrCallFilter(calls: IVRCall[], filter?: IVRFilter): IVRCall[] {
  if (!filter) return calls;

  let filtered = [...calls];

  if (filter.callType) filtered = filtered.filter(c => c.callType === filter.callType);
  if (filter.status) filtered = filtered.filter(c => c.status === filter.status);
  if (filter.gateId) filtered = filtered.filter(c => c.gateId === filter.gateId);
  if (filter.dateFrom) filtered = filtered.filter(c => c.startTime >= filter.dateFrom!);
  if (filter.dateTo) filtered = filtered.filter(c => c.startTime <= filter.dateTo!);
  if (filter.searchTerm) {
    const search = filter.searchTerm.toLowerCase();
    filtered = filtered.filter(
      c =>
        c.callerPhone.toLowerCase().includes(search) ||
        c.callerName?.toLowerCase().includes(search) ||
        c.gateName?.toLowerCase().includes(search)
    );
  }

  return filtered.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
}

/** Filter visitors to pending approval requests */
export function filterPendingVisitors(visitors: Visitor[]): Visitor[] {
  return visitors.filter(v => v.approvalStatus === VisitorApprovalStatus.PENDING);
}
