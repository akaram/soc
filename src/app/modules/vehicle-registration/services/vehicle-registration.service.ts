import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, delay, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  Vehicle,
  VehicleRegistrationRequest,
  VehicleRegistrationResponse,
  RFIDRegistrationRequest,
  RFIDIssueResponse,
  FASTagLinkRequest,
  FASTagLinkResponse,
  VehicleType,
  VehicleStatus,
  ApprovalStatus,
  RFIDStatus,
  RFIDTagType
} from '../models/vehicle.model';
import { normalizeVehicleRecord } from './vehicle-api.mapper';
import { SessionContextService } from '../../../core/services/session-context.service';

/** Spring Page JSON */
interface SpringPage<T> {
  content?: T[];
}

@Injectable({
  providedIn: 'root'
})
export class VehicleRegistrationService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  /** Map Hibernate FK errors to a message QA/users can act on. */
  private friendlyRegistrationError(err: HttpErrorResponse | Error): string {
    const raw =
      (err as HttpErrorResponse).error?.message ||
      (err as HttpErrorResponse).message ||
      (err as Error).message ||
      '';
    if (/foreign key constraint fails/i.test(raw)) {
      if (/owner_id/i.test(raw)) {
        return 'Invalid vehicle owner. Select a registered resident from the list (do not type a name or placeholder).';
      }
      if (/created_by/i.test(raw)) {
        return 'Your session user is invalid. Sign out, sign in again, then retry registration.';
      }
      if (/flat_id/i.test(raw)) {
        return 'Unit number does not match a flat in this society. Check Society Setup.';
      }
      return 'Registration could not be saved because a linked record is missing. Check owner and unit number.';
    }
    return raw || 'Registration failed';
  }

  /**
   * Resolve flat UUID and owner by flat number within the current society.
   */
  resolveFlatByNumber(
    flatNumber: string
  ): Observable<{ id: string; ownerId?: string; flatNumber: string } | null> {
    const sid = this.session.getSocietyId();
    if (!sid || !flatNumber.trim()) {
      return of(null);
    }
    return this.http.get<Record<string, unknown>[]>(`/flats/society/${encodeURIComponent(sid)}`).pipe(
      map(flats => {
        const n = flatNumber.trim().toLowerCase();
        const hit = (flats ?? []).find(
          f => String(f['flatNumber'] ?? f['flat_number'] ?? '').toLowerCase() === n
        );
        if (!hit) {
          return null;
        }
        return {
          id: String(hit['id'] ?? ''),
          ownerId: hit['ownerId'] != null ? String(hit['ownerId']) : undefined,
          flatNumber: String(hit['flatNumber'] ?? hit['flat_number'] ?? flatNumber)
        };
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Register a new vehicle (POST /vehicles).
   * Resolves owner from the selected resident and/or unit number before save.
   */
  registerVehicle(request: VehicleRegistrationRequest): Observable<VehicleRegistrationResponse> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({
        success: false,
        message: 'Society context missing. Sign in again.',
        errors: ['Society context missing']
      });
    }

    const flat$ = request.unitNumber?.trim()
      ? this.resolveFlatByNumber(request.unitNumber)
      : of(null);

    return flat$.pipe(
      switchMap(flat => {
        const sessionUserId = this.session.getCurrentUserId();
        const validSessionUser =
          sessionUserId && sessionUserId !== societyId ? sessionUserId : '';
        // Prefer explicit resident selection, then flat owner, then logged-in user.
        const ownerId = request.ownerId || flat?.ownerId || validSessionUser;
        if (!ownerId) {
          return throwError(
            () =>
              new Error(
                'Vehicle owner could not be resolved. Select a resident or assign an owner to the flat in Society Setup.'
              )
          );
        }
        const createdBy = validSessionUser || ownerId;
        const today = new Date().toISOString().split('T')[0];
        const body: Record<string, unknown> = {
          societyId,
          ownerId,
          flatId: flat?.id || request.flatId || undefined,
          registrationNumber: request.registrationNumber.replace(/[\s\-]/g, '').toUpperCase(),
          vehicleType: request.vehicleType,
          make: request.make,
          model: request.model,
          color: request.color,
          year: request.year,
          ownerType: request.ownerType,
          parkingSlot: request.parkingSlot ?? undefined,
          status: VehicleStatus.ACTIVE,
          approvalStatus: ApprovalStatus.PENDING,
          registrationDate: today,
          createdBy,
          remarks: request.remarks
        };
        return this.http.post<Record<string, unknown>>('/vehicles', body).pipe(
          map(raw => {
            const vehicle = normalizeVehicleRecord({
              ...raw,
              ownerName: request.ownerName,
              unitNumber: request.unitNumber || flat?.flatNumber
            });
            return {
              success: true,
              message: 'Vehicle registered successfully. Pending approval from admin.',
              vehicleId: vehicle.id,
              vehicle
            } as VehicleRegistrationResponse;
          })
        );
      }),
      catchError(err => {
        const msg = this.friendlyRegistrationError(err);
        return of({
          success: false,
          message: msg,
          errors: [msg]
        } as VehicleRegistrationResponse);
      })
    );
  }

  /**
   * Issue RFID tag for a vehicle (POST /vehicles/{id}/rfid/issue).
   */
  issueRFIDTag(request: RFIDRegistrationRequest): Observable<RFIDIssueResponse> {
    const assignedBy = this.session.getCurrentUserId() || this.session.getSocietyId();
    const body: Record<string, unknown> = {
      validityPeriodMonths: request.validityPeriod,
      tagType: request.tagType,
      assignedBy,
      remarks: request.remarks
    };
    return this.http.post<any>(`/vehicles/${encodeURIComponent(request.vehicleId)}/rfid/issue`, body).pipe(
      map(raw => ({
        success: true,
        message: 'RFID tag issued successfully',
        rfidTag: {
          tagId: String(raw.tagId ?? ''),
          tagNumber: String(raw.tagNumber ?? ''),
          tagType: raw.tagType ? (raw.tagType as RFIDTagType) : request.tagType,
          issueDate: raw.issueDate ? new Date(raw.issueDate) : new Date(),
          expiryDate: raw.expiryDate ? new Date(raw.expiryDate) : undefined,
          status: (raw.status as RFIDStatus) ?? RFIDStatus.ACTIVE,
          lastScanned: raw.lastScanned ? new Date(raw.lastScanned) : undefined,
          scanCount: typeof raw.scanCount === 'number' ? raw.scanCount : Number(raw.scanCount ?? 0),
          isActive: Boolean(raw.isActive),
          assignedDate: raw.assignedDate ? new Date(raw.assignedDate) : new Date(),
          assignedBy: String(raw.assignedBy ?? assignedBy)
        }
      } as RFIDIssueResponse)),
      catchError(err => {
        const msg = err.error?.message || err.message || 'RFID issue failed';
        return of({ success: false, message: msg, errors: [msg] } as RFIDIssueResponse);
      })
    );
  }

  /**
   * Link FASTag (POST /vehicles/{id}/fastag/link).
   *
   * POC note: the backend stores FASTag snapshot embedded on the vehicle row.
   */
  linkFASTag(request: FASTagLinkRequest): Observable<FASTagLinkResponse> {
    const tagId = 'FT-' + Date.now().toString(36).toUpperCase();
    const body: Record<string, unknown> = {
      tagId,
      tagNumber: request.tagNumber,
      accountId: request.accountId,
      bankName: request.bankName,
      vehicleClass: request.vehicleClass,
      walletBalance: 0,
      status: 'ACTIVE',
      remarks: request.remarks
    };
    return this.http.post<any>(`/vehicles/${encodeURIComponent(request.vehicleId)}/fastag/link`, body).pipe(
      map(raw => ({
        success: true,
        message: 'FASTag linked successfully',
        fasTag: raw
      } as FASTagLinkResponse)),
      catchError(err => {
        const msg = err.error?.message || err.message || 'FASTag link failed';
        return of({ success: false, message: msg, errors: [msg] } as FASTagLinkResponse);
      })
    );
  }

  /**
   * Get all registered vehicles for the current society
   */
  getAllVehicles(): Observable<Vehicle[]> {
    const sid = this.session.getSocietyId();
    return this.http.get<any[]>(`/vehicles/society/${sid}`).pipe(
      map(rows => (Array.isArray(rows) ? rows : []).map(r => normalizeVehicleRecord(r))),
      catchError(() => of([]))
    );
  }

  /**
   * Get vehicle by ID
   */
  getVehicleById(id: string): Observable<Vehicle | undefined> {
    return this.http.get<any>(`/vehicles/${id}`).pipe(
      map(raw => normalizeVehicleRecord(raw)),
      catchError(() => of(undefined))
    );
  }

  /**
   * Get vehicles by owner
   */
  getVehiclesByOwner(ownerId: string): Observable<Vehicle[]> {
    return this.http.get<any[]>(`/vehicles/owner/${ownerId}`).pipe(
      map(rows => (Array.isArray(rows) ? rows : []).map(r => normalizeVehicleRecord(r))),
      catchError(() => of([]))
    );
  }

  /**
   * Search vehicles by registration number (Spring Page → first page, size 50)
   */
  searchByRegistration(registrationNumber: string): Observable<Vehicle[]> {
    const sid = this.session.getSocietyId();
    const params = new HttpParams()
      .set('searchTerm', registrationNumber)
      .set('page', '0')
      .set('size', '50');
    return this.http.get<SpringPage<any>>(`/vehicles/society/${sid}/search`, { params }).pipe(
      map(p => (p.content ?? []).map(r => normalizeVehicleRecord(r))),
      catchError(() => of([]))
    );
  }

  /**
   * Approve vehicle registration
   */
  approveVehicle(vehicleId: string, approvedBy: string): Observable<VehicleRegistrationResponse> {
    return this.http
      .post<any>(`/vehicles/${vehicleId}/approve`, null, {
        params: new HttpParams().set('approvedBy', approvedBy)
      })
      .pipe(
        map(raw => ({
          success: true,
          message: 'Vehicle registration approved successfully',
          vehicle: normalizeVehicleRecord(raw)
        })),
        catchError(err => {
          const msg = err.error?.message || err.message || 'Approve failed';
          return of({ success: false, message: msg, errors: [msg] });
        })
      );
  }

  /**
   * Reject vehicle registration
   */
  rejectVehicle(vehicleId: string, reason: string): Observable<VehicleRegistrationResponse> {
    return this.http
      .post<any>(`/vehicles/${vehicleId}/reject`, null, {
        params: new HttpParams().set('reason', reason)
      })
      .pipe(
        map(raw => ({
          success: true,
          message: 'Vehicle registration rejected',
          vehicle: normalizeVehicleRecord(raw)
        })),
        catchError(err => {
          const msg = err.error?.message || err.message || 'Reject failed';
          return of({ success: false, message: msg, errors: [msg] });
        })
      );
  }

  /**
   * Scan RFID tag: GET /vehicles/society/{societyId}/rfid/scan?tag=…&record=true
   *
   * Resolves the vehicle by embedded RFID tag number or tag id; when {@code record} is true,
   * the backend increments scanCount and updates lastScanned (gate-style usage).
   */
  scanRFIDTag(tagNumber: string, record = true): Observable<Vehicle | undefined> {
    const sid = this.session.getSocietyId();
    const token = (tagNumber ?? '').trim();
    if (!sid || !token) {
      return of(undefined);
    }
    const params = new HttpParams().set('tag', token).set('record', record ? 'true' : 'false');
    return this.http.get<any>(`/vehicles/society/${encodeURIComponent(sid)}/rfid/scan`, { params }).pipe(
      map(raw => normalizeVehicleRecord(raw)),
      catchError((err: HttpErrorResponse) => {
        // 404: unknown / inactive / expired tag — same UX as "not found"
        if (err.status === 404) {
          return of(undefined);
        }
        console.error('RFID scan request failed', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Get vehicle makes for dropdown
   */
  getVehicleMakes(): Observable<string[]> {
    return of([
      'Maruti Suzuki',
      'Hyundai',
      'Tata',
      'Mahindra',
      'Honda',
      'Toyota',
      'Ford',
      'Volkswagen',
      'Renault',
      'Nissan',
      'Kia',
      'MG',
      'Skoda',
      'BMW',
      'Mercedes-Benz',
      'Audi'
    ]).pipe(delay(100));
  }

  /**
   * Get available parking slots (UI helper; not from API)
   */
  getAvailableParkingSlots(vehicleType: VehicleType): Observable<string[]> {
    const slots =
      vehicleType === VehicleType.TWO_WHEELER
        ? Array.from({ length: 50 }, (_, i) => `P-TW-${String(i + 1).padStart(2, '0')}`)
        : Array.from({ length: 100 }, (_, i) => `P-FW-${String(i + 1).padStart(3, '0')}`);

    return of(slots).pipe(delay(200));
  }
}
