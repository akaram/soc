import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError, forkJoin, from } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import QRCode from 'qrcode';
import {
  Visitor,
  PreInviteVisitorRequest,
  VisitorInvitationResponse,
  VisitorStatus,
  ApprovalStatus,
  VehicleType as VisitorVehicleType,
  VisitorFilter,
  VisitorStatistics,
  QRCodeData,
  RecurringPattern
} from '../models/visitor.model';
import {
  RecurringVisitor,
  CreateRecurringVisitorRequest,
  RecurringVisitorResponse,
  DailyHelpType
} from '../models/recurring-visitor.model';
import {
  MonthlyGatepass,
  CreateMonthlyGatepassRequest,
  MonthlyGatepassResponse,
  GatepassStatus,
  GatepassStatistics
} from '../models/monthly-gatepass.model';
import {
  isValidPhotoDataUrl,
  readCachedPhoto,
  resolvePhotoDisplayUrl
} from '../../gate-security/services/visitor-photo-api.mapper';
import {
  BulkApprovalRequest,
  BulkApprovalResponse,
  BulkApprovalFailure,
  BulkApprovalSession,
  BulkApprovalStatus
} from '../models/bulk-approval.model';
import {
  ApprovalTier,
  ApprovalLevel,
  ApprovalWorkflow,
  TierApprovalRequest,
  TierRejectionRequest,
  TierApprovalResponse,
  ApprovalWorkflowStatistics
} from '../models/approval-tier.model';
import {
  DeliveryTracking,
  DeliveryService,
  DeliveryStatus,
  DeliveryType,
  CreateDeliveryTrackingRequest,
  UpdateDeliveryStatusRequest,
  DeliveryTrackingResponse,
  DeliveryStatistics,
  DeliveryFilter,
  DeliveryItem
} from '../models/delivery-tracking.model';
import {
  CabTaxiEntry,
  CreateCabTaxiEntryRequest,
  SendOtpRequest,
  VerifyOtpRequest,
  CabTaxiEntryResponse,
  CabTaxiEntryStatistics,
  CabTaxiEntryFilter
} from '../models/cab-taxi-entry.model';
import {
  SchoolBus,
  BusRoute,
  CreateSchoolBusRequest,
  UpdateBusLocationRequest,
  SchoolBusResponse,
  SchoolBusStatistics,
  SchoolBusFilter
} from '../models/school-bus-tracking.model';
import {
  normalizeRecurringVisitor,
  normalizeMonthlyGatepass,
  normalizeDelivery,
  createRecurringVisitorBody,
  toIsoLocalTime,
  uiDeliveryStatusToBackend
} from './visitor-ancillary.mappers';
import {
  normalizeCabTaxiEntry,
  normalizeSchoolBus,
  normalizeBusRoute,
  mapCabTaxiStatistics,
  mapSchoolBusStatistics
} from './cab-school.mappers';
import { SessionContextService } from '../../../core/services/session-context.service';

/** Spring Data Page JSON returned by /visitors/society/{id}/search */
interface SpringPage<T> {
  content?: T[];
  totalElements?: number;
}

@Injectable({
  providedIn: 'root'
})
export class VisitorManagementService {
  constructor(
    private http: HttpClient,
    private sessionContext: SessionContextService
  ) {}
  
  /**
   * Society for visitor APIs — same resolution as admin users list and mobile guard session.
   */
  private getSocietyId(): string {
    return this.sessionContext.getSocietyId();
  }

  /** True when a visitor still needs guard (gate) approval. */
  private isVisitorGatePending(v: Visitor): boolean {
    if (v.status !== VisitorStatus.PENDING) {
      return false;
    }
    if (v.gateApproved || v.gateRejected) {
      return false;
    }
    const level = v.approvalLevel;
    // NONE / missing = treat as gate-level pending (legacy rows and backend default).
    return (
      !level ||
      level === ApprovalLevel.NONE ||
      level === ApprovalLevel.GATE_LEVEL ||
      level === ApprovalLevel.BOTH
    );
  }

  /** Logged-in admin id, name, phone for host / invitedBy fields on create. */
  private getAdminFromSession(): { id: string; name: string; phone: string } {
    const fallback = { id: '', name: 'Admin', phone: '0000000000' };
    for (const storage of [localStorage, sessionStorage]) {
      const session = storage.getItem('adminSession');
      if (session) {
        try {
          const o = JSON.parse(session) as { userId?: string; name?: string; phone?: string };
          return {
            id: o.userId ?? fallback.id,
            name: o.name ?? fallback.name,
            phone: o.phone?.trim() ? o.phone : fallback.phone
          };
        } catch {
          /* continue */
        }
      }
    }
    const userRaw = sessionStorage.getItem('adminUser') ?? localStorage.getItem('adminUser');
    if (userRaw) {
      try {
        const o = JSON.parse(userRaw) as { id?: string; name?: string };
        return {
          id: o.id ?? fallback.id,
          name: o.name ?? fallback.name,
          phone: fallback.phone
        };
      } catch {
        /* ignore */
      }
    }
    return fallback;
  }

  private parseAsDate(v: unknown): Date | undefined {
    if (v == null) {
      return undefined;
    }
    if (v instanceof Date) {
      return v;
    }
    if (typeof v === 'string' || typeof v === 'number') {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? undefined : d;
    }
    return undefined;
  }

  /** Normalizes backend LocalTime (string or object) to HH:mm for the UI model. */
  private normalizeVisitTime(v: unknown): string {
    if (v == null) {
      return '';
    }
    if (typeof v === 'string') {
      const parts = v.split(':');
      if (parts.length >= 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      }
      return v;
    }
    if (typeof v === 'object' && v !== null && 'hour' in v) {
      const t = v as { hour: number; minute: number };
      return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
    }
    return String(v);
  }

  /** Maps Jackson visitor JSON to the Angular {@link Visitor} shape. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- API payload shape varies
  private normalizeVisitor(raw: any): Visitor {
    const visitDate = this.parseAsDate(raw.visitDate) ?? new Date(0);
    const invitedDate = this.parseAsDate(raw.invitedDate) ?? new Date(0);
    const id = String(raw.id ?? '');
    const societyId = this.getSocietyId();
    return {
      id,
      name: String(raw.name ?? ''),
      phone: String(raw.phone ?? ''),
      email: raw.email != null ? String(raw.email) : undefined,
      purpose: String(raw.purpose ?? ''),
      visitingFlat: String(raw.visitingFlat ?? raw['visiting_flat'] ?? ''),
      visitingUnit: raw.visitingUnit != null ? String(raw.visitingUnit) : undefined,
      hostName: String(raw.hostName ?? raw['host_name'] ?? ''),
      hostPhone: String(raw.hostPhone ?? raw['host_phone'] ?? ''),
      hostId: String(raw.hostId ?? raw['host_id'] ?? ''),
      visitDate,
      visitTime: this.normalizeVisitTime(raw.visitTime ?? raw['visit_time']),
      expectedDuration: typeof raw.expectedDuration === 'number' ? raw.expectedDuration : undefined,
      vehicleNumber: raw.vehicleNumber != null ? String(raw.vehicleNumber) : undefined,
      vehicleType: (raw.vehicleType as VisitorVehicleType) ?? VisitorVehicleType.NONE,
      numberOfVisitors: typeof raw.numberOfVisitors === 'number' ? raw.numberOfVisitors : 1,
      photo: this.resolveVisitorPhoto(raw.photo, id, societyId),
      idProof: raw.idProof != null ? String(raw.idProof) : undefined,
      idProofNumber: raw.idProofNumber != null ? String(raw.idProofNumber) : undefined,
      qrCode: raw.qrCode != null ? String(raw.qrCode) : undefined,
      qrCodeData: raw.qrCodeData != null ? String(raw.qrCodeData) : undefined,
      status: (raw.status as VisitorStatus) ?? VisitorStatus.PENDING,
      approvalStatus: (raw.approvalStatus as ApprovalStatus) ?? ApprovalStatus.PENDING,
      checkInTime: this.parseAsDate(raw.checkInTime),
      checkOutTime: this.parseAsDate(raw.checkOutTime),
      checkedInBy: raw.checkedInBy != null ? String(raw.checkedInBy) : undefined,
      checkedOutBy: raw.checkedOutBy != null ? String(raw.checkedOutBy) : undefined,
      guardNotes: raw.guardNotes != null ? String(raw.guardNotes) : undefined,
      rejectionReason: raw.rejectionReason != null ? String(raw.rejectionReason) : undefined,
      invitedBy: String(raw.invitedBy ?? ''),
      invitedDate,
      expiryDate: this.parseAsDate(raw.expiryDate),
      isRecurring: !!raw.isRecurring,
      recurringPattern: raw.recurringPattern as RecurringPattern | undefined,
      approvalLevel: raw.approvalLevel != null ? String(raw.approvalLevel) : undefined,
      gateApproved: !!raw.gateApproved,
      towerApproved: !!raw.towerApproved,
      gateApprovedBy: raw.gateApprovedBy != null ? String(raw.gateApprovedBy) : undefined,
      gateApprovedAt: this.parseAsDate(raw.gateApprovedAt),
      towerApprovedBy: raw.towerApprovedBy != null ? String(raw.towerApprovedBy) : undefined,
      towerApprovedAt: this.parseAsDate(raw.towerApprovedAt),
      gateRejected: !!raw.gateRejected,
      towerRejected: !!raw.towerRejected,
      gateRejectionReason: raw.gateRejectionReason != null ? String(raw.gateRejectionReason) : undefined,
      towerRejectionReason: raw.towerRejectionReason != null ? String(raw.towerRejectionReason) : undefined,
      currentApprovalTier: raw.currentApprovalTier != null ? String(raw.currentApprovalTier) : undefined,
      createdAt: this.parseAsDate(raw.createdAt) ?? new Date(0),
      updatedAt: this.parseAsDate(raw.updatedAt) ?? new Date(0)
    };
  }

  /** Inline JPEG data URL, local cache fallback, or placeholder for gate photos. */
  private resolveVisitorPhoto(
    rawPhoto: unknown,
    visitorId: string,
    societyId: string
  ): string | undefined {
    const photo = rawPhoto != null ? String(rawPhoto).trim() : '';
    if (!photo) {
      return undefined;
    }
    if (isValidPhotoDataUrl(photo)) {
      return photo;
    }
    if (societyId && visitorId) {
      const cached = readCachedPhoto(societyId, visitorId);
      if (cached) {
        return cached;
      }
    }
    if (!photo) {
      return undefined;
    }
    return resolvePhotoDisplayUrl(photo, societyId, visitorId);
  }

  private normalizeVisitorList(rows: unknown[]): Visitor[] {
    return rows.map(r => this.normalizeVisitor(r));
  }

