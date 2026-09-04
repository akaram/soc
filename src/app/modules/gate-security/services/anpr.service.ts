import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  VehicleRegistration,
  ANPREntry,
  ANPRStatus,
  VehicleCategory,
  EntryStatus,
  CreateVehicleRegistrationRequest,
  ANPRDetectionRequest,
  ANPRResponse,
  ANPRStatistics,
  ANPRFilter
} from '../models/anpr.model';
import { VehicleRegistrationService } from '../../vehicle-registration/services/vehicle-registration.service';
import { ApprovalStatus, Vehicle, VehicleStatus } from '../../vehicle-registration/models/vehicle.model';
import {
  anprRequestToVehicleRequest,
  anprStatusToVehicleStatus,
  gateEventToAnprEntry,
  normalizePlate,
  vehicleToRegistration
} from './anpr-api.mapper';

@Injectable({
  providedIn: 'root'
})
export class ANPRService {
  constructor(
    private http: HttpClient,
    private vehicleService: VehicleRegistrationService
  ) {}

  /** Load all vehicle registrations for the active society (GET /vehicles/society/{id}) */
  getAllRegistrations(filter?: ANPRFilter): Observable<VehicleRegistration[]> {
    return this.vehicleService.getAllVehicles().pipe(
      map(vehicles => this.applyRegistrationFilter(vehicles.map(v => vehicleToRegistration(v)), filter)),
      catchError(err => {
        console.error('Failed to load ANPR registrations from API', err);
        return of([]);
      })
    );
  }

  getRegistrationById(id: string): Observable<VehicleRegistration | null> {
    return this.vehicleService.getVehicleById(id).pipe(
      map(v => (v ? vehicleToRegistration(v) : null)),
      catchError(() => of(null))
    );
  }

