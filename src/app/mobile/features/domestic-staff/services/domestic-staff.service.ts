import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  DomesticStaff,
  StaffRole,
  StaffStatus,
  DocumentType,
  DayOfWeek,
  StaffAccessLog,
  StaffAttendance,
  AttendanceStatus,
  StaffRating,
  PasscodeVerificationRequest,
  PasscodeVerificationResponse
} from '../models/domestic-staff.model';
import { SessionContextService } from '../../../../core/services/session-context.service';

/** Backend staff type / status enums (UPPER_SNAKE). */
const ROLE_TO_BACKEND: Record<string, string> = {
  [StaffRole.MAID]: 'MAID',
  [StaffRole.COOK]: 'COOK',
  [StaffRole.DRIVER]: 'DRIVER',
  [StaffRole.NANNY]: 'NANNY',
  [StaffRole.GARDENER]: 'GARDENER',
  [StaffRole.CARETAKER]: 'CARETAKER',
  [StaffRole.TUTOR]: 'TUTOR',
  [StaffRole.OTHER]: 'OTHER'
};

const ROLE_FROM_BACKEND: Record<string, StaffRole> = {
  MAID: StaffRole.MAID,
  COOK: StaffRole.COOK,
  DRIVER: StaffRole.DRIVER,
  NANNY: StaffRole.NANNY,
  GARDENER: StaffRole.GARDENER,
  CARETAKER: StaffRole.CARETAKER,
  TUTOR: StaffRole.TUTOR,
  SECURITY: StaffRole.OTHER,
  OTHER: StaffRole.OTHER
};

const STATUS_FROM_BACKEND: Record<string, StaffStatus> = {
  ACTIVE: StaffStatus.ACTIVE,
  INACTIVE: StaffStatus.INACTIVE,
  SUSPENDED: StaffStatus.INACTIVE,
  BLACKLISTED: StaffStatus.BLOCKED
};

const DOC_TO_BACKEND: Record<string, string> = {
  [DocumentType.AADHAR]: 'AADHAAR',
  [DocumentType.PAN]: 'PAN',
  [DocumentType.VOTER_ID]: 'VOTER_ID',
  [DocumentType.DRIVING_LICENSE]: 'DRIVING_LICENSE',
  [DocumentType.PASSPORT]: 'PASSPORT',
  [DocumentType.OTHER]: 'OTHER',
  // Tolerate older / alternate labels from saved drafts
  'Aadhar Card': 'AADHAAR',
  AADHAAR: 'AADHAAR',
  AADHAR: 'AADHAAR'
};

const DAY_TO_BACKEND: Record<DayOfWeek, string> = {
  [DayOfWeek.MONDAY]: 'MONDAY',
  [DayOfWeek.TUESDAY]: 'TUESDAY',
  [DayOfWeek.WEDNESDAY]: 'WEDNESDAY',
  [DayOfWeek.THURSDAY]: 'THURSDAY',
  [DayOfWeek.FRIDAY]: 'FRIDAY',
  [DayOfWeek.SATURDAY]: 'SATURDAY',
  [DayOfWeek.SUNDAY]: 'SUNDAY'
};