  /** Builds JSON body for POST /visitors from the pre-invite form (no file upload). */
  private buildCreateVisitorPayload(req: PreInviteVisitorRequest): Record<string, unknown> {
    const admin = this.getAdminFromSession();
    const societyId = this.getSocietyId();
    const vd = req.visitDate instanceof Date ? req.visitDate : new Date(req.visitDate as string | number);
    const visitDateStr = vd.toISOString().split('T')[0];
    let vt = (req.visitTime || '09:00:00').trim();
    if (vt.split(':').length === 2) {
      vt = `${vt}:00`;
    }
    const requiresTower =
      !!req.visitingUnit && /tower\s*[abc]/i.test(req.visitingUnit);
    const approvalLevel = requiresTower ? 'BOTH' : 'GATE_LEVEL';
    return {
      societyId,
      name: req.name.trim(),
      phone: req.phone.trim(),
      email: req.email?.trim() || undefined,
      purpose: (req.purpose || 'Visit').trim(),
      visitingFlat: req.visitingFlat.trim(),
      visitingUnit: req.visitingUnit?.trim() || undefined,
      hostName: admin.name,
      hostPhone: admin.phone,
      hostId: admin.id || societyId,
      visitDate: visitDateStr,
      visitTime: vt,
      expectedDuration: req.expectedDuration ?? 60,
      vehicleNumber: req.vehicleNumber?.trim() || undefined,
      vehicleType: req.vehicleType ?? 'NONE',
      numberOfVisitors: req.numberOfVisitors ?? 1,
      status: 'PENDING',
      approvalStatus: 'PENDING',
      approvalLevel,
      invitedBy: admin.id || societyId,
      isRecurring: req.isRecurring ?? false,
      recurringPattern: req.recurringPattern,
      guardNotes: req.notes?.trim() || undefined
    };
  }