  getRegistrationByVehicleNumber(vehicleNumber: string): Observable<VehicleRegistration | null> {
    const normalized = normalizePlate(vehicleNumber);
    return this.vehicleService.searchByRegistration(vehicleNumber).pipe(
      map(rows => {
        const match = rows.find(v => normalizePlate(v.registrationNumber) === normalized);
        return match ? vehicleToRegistration(match) : null;
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Register vehicle via POST /vehicles, then auto-approve so gate ANPR
   * verification can allow entry immediately (admin Gate Security flow).
   */
  createRegistration(request: CreateVehicleRegistrationRequest): Observable<ANPRResponse> {
    const ownerId = this.resolveOwnerId();
    const body = anprRequestToVehicleRequest(request, ownerId);

    return this.vehicleService.registerVehicle(body).pipe(
      switchMap(res => {
        if (!res.success || !res.vehicleId) {
          return of({
            success: false,
            message: res.message || 'Failed to register vehicle',
            matchFound: false,
            errors: res.errors
          } as ANPRResponse);
        }
        const approvedBy = this.resolveOwnerId();
        return this.vehicleService.approveVehicle(res.vehicleId, approvedBy).pipe(
          map(approved => {
            const vehicle = approved.vehicle ?? res.vehicle;
            return {
              success: approved.success || !!vehicle,
              message: approved.success
                ? 'Vehicle registered and approved for ANPR gate access.'
                : res.message,
              registration: vehicle
                ? vehicleToRegistration(vehicle, request.ownerPhone)
                : undefined,
              matchFound: false,
              errors: approved.errors
            } as ANPRResponse;
          }),
          catchError(() =>
            of({
              success: true,
              message:
                'Vehicle registered. Approve it from the list before gate verification will allow entry.',
              registration: res.vehicle
                ? vehicleToRegistration(res.vehicle, request.ownerPhone)
                : undefined,
              matchFound: false
            } as ANPRResponse)
          )
        );
      })
    );
  }

  /**
   * Look up a plate against society vehicles (real API).
   * OCR/camera integration can supply {@link ANPRDetectionRequest.plateNumber}.
   */
  detectVehicle(request: ANPRDetectionRequest): Observable<ANPRResponse> {
    const plate = (request.plateNumber ?? '').trim();
    if (!plate) {
      return of({
        success: false,
        message: 'Enter the vehicle plate number to verify against registered vehicles.',
        matchFound: false,
        errors: ['plateNumber is required']
      });
    }

    const normalized = normalizePlate(plate);
    // Backend LIKE search is literal — try both hyphenated and compact forms
    const searchTerms = [...new Set([plate, normalized].filter(Boolean))];

    return forkJoin(
      searchTerms.map(term =>
        this.vehicleService.searchByRegistration(term).pipe(catchError(() => of([] as Vehicle[])))
      )
    ).pipe(
      switchMap(resultSets => {
        const vehicles = resultSets.flat();
        const match = vehicles.find(v => normalizePlate(v.registrationNumber) === normalized);

        if (!match) {
          return of({
            success: false,
            message: 'Vehicle not registered in this society.',
            matchFound: false,
            detectedNumber: plate,
            errors: ['Vehicle not registered']
          } as ANPRResponse);
        }

        const registration = vehicleToRegistration(match);

        if (match.approvalStatus !== ApprovalStatus.APPROVED) {
          return of({
            success: false,
            message: 'Vehicle found but pending admin approval. Activate it from the ANPR list first.',
            matchFound: true,
            detectedNumber: match.registrationNumber,
            registration,
            errors: ['Approval pending']
          });
        }

        if (match.status !== VehicleStatus.ACTIVE) {
          return of({
            success: false,
            message: `Vehicle is ${match.status} and cannot enter.`,
            matchFound: true,
            detectedNumber: match.registrationNumber,
            registration,
            errors: ['Vehicle not active']
          });
        }

        return of({
          success: true,
          message: 'Vehicle recognized — entry allowed.',
          matchFound: true,
          detectedNumber: match.registrationNumber,
          registration,
          confidence: 100
        } as ANPRResponse);
      }),
      catchError(err => {
        console.error('ANPR plate lookup failed', err);
        return of({
          success: false,
          message: err.error?.message || 'Failed to verify plate with the server.',
          matchFound: false,
          errors: ['API error']
        });
      })
    );
  }

  /** Gate entry history from GET /gate-hardware/events/society/{societyId} */
  getAllEntries(filter?: ANPRFilter): Observable<ANPREntry[]> {
    return forkJoin({
      vehicles: this.vehicleService.getAllVehicles().pipe(catchError(() => of([] as Vehicle[]))),
      events: this.fetchGateEvents()
    }).pipe(
      map(({ vehicles, events }) => {
        const byPlate = new Map<string, VehicleRegistration>();
        for (const v of vehicles) {
          const reg = vehicleToRegistration(v);
          byPlate.set(normalizePlate(reg.vehicleNumber), reg);
        }

        let entries = events
          .map(e => gateEventToAnprEntry(e, byPlate))
          .filter((e): e is ANPREntry => e !== null);

        if (filter?.gateId) {
          entries = entries.filter(e => e.gateId === filter.gateId);
        }
        if (filter?.dateFrom) {
          entries = entries.filter(e => e.timestamp >= filter.dateFrom!);
        }
        if (filter?.dateTo) {
          entries = entries.filter(e => e.timestamp <= filter.dateTo!);
        }
        if (filter?.vehicleCategory) {
          entries = entries.filter(e => e.vehicleCategory === filter.vehicleCategory);
        }

        return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      }),
      catchError(err => {
        console.error('Failed to load ANPR entry history', err);
        return of([]);
      })
    );
  }

  /** Stats derived from live vehicles + gate hardware events */
  getStatistics(): Observable<ANPRStatistics> {
    return forkJoin({
      vehicles: this.vehicleService.getAllVehicles().pipe(catchError(() => of([] as Vehicle[]))),
      events: this.fetchGateEvents()
    }).pipe(
      map(({ vehicles, events }) => {
        const registrations = vehicles.map(v => vehicleToRegistration(v));
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const byPlate = new Map<string, VehicleRegistration>();
        for (const r of registrations) {
          byPlate.set(normalizePlate(r.vehicleNumber), r);
        }

        const entries = events
          .map(e => gateEventToAnprEntry(e, byPlate))
          .filter((e): e is ANPREntry => e !== null);

        const entriesToday = entries.filter(e => {
          const d = new Date(e.timestamp);
          d.setHours(0, 0, 0, 0);
          return d.getTime() === today.getTime();
        });

        const successfulEntries = entries.filter(e => e.status === EntryStatus.ALLOWED);
        const avgConfidence =
          successfulEntries.length > 0
            ? successfulEntries.reduce((sum, e) => sum + e.confidence, 0) / successfulEntries.length
            : 0;

        const recognitionAccuracy =
          entries.length > 0 ? (successfulEntries.length / entries.length) * 100 : 0;

        const byGate: Record<string, number> = {};
        entries.forEach(e => {
          byGate[e.gateId] = (byGate[e.gateId] || 0) + 1;
        });

        return {
          totalRegistrations: registrations.length,
          activeRegistrations: registrations.filter(r => r.status === ANPRStatus.ACTIVE).length,
          totalDetections: entries.length,
          successfulEntries: successfulEntries.length,
          deniedEntries: entries.filter(e => e.status === EntryStatus.DENIED).length,
          detectionsToday: entriesToday.length,
          byCategory: {
            resident: registrations.filter(r => r.ownerType === VehicleCategory.RESIDENT).length,
            visitor: registrations.filter(r => r.ownerType === VehicleCategory.VISITOR).length,
            staff: registrations.filter(r => r.ownerType === VehicleCategory.STAFF).length,
            vendor: registrations.filter(r => r.ownerType === VehicleCategory.VENDOR).length,
            delivery: registrations.filter(r => r.ownerType === VehicleCategory.DELIVERY).length,
            emergency: registrations.filter(r => r.ownerType === VehicleCategory.EMERGENCY).length,
            unknown: entries.filter(e => e.vehicleCategory === VehicleCategory.UNKNOWN).length
          },
          byGate,
          averageConfidence: avgConfidence,
          recognitionAccuracy
        } as ANPRStatistics;
      }),
      catchError(() =>
        of({
          totalRegistrations: 0,
          activeRegistrations: 0,
          totalDetections: 0,
          successfulEntries: 0,
          deniedEntries: 0,
          detectionsToday: 0,
          byCategory: {
            resident: 0,
            visitor: 0,
            staff: 0,
            vendor: 0,
            delivery: 0,
            emergency: 0,
            unknown: 0
          },
          byGate: {},
          averageConfidence: 0,
          recognitionAccuracy: 0
        })
      )
    );
  }

  /** PUT /vehicles/{id} with updated status */
  updateRegistrationStatus(registrationId: string, status: ANPRStatus): Observable<ANPRResponse> {
    return this.vehicleService.getVehicleById(registrationId).pipe(
      switchMap(vehicle => {
        if (!vehicle?.id) {
          return of({
            success: false,
            message: 'Registration not found',
            matchFound: false,
            errors: ['Not found']
          });
        }
        const body = {
          ...this.vehicleToApiBody(vehicle),
          status: anprStatusToVehicleStatus(status)
        };
        return this.http.put<Vehicle>(`/vehicles/${encodeURIComponent(vehicle.id)}`, body).pipe(
          map(raw => ({
            success: true,
            message: 'Registration status updated successfully',
            registration: vehicleToRegistration({ ...vehicle, status: anprStatusToVehicleStatus(status) }),
            matchFound: false
          })),
          catchError(err =>
            of({
              success: false,
              message: err.error?.message || 'Failed to update status',
              matchFound: false,
              errors: [err.message]
            })
          )
        );
      }),
      catchError(() =>
        of({
          success: false,
          message: 'Registration not found',
          matchFound: false,
          errors: ['Not found']
        })
      )
    );
  }

  /** DELETE /vehicles/{id} */
  deleteRegistration(registrationId: string): Observable<ANPRResponse> {
    return this.http.delete<void>(`/vehicles/${encodeURIComponent(registrationId)}`).pipe(
      map(() => ({
        success: true,
        message: 'Registration deleted successfully',
        matchFound: false
      })),
      catchError(err =>
        of({
          success: false,
          message: err.error?.message || 'Failed to delete registration',
          matchFound: false,
          errors: [err.message]
        })
      )
    );
  }

  private fetchGateEvents(): Observable<Record<string, unknown>[]> {
    const societyId = this.readSocietyId();
    if (!societyId) {
      return of([]);
    }
    return this.http
      .get<Record<string, unknown>[]>(`/gate-hardware/events/society/${encodeURIComponent(societyId)}`)
      .pipe(
        map(rows => (Array.isArray(rows) ? rows : [])),
        catchError(() => of([]))
      );
  }

  private applyRegistrationFilter(
    rows: VehicleRegistration[],
    filter?: ANPRFilter
  ): VehicleRegistration[] {
    let filtered = [...rows];
    if (filter?.vehicleCategory) {
      filtered = filtered.filter(r => r.ownerType === filter.vehicleCategory);
    }
    if (filter?.status) {
      filtered = filtered.filter(r => r.status === filter.status);
    }
    if (filter?.searchTerm) {
      const search = filter.searchTerm.toLowerCase();
      filtered = filtered.filter(
        r =>
          r.vehicleNumber.toLowerCase().includes(search) ||
          r.ownerName.toLowerCase().includes(search) ||
          r.ownerPhone.includes(search) ||
          r.flatNumber?.toLowerCase().includes(search)
      );
    }
    return filtered.sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime());
  }

  private resolveOwnerId(): string {
    for (const storage of [localStorage, sessionStorage]) {
      for (const key of ['adminSession', 'adminUser', 'mobileUser'] as const) {
        const raw = storage.getItem(key);
        if (!raw) continue;
        try {
          const o = JSON.parse(raw) as { userId?: string; id?: string };
          if (o.userId) return o.userId;
          if (o.id) return o.id;
        } catch {
          /* continue */
        }
      }
    }
    return this.readSocietyId();
  }

  private readSocietyId(): string {
    const fromLs = localStorage.getItem('societyId');
    if (fromLs) return fromLs;
    for (const key of ['adminUser', 'adminSession'] as const) {
      const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
      if (!raw) continue;
      try {
        const o = JSON.parse(raw) as { societyId?: string };
        if (o.societyId) return o.societyId;
      } catch {
        /* ignore */
      }
    }
    return '';
  }

  /** Minimal vehicle payload for PUT /vehicles/{id} */
  private vehicleToApiBody(vehicle: Vehicle): Record<string, unknown> {
    return {
      societyId: this.readSocietyId(),
      ownerId: vehicle.ownerId,
      registrationNumber: vehicle.registrationNumber,
      vehicleType: vehicle.vehicleType,
      make: vehicle.make,
      model: vehicle.model,
      color: vehicle.color,
      year: vehicle.year,
      ownerType: vehicle.ownerType,
      parkingSlot: vehicle.parkingSlot,
      status: vehicle.status,
      approvalStatus: vehicle.approvalStatus,
      registrationDate: vehicle.registrationDate.toISOString().split('T')[0],
      createdBy: vehicle.createdBy,
      remarks: vehicle.remarks
    };
  }
}