@Injectable({
  providedIn: 'root'
})
export class DomesticStaffService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  /** Active society — JWT for guards/mobile; Society Setup for admin. */
  getSocietyId(): string {
    const fromSession = this.session.getSocietyId();
    if (fromSession) {
      return fromSession;
    }
    const fromLs = localStorage.getItem('societyId') ?? sessionStorage.getItem('societyId');
    if (fromLs) {
      return fromLs;
    }
    for (const key of ['mobileUser', 'adminUser', 'adminSession'] as const) {
      const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
      if (!raw) {
        continue;
      }
      try {
        const o = JSON.parse(raw) as { societyId?: string };
        if (o.societyId) {
          return o.societyId;
        }
      } catch {
        /* ignore */
      }
    }
    return '';
  }

  /** Logged-in admin/resident for ownerId and createdBy. */
  getAdminFromSession(): { id: string; name: string } {
    const fallback = { id: '', name: 'Admin' };
    for (const storage of [localStorage, sessionStorage]) {
      const session = storage.getItem('adminSession');
      if (session) {
        try {
          const o = JSON.parse(session) as { userId?: string; name?: string };
          return { id: o.userId ?? fallback.id, name: o.name ?? fallback.name };
        } catch {
          /* continue */
        }
      }
    }
    const userRaw = sessionStorage.getItem('adminUser') ?? localStorage.getItem('adminUser');
    if (userRaw) {
      try {
        const o = JSON.parse(userRaw) as { id?: string; name?: string };
        return { id: o.id ?? fallback.id, name: o.name ?? fallback.name };
      } catch {
        /* ignore */
      }
    }
    return fallback;
  }

  private parseDate(v: unknown): Date | undefined {
    if (v == null) {
      return undefined;
    }
    const d = new Date(v as string | number);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private normalizeStaff(raw: any): DomesticStaff {
    const roleRaw = String(raw.role ?? raw.staffType ?? 'OTHER').toUpperCase();
    const statusRaw = String(raw.status ?? 'ACTIVE').toUpperCase();
    const regRaw = String(raw.registrationStatus ?? 'APPROVED').toUpperCase();

    let status = STATUS_FROM_BACKEND[statusRaw] ?? StaffStatus.ACTIVE;
    if (regRaw === 'PENDING') {
      status = StaffStatus.PENDING_APPROVAL;
    }

    let workingDays: DayOfWeek[] = [];
    const accessDays = raw.accessDays;
    if (typeof accessDays === 'string' && accessDays.trim()) {
      try {
        const parsed = JSON.parse(accessDays) as string[];
        workingDays = parsed.map(d => this.dayFromBackend(d)).filter(Boolean) as DayOfWeek[];
      } catch {
        workingDays = accessDays.split(',').map(d => this.dayFromBackend(d.trim())).filter(Boolean) as DayOfWeek[];
      }
    }

    const startTime = raw.accessStartTime != null ? String(raw.accessStartTime).slice(0, 5) : undefined;
    const endTime = raw.accessEndTime != null ? String(raw.accessEndTime).slice(0, 5) : undefined;

    return {
      id: String(raw.id ?? ''),
      name: String(raw.name ?? ''),
      phoneNumber: String(raw.phoneNumber ?? raw.phone ?? ''),
      alternatePhone: raw.alternatePhone != null ? String(raw.alternatePhone) : undefined,
      photoUrl: raw.photoUrl != null ? String(raw.photoUrl) : undefined,
      role: ROLE_FROM_BACKEND[roleRaw] ?? StaffRole.OTHER,
      passcode: String(raw.passcode ?? ''),
      status,
      flatId: String(raw.flatId ?? ''),
      flatNumber: String(raw.flatNumber ?? '—'),
      societyId: String(raw.societyId ?? ''),
      documentType: this.docFromBackend(raw.documentType ?? raw.idProofType),
      documentNumber:
        raw.documentNumber != null || raw.idProofNumber != null
          ? String(raw.documentNumber ?? raw.idProofNumber ?? '')
          : undefined,
      documentUrl:
        raw.documentUrl != null || raw.idProofUrl != null
          ? String(raw.documentUrl ?? raw.idProofUrl ?? '')
          : undefined,
      address: raw.address != null ? String(raw.address) : undefined,
      emergencyContact: raw.emergencyContactName
        ? {
            name: String(raw.emergencyContactName),
            relationship: String(raw.emergencyContactRelation ?? ''),
            phoneNumber: String(raw.emergencyContactPhone ?? '')
          }
        : undefined,
      workSchedule: {
        workingDays,
        startTime,
        endTime,
        isFullTime: String(raw.workTimings ?? '').toUpperCase() === 'FULL_TIME'
      },
      createdAt: this.parseDate(raw.createdAt) ?? new Date(),
      updatedAt: this.parseDate(raw.updatedAt ?? raw.lastModified) ?? new Date(),
      createdBy: String(raw.createdBy ?? raw.createdByName ?? 'Admin'),
      lastAccessDate: this.parseDate(raw.lastAccessDate)
    };
  }

  private dayFromBackend(value: string): DayOfWeek | undefined {
    const map: Record<string, DayOfWeek> = {
      MONDAY: DayOfWeek.MONDAY,
      TUESDAY: DayOfWeek.TUESDAY,
      WEDNESDAY: DayOfWeek.WEDNESDAY,
      THURSDAY: DayOfWeek.THURSDAY,
      FRIDAY: DayOfWeek.FRIDAY,
      SATURDAY: DayOfWeek.SATURDAY,
      SUNDAY: DayOfWeek.SUNDAY
    };
    return map[value.toUpperCase()];
  }

  private docFromBackend(value: unknown): DocumentType | undefined {
    if (value == null) {
      return undefined;
    }
    const v = String(value).toUpperCase();
    const map: Record<string, DocumentType> = {
      AADHAAR: DocumentType.AADHAR,
      AADHAR: DocumentType.AADHAR,
      PAN: DocumentType.PAN,
      VOTER_ID: DocumentType.VOTER_ID,
      DRIVING_LICENSE: DocumentType.DRIVING_LICENSE,
      PASSPORT: DocumentType.PASSPORT,
      OTHER: DocumentType.OTHER
    };
    return map[v];
  }

  /** Build POST body for /domestic-staff from the add-staff form. */
  private buildCreatePayload(staff: Partial<DomesticStaff>): Record<string, unknown> {
    const admin = this.getAdminFromSession();
    const societyId = staff.societyId || this.getSocietyId();
    const roleKey = staff.role ? ROLE_TO_BACKEND[staff.role] ?? 'OTHER' : 'OTHER';
    const schedule = staff.workSchedule;
    let accessDays: string | undefined;
    if (schedule?.workingDays?.length) {
      accessDays = JSON.stringify(schedule.workingDays.map(d => DAY_TO_BACKEND[d] ?? d.toUpperCase()));
    }

    return {
      societyId,
      flatId: staff.flatId,
      ownerId: admin.id || societyId,
      name: staff.name?.trim(),
      phoneNumber: staff.phoneNumber?.trim(),
      alternatePhone: staff.alternatePhone?.trim() || undefined,
      photoUrl: staff.photoUrl || undefined,
      role: roleKey,
      passcode: staff.passcode || this.generatePasscode(),
      status: 'ACTIVE',
      registrationStatus: 'APPROVED',
      documentType: staff.documentType
        ? DOC_TO_BACKEND[staff.documentType] ?? DOC_TO_BACKEND[String(staff.documentType)]
        : undefined,
      documentNumber: staff.documentNumber?.trim() || undefined,
      documentUrl: staff.documentUrl || undefined,
      address: staff.address?.trim() || undefined,
      emergencyContactName: staff.emergencyContact?.name,
      emergencyContactRelation: staff.emergencyContact?.relationship,
      emergencyContactPhone: staff.emergencyContact?.phoneNumber,
      accessDays,
      accessStartTime: schedule?.startTime ? `${schedule.startTime}:00`.replace('::', ':') : undefined,
      accessEndTime: schedule?.endTime ? `${schedule.endTime}:00`.replace('::', ':') : undefined,
      workTimings: schedule?.isFullTime ? 'FULL_TIME' : 'PART_TIME',
      hasRecurringAccess: true
    };
  }

  getDomesticStaffByFlat(flatId: string): Observable<DomesticStaff[]> {
    return this.http
      .get<unknown[]>(`/domestic-staff/flat/${encodeURIComponent(flatId)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => this.normalizeStaff(r))),
        catchError(err => {
          console.error('Failed to load flat domestic staff:', err);
          return of([]);
        })
      );
  }

  /** All staff for the active society (admin list view). */
  getDomesticStaffBySociety(societyId?: string): Observable<DomesticStaff[]> {
    const sid = societyId || this.getSocietyId();
    if (!sid) {
      return of([]);
    }
    return this.http
      .get<unknown[]>(`/domestic-staff/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows => (rows ?? []).map(r => this.normalizeStaff(r))),
        catchError(err => {
          console.error('Failed to load domestic staff:', err);
          return of([]);
        })
      );
  }

  /**
   * Guard gate: ACTIVE cooks/maids for the JWT society
   * (ignores Society Setup selection so the list always matches the logged-in guard).
   */
  getActiveStaffForGuard(): Observable<DomesticStaff[]> {
    return this.http.get<unknown[]>('/domestic-staff/current-society/active').pipe(
      map(rows => (rows ?? []).map(r => this.normalizeStaff(r))),
      catchError(err => {
        console.error('Failed to load gate domestic staff:', err);
        // Fallback: society id from session if JWT-scoped route is unavailable.
        return this.getDomesticStaffBySociety().pipe(
          map(rows => rows.filter(s => s.status === StaffStatus.ACTIVE))
        );
      })
    );
  }

  getDomesticStaffById(id: string): Observable<DomesticStaff | undefined> {
    return this.http.get<unknown>(`/domestic-staff/${encodeURIComponent(id)}`).pipe(
      map(raw => this.normalizeStaff(raw)),
      catchError(() => of(undefined))
    );
  }

  addDomesticStaff(staff: Partial<DomesticStaff>): Observable<DomesticStaff> {
    const body = this.buildCreatePayload(staff);
    return this.http.post<unknown>('/domestic-staff', body).pipe(map(raw => this.normalizeStaff(raw)));
  }

  updateDomesticStaff(id: string, updates: Partial<DomesticStaff>): Observable<DomesticStaff> {
    const body = this.buildCreatePayload({ ...updates, societyId: updates.societyId });
    return this.http.put<unknown>(`/domestic-staff/${encodeURIComponent(id)}`, body).pipe(
      map(raw => this.normalizeStaff(raw))
    );
  }

  deleteDomesticStaff(id: string): Observable<boolean> {
    return this.http.delete<void>(`/domestic-staff/${encodeURIComponent(id)}`).pipe(
      map(() => true),
      catchError(() => throwError(() => new Error('Staff not found')))
    );
  }

  verifyPasscode(request: PasscodeVerificationRequest): Observable<PasscodeVerificationResponse> {
    const societyId = this.getSocietyId();
    let params = new HttpParams()
      .set('passcode', request.passcode)
      .set('entryGate', request.entryGate);
    if (societyId) {
      params = params.set('societyId', societyId);
    }
    if (request.guardId) {
      params = params.set('guardId', request.guardId);
    }
    return this.http.post<Record<string, unknown>>('/domestic-staff/verify-passcode', null, { params }).pipe(
      map(res => ({
        success: !!res['success'],
        message: String(res['message'] ?? ''),
        staff: res['staff'] ? this.normalizeStaff(res['staff']) : undefined,
        accessLog: res['accessLog'] ? this.normalizeAccessLog(res['accessLog']) : undefined
      }))
    );
  }

  /** Guard detail: prefer approve-by-id; fall back to passcode verify if backend is older. */
  approveEntry(
    staffId: string,
    options?: { passcode?: string; entryGate?: string; guardId?: string }
  ): Observable<PasscodeVerificationResponse> {
    const entryGate = options?.entryGate || 'Main Gate';
    let params = new HttpParams().set('entryGate', entryGate);
    if (options?.guardId) {
      params = params.set('guardId', options.guardId);
    }

    const mapResponse = (res: Record<string, unknown>): PasscodeVerificationResponse => ({
      success: !!res['success'],
      message: String(res['message'] ?? ''),
      staff: res['staff'] ? this.normalizeStaff(res['staff']) : undefined,
      accessLog: res['accessLog'] ? this.normalizeAccessLog(res['accessLog']) : undefined
    });

    return this.http
      .post<Record<string, unknown>>(`/domestic-staff/${encodeURIComponent(staffId)}/approve-entry`, {}, { params })
      .pipe(
        map(mapResponse),
        catchError(err => {
          // Older backend without /approve-entry → use passcode verify instead.
          if (err?.status === 404 && options?.passcode) {
            return this.verifyPasscode({
              passcode: options.passcode,
              entryGate,
              ...(options.guardId ? { guardId: options.guardId } : {})
            });
          }
          return throwError(() => err);
        })
      );
  }

  generatePasscode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  regeneratePasscode(staffId: string): Observable<string> {
    return this.http
      .post<{ passcode: string }>(`/domestic-staff/${encodeURIComponent(staffId)}/regenerate-passcode`, null)
      .pipe(map(res => res.passcode));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private normalizeAccessLog(raw: any): StaffAccessLog {
    return {
      id: String(raw.id ?? ''),
      staffId: String(raw.staffId ?? ''),
      staffName: String(raw.staffName ?? ''),
      flatNumber: String(raw.flatNumber ?? ''),
      checkInTime: this.parseDate(raw.checkInTime) ?? new Date(),
      checkOutTime: this.parseDate(raw.checkOutTime),
      entryGate: String(raw.entryGate ?? 'Main Gate'),
      exitGate: raw.exitGate != null ? String(raw.exitGate) : undefined,
      verifiedBy: String(raw.verifiedBy ?? ''),
      notes: raw.notes != null ? String(raw.notes) : undefined,
      photoCapture: raw.photoCapture != null ? String(raw.photoCapture) : undefined
    };
  }

  getAccessLogs(staffId: string): Observable<StaffAccessLog[]> {
    return this.http
      .get<unknown[]>(`/domestic-staff/${encodeURIComponent(staffId)}/access-logs`)
      .pipe(map(rows => (rows ?? []).map(r => this.normalizeAccessLog(r))));
  }

  getTodaysAccessLogs(_societyId: string): Observable<StaffAccessLog[]> {
    return of([]);
  }

  getAttendance(_staffId: string, _month?: number, _year?: number): Observable<StaffAttendance[]> {
    return of([]);
  }

  markAttendance(_staffId: string, _checkIn: Date, _notes?: string): Observable<StaffAttendance> {
    return throwError(() => new Error('Attendance API not implemented yet'));
  }

  getRatings(_staffId: string): Observable<StaffRating[]> {
    return of([]);
  }

  addRating(_rating: Omit<StaffRating, 'id' | 'createdAt'>): Observable<StaffRating> {
    return throwError(() => new Error('Ratings API not implemented yet'));
  }

  getAverageRating(_staffId: string): Observable<number> {
    return of(0);
  }

  updateStaffStatus(staffId: string, status: StaffStatus): Observable<DomesticStaff> {
    if (status === StaffStatus.BLOCKED) {
      return this.blockStaff(staffId);
    }
    if (status === StaffStatus.ACTIVE) {
      return this.unblockStaff(staffId);
    }
    return this.getDomesticStaffById(staffId).pipe(
      map(s => {
        if (!s) {
          throw new Error('Staff not found');
        }
        return s;
      })
    );
  }

  blockStaff(staffId: string): Observable<DomesticStaff> {
    return this.http
      .post<unknown>(`/domestic-staff/${encodeURIComponent(staffId)}/block`, null)
      .pipe(map(raw => this.normalizeStaff(raw)));
  }

  unblockStaff(staffId: string): Observable<DomesticStaff> {
    return this.http
      .post<unknown>(`/domestic-staff/${encodeURIComponent(staffId)}/unblock`, null)
      .pipe(map(raw => this.normalizeStaff(raw)));
  }

  /** Flats for the add-staff form dropdown. */
  loadFlatsForSociety(): Observable<Array<{ id: string; flatNumber: string }>> {
    const societyId = this.getSocietyId();
    if (!societyId) {
      return of([]);
    }
    return this.http.get<Array<{ id: string; flatNumber: string }>>(
      `/flats/society/${encodeURIComponent(societyId)}`
    );
  }
}