  /**
   * Pre-invite a visitor (POST /visitors). QR data may be filled by the backend later.
   */
  preInviteVisitor(request: PreInviteVisitorRequest): Observable<VisitorInvitationResponse> {
    if (!request.name?.trim() || !request.phone?.trim() || !request.visitingFlat?.trim() || !request.visitDate) {
      return of({
        success: false,
        message: 'Please fill all required fields',
        errors: ['Missing required fields']
      });
    }
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(request.phone)) {
      return of({
        success: false,
        message: 'Invalid phone number format',
        errors: ['Invalid phone number']
      });
    }
    const payload = this.buildCreateVisitorPayload(request);
    const societyId = payload['societyId'] as string;
    if (!societyId?.trim()) {
      return of({
        success: false,
        message: 'No society selected. Open Society Setup and select a society first.',
        errors: ['Missing societyId']
      });
    }
    return this.http.post<Record<string, unknown>>('/visitors', payload).pipe(
      switchMap(raw => from(this.ensureVisitorQrCode(this.normalizeVisitor(raw)))),
      map(visitor => {
        return {
          success: true,
          message: 'Visitor pre-invited successfully.',
          visitor,
          qrCode: visitor.qrCode,
          qrCodeData: visitor.qrCodeData,
          shareableLink: `${window.location.origin}/admin/visitors/${visitor.id}/qr`
        };
      }),
      catchError(err => {
        const msg = err.error?.message || err.message || 'Failed to create visitor';
        return of({
          success: false,
          message: msg,
          errors: [msg]
        });
      })
    );
  }

  /**
   * Get all visitors for the current society
   */
  getAllVisitors(): Observable<Visitor[]> {
    const societyId = this.getSocietyId();
    if (!societyId) {
      return of([]);
    }
    return this.http.get<unknown[]>(`/visitors/society/${societyId}`).pipe(
      map(rows => this.normalizeVisitorList(Array.isArray(rows) ? rows : []))
    );
  }

  /**
   * Get visitor by ID
   */
  getVisitorById(id: string): Observable<Visitor> {
    return this.http
      .get<Record<string, unknown>>(`/visitors/${encodeURIComponent(id)}`)
      .pipe(switchMap(raw => from(this.ensureVisitorQrCode(this.normalizeVisitor(raw)))));
  }

  /**
   * Resolve a visitor from a scanned QR token (UUID, phone, qrCodeId, or search term).
   */
  findVisitorByScanToken(token: string): Observable<Visitor | null> {
    const trimmed = token?.trim();
    if (!trimmed) {
      return of(null);
    }

    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRe.test(trimmed)) {
      return this.getVisitorById(trimmed).pipe(catchError(() => of(null)));
    }

    const digitsOnly = trimmed.replace(/\D/g, '');

    return this.getVisitorsByFilter({ searchTerm: trimmed }).pipe(
      map(list => this.pickBestVisitorScanMatch(list, trimmed, digitsOnly)),
      switchMap(match => {
        if (match) {
          return of(match);
        }
        // Fallback: match qrCodeId embedded in stored qrCodeData JSON.
        return this.getAllVisitors().pipe(
          map(all => this.pickBestVisitorScanMatch(all, trimmed, digitsOnly))
        );
      }),
      catchError(() => of(null))
    );
  }

  /** Pick the best visitor row for a guard scan token. */
  private pickBestVisitorScanMatch(
    list: Visitor[],
    token: string,
    digitsOnly: string
  ): Visitor | null {
    if (!list?.length) {
      return null;
    }

    const byId = list.find(v => v.id === token);
    if (byId) {
      return byId;
    }

    const byPhone = list.find(v => {
      const phoneDigits = (v.phone ?? '').replace(/\D/g, '');
      return (
        v.phone === token ||
        phoneDigits === digitsOnly ||
        (digitsOnly.length >= 6 &&
          (phoneDigits.endsWith(digitsOnly) || digitsOnly.endsWith(phoneDigits)))
      );
    });
    if (byPhone) {
      return byPhone;
    }

    const byQrMeta = list.find(v => {
      if (!v.qrCodeData) {
        return false;
      }
      try {
        const data = JSON.parse(v.qrCodeData) as Record<string, unknown>;
        return data['qrCodeId'] === token || data['visitorId'] === token;
      } catch {
        return false;
      }
    });
    if (byQrMeta) {
      return byQrMeta;
    }

    return list.length === 1 ? list[0] : null;
  }

  /**
   * Builds QR image (data URL) when the API did not store one yet.
   */
  /**
   * Builds QR image for recurring / daily-help visitors when the API has none stored.
   */
  async ensureRecurringVisitorQrCode(visitor: RecurringVisitor): Promise<RecurringVisitor> {
    if (!visitor?.id) {
      return visitor;
    }
    if (visitor.qrCode?.startsWith('data:image')) {
      return visitor;
    }
    const expiry =
      visitor.endDate != null
        ? new Date(visitor.endDate).toISOString()
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const qrPayload = {
      type: 'RECURRING',
      recurringVisitorId: visitor.id,
      name: visitor.name,
      phone: visitor.phone,
      visitingFlat: visitor.visitingFlat,
      visitTime: visitor.visitTime || '09:00',
      recurringPattern: visitor.recurringPattern,
      qrCodeId: this.generateQRCodeId(),
      expiryDate: expiry,
      isActive: visitor.isActive
    };
    const qrCodeData = JSON.stringify(qrPayload);
    try {
      const qrCode = await QRCode.toDataURL(qrCodeData, { width: 280, margin: 2, errorCorrectionLevel: 'M' });
      return { ...visitor, qrCodeData, qrCode };
    } catch (e) {
      console.error('Recurring QR generation failed:', e);
      return { ...visitor, qrCodeData, qrCode: this.generateQRCodeImage(qrCodeData) };
    }
  }

  async ensureVisitorQrCode(visitor: Visitor): Promise<Visitor> {
    if (!visitor?.id) {
      return visitor;
    }
    if (visitor.qrCode?.startsWith('data:image')) {
      return visitor;
    }
    const visitDate =
      visitor.visitDate instanceof Date
        ? visitor.visitDate.toISOString()
        : String(visitor.visitDate ?? '');
    const expiry =
      visitor.expiryDate != null
        ? new Date(visitor.expiryDate).toISOString()
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const qrPayload: QRCodeData = {
      visitorId: visitor.id,
      name: visitor.name,
      phone: visitor.phone,
      visitingFlat: visitor.visitingFlat,
      visitDate,
      visitTime: visitor.visitTime || '09:00',
      qrCodeId: this.generateQRCodeId(),
      expiryDate: expiry,
      status: visitor.status
    };
    const qrCodeData = JSON.stringify(qrPayload);
    try {
      const qrCode = await QRCode.toDataURL(qrCodeData, { width: 280, margin: 2, errorCorrectionLevel: 'M' });
      return { ...visitor, qrCodeData, qrCode };
    } catch (e) {
      console.error('QR generation failed:', e);
      return { ...visitor, qrCodeData, qrCode: this.generateQRCodeImage(qrCodeData) };
    }
  }

  /**
   * Format a Date as YYYY-MM-DD in the user's local timezone (avoids UTC drift from toISOString).
   */
  private toLocalDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** True when two timestamps fall on the same local calendar day. */
  private isSameLocalCalendarDay(value: Date | undefined | null, reference: Date): boolean {
    if (!value) {
      return false;
    }
    const a = new Date(value);
    const b = new Date(reference);
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  /**
   * Visitors approved, checked in, or otherwise processed today (local date).
   * Matches the guard dashboard "Approved Today" tile.
   */
  isVisitorApprovedToday(visitor: Visitor, reference: Date = new Date()): boolean {
    const processed =
      visitor.status === VisitorStatus.APPROVED ||
      visitor.status === VisitorStatus.CHECKED_IN ||
      visitor.status === VisitorStatus.CHECKED_OUT;
    if (!processed) {
      return false;
    }
    return (
      this.isSameLocalCalendarDay(visitor.visitDate, reference) ||
      this.isSameLocalCalendarDay(visitor.gateApprovedAt, reference) ||
      this.isSameLocalCalendarDay(visitor.towerApprovedAt, reference) ||
      this.isSameLocalCalendarDay(visitor.checkInTime, reference)
    );
  }

  /** All society visitors with approval / check-in activity today. */
  getApprovedTodayVisitors(reference: Date = new Date()): Observable<Visitor[]> {
    return this.getAllVisitors().pipe(
      map(visitors => visitors.filter(v => this.isVisitorApprovedToday(v, reference)))
    );
  }

  /**
   * Get visitors by filter (search uses Spring Page — we take the first page, size 500)
   */
  getVisitorsByFilter(filter: VisitorFilter): Observable<Visitor[]> {
    const societyId = this.getSocietyId();
    let params = new HttpParams();

    if (filter.status) {
      return this.http.get<unknown[]>(`/visitors/society/${societyId}/status/${filter.status}`).pipe(
        map(rows => this.normalizeVisitorList(Array.isArray(rows) ? rows : []))
      );
    }

    if (filter.visitDate) {
      const dateStr =
        filter.visitDate instanceof Date
          ? this.toLocalDateString(filter.visitDate)
          : filter.visitDate;
      return this.http.get<unknown[]>(`/visitors/society/${societyId}/date/${dateStr}`).pipe(
        map(rows => this.normalizeVisitorList(Array.isArray(rows) ? rows : []))
      );
    }

    if (filter.hostId) {
      return this.http.get<unknown[]>(`/visitors/host/${filter.hostId}`).pipe(
        map(rows => this.normalizeVisitorList(Array.isArray(rows) ? rows : []))
      );
    }

    if (filter.searchTerm) {
      params = params.set('searchTerm', filter.searchTerm).set('page', '0').set('size', '500');
      return this.http.get<SpringPage<unknown>>(`/visitors/society/${societyId}/search`, { params }).pipe(
        map(page => this.normalizeVisitorList(page.content ?? []))
      );
    }

    return this.getAllVisitors();
  }

  /**
   * Visitor statistics derived from the live society list
   */
  getVisitorStatistics(): Observable<VisitorStatistics> {
    return this.getAllVisitors().pipe(
      map(visitors => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayVisitors = visitors.filter((v: Visitor) => {
          const visitDate = new Date(v.visitDate);
          visitDate.setHours(0, 0, 0, 0);
          return visitDate.getTime() === today.getTime();
        });

        const thisWeek = this.getWeekStart();
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        return {
          totalToday: todayVisitors.length,
          pending: visitors.filter((v: Visitor) => v.status === VisitorStatus.PENDING).length,
          approved: visitors.filter((v: Visitor) => v.status === VisitorStatus.APPROVED).length,
          approvedToday: visitors.filter((v: Visitor) => this.isVisitorApprovedToday(v, today)).length,
          checkedIn: visitors.filter((v: Visitor) => v.status === VisitorStatus.CHECKED_IN).length,
          checkedOut: visitors.filter((v: Visitor) => v.status === VisitorStatus.CHECKED_OUT).length,
          rejected: visitors.filter((v: Visitor) => v.status === VisitorStatus.REJECTED).length,
          thisWeek: visitors.filter((v: Visitor) => {
            const visitDate = new Date(v.visitDate);
            return visitDate >= thisWeek;
          }).length,
          thisMonth: visitors.filter((v: Visitor) => {
            const visitDate = new Date(v.visitDate);
            return visitDate >= thisMonth;
          }).length
        };
      })
    );
  }

  /**
   * Approve visitor. Pass completeApproval=true for admin one-click full approval (both gate + tower).
   */
  approveVisitor(
    visitorId: string,
    approvedBy?: string,
    completeApproval = true
  ): Observable<VisitorInvitationResponse> {
    const by = approvedBy?.trim() || this.getAdminFromSession().id || 'admin';
    let params = new HttpParams().set('approvedBy', by);
    if (completeApproval) {
      params = params.set('complete', 'true');
    }
    return this.http.post<Record<string, unknown>>(`/visitors/${visitorId}/approve`, null, { params }).pipe(
      switchMap(raw => {
        let visitor = this.normalizeVisitor(raw);
        // Fallback for older backends that ignore complete=true on BOTH-level visitors
        if (
          completeApproval &&
          visitor.approvalLevel === 'BOTH' &&
          visitor.status === VisitorStatus.PENDING &&
          visitor.gateApproved &&
          !visitor.towerApproved
        ) {
          return this.http
            .post<Record<string, unknown>>(`/visitors/${visitorId}/approve-tower`, null, {
              params: new HttpParams().set('approvedBy', by)
            })
            .pipe(map(towerRaw => this.normalizeVisitor(towerRaw)));
        }
        return of(visitor);
      }),
      map(visitor => {
        const fullyApproved = visitor.status === VisitorStatus.APPROVED;
        return {
          success: fullyApproved,
          message: fullyApproved
            ? 'Visitor approved successfully'
            : 'Gate approval recorded — tower approval still required',
          visitor
        };
      })
    );
  }

  /**
   * Reject visitor
   */
  rejectVisitor(visitorId: string, reason: string): Observable<VisitorInvitationResponse> {
    return this.http.post<Record<string, unknown>>(`/visitors/${visitorId}/reject`, null, {
      params: new HttpParams().set('reason', reason)
    }).pipe(
      map(raw => {
        const visitor = this.normalizeVisitor(raw);
        return {
          success: true,
          message: 'Visitor rejected',
          visitor
        };
      })
    );
  }

  /**
   * Check in visitor
   */
  checkInVisitor(visitorId: string, checkedInBy: string, notes?: string): Observable<VisitorInvitationResponse> {
    let params = new HttpParams().set('checkedInBy', checkedInBy);
    if (notes) {
      params = params.set('notes', notes);
    }
    return this.http.post<Record<string, unknown>>(`/visitors/${visitorId}/check-in`, null, { params }).pipe(
      map(raw => {
        const visitor = this.normalizeVisitor(raw);
        return {
          success: true,
          message: 'Visitor checked in successfully',
          visitor
        };
      })
    );
  }

  /**
   * Check out visitor
   */
  checkOutVisitor(visitorId: string, checkedOutBy: string): Observable<VisitorInvitationResponse> {
    return this.http.post<Record<string, unknown>>(`/visitors/${visitorId}/check-out`, null, {
      params: new HttpParams().set('checkedOutBy', checkedOutBy)
    }).pipe(
      map(raw => {
        const visitor = this.normalizeVisitor(raw);
        return {
          success: true,
          message: 'Visitor checked out successfully',
          visitor
        };
      })
    );
  }

  /**
   * Scan QR payload (JSON) and load the visitor from the API
   */
  scanQRCode(qrCodeData: string): Observable<Visitor | undefined> {
    let data: QRCodeData;
    try {
      data = JSON.parse(qrCodeData) as QRCodeData;
    } catch (error) {
      console.error('Invalid QR code data:', error);
      return of(undefined);
    }
    if (!data?.visitorId) {
      return of(undefined);
    }
    return this.getVisitorById(data.visitorId).pipe(
      map(visitor => {
        if (visitor.expiryDate && new Date() > new Date(visitor.expiryDate)) {
          return undefined;
        }
        return visitor;
      }),
      catchError(() => of(undefined))
    );
  }

  /**
   * Delete visitor on the server
   */
  deleteVisitor(visitorId: string): Observable<VisitorInvitationResponse> {
    return this.http.delete<void>(`/visitors/${visitorId}`).pipe(
      map(() => ({
        success: true,
        message: 'Visitor deleted successfully'
      })),
      catchError(err => {
        const msg = err.error?.message || err.message || 'Delete failed';
        return of({
          success: false,
          message: msg,
          errors: [msg]
        });
      })
    );
  }

  // Helper methods
  private generateVisitorId(): string {
    return 'VIS-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  private generateQRCodeId(): string {
    return 'QR-' + Math.random().toString(36).substr(2, 12).toUpperCase();
  }

  private generateQRCodeImage(data: string): string {
    // In a real application, this would generate an actual QR code image
    // For now, we'll return a data URL placeholder
    // You would use a library like 'qrcode' or 'angularx-qrcode' for actual QR generation
    return `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><text x="100" y="100" text-anchor="middle" font-size="12">QR Code</text></svg>`)}`;
  }

  private getWeekStart(): Date {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(today.setDate(diff));
  }

  /**
   * Resolve a flat UUID for APIs: match visitingFlat label to /flats/society, else first flat.
   */
  private resolveFlatId(visitingFlat?: string): Observable<string> {
    const sid = this.getSocietyId();
    return this.http.get<any[]>(`/flats/society/${sid}`).pipe(
      map(flats => {
        if (!flats?.length) {
          throw new Error(
            'No flats for this society. Create a flat or run the backend with spring.profiles.active=dev.'
          );
        }
        const label = (visitingFlat || '').trim().toLowerCase().replace(/\s+/g, '');
        if (label) {
          const hit = flats.find((f: any) => {
            const fn = String(f.flatNumber || '')
              .toLowerCase()
              .replace(/\s+/g, '');
            return fn === label || fn.includes(label) || label.includes(fn);
          });
          if (hit?.id) {
            return String(hit.id);
          }
        }
        return String(flats[0].id);
      })
    );
  }

  /** Recurring visitors merged with flat numbers for display */
  private listRecurringWithFlats(): Observable<RecurringVisitor[]> {
    const sid = this.getSocietyId();
    return forkJoin({
      rows: this.http.get<any[]>(`/recurring-visitors/society/${sid}`),
      flats: this.http.get<any[]>(`/flats/society/${sid}`)
    }).pipe(
      map(({ rows, flats }) => {
        const byId = new Map<string, any>(flats.map((f: any) => [f.id, f]));
        return rows.map((r: any) => normalizeRecurringVisitor(r, byId.get(r.flatId)));
      })
    );
  }

  private listMonthlyWithFlats(): Observable<MonthlyGatepass[]> {
    const sid = this.getSocietyId();
    return forkJoin({
      rows: this.http.get<any[]>(`/monthly-gatepass/society/${sid}`),
      flats: this.http.get<any[]>(`/flats/society/${sid}`)
    }).pipe(
      map(({ rows, flats }) => {
        const byId = new Map<string, any>(flats.map((f: any) => [f.id, f]));
        return rows.map((r: any) => normalizeMonthlyGatepass(r, byId.get(r.flatId)));
      })
    );
  }

  private listDeliveriesWithFlats(): Observable<DeliveryTracking[]> {
    const sid = this.getSocietyId();
    return forkJoin({
      rows: this.http.get<any[]>(`/deliveries/society/${sid}`),
      flats: this.http.get<any[]>(`/flats/society/${sid}`)
    }).pipe(
      map(({ rows, flats }) => {
        const byId = new Map<string, any>(flats.map((f: any) => [f.id, f]));
        return rows
          .map((r: any) => normalizeDelivery(r, byId.get(r.flatId)))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      })
    );
  }

  /**
   * Get all recurring visitors
   */
  getAllRecurringVisitors(): Observable<RecurringVisitor[]> {
    return this.listRecurringWithFlats();
  }

  /**
   * Get recurring visitor by ID
   */
  getRecurringVisitorById(id: string): Observable<RecurringVisitor | undefined> {
    return forkJoin({
      raw: this.http.get<any>(`/recurring-visitors/${id}`),
      flats: this.http.get<any[]>(`/flats/society/${this.getSocietyId()}`)
    }).pipe(
      map(({ raw, flats }) => {
        const byId = new Map<string, any>(flats.map((f: any) => [f.id, f]));
        return normalizeRecurringVisitor(raw, byId.get(raw.flatId));
      }),
      catchError(() => of(undefined))
    );
  }

  /**
   * Create a new recurring visitor (daily help)
   */
  createRecurringVisitor(request: CreateRecurringVisitorRequest): Observable<RecurringVisitorResponse> {
    if (!request.name?.trim() || !request.phone?.trim() || !request.visitingFlat?.trim() || !request.visitTime) {
      return of({
        success: false,
        message: 'Please fill all required fields',
        errors: ['Missing required fields']
      });
    }
    const admin = this.getAdminFromSession();
    const ownerId = admin.id || this.getSocietyId();
    return this.resolveFlatId(request.visitingFlat).pipe(
      switchMap(flatId => {
        const body = createRecurringVisitorBody(
          request,
          this.getSocietyId(),
          flatId,
          ownerId
        );
        return this.http.post<any>('/recurring-visitors', body).pipe(
          switchMap(raw =>
            this.http.get<any[]>(`/flats/society/${this.getSocietyId()}`).pipe(
              map(flats => {
                const flat = flats.find((f: any) => f.id === raw.flatId);
                return normalizeRecurringVisitor(raw, flat);
              })
            )
          ),
          map(recurringVisitor => ({
            success: true,
            message: 'Recurring visitor created successfully',
            recurringVisitor
          })),
          catchError(err => {
            const msg = err.error?.message || err.message || 'Create failed';
            return of({ success: false, message: msg, errors: [msg] });
          })
        );
      }),
      catchError(err => {
        const msg = err?.message || 'Could not resolve flat';
        return of({ success: false, message: msg, errors: [msg] });
      })
    );
  }

  /**
   * Update recurring visitor
   */
  updateRecurringVisitor(id: string, request: Partial<CreateRecurringVisitorRequest>): Observable<RecurringVisitorResponse> {
    const patch: any = {};
    if (request.name != null) {
      patch.name = request.name;
    }
    if (request.phone != null) {
      patch.phone = request.phone;
    }
    if (request.purpose != null) {
      patch.purpose = request.purpose;
    }
    if (request.visitTime != null) {
      const iso = toIsoLocalTime(request.visitTime);
      patch.accessStartTime = iso;
      patch.accessEndTime = iso;
    }
    if (request.recurringPattern != null || request.daysOfWeek != null) {
      patch.accessDays = JSON.stringify({
        pattern: request.recurringPattern,
        days: request.daysOfWeek ?? []
      });
    }
    return this.http.put<any>(`/recurring-visitors/${id}`, patch).pipe(
      switchMap(raw =>
        this.http.get<any[]>(`/flats/society/${this.getSocietyId()}`).pipe(
          map(flats => {
            const flat = flats.find((f: any) => f.id === raw.flatId);
            return normalizeRecurringVisitor(raw, flat);
          })
        )
      ),
      map(recurringVisitor => ({
        success: true,
        message: 'Recurring visitor updated successfully',
        recurringVisitor
      })),
      catchError(err => {
        const msg = err.error?.message || err.message || 'Update failed';
        return of({ success: false, message: msg, errors: [msg] });
      })
    );
  }

  /**
   * Activate/Deactivate recurring visitor
   */
  toggleRecurringVisitor(id: string): Observable<RecurringVisitorResponse> {
    return this.http.get<any>(`/recurring-visitors/${id}`).pipe(
      switchMap(cur => {
        const next = cur.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        return this.http.put<any>(`/recurring-visitors/${id}`, { status: next });
      }),
      switchMap(raw =>
        this.http.get<any[]>(`/flats/society/${this.getSocietyId()}`).pipe(
          map(flats => {
            const flat = flats.find((f: any) => f.id === raw.flatId);
            return normalizeRecurringVisitor(raw, flat);
          })
        )
      ),
      map(recurringVisitor => ({
        success: true,
        message: `Recurring visitor ${recurringVisitor.isActive ? 'activated' : 'deactivated'} successfully`,
        recurringVisitor
      })),
      catchError(err => {
        const msg = err.error?.message || err.message || 'Toggle failed';
        return of({ success: false, message: msg, errors: [msg] });
      })
    );
  }

  /**
   * Delete recurring visitor
   */
  deleteRecurringVisitor(id: string): Observable<RecurringVisitorResponse> {
    return this.http.delete<void>(`/recurring-visitors/${id}`).pipe(
      map(() => ({ success: true, message: 'Recurring visitor deleted successfully' })),
      catchError(err => {
        const msg = err.error?.message || err.message || 'Delete failed';
        return of({ success: false, message: msg, errors: [msg] });
      })
    );
  }

  /**
   * Get recurring visitors by flat
   */
  getRecurringVisitorsByFlat(flatNumber: string): Observable<RecurringVisitor[]> {
    return this.listRecurringWithFlats().pipe(
      map(list =>
        list.filter(
          rv => rv.visitingFlat.toLowerCase() === flatNumber.trim().toLowerCase()
        )
      )
    );
  }

  /**
   * Get active recurring visitors (daily help) for guard gate screens.
   * Mobile guards use JWT-scoped /current-society/active.
   */
  getActiveRecurringVisitors(): Observable<RecurringVisitor[]> {
    const sid = this.getSocietyId();
    const isMobile =
      typeof window !== 'undefined' && window.location.pathname.includes('/mobile');

    const enrich = (rows: any[], societyId: string) =>
      this.http.get<any[]>(`/flats/society/${societyId}`).pipe(
        catchError(() => of([] as any[])),
        map(flats => {
          const byId = new Map<string, any>(flats.map((f: any) => [f.id, f]));
          return (rows ?? [])
            .map((r: any) => normalizeRecurringVisitor(r, byId.get(r.flatId)))
            .filter((rv: RecurringVisitor) => rv.isActive)
            .sort((a, b) => a.name.localeCompare(b.name));
        })
      );

    const fallbackBySociety = (societyId: string) =>
      this.http.get<any[]>(`/recurring-visitors/society/${societyId}/active`).pipe(
        catchError(() =>
          this.http.get<any[]>(`/recurring-visitors/society/${societyId}`).pipe(
            map(rows =>
              (rows ?? []).filter(r => (r?.status ?? '').toUpperCase() === 'ACTIVE')
            )
          )
        ),
        switchMap(rows => enrich(rows, societyId))
      );

    if (isMobile) {
      return this.http.get<any[]>(`/recurring-visitors/current-society/active`).pipe(
        switchMap(rows => {
          const societyId = sid || rows?.[0]?.societyId || '';
          if (!societyId) {
            return of(
              (rows ?? []).map((r: any) => normalizeRecurringVisitor(r))
            );
          }
          return enrich(rows, societyId);
        }),
        catchError(() => (sid ? fallbackBySociety(sid) : of([])))
      );
    }

    if (!sid) {
      return of([]);
    }

    return fallbackBySociety(sid).pipe(catchError(() => of([])));
  }

  /** Log daily-help check-in (UI-only until visit counter API exists). */
  recordRecurringVisitorCheckIn(id: string): Observable<{ success: boolean; message: string }> {
    return this.getRecurringVisitorById(id).pipe(
      map(rv => {
        if (!rv) {
          return { success: false, message: 'Recurring visitor not found' };
        }
        if (!rv.isActive) {
          return { success: false, message: 'Recurring visitor is not active' };
        }
        return {
          success: true,
          message: `${rv.name} allowed — daily help entry noted.`
        };
      }),
      catchError(() => of({ success: false, message: 'Could not verify recurring visitor' }))
    );
  }

  // Helper method for generating recurring visitor ID
  private generateRecurringVisitorId(): string {
    return 'REC-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  /**
   * Get all monthly gatepasses
   */
  getAllMonthlyGatepasses(): Observable<MonthlyGatepass[]> {
    return this.listMonthlyWithFlats();
  }

  /**
   * Active monthly gatepasses for guard gate (valid today, status ACTIVE).
   * Mobile guards use JWT-scoped /current-society/active; admin uses society path.
   */
  getActiveMonthlyGatepasses(): Observable<MonthlyGatepass[]> {
    const sid = this.getSocietyId();
    const isMobile =
      typeof window !== 'undefined' && window.location.pathname.includes('/mobile');

    const enrich = (rows: any[], societyId: string) =>
      this.http.get<any[]>(`/flats/society/${societyId}`).pipe(
        catchError(() => of([] as any[])),
        map(flats => {
          const byId = new Map<string, any>(flats.map((f: any) => [f.id, f]));
          return (rows ?? [])
            .map((r: any) => normalizeMonthlyGatepass(r, byId.get(r.flatId)))
            .filter(gp => gp.status === GatepassStatus.ACTIVE && gp.validityDays >= 0)
            .sort((a, b) => a.visitorName.localeCompare(b.visitorName));
        })
      );

    const fallbackBySociety = (societyId: string) =>
      this.http.get<any[]>(`/monthly-gatepass/society/${societyId}/active`).pipe(
        catchError(() =>
          this.http.get<any[]>(`/monthly-gatepass/society/${societyId}`).pipe(
            map(rows =>
              (rows ?? []).filter(r => {
                if ((r?.status ?? '').toUpperCase() !== 'ACTIVE') {
                  return false;
                }
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const from = r?.validFrom ? new Date(r.validFrom) : null;
                const to = r?.validTo ? new Date(r.validTo) : null;
                if (from) from.setHours(0, 0, 0, 0);
                if (to) to.setHours(23, 59, 59, 999);
                return (!from || from <= today) && (!to || to >= today);
              })
            )
          )
        ),
        switchMap(rows => enrich(rows, societyId))
      );

    if (isMobile) {
      return this.http.get<any[]>(`/monthly-gatepass/current-society/active`).pipe(
        switchMap(rows => {
          const societyId = sid || rows?.[0]?.societyId || '';
          if (!societyId) {
            return of(
              (rows ?? []).map((r: any) =>
                normalizeMonthlyGatepass(r)
              )
            );
          }
          return enrich(rows, societyId);
        }),
        catchError(() => (sid ? fallbackBySociety(sid) : of([])))
      );
    }

    if (!sid) {
      return of([]);
    }

    return fallbackBySociety(sid).pipe(catchError(() => of([])));
  }

  /**
   * Get monthly gatepass by ID
   */
  getMonthlyGatepassById(id: string): Observable<MonthlyGatepass | undefined> {
    return forkJoin({
      raw: this.http.get<any>(`/monthly-gatepass/${id}`),
      flats: this.http.get<any[]>(`/flats/society/${this.getSocietyId()}`)
    }).pipe(
      map(({ raw, flats }) => {
        const flat = flats.find((f: any) => f.id === raw.flatId);
        return normalizeMonthlyGatepass(raw, flat);
      }),
      catchError(() => of(undefined))
    );
  }

  /**
   * Create a new monthly gatepass
   */
  createMonthlyGatepass(request: CreateMonthlyGatepassRequest): Observable<MonthlyGatepassResponse> {
    if (!request.visitorName?.trim() || !request.phone?.trim() || !request.visitingFlat?.trim() || !request.startDate || !request.endDate) {
      return of({
        success: false,
        message: 'Please fill all required fields',
        errors: ['Missing required fields']
      });
    }
    if (request.endDate <= request.startDate) {
      return of({
        success: false,
        message: 'End date must be after start date',
        errors: ['Invalid date range']
      });
    }
    const admin = this.getAdminFromSession();
    const ownerId = admin.id || this.getSocietyId();
    return this.resolveFlatId(request.visitingFlat).pipe(
      switchMap(flatId => {
        const body: any = {
          societyId: this.getSocietyId(),
          flatId,
          ownerId,
          visitorName: request.visitorName.trim(),
          phone: request.phone.trim(),
          email: request.email?.trim(),
          purpose: request.purpose,
          validFrom: request.startDate.toISOString().split('T')[0],
          validTo: request.endDate.toISOString().split('T')[0],
          status: 'ACTIVE',
          qrCodeData: JSON.stringify({
            visitorName: request.visitorName,
            flatLabel: request.visitingFlat
          })
        };
        return this.http.post<any>('/monthly-gatepass', body).pipe(
          switchMap(raw =>
            this.http.get<any[]>(`/flats/society/${this.getSocietyId()}`).pipe(
              map(flats => {
                const flat = flats.find((f: any) => f.id === raw.flatId);
                return normalizeMonthlyGatepass(raw, flat);
              })
            )
          ),
          map(gatepass => ({
            success: true,
            message: 'Monthly gatepass created successfully',
            gatepass
          })),
          catchError(err => {
            const msg = err.error?.message || err.message || 'Create failed';
            return of({ success: false, message: msg, errors: [msg] });
          })
        );
      }),
      catchError(err => {
        const msg = err?.message || 'Could not resolve flat';
        return of({ success: false, message: msg, errors: [msg] });
      })
    );
  }

  /**
   * Update monthly gatepass
   */
  updateMonthlyGatepass(id: string, request: Partial<CreateMonthlyGatepassRequest>): Observable<MonthlyGatepassResponse> {
    const patch: any = {};
    if (request.visitorName != null) patch.visitorName = request.visitorName;
    if (request.phone != null) patch.phone = request.phone;
    if (request.email !== undefined) patch.email = request.email;
    if (request.purpose != null) patch.purpose = request.purpose;
    if (request.startDate) patch.validFrom = request.startDate.toISOString().split('T')[0];
    if (request.endDate) patch.validTo = request.endDate.toISOString().split('T')[0];
    return this.http.put<any>(`/monthly-gatepass/${id}`, patch).pipe(
      switchMap(raw =>
        this.http.get<any[]>(`/flats/society/${this.getSocietyId()}`).pipe(
          map(flats => normalizeMonthlyGatepass(raw, flats.find((f: any) => f.id === raw.flatId)))
        )
      ),
      map(gatepass => ({ success: true, message: 'Monthly gatepass updated successfully', gatepass })),
      catchError(err => {
        const msg = err.error?.message || err.message || 'Update failed';
        return of({ success: false, message: msg, errors: [msg] });
      })
    );
  }

  /**
   * Approve monthly gatepass
   */
  approveMonthlyGatepass(id: string, approvedBy: string): Observable<MonthlyGatepassResponse> {
    const approvedDate = new Date().toISOString().split('T')[0];
    return this.http
      .put<any>(`/monthly-gatepass/${id}`, {
        approvedBy,
        approvedDate,
        status: 'ACTIVE'
      })
      .pipe(
        switchMap(raw =>
          this.http.get<any[]>(`/flats/society/${this.getSocietyId()}`).pipe(
            map(flats => normalizeMonthlyGatepass(raw, flats.find((f: any) => f.id === raw.flatId)))
          )
        ),
        map(gatepass => ({ success: true, message: 'Monthly gatepass approved successfully', gatepass })),
        catchError(err => {
          const msg = err.error?.message || err.message || 'Approve failed';
          return of({ success: false, message: msg, errors: [msg] });
        })
      );
  }

  /**
   * Suspend monthly gatepass
   */
  suspendMonthlyGatepass(id: string, reason?: string): Observable<MonthlyGatepassResponse> {
    return this.http.put<any>(`/monthly-gatepass/${id}`, { status: 'SUSPENDED' }).pipe(
      switchMap(raw =>
        this.http.get<any[]>(`/flats/society/${this.getSocietyId()}`).pipe(
          map(flats => normalizeMonthlyGatepass(raw, flats.find((f: any) => f.id === raw.flatId)))
        )
      ),
      map(gatepass => {
        if (reason) gatepass.notes = (gatepass.notes || '') + '\nSuspended: ' + reason;
        return { success: true, message: 'Monthly gatepass suspended successfully', gatepass };
      }),
      catchError(err => {
        const msg = err.error?.message || err.message || 'Suspend failed';
        return of({ success: false, message: msg, errors: [msg] });
      })
    );
  }

  /**
   * Cancel monthly gatepass
   */
  cancelMonthlyGatepass(id: string, reason?: string): Observable<MonthlyGatepassResponse> {
    return this.http.put<any>(`/monthly-gatepass/${id}`, { status: 'INACTIVE' }).pipe(
      switchMap(raw =>
        this.http.get<any[]>(`/flats/society/${this.getSocietyId()}`).pipe(
          map(flats => normalizeMonthlyGatepass(raw, flats.find((f: any) => f.id === raw.flatId)))
        )
      ),
      map(gatepass => {
        if (reason) gatepass.notes = (gatepass.notes || '') + '\nCancelled: ' + reason;
        return { success: true, message: 'Monthly gatepass cancelled successfully', gatepass };
      }),
      catchError(err => {
        const msg = err.error?.message || err.message || 'Cancel failed';
        return of({ success: false, message: msg, errors: [msg] });
      })
    );
  }

  /**
   * Delete monthly gatepass
   */
  deleteMonthlyGatepass(id: string): Observable<MonthlyGatepassResponse> {
    return this.http.delete<void>(`/monthly-gatepass/${id}`).pipe(
      map(() => ({ success: true, message: 'Monthly gatepass deleted successfully' })),
      catchError(err => {
        const msg = err.error?.message || err.message || 'Delete failed';
        return of({ success: false, message: msg, errors: [msg] });
      })
    );
  }

  /**
   * Get monthly gatepass statistics
   */
  getMonthlyGatepassStatistics(): Observable<GatepassStatistics> {
    return this.listMonthlyWithFlats().pipe(
      map(gps => {
        const today = new Date();
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          totalActive: gps.filter(gp => gp.status === GatepassStatus.ACTIVE).length,
          totalExpired: gps.filter(gp => gp.status === GatepassStatus.EXPIRED).length,
          totalPending: gps.filter(gp => gp.status === GatepassStatus.PENDING).length,
          totalThisMonth: gps.filter(gp => new Date(gp.createdAt) >= thisMonthStart).length,
          totalVisitsThisMonth: 0
        };
      })
    );
  }

  /**
   * Record a visit for monthly gatepass (visit counts are not persisted server-side in this POC)
   */
  recordGatepassVisit(gatepassId: string): Observable<MonthlyGatepassResponse> {
    return this.getMonthlyGatepassById(gatepassId).pipe(
      switchMap(gp => {
        if (!gp) {
          return of({ success: false, message: 'Monthly gatepass not found', errors: ['Invalid ID'] });
        }
        if (gp.status !== GatepassStatus.ACTIVE && gp.status !== GatepassStatus.PENDING) {
          return of({ success: false, message: 'Gatepass is not active', errors: ['Invalid status'] });
        }
        return of({
          success: true,
          message: 'Visit noted (counter is UI-only until the API stores it).',
          gatepass: gp
        });
      })
    );
  }

  // Helper method for generating gatepass ID
  private generateGatepassId(): string {
    return 'GP-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  /**
   * Bulk approve visitors (parallel POST /visitors/{id}/approve). QR auto-generation is server-side only for this POC.
   */
  bulkApproveVisitors(request: BulkApprovalRequest): Observable<BulkApprovalResponse> {
    if (!request.visitorIds?.length) {
      return of({
        success: false,
        message: 'No visitors selected for approval',
        totalRequested: 0,
        approved: 0,
        failed: 0,
        errors: ['No visitors selected']
      });
    }
    const approvedBy = this.getAdminFromSession().id || 'admin';
    return forkJoin(
      request.visitorIds.map(id =>
        this.http.post<Record<string, unknown>>(`/visitors/${id}/approve`, null, {
          params: new HttpParams().set('approvedBy', approvedBy).set('complete', 'true')
        }).pipe(
          map(raw => ({ ok: true as const, visitor: this.normalizeVisitor(raw) })),
          catchError(() =>
            of({
              ok: false as const,
              visitorId: id,
              visitorName: 'Unknown',
              reason: 'Approve request failed'
            })
          )
        )
      )
    ).pipe(
      map(results => {
        const approvedVisitors: Visitor[] = [];
        const failedVisitors: BulkApprovalFailure[] = [];
        for (const r of results) {
          if (r.ok) {
            approvedVisitors.push(r.visitor);
          } else {
            failedVisitors.push({
              visitorId: r.visitorId,
              visitorName: r.visitorName,
              reason: r.reason
            });
          }
        }
        const approvedCount = approvedVisitors.length;
        const failedCount = failedVisitors.length;
        const success = approvedCount > 0;
        const message =
          approvedCount === request.visitorIds.length
            ? `Successfully approved ${approvedCount} visitor(s)`
            : `Approved ${approvedCount} out of ${request.visitorIds.length} visitor(s)`;
        return {
          success,
          message,
          totalRequested: request.visitorIds.length,
          approved: approvedCount,
          failed: failedCount,
          approvedVisitors,
          failedVisitors,
          errors: failedCount > 0 ? failedVisitors.map(f => `${f.visitorName}: ${f.reason}`) : undefined
        };
      })
    );
  }

  /**
   * Get visitors by event date (for bulk approval) from the API list
   */
  getVisitorsByEventDate(eventDate: Date): Observable<Visitor[]> {
    return this.getAllVisitors().pipe(
      map(all => {
        const targetDate = new Date(eventDate);
        targetDate.setHours(0, 0, 0, 0);
        return all.filter((v: Visitor) => {
          const visitDate = new Date(v.visitDate);
          visitDate.setHours(0, 0, 0, 0);
          return (
            visitDate.getTime() === targetDate.getTime() &&
            (v.status === VisitorStatus.PENDING || v.status === VisitorStatus.REJECTED)
          );
        });
      })
    );
  }

  /**
   * Get visitors by event name (purpose contains) from the API list
   */
  getVisitorsByEventName(eventName: string): Observable<Visitor[]> {
    return this.getAllVisitors().pipe(
      map(all => {
        const searchLower = eventName.toLowerCase();
        return all.filter(
          (v: Visitor) =>
            v.purpose.toLowerCase().includes(searchLower) &&
            (v.status === VisitorStatus.PENDING || v.status === VisitorStatus.REJECTED)
        );
      })
    );
  }

  /**
   * Build workflow DTO from a loaded visitor
   */
  private toApprovalWorkflow(visitor: Visitor): ApprovalWorkflow {
    return {
      visitorId: visitor.id,
      gateApprovalRequired:
        visitor.approvalLevel === ApprovalLevel.GATE_LEVEL || visitor.approvalLevel === ApprovalLevel.BOTH,
      towerApprovalRequired:
        visitor.approvalLevel === ApprovalLevel.TOWER_LEVEL || visitor.approvalLevel === ApprovalLevel.BOTH,
      gateApproved: visitor.gateApproved || false,
      towerApproved: visitor.towerApproved || false,
      gateApprovedBy: visitor.gateApprovedBy,
      gateApprovedAt: visitor.gateApprovedAt,
      towerApprovedBy: visitor.towerApprovedBy,
      towerApprovedAt: visitor.towerApprovedAt,
      gateRejected: visitor.gateRejected || false,
      towerRejected: visitor.towerRejected || false,
      gateRejectedBy: visitor.gateRejected ? visitor.gateApprovedBy : undefined,
      gateRejectedAt: visitor.gateRejected ? visitor.gateApprovedAt : undefined,
      gateRejectionReason: visitor.gateRejectionReason,
      towerRejectedBy: visitor.towerRejected ? visitor.towerApprovedBy : undefined,
      towerRejectedAt: visitor.towerRejected ? visitor.towerApprovedAt : undefined,
      towerRejectionReason: visitor.towerRejectionReason,
      currentTier: this.getCurrentApprovalTier(visitor),
      isComplete: this.isApprovalComplete(visitor)
    };
  }

  /**
   * Get approval workflow for a visitor
   */
  getApprovalWorkflow(visitorId: string): Observable<ApprovalWorkflow | undefined> {
    return this.getVisitorById(visitorId).pipe(
      map(v => this.toApprovalWorkflow(v)),
      catchError(() => of(undefined))
    );
  }

  /**
   * Gate level approval — POST /visitors/{id}/approve (handles BOTH gate step on server)
   */
  approveAtGateLevel(request: TierApprovalRequest): Observable<TierApprovalResponse> {
    return this.http
      .post<Record<string, unknown>>(`/visitors/${request.visitorId}/approve`, null, {
        params: new HttpParams().set('approvedBy', request.approvedBy)
      })
      .pipe(
        map(raw => {
          const visitor = this.normalizeVisitor(raw);
          return {
            success: true,
            message: 'Visitor approved at gate level',
            visitor,
            workflow: this.getWorkflowForVisitor(visitor)
          };
        }),
        catchError(err => {
          const msg = err.error?.message || err.message || 'Gate approval failed';
          return of({ success: false, message: msg, errors: [msg] });
        })
      );
  }

  /**
   * Tower level approval — POST /visitors/{id}/approve-tower
   */
  approveAtTowerLevel(request: TierApprovalRequest): Observable<TierApprovalResponse> {
    return this.http
      .post<Record<string, unknown>>(`/visitors/${request.visitorId}/approve-tower`, null, {
        params: new HttpParams().set('approvedBy', request.approvedBy)
      })
      .pipe(
        map(raw => {
          const visitor = this.normalizeVisitor(raw);
          return {
            success: true,
            message: 'Visitor approved at tower level. Fully approved!',
            visitor,
            workflow: this.getWorkflowForVisitor(visitor)
          };
        }),
        catchError(err => {
          const msg = err.error?.message || err.message || 'Tower approval failed';
          return of({ success: false, message: msg, errors: [msg] });
        })
      );
  }

  /**
   * Gate level rejection — uses global reject with a prefixed reason (server stores single rejection_reason)
   */
  rejectAtGateLevel(request: TierRejectionRequest): Observable<TierApprovalResponse> {
    const reason = `Gate Level: ${request.reason}`;
    return this.http
      .post<Record<string, unknown>>(`/visitors/${request.visitorId}/reject`, null, {
        params: new HttpParams().set('reason', reason)
      })
      .pipe(
        map(raw => {
          const visitor = this.normalizeVisitor(raw);
          return {
            success: true,
            message: 'Visitor rejected at gate level',
            visitor,
            workflow: this.getWorkflowForVisitor(visitor)
          };
        }),
        catchError(err => {
          const msg = err.error?.message || err.message || 'Reject failed';
          return of({ success: false, message: msg, errors: [msg] });
        })
      );
  }

  /**
   * Tower level rejection
   */
  rejectAtTowerLevel(request: TierRejectionRequest): Observable<TierApprovalResponse> {
    const reason = `Tower Level: ${request.reason}`;
    return this.http
      .post<Record<string, unknown>>(`/visitors/${request.visitorId}/reject`, null, {
        params: new HttpParams().set('reason', reason)
      })
      .pipe(
        map(raw => {
          const visitor = this.normalizeVisitor(raw);
          return {
            success: true,
            message: 'Visitor rejected at tower level',
            visitor,
            workflow: this.getWorkflowForVisitor(visitor)
          };
        }),
        catchError(err => {
          const msg = err.error?.message || err.message || 'Reject failed';
          return of({ success: false, message: msg, errors: [msg] });
        })
      );
  }

  /**
   * Get approval workflow statistics from the live visitor list
   */
  getApprovalWorkflowStatistics(): Observable<ApprovalWorkflowStatistics> {
    return this.getAllVisitors().pipe(
      map(visitors => ({
        pendingGate: visitors.filter((v: Visitor) => this.isVisitorGatePending(v)).length,
        pendingTower: visitors.filter(
          (v: Visitor) =>
            (v.approvalLevel === ApprovalLevel.TOWER_LEVEL || v.approvalLevel === ApprovalLevel.BOTH) &&
            !v.towerApproved &&
            !v.towerRejected &&
            v.status === VisitorStatus.PENDING &&
            (v.approvalLevel === ApprovalLevel.TOWER_LEVEL || v.gateApproved === true)
        ).length,
        gateApproved: visitors.filter(
          (v: Visitor) => v.gateApproved && !v.towerApproved && v.approvalLevel === ApprovalLevel.BOTH
        ).length,
        towerApproved: visitors.filter((v: Visitor) => v.towerApproved).length,
        fullyApproved: visitors.filter(
          (v: Visitor) => v.gateApproved && v.towerApproved && v.approvalLevel === ApprovalLevel.BOTH
        ).length,
        rejected: visitors.filter(
          (v: Visitor) =>
            v.status === VisitorStatus.REJECTED || v.gateRejected || v.towerRejected
        ).length
      }))
    );
  }

  /**
   * Visitors pending gate approval
   */
  getVisitorsPendingGateApproval(): Observable<Visitor[]> {
    return this.getAllVisitors().pipe(
      map(visitors => visitors.filter((v: Visitor) => this.isVisitorGatePending(v)))
    );
  }

  /**
   * Visitors pending tower approval (after gate when BOTH)
   */
  getVisitorsPendingTowerApproval(): Observable<Visitor[]> {
    return this.getAllVisitors().pipe(
      map(visitors =>
        visitors.filter((v: Visitor) => {
          const requiresTower =
            v.approvalLevel === ApprovalLevel.TOWER_LEVEL || v.approvalLevel === ApprovalLevel.BOTH;
          const notTowerProcessed = !v.towerApproved && !v.towerRejected;
          const gateApprovedIfRequired =
            v.approvalLevel === ApprovalLevel.TOWER_LEVEL || v.gateApproved === true;
          const isPending =
            v.status === VisitorStatus.PENDING || v.approvalStatus === ApprovalStatus.UNDER_REVIEW;
          return requiresTower && notTowerProcessed && gateApprovedIfRequired && isPending;
        })
      )
    );
  }

  // Helper methods
  private getCurrentApprovalTier(visitor: Visitor): ApprovalTier {
    if (!visitor.approvalLevel || visitor.approvalLevel === ApprovalLevel.NONE) {
      return ApprovalTier.COMPLETE;
    }

    if (visitor.approvalLevel === ApprovalLevel.GATE_LEVEL) {
      return visitor.gateApproved ? ApprovalTier.COMPLETE : ApprovalTier.GATE;
    }

    if (visitor.approvalLevel === ApprovalLevel.TOWER_LEVEL) {
      return visitor.towerApproved ? ApprovalTier.COMPLETE : ApprovalTier.TOWER;
    }

    if (visitor.approvalLevel === ApprovalLevel.BOTH) {
      if (visitor.gateApproved && visitor.towerApproved) {
        return ApprovalTier.COMPLETE;
      } else if (visitor.gateApproved) {
        return ApprovalTier.TOWER;
      } else {
        return ApprovalTier.GATE;
      }
    }

    return ApprovalTier.COMPLETE;
  }

  private isApprovalComplete(visitor: Visitor): boolean {
    if (!visitor.approvalLevel || visitor.approvalLevel === ApprovalLevel.NONE) {
      return true;
    }

    if (visitor.approvalLevel === ApprovalLevel.GATE_LEVEL) {
      return visitor.gateApproved === true;
    }

    if (visitor.approvalLevel === ApprovalLevel.TOWER_LEVEL) {
      return visitor.towerApproved === true;
    }

    if (visitor.approvalLevel === ApprovalLevel.BOTH) {
      return visitor.gateApproved === true && visitor.towerApproved === true;
    }

    return false;
  }

  private getWorkflowForVisitor(visitor: Visitor): ApprovalWorkflow {
    return {
      visitorId: visitor.id,
      gateApprovalRequired: visitor.approvalLevel === ApprovalLevel.GATE_LEVEL || visitor.approvalLevel === ApprovalLevel.BOTH,
      towerApprovalRequired: visitor.approvalLevel === ApprovalLevel.TOWER_LEVEL || visitor.approvalLevel === ApprovalLevel.BOTH,
      gateApproved: visitor.gateApproved || false,
      towerApproved: visitor.towerApproved || false,
      gateApprovedBy: visitor.gateApprovedBy,
      gateApprovedAt: visitor.gateApprovedAt,
      towerApprovedBy: visitor.towerApprovedBy,
      towerApprovedAt: visitor.towerApprovedAt,
      gateRejected: visitor.gateRejected || false,
      towerRejected: visitor.towerRejected || false,
      gateRejectedBy: visitor.gateRejected ? visitor.gateApprovedBy : undefined,
      gateRejectedAt: visitor.gateRejected ? visitor.gateApprovedAt : undefined,
      gateRejectionReason: visitor.gateRejectionReason,
      towerRejectedBy: visitor.towerRejected ? visitor.towerApprovedBy : undefined,
      towerRejectedAt: visitor.towerRejected ? visitor.towerApprovedAt : undefined,
      towerRejectionReason: visitor.towerRejectionReason,
      currentTier: this.getCurrentApprovalTier(visitor),
      isComplete: this.isApprovalComplete(visitor)
    };
  }

  // ==================== Delivery Tracking Methods ====================

  /**
   * Get all deliveries
   */
  getAllDeliveries(filter?: DeliveryFilter): Observable<DeliveryTracking[]> {
    return this.listDeliveriesWithFlats().pipe(
      map(list => {
        let filtered = [...list];
        if (filter) {
          if (filter.service) {
            filtered = filtered.filter(d => d.service === filter.service);
          }
          if (filter.deliveryType) {
            filtered = filtered.filter(d => d.deliveryType === filter.deliveryType);
          }
          if (filter.status) {
            filtered = filtered.filter(d => d.status === filter.status);
          }
          if (filter.flatNumber) {
            filtered = filtered.filter(
              d => d.flatNumber.toLowerCase() === filter.flatNumber!.toLowerCase()
            );
          }
          if (filter.searchTerm) {
            const search = filter.searchTerm.toLowerCase();
            filtered = filtered.filter(
              d =>
                d.orderId.toLowerCase().includes(search) ||
                d.recipientName.toLowerCase().includes(search) ||
                d.recipientPhone.includes(search) ||
                d.flatNumber.toLowerCase().includes(search)
            );
          }
        }
        return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      })
    );
  }

  /**
   * Get deliveries assigned to a specific executive
   */
  getDeliveriesByExecutive(executiveId: string, executiveName?: string): Observable<DeliveryTracking[]> {
    return this.listDeliveriesWithFlats().pipe(
      map(rows =>
        rows
          .filter((d: DeliveryTracking) => {
            if (executiveName && d.deliveryPersonName) {
              return d.deliveryPersonName.toLowerCase().includes(executiveName.toLowerCase());
            }
            return (
              (d.deliveryPersonPhone && d.deliveryPersonPhone.includes(executiveId)) ||
              (d.deliveryPersonName && d.deliveryPersonName.includes(executiveId))
            );
          })
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      )
    );
  }

  /**
   * Get delivery by ID
   */
  getDeliveryById(deliveryId: string): Observable<DeliveryTracking | undefined> {
    return forkJoin({
      raw: this.http.get<any>(`/deliveries/${deliveryId}`),
      flats: this.http.get<any[]>(`/flats/society/${this.getSocietyId()}`)
    }).pipe(
      map(({ raw, flats }) =>
        normalizeDelivery(raw, flats.find((f: any) => f.id === raw.flatId))
      ),
      catchError(() => of(undefined))
    );
  }

  /**
   * Create new delivery tracking
   */
  createDeliveryTracking(request: CreateDeliveryTrackingRequest): Observable<DeliveryTrackingResponse> {
    return this.resolveFlatId(request.flatNumber).pipe(
      switchMap(flatId => {
        const meta = {
          recipientName: request.recipientName,
          items: request.items,
          specialInstructions: request.specialInstructions,
          totalAmount: request.totalAmount,
          paymentMethod: request.paymentMethod,
          recipientEmail: request.recipientEmail,
          unitNumber: request.unitNumber,
          trackingUrl: request.trackingUrl,
          requiresApproval: request.requiresApproval
        };
        const body: any = {
          societyId: this.getSocietyId(),
          flatId,
          recipientId: request.hostId,
          deliveryType: request.service,
          trackingNumber: request.orderId,
          deliveryExecutiveName: request.recipientName,
          deliveryExecutivePhone: request.recipientPhone,
          itemsDescription: JSON.stringify(meta),
          status: 'PENDING',
          notes: request.notes
        };
        if (request.estimatedArrival) {
          body.expectedDeliveryTime = request.estimatedArrival.toISOString();
        }
        return this.http.post<any>('/deliveries', body).pipe(
          switchMap(raw =>
            this.http.get<any[]>(`/flats/society/${this.getSocietyId()}`).pipe(
              map(flats =>
                normalizeDelivery(raw, flats.find((f: any) => f.id === raw.flatId))
              )
            )
          ),
          map(delivery => ({
            success: true,
            message: 'Delivery tracking created successfully',
            delivery
          })),
          catchError(err => {
            const msg = err.error?.message || err.message || 'Create failed';
            return of({ success: false, message: msg, errors: [msg], delivery: undefined });
          })
        );
      }),
      catchError(err => {
        const msg = err?.message || 'Could not resolve flat';
        return of({ success: false, message: msg, errors: [msg], delivery: undefined });
      })
    );
  }

  /**
   * Update delivery status
   */
  updateDeliveryStatus(request: UpdateDeliveryStatusRequest): Observable<DeliveryTrackingResponse> {
    const backendSt = uiDeliveryStatusToBackend(request.status);
    return this.http
      .put<any>(`/deliveries/${request.deliveryId}/status`, null, {
        params: new HttpParams().set('status', backendSt)
      })
      .pipe(
        switchMap(() => this.getDeliveryById(request.deliveryId)),
        map(delivery => {
          if (!delivery) {
            return {
              success: false,
              message: 'Delivery not found',
              errors: ['Invalid delivery ID']
            };
          }
          return {
            success: true,
            message: 'Delivery status updated successfully',
            delivery
          };
        }),
        catchError(err => {
          const msg = err.error?.message || err.message || 'Update failed';
          return of({ success: false, message: msg, errors: [msg] });
        })
      );
  }

  /**
   * Approve delivery (stored as note; use status API for workflow)
   */
  approveDelivery(deliveryId: string, approvedBy: string): Observable<DeliveryTrackingResponse> {
    return this.http.get<any>(`/deliveries/${deliveryId}`).pipe(
      switchMap(cur => {
        const notes = (cur.notes ? String(cur.notes) + '\n' : '') + `Approved by ${approvedBy}`;
        return this.http.put<any>(`/deliveries/${deliveryId}`, { notes });
      }),
      switchMap(raw =>
        this.http.get<any[]>(`/flats/society/${this.getSocietyId()}`).pipe(
          map(flats =>
            normalizeDelivery(raw, flats.find((f: any) => f.id === raw.flatId))
          )
        )
      ),
      map(delivery => ({
        success: true,
        message: 'Delivery approved successfully',
        delivery
      })),
      catchError(err => {
        const msg = err.error?.message || err.message || 'Approve failed';
        return of({ success: false, message: msg, errors: [msg] });
      })
    );
  }

  /**
   * Get delivery statistics
   */
  getDeliveryStatistics(): Observable<DeliveryStatistics> {
    return this.listDeliveriesWithFlats().pipe(
      map(deliveries => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayDeliveries = deliveries.filter((d: DeliveryTracking) => {
          const created = new Date(d.createdAt);
          created.setHours(0, 0, 0, 0);
          return created.getTime() === today.getTime();
        });

        return {
          totalToday: todayDeliveries.length,
          pending: deliveries.filter(
            (d: DeliveryTracking) =>
              d.status === DeliveryStatus.ORDERED ||
              d.status === DeliveryStatus.CONFIRMED ||
              d.status === DeliveryStatus.PREPARING
          ).length,
          outForDelivery: deliveries.filter(
            (d: DeliveryTracking) =>
              d.status === DeliveryStatus.OUT_FOR_DELIVERY || d.status === DeliveryStatus.ARRIVED
          ).length,
          delivered: deliveries.filter((d: DeliveryTracking) => d.status === DeliveryStatus.DELIVERED)
            .length,
          failed: deliveries.filter(
            (d: DeliveryTracking) =>
              d.status === DeliveryStatus.FAILED || d.status === DeliveryStatus.CANCELLED
          ).length,
          byService: {
            amazon: deliveries.filter((d: DeliveryTracking) => d.service === DeliveryService.AMAZON)
              .length,
            zomato: deliveries.filter((d: DeliveryTracking) => d.service === DeliveryService.ZOMATO)
              .length,
            swiggy: deliveries.filter((d: DeliveryTracking) => d.service === DeliveryService.SWIGGY)
              .length,
            flipkart: deliveries.filter((d: DeliveryTracking) => d.service === DeliveryService.FLIPKART)
              .length,
            other: deliveries.filter((d: DeliveryTracking) => d.service === DeliveryService.OTHER).length
          },
          byType: {
            food: deliveries.filter((d: DeliveryTracking) => d.deliveryType === DeliveryType.FOOD).length,
            grocery: deliveries.filter((d: DeliveryTracking) => d.deliveryType === DeliveryType.GROCERY)
              .length,
            package: deliveries.filter((d: DeliveryTracking) => d.deliveryType === DeliveryType.PACKAGE)
              .length,
            electronics: deliveries.filter(
              (d: DeliveryTracking) => d.deliveryType === DeliveryType.ELECTRONICS
            ).length,
            clothing: deliveries.filter((d: DeliveryTracking) => d.deliveryType === DeliveryType.CLOTHING)
              .length,
            other: deliveries.filter((d: DeliveryTracking) => d.deliveryType === DeliveryType.OTHER).length
          }
        };
      })
    );
  }

  // ==================== Cab/Taxi Entry Methods (REST) ====================

  /** Maps backend cab/taxi action JSON to CabTaxiEntryResponse. */
  private mapCabTaxiAction(raw: Record<string, unknown> | null | undefined): CabTaxiEntryResponse {
    const r = raw ?? {};
    return {
      success: Boolean(r['success']),
      message: String(r['message'] ?? ''),
      entry: r['entry'] ? normalizeCabTaxiEntry(r['entry'] as Record<string, unknown>) : undefined,
      otpCode: r['otpCode'] != null ? String(r['otpCode']) : undefined,
      errors: Array.isArray(r['errors']) ? (r['errors'] as string[]) : undefined
    };
  }

  getAllCabTaxiEntries(filter?: CabTaxiEntryFilter): Observable<CabTaxiEntry[]> {
    const sid = this.getSocietyId();
    if (!sid) {
      return of([]);
    }
    return this.http.get<Record<string, unknown>[]>(`/cab-taxi-entries/society/${encodeURIComponent(sid)}`).pipe(
      map(rows => {
        let list = (rows ?? []).map(r => normalizeCabTaxiEntry(r));
        if (filter) {
          if (filter.entryType) {
            list = list.filter(e => e.entryType === filter.entryType);
          }
          if (filter.status) {
            list = list.filter(e => e.status === filter.status);
          }
          if (filter.searchTerm) {
            const search = filter.searchTerm.toLowerCase();
            list = list.filter(
              e =>
                e.vehicleNumber.toLowerCase().includes(search) ||
                e.driverName.toLowerCase().includes(search) ||
                e.driverPhone.includes(search) ||
                e.passengerName.toLowerCase().includes(search) ||
                e.passengerPhone.includes(search) ||
                e.visitingFlat.toLowerCase().includes(search)
            );
          }
        }
        return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }),
      catchError(() => of([]))
    );
  }

  getCabTaxiEntryById(id: string): Observable<CabTaxiEntry | null> {
    return this.http.get<Record<string, unknown>>(`/cab-taxi-entries/${encodeURIComponent(id)}`).pipe(
      map(r => normalizeCabTaxiEntry(r)),
      catchError(() => of(null))
    );
  }

  createCabTaxiEntry(request: CreateCabTaxiEntryRequest): Observable<CabTaxiEntryResponse> {
    if (
      !request.vehicleNumber ||
      !request.driverName ||
      !request.driverPhone ||
      !request.passengerName ||
      !request.passengerPhone ||
      !request.visitingFlat
    ) {
      return of({
        success: false,
        message: 'Please fill all required fields',
        errors: ['Missing required fields']
      });
    }
    const societyId = this.getSocietyId();
    if (!societyId) {
      return of({ success: false, message: 'No society in session', errors: ['societyId'] });
    }
    const admin = this.getAdminFromSession();
    let hostId = request.hostId;
    if (!hostId || hostId === 'CURRENT_USER') {
      hostId = admin.id || societyId;
    }
    const body: Record<string, unknown> = {
      societyId,
      entryType: request.entryType,
      vehicleNumber: request.vehicleNumber,
      driverName: request.driverName,
      driverPhone: request.driverPhone,
      driverLicense: request.driverLicense,
      passengerName: request.passengerName,
      passengerPhone: request.passengerPhone,
      passengerEmail: request.passengerEmail,
      visitingFlat: request.visitingFlat,
      visitingUnit: request.visitingUnit,
      hostId,
      expectedDuration: request.expectedDuration,
      purpose: request.purpose,
      requiresApproval: request.requiresApproval ?? false,
      notes: request.notes,
      createdBy: admin.id || 'admin'
    };
    return this.http.post<Record<string, unknown>>('/cab-taxi-entries', body).pipe(
      map(raw => ({
        success: true,
        message: 'Cab/Taxi entry created successfully',
        entry: normalizeCabTaxiEntry(raw)
      })),
      catchError(err => {
        const msg = err?.error?.message || err?.message || 'Failed to create entry';
        return of({ success: false, message: String(msg), errors: [String(msg)] });
      })
    );
  }

  sendOtpForCabTaxiEntry(request: SendOtpRequest): Observable<CabTaxiEntryResponse> {
    return this.http
      .post<Record<string, unknown>>(
        `/cab-taxi-entries/${encodeURIComponent(request.entryId)}/send-otp`,
        { phoneNumber: request.phoneNumber }
      )
      .pipe(
        map(r => this.mapCabTaxiAction(r)),
        catchError(() => of({ success: false, message: 'OTP request failed', errors: ['Network error'] }))
      );
  }

  verifyOtpForCabTaxiEntry(request: VerifyOtpRequest): Observable<CabTaxiEntryResponse> {
    return this.http
      .post<Record<string, unknown>>(
        `/cab-taxi-entries/${encodeURIComponent(request.entryId)}/verify-otp`,
        { otpCode: request.otpCode, phoneNumber: request.phoneNumber }
      )
      .pipe(
        map(r => this.mapCabTaxiAction(r)),
        catchError(() => of({ success: false, message: 'Verification failed', errors: ['Network error'] }))
      );
  }

  approveCabTaxiEntry(entryId: string, approvedBy: string): Observable<CabTaxiEntryResponse> {
    const by = approvedBy || this.getAdminFromSession().id || 'admin';
    const params = new HttpParams().set('approvedBy', by);
    return this.http
      .post<Record<string, unknown>>(`/cab-taxi-entries/${encodeURIComponent(entryId)}/approve`, null, { params })
      .pipe(
        map(r => this.mapCabTaxiAction(r)),
        catchError(() => of({ success: false, message: 'Approve failed', errors: ['Network error'] }))
      );
  }

  recordCabTaxiEntry(entryId: string, gate?: string): Observable<CabTaxiEntryResponse> {
    let params = new HttpParams();
    if (gate) {
      params = params.set('gate', gate);
    }
    return this.http
      .post<Record<string, unknown>>(
        `/cab-taxi-entries/${encodeURIComponent(entryId)}/record-entry`,
        null,
        { params }
      )
      .pipe(
        map(r => this.mapCabTaxiAction(r)),
        catchError(() => of({ success: false, message: 'Record entry failed', errors: ['Network error'] }))
      );
  }

  recordCabTaxiExit(entryId: string, gate?: string): Observable<CabTaxiEntryResponse> {
    let params = new HttpParams();
    if (gate) {
      params = params.set('gate', gate);
    }
    return this.http
      .post<Record<string, unknown>>(
        `/cab-taxi-entries/${encodeURIComponent(entryId)}/record-exit`,
        null,
        { params }
      )
      .pipe(
        map(r => this.mapCabTaxiAction(r)),
        catchError(() => of({ success: false, message: 'Record exit failed', errors: ['Network error'] }))
      );
  }

  getCabTaxiEntryStatistics(): Observable<CabTaxiEntryStatistics> {
    const sid = this.getSocietyId();
    if (!sid) {
      return of(mapCabTaxiStatistics({}));
    }
    return this.http
      .get<Record<string, unknown>>(`/cab-taxi-entries/society/${encodeURIComponent(sid)}/statistics`)
      .pipe(map(r => mapCabTaxiStatistics(r)), catchError(() => of(mapCabTaxiStatistics({}))));
  }

  // ==================== School Bus Tracking (REST) ====================

  getAllSchoolBuses(filter?: SchoolBusFilter): Observable<SchoolBus[]> {
    const sid = this.getSocietyId();
    if (!sid) {
      return of([]);
    }
    return this.http.get<Record<string, unknown>[]>(`/school-buses/society/${encodeURIComponent(sid)}`).pipe(
      map(rows => {
        let list = (rows ?? []).map(r => normalizeSchoolBus(r));
        if (filter) {
          if (filter.status) {
            list = list.filter(b => b.status === filter.status);
          }
          if (filter.routeId) {
            list = list.filter(b => b.routeId === filter.routeId);
          }
          if (filter.searchTerm) {
            const search = filter.searchTerm.toLowerCase();
            list = list.filter(
              b =>
                b.busNumber.toLowerCase().includes(search) ||
                b.vehicleNumber.toLowerCase().includes(search) ||
                b.driverName.toLowerCase().includes(search) ||
                b.driverPhone.includes(search)
            );
          }
        }
        return list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      })
    );
  }

  getSchoolBusById(id: string): Observable<SchoolBus | null> {
    return this.http.get<Record<string, unknown>>(`/school-buses/${encodeURIComponent(id)}`).pipe(
      map(r => normalizeSchoolBus(r)),
      catchError(() => of(null))
    );
  }

  createSchoolBus(request: CreateSchoolBusRequest): Observable<SchoolBusResponse> {
    const societyId = this.getSocietyId();
    if (!societyId) {
      return of({ success: false, message: 'No society in session', errors: ['societyId'] });
    }
    const admin = this.getAdminFromSession();
    const body: Record<string, unknown> = {
      societyId,
      busNumber: request.busNumber,
      vehicleNumber: request.vehicleNumber,
      driverName: request.driverName,
      driverPhone: request.driverPhone,
      driverLicense: request.driverLicense,
      conductorName: request.conductorName,
      conductorPhone: request.conductorPhone,
      routeId: request.routeId,
      maxCapacity: request.maxCapacity,
      scheduledPickupTime: request.scheduledPickupTime,
      scheduledDropoffTime: request.scheduledDropoffTime,
      notes: request.notes,
      createdBy: admin.id || 'admin'
    };
    return this.http.post<Record<string, unknown>>('/school-buses', body).pipe(
      switchMap(raw => {
        const idNew = String(raw['id'] ?? '');
        const fallback = normalizeSchoolBus(raw);
        if (!idNew) {
          return of({ success: true, message: 'School bus created successfully', bus: fallback });
        }
        return this.getSchoolBusById(idNew).pipe(
          map(bus => ({
            success: true,
            message: 'School bus created successfully',
            bus: bus ?? fallback
          }))
        );
      }),
      catchError(err => {
        const msg = err?.error?.message || err?.message || 'Create failed';
        return of({ success: false, message: String(msg), errors: [String(msg)] });
      })
    );
  }

  updateBusLocation(request: UpdateBusLocationRequest): Observable<SchoolBusResponse> {
    return this.http
      .post<Record<string, unknown>>(`/school-buses/${encodeURIComponent(request.busId)}/location`, {
        latitude: request.latitude,
        longitude: request.longitude,
        address: request.address,
        speed: request.speed,
        heading: request.heading
      })
      .pipe(
        map(raw => ({
          success: true,
          message: 'Location updated successfully',
          bus: normalizeSchoolBus(raw)
        })),
        catchError(() =>
          of({ success: false, message: 'Location update failed', errors: ['Bus not found'] })
        )
      );
  }

  getSchoolBusStatistics(): Observable<SchoolBusStatistics> {
    const sid = this.getSocietyId();
    if (!sid) {
      return of(mapSchoolBusStatistics({}));
    }
    return this.http
      .get<Record<string, unknown>>(`/school-buses/society/${encodeURIComponent(sid)}/statistics`)
      .pipe(map(r => mapSchoolBusStatistics(r)));
  }

  getAllBusRoutes(): Observable<BusRoute[]> {
    const sid = this.getSocietyId();
    if (!sid) {
      return of([]);
    }
    return this.http.get<Record<string, unknown>[]>(`/bus-routes/society/${encodeURIComponent(sid)}`).pipe(
      map(rows =>
        (rows ?? [])
          .map(r => normalizeBusRoute(r))
          .filter((x): x is BusRoute => !!x)
      ),
      catchError(() => of([]))
    );
  }
}
