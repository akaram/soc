/**
 * Maps REST payloads for recurring visitors, monthly gatepass, and deliveries
 * (backend enums/fields differ slightly from Angular models).
 */

import {
  RecurringVisitor,
  CreateRecurringVisitorRequest
} from '../models/recurring-visitor.model';
import { RecurringPattern } from '../models/visitor.model';
import {
  MonthlyGatepass,
  GatepassStatus
} from '../models/monthly-gatepass.model';
import { ApprovalStatus } from '../models/visitor.model';
import {
  DeliveryTracking,
  DeliveryService,
  DeliveryStatus,
  DeliveryType,
  DeliveryItem
} from '../models/delivery-tracking.model';

/** Parses UI time strings like "09:00 AM" or "14:30" to HH:mm:ss for the API. */
export function toIsoLocalTime(s: string): string {
  const t = (s || '09:00').trim();
  const ampm = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const ap = ampm[3].toUpperCase();
    if (ap === 'PM' && h < 12) {
      h += 12;
    }
    if (ap === 'AM' && h === 12) {
      h = 0;
    }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  }
  const hm = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hm) {
    return `${hm[1].padStart(2, '0')}:${hm[2].padStart(2, '0')}:${hm[3] ? hm[3].padStart(2, '0') : '00'}`;
  }
  return '09:00:00';
}

export function parseAccessDaysJson(raw: unknown): {
  pattern: RecurringPattern;
  days: number[] | undefined;
} {
  if (raw == null || raw === '') {
    return { pattern: RecurringPattern.DAILY, days: undefined };
  }
  if (typeof raw === 'string') {
    try {
      const o = JSON.parse(raw) as { pattern?: string; days?: number[] };
      const pattern = (o.pattern as RecurringPattern) || RecurringPattern.DAILY;
      return { pattern, days: Array.isArray(o.days) ? o.days : undefined };
    } catch {
      return { pattern: RecurringPattern.DAILY, days: undefined };
    }
  }
  return { pattern: RecurringPattern.DAILY, days: undefined };
}

function formatTimeFromApi(v: unknown): string {
  if (v == null) {
    return '';
  }
  if (typeof v === 'string') {
    const p = v.split(':');
    if (p.length >= 2) {
      return `${p[0].padStart(2, '0')}:${p[1].padStart(2, '0')}`;
    }
    return v;
  }
  if (typeof v === 'object' && v !== null && 'hour' in v) {
    const t = v as { hour: number; minute: number };
    return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
  }
  return String(v);
}

function parseDate(v: unknown): Date {
  if (v == null) {
    return new Date(0);
  }
  if (v instanceof Date) {
    return v;
  }
  const d = new Date(typeof v === 'string' || typeof v === 'number' ? v : String(v));
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

export function normalizeRecurringVisitor(
  raw: any,
  flat?: { id?: string; flatNumber?: string }
): RecurringVisitor {
  const { pattern, days } = parseAccessDaysJson(raw?.accessDays);
  const visitingFlat = flat?.flatNumber ?? raw?.flatId ?? '';
  const adminDisplay = '—';
  const st = raw?.status as string | undefined;
  const isActive = st === 'ACTIVE';
  const reg = raw?.registrationDate ? parseDate(raw.registrationDate) : new Date(0);
  const exp = raw?.expiryDate ? parseDate(raw.expiryDate) : undefined;
  const createdAt = parseDate(raw?.createdAt);
  const updatedAt = parseDate(raw?.updatedAt);
  return {
    id: String(raw?.id ?? ''),
    name: String(raw?.name ?? ''),
    phone: String(raw?.phone ?? ''),
    email: raw?.email ?? undefined,
    visitingFlat,
    visitingUnit: undefined,
    hostName: adminDisplay,
    hostPhone: adminDisplay,
    hostId: String(raw?.ownerId ?? ''),
    purpose: String(raw?.purpose ?? raw?.relationship ?? ''),
    visitTime: formatTimeFromApi(raw?.accessStartTime),
    expectedDuration: 120,
    vehicleNumber: undefined,
    vehicleType: undefined,
    recurringPattern: pattern,
    daysOfWeek: days,
    startDate: reg,
    endDate: exp,
    isActive,
    autoApprove: raw?.registrationStatus === 'APPROVED',
    qrCode: undefined,
    qrCodeData: undefined,
    notes: undefined,
    createdAt,
    updatedAt,
    lastVisitDate: undefined,
    totalVisits: 0,
    idProofNumber: raw?.idProofNumber ?? undefined
  };
}

export function normalizeMonthlyGatepass(raw: any, flat?: { flatNumber?: string }): MonthlyGatepass {
  const vf = raw?.validFrom ? parseDate(raw.validFrom) : new Date(0);
  const vt = raw?.validTo ? parseDate(raw.validTo) : new Date(0);
  const statusBackend = raw?.status as string | undefined;
  let uiStatus: GatepassStatus;
  if (!raw?.approvedBy && statusBackend === 'ACTIVE') {
    uiStatus = GatepassStatus.PENDING;
  } else {
    const map: Record<string, GatepassStatus> = {
      ACTIVE: GatepassStatus.ACTIVE,
      INACTIVE: GatepassStatus.SUSPENDED,
      EXPIRED: GatepassStatus.EXPIRED,
      SUSPENDED: GatepassStatus.SUSPENDED
    };
    uiStatus = map[statusBackend || ''] ?? GatepassStatus.ACTIVE;
  }
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (vt.getTime() < todayStart.getTime()) {
    uiStatus = GatepassStatus.EXPIRED;
  }
  const validityDays = Math.max(
    0,
    Math.ceil((vt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  );
  return {
    id: String(raw?.id ?? ''),
    visitorName: String(raw?.visitorName ?? ''),
    phone: String(raw?.phone ?? ''),
    email: raw?.email ?? undefined,
    visitingFlat: flat?.flatNumber ?? String(raw?.flatId ?? ''),
    visitingUnit: undefined,
    hostName: '—',
    hostPhone: '—',
    hostId: String(raw?.ownerId ?? ''),
    purpose: String(raw?.purpose ?? ''),
    photo: raw?.photoUrl ?? undefined,
    idProofNumber: undefined,
    vehicleNumber: undefined,
    vehicleType: undefined,
    qrCode: raw?.qrCode ?? undefined,
    qrCodeData: raw?.qrCodeData ?? undefined,
    startDate: vf,
    endDate: vt,
    validityDays,
    status: uiStatus,
    approvalStatus:
      raw?.approvedBy || uiStatus === GatepassStatus.ACTIVE
        ? ApprovalStatus.APPROVED
        : ApprovalStatus.PENDING,
    isActive: uiStatus === GatepassStatus.ACTIVE,
    autoApprove: true,
    maxVisitsPerMonth: undefined,
    currentMonthVisits: 0,
    totalVisits: 0,
    notes: undefined,
    createdBy: String(raw?.ownerId ?? ''),
    createdAt: parseDate(raw?.createdAt),
    updatedAt: parseDate(raw?.updatedAt),
    approvedBy: raw?.approvedBy ?? undefined,
    approvedDate: raw?.approvedDate ? parseDate(raw.approvedDate) : undefined
  };
}

/** Backend Delivery.DeliveryType → UI service (closest match). */
function deliveryTypeToService(dt: string): DeliveryService {
  const u = (dt || '').toUpperCase();
  if (u === 'AMAZON') {
    return DeliveryService.AMAZON;
  }
  if (u === 'ZOMATO') {
    return DeliveryService.ZOMATO;
  }
  if (u === 'SWIGGY') {
    return DeliveryService.SWIGGY;
  }
  if (u === 'FLIPKART') {
    return DeliveryService.FLIPKART;
  }
  return DeliveryService.OTHER;
}

function backendStatusToUi(st: string): DeliveryStatus {
  const u = (st || '').toUpperCase();
  const m: Record<string, DeliveryStatus> = {
    PENDING: DeliveryStatus.ORDERED,
    IN_TRANSIT: DeliveryStatus.OUT_FOR_DELIVERY,
    ARRIVED: DeliveryStatus.ARRIVED,
    DELIVERED: DeliveryStatus.DELIVERED,
    RETURNED: DeliveryStatus.FAILED,
    CANCELLED: DeliveryStatus.CANCELLED
  };
  return m[u] ?? DeliveryStatus.ORDERED;
}

export function uiDeliveryStatusToBackend(s: DeliveryStatus): string {
  const m: Partial<Record<DeliveryStatus, string>> = {
    [DeliveryStatus.ORDERED]: 'PENDING',
    [DeliveryStatus.CONFIRMED]: 'PENDING',
    [DeliveryStatus.PREPARING]: 'PENDING',
    [DeliveryStatus.OUT_FOR_DELIVERY]: 'IN_TRANSIT',
    [DeliveryStatus.ARRIVED]: 'ARRIVED',
    [DeliveryStatus.DELIVERED]: 'DELIVERED',
    [DeliveryStatus.FAILED]: 'RETURNED',
    [DeliveryStatus.CANCELLED]: 'CANCELLED'
  };
  return m[s] ?? 'PENDING';
}

export function normalizeDelivery(
  raw: any,
  flat?: { flatNumber?: string }
): DeliveryTracking {
  let items: DeliveryItem[] | undefined;
  let recipientName = '—';
  try {
    if (raw?.itemsDescription) {
      const j = JSON.parse(raw.itemsDescription as string);
      if (Array.isArray(j)) {
        items = j as DeliveryItem[];
      } else if (j && typeof j === 'object' && 'items' in j) {
        const o = j as {
          items?: DeliveryItem[];
          recipientName?: string;
          recipientEmail?: string;
          unitNumber?: string;
          trackingUrl?: string;
          specialInstructions?: string;
          totalAmount?: number;
          paymentMethod?: string;
        };
        items = o.items;
        if (o.recipientName) {
          recipientName = o.recipientName;
        }
      }
    }
  } catch {
    items = undefined;
  }
  const createdAt = parseDate(raw?.createdAt);
  const updatedAt = parseDate(raw?.updatedAt);
  return {
    id: String(raw?.id ?? ''),
    orderId: String(raw?.trackingNumber ?? raw?.id ?? ''),
    service: deliveryTypeToService(String(raw?.deliveryType ?? 'OTHER')),
    deliveryType: DeliveryType.PACKAGE,
    status: backendStatusToUi(String(raw?.status ?? 'PENDING')),
    recipientName,
    recipientPhone: raw?.deliveryExecutivePhone ? String(raw.deliveryExecutivePhone) : '—',
    flatNumber: flat?.flatNumber ?? String(raw?.flatId ?? ''),
    unitNumber: undefined,
    hostId: String(raw?.recipientId ?? ''),
    hostName: '—',
    hostPhone: '—',
    estimatedArrival: raw?.expectedDeliveryTime
      ? parseDate(raw.expectedDeliveryTime)
      : undefined,
    actualArrival: raw?.actualDeliveryTime
      ? parseDate(raw.actualDeliveryTime)
      : undefined,
    deliveredAt:
      String(raw?.status).toUpperCase() === 'DELIVERED' && raw?.actualDeliveryTime
        ? parseDate(raw.actualDeliveryTime)
        : undefined,
    deliveryPersonName: raw?.deliveryExecutiveName ?? undefined,
    deliveryPersonPhone: raw?.deliveryExecutivePhone ?? undefined,
    items,
    totalAmount: undefined,
    paymentMethod: undefined,
    specialInstructions: undefined,
    trackingUrl: undefined,
    currentLocation: undefined,
    lastUpdated: updatedAt,
    visitorId: undefined,
    qrCode: undefined,
    qrCodeData: undefined,
    isActive: String(raw?.status).toUpperCase() !== 'DELIVERED',
    requiresApproval: false,
    approved: true,
    approvedBy: undefined,
    approvedAt: undefined,
    createdAt,
    updatedAt,
    notes: raw?.notes ?? undefined,
    vehicleNumber: undefined
  };
}

export function createRecurringVisitorBody(
  request: CreateRecurringVisitorRequest,
  societyId: string,
  flatId: string,
  ownerId: string
): Record<string, unknown> {
  const accessPayload = JSON.stringify({
    pattern: request.recurringPattern,
    days: request.daysOfWeek ?? []
  });
  return {
    societyId,
    flatId,
    ownerId,
    name: request.name.trim(),
    phone: request.phone.trim(),
    email: request.email?.trim() || undefined,
    purpose: request.purpose,
    relationship: 'RECURRING_VISITOR',
    accessDays: accessPayload,
    accessStartTime: toIsoLocalTime(request.visitTime),
    accessEndTime: toIsoLocalTime(request.visitTime),
    status: 'ACTIVE',
    registrationStatus: request.autoApprove === false ? 'PENDING' : 'APPROVED',
    registrationDate: new Date().toISOString().split('T')[0],
    expiryDate: request.endDate ? request.endDate.toISOString().split('T')[0] : undefined,
    idProofNumber: request.idProofNumber?.trim() || undefined
  };
}
