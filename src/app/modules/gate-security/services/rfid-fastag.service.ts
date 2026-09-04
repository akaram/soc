import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  RFIDRegistration,
  RFIDEntry,
  RFIDStatus,
  TagType,
  VehicleCategory,
  EntryStatus,
  CreateRFIDRegistrationRequest,
  RFIDDetectionRequest,
  RFIDResponse,
  RFIDStatistics,
  RFIDFilter
} from '../models/rfid-fastag.model';
import { VehicleRegistrationService } from '../../vehicle-registration/services/vehicle-registration.service';
import { GateHardwareService } from './gate-hardware.service';
import { SessionContextService } from '../../../core/services/session-context.service';
import { Vehicle } from '../../vehicle-registration/models/vehicle.model';
import {
  gateEventToRfidEntry,
  indexRegistrationsByTag,
  normalizeTagToken,
  parseRegistrationId,
  rfidRequestToVehicleRequest,
  rfidStatusToVehicleStatus,
  vehiclesToRegistrations
} from './rfid-fastag-api.mapper';
import { normalizePlate } from './anpr-api.mapper';

@Injectable({
  providedIn: 'root'
})
export class RFIDFastagService {
  constructor(
    private http: HttpClient,
    private vehicleService: VehicleRegistrationService,
    private gateHardware: GateHardwareService,
    private session: SessionContextService
  ) {}

  /** Tags derived from GET /vehicles/society/{id} (embedded rfidTag + fasTag) */
  getAllRegistrations(filter?: RFIDFilter): Observable<RFIDRegistration[]> {
    return this.vehicleService.getAllVehicles().pipe(
      map(vehicles => this.applyRegistrationFilter(vehiclesToRegistrations(vehicles), filter)),
      catchError(err => {
        console.error('Failed to load RFID/FASTag registrations from API', err);
        return of([]);
      })
    );
  }

  getRegistrationById(id: string): Observable<RFIDRegistration | null> {
    const parsed = parseRegistrationId(id);
    if (!parsed) {
      return of(null);
    }
    return this.vehicleService.getVehicleById(parsed.vehicleId).pipe(
      map(vehicle => {
        if (!vehicle) {
          return null;
        }
        const rows = vehiclesToRegistrations([vehicle]);
        return rows.find(r => r.id === id) ?? null;
      }),
      catchError(() => of(null))
    );
  }

  getRegistrationByTagId(tagId: string): Observable<RFIDRegistration | null> {
    const normalized = normalizeTagToken(tagId);
    return this.getAllRegistrations().pipe(
      map(rows => rows.find(r => normalizeTagToken(r.tagId) === normalized) ?? null)
    );
  }

  /**
   * Link a tag to an existing or new vehicle:
   * POST /vehicles → POST /vehicles/{id}/rfid/issue or /fastag/link
   */
  createRegistration(request: CreateRFIDRegistrationRequest): Observable<RFIDResponse> {
    if (request.tagType === TagType.BLUETOOTH) {
      return of({
        success: false,
        message: 'Bluetooth tags are not supported by the vehicle API yet.',
        matchFound: false,
        errors: ['Unsupported tag type']
      });
    }

    const ownerId = this.resolveOwnerId();
    const plate = (request.vehicleNumber ?? '').trim();

    return this.vehicleService.searchByRegistration(plate).pipe(
      switchMap(matches => {
        const normalized = normalizePlate(plate);
        const existing = matches.find(v => normalizePlate(v.registrationNumber) === normalized);

        if (existing?.id) {
          return this.issueTagOnVehicle(existing.id, request);
        }

        const body = rfidRequestToVehicleRequest(request, ownerId);
        return this.vehicleService.registerVehicle(body).pipe(
          switchMap(res => {
            if (!res.success || !res.vehicle?.id) {
              return of({
                success: false,
                message: res.message || 'Failed to register vehicle before issuing tag',
                matchFound: false,
                errors: res.errors
              } as RFIDResponse);
            }
            return this.issueTagOnVehicle(res.vehicle.id, request);
          })
        );
      }),
      catchError(err => {
        console.error('RFID/FASTag registration failed', err);
        return of({
          success: false,
          message: err.error?.message || 'Failed to register tag with the server.',
          matchFound: false,
          errors: ['API error']
        });
      })
    );
  }

  /**
   * Gate detection via POST /gate-hardware/events, enriched with vehicle scan when allowed.
   */
  detectTag(request: RFIDDetectionRequest): Observable<RFIDResponse> {
    const tag = (request.tagId ?? '').trim();
    if (!tag) {
      return of({
        success: false,
        message: 'Enter a tag ID to scan at the gate.',
        matchFound: false,
        errors: ['tagId is required']
      });
    }

    return this.gateHardware
      .ingestRfidDetect(request.gateId, 'RFID_SIMULATOR_UI', tag)
      .pipe(
        switchMap(decision => {
          const gateOpened = decision.action?.actionType === 'OPEN_BARRIER';

          if (decision.decision === 'ALLOW') {
            return this.vehicleService.scanRFIDTag(tag, false).pipe(
              map(vehicle => this.buildAllowResponse(vehicle, request, decision.reason, gateOpened))
            );
          }

          if (decision.decision === 'DENY') {
            return of({
              success: false,
              message: decision.reason ?? 'Access denied',
              matchFound: false,
              gateOpened: false,
              entry: this.buildDeniedEntry(tag, request, decision.reason)
            } as RFIDResponse);
          }

          // MANUAL_REVIEW — no demo fallback
          return of({
            success: false,
            message: decision.reason ?? 'Tag requires manual guard approval',
            matchFound: true,
            gateOpened: false,
            entry: {
              id: `review-${Date.now()}`,
              tagId: tag,
              gateId: request.gateId,
              gateName: this.formatGateName(request.gateId),
              entryType: 'ENTRY',
              status: EntryStatus.PENDING_APPROVAL,
              timestamp: new Date(),
              detectionMethod: 'AUTOMATIC',
              signalStrength: request.signalStrength,
              readDistance: request.readDistance,
              vehicleCategory: VehicleCategory.UNKNOWN,
              gateOpened: false,
              location: request.location
            }
          } as RFIDResponse);
        }),
        catchError(err => {
          console.error('RFID gate detection failed', err);
          return of({
            success: false,
            message: err.error?.message || 'Gate hardware API request failed.',
            matchFound: false,
            errors: ['API error']
          });
        })
      );
  }

  /** Entry history from GET /gate-hardware/events/society/{societyId} */
  getAllEntries(filter?: RFIDFilter): Observable<RFIDEntry[]> {
    return forkJoin({
      registrations: this.getAllRegistrations().pipe(catchError(() => of([] as RFIDRegistration[]))),
      events: this.fetchGateEvents()
    }).pipe(
      map(({ registrations, events }) => {
        const byTag = indexRegistrationsByTag(registrations);

        let entries = events
          .map(e => gateEventToRfidEntry(e, byTag))
          .filter((e): e is RFIDEntry => e !== null);

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
        console.error('Failed to load RFID entry history', err);
        return of([]);
      })
    );
  }

  /** Stats from live vehicles + gate hardware events */
  getStatistics(): Observable<RFIDStatistics> {
    return forkJoin({
      registrations: this.getAllRegistrations().pipe(catchError(() => of([] as RFIDRegistration[]))),
      events: this.fetchGateEvents()
    }).pipe(
      map(({ registrations, events }) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const byTag = indexRegistrationsByTag(registrations);
        const entries = events
          .map(e => gateEventToRfidEntry(e, byTag))
          .filter((e): e is RFIDEntry => e !== null);

        const entriesToday = entries.filter(e => {
          const d = new Date(e.timestamp);
          d.setHours(0, 0, 0, 0);
          return d.getTime() === today.getTime();
        });

        const successfulEntries = entries.filter(e => e.status === EntryStatus.ALLOWED);
        const autoOpenedGates = entries.filter(e => e.gateOpened).length;
        const withSignal = entries.filter(e => typeof e.signalStrength === 'number');
        const avgSignalStrength =
          withSignal.length > 0
            ? withSignal.reduce((sum, e) => sum + (e.signalStrength ?? 0), 0) / withSignal.length
            : 0;

        const byGate: Record<string, number> = {};
        entries.forEach(e => {
          byGate[e.gateId] = (byGate[e.gateId] || 0) + 1;
        });

        return {
          totalRegistrations: registrations.length,
          activeRegistrations: registrations.filter(r => r.status === RFIDStatus.ACTIVE).length,
          totalDetections: entries.length,
          successfulEntries: successfulEntries.length,
          deniedEntries: entries.filter(e => e.status === EntryStatus.DENIED).length,
          detectionsToday: entriesToday.length,
          autoOpenedGates,
          byTagType: {
            rfid: registrations.filter(r => r.tagType === TagType.RFID || r.tagType === TagType.NFC).length,
            fastag: registrations.filter(r => r.tagType === TagType.FASTAG).length,
            nfc: registrations.filter(r => r.tagType === TagType.NFC).length,
            bluetooth: registrations.filter(r => r.tagType === TagType.BLUETOOTH).length
          },
          byCategory: {
            resident: registrations.filter(r => r.ownerType === VehicleCategory.RESIDENT).length,
            visitor: registrations.filter(r => r.ownerType === VehicleCategory.VISITOR).length,
            staff: registrations.filter(r => r.ownerType === VehicleCategory.STAFF).length,
            vendor: registrations.filter(r => r.ownerType === VehicleCategory.VENDOR).length,
            delivery: registrations.filter(r => r.ownerType === VehicleCategory.DELIVERY).length,
            emergency: registrations.filter(r => r.ownerType === VehicleCategory.EMERGENCY).length
          },
          byGate,
          averageSignalStrength: avgSignalStrength
        } as RFIDStatistics;
      }),
      catchError(() =>
        of({
          totalRegistrations: 0,
          activeRegistrations: 0,
          totalDetections: 0,
          successfulEntries: 0,
          deniedEntries: 0,
          detectionsToday: 0,
          autoOpenedGates: 0,
          byTagType: { rfid: 0, fastag: 0, nfc: 0, bluetooth: 0 },
          byCategory: {
            resident: 0,
            visitor: 0,
            staff: 0,
            vendor: 0,
            delivery: 0,
            emergency: 0
          },
          byGate: {},
          averageSignalStrength: 0
        })
      )
    );
  }

  /** PUT /vehicles/{id} — updates vehicle status for gate access control */
  updateRegistrationStatus(registrationId: string, status: RFIDStatus): Observable<RFIDResponse> {
    const parsed = parseRegistrationId(registrationId);
    if (!parsed) {
      return of({
        success: false,
        message: 'Registration not found',
        matchFound: false,
        errors: ['Invalid registration id']
      });
    }

    return this.vehicleService.getVehicleById(parsed.vehicleId).pipe(
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
          status: rfidStatusToVehicleStatus(status)
        };

        return this.http.put<Vehicle>(`/vehicles/${encodeURIComponent(vehicle.id)}`, body).pipe(
          switchMap(() => this.getRegistrationById(registrationId)),
          map(registration => ({
            success: true,
            message: 'Registration status updated successfully',
            registration: registration ?? undefined,
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

  /** Deactivate gate access by setting vehicle status to INACTIVE */
  deleteRegistration(registrationId: string): Observable<RFIDResponse> {
    return this.updateRegistrationStatus(registrationId, RFIDStatus.INACTIVE).pipe(
      map(res => ({
        ...res,
        message: res.success
          ? 'Tag access revoked (vehicle deactivated). Re-activate from the list if needed.'
          : res.message
      }))
    );
  }

  private issueTagOnVehicle(
    vehicleId: string,
    request: CreateRFIDRegistrationRequest
  ): Observable<RFIDResponse> {
    if (request.tagType === TagType.FASTAG) {
      const body = {
        tagId: request.tagId,
        tagNumber: request.tagId,
        accountId: request.tagId,
        bankName: '—',
        vehicleClass: request.vehicleType,
        status: 'ACTIVE',
        remarks: request.notes
      };
      return this.http
        .post<Record<string, unknown>>(`/vehicles/${encodeURIComponent(vehicleId)}/fastag/link`, body)
        .pipe(
          switchMap(() => this.vehicleService.getVehicleById(vehicleId)),
          map(vehicle => {
            const registration = vehicle
              ? vehiclesToRegistrations([vehicle]).find(r => r.tagType === TagType.FASTAG)
              : undefined;
            return {
              success: true,
              message: 'FASTag linked successfully',
              registration,
              matchFound: false
            } as RFIDResponse;
          }),
          catchError(err =>
            of({
              success: false,
              message: err.error?.message || 'Failed to link FASTag',
              matchFound: false,
              errors: [err.message]
            })
          )
        );
    }

    // RFID and NFC both use the RFID issue endpoint
    const assignedBy = this.resolveOwnerId();
    const body = {
      tagId: request.tagId,
      tagNumber: request.tagId,
      tagType: request.tagType === TagType.NFC ? 'PREMIUM' : 'STANDARD',
      validityPeriodMonths: 12,
      assignedBy,
      remarks: request.notes
    };

    return this.http
      .post<Record<string, unknown>>(`/vehicles/${encodeURIComponent(vehicleId)}/rfid/issue`, body)
      .pipe(
        switchMap(() => this.vehicleService.getVehicleById(vehicleId)),
        map(vehicle => {
          const registration = vehicle
            ? vehiclesToRegistrations([vehicle]).find(
                r => r.tagType === TagType.RFID || r.tagType === TagType.NFC
              )
            : undefined;
          return {
            success: true,
            message: 'RFID tag issued successfully',
            registration,
            matchFound: false
          } as RFIDResponse;
        }),
        catchError(err =>
          of({
            success: false,
            message: err.error?.message || 'Failed to issue RFID tag',
            matchFound: false,
            errors: [err.message]
          })
        )
      );
  }

  private buildAllowResponse(
    vehicle: Vehicle | undefined,
    request: RFIDDetectionRequest,
    reason?: string,
    gateOpened?: boolean
  ): RFIDResponse {
    const tag = (request.tagId ?? '').trim();
    const registration = vehicle
      ? vehiclesToRegistrations([vehicle]).find(
          r => normalizeTagToken(r.tagId) === normalizeTagToken(tag)
        ) ?? vehiclesToRegistrations([vehicle])[0]
      : undefined;

    const entry: RFIDEntry = {
      id: `entry-${Date.now()}`,
      tagId: tag,
      registration,
      gateId: request.gateId,
      gateName: this.formatGateName(request.gateId),
      entryType: 'ENTRY',
      status: EntryStatus.ALLOWED,
      timestamp: new Date(),
      detectionMethod: 'AUTOMATIC',
      signalStrength: request.signalStrength,
      readDistance: request.readDistance,
      verifiedBy: 'GATE_HARDWARE',
      vehicleNumber: registration?.vehicleNumber ?? vehicle?.registrationNumber,
      vehicleCategory: registration?.ownerType ?? VehicleCategory.UNKNOWN,
      vehicleType: registration?.vehicleType,
      gateOpened: Boolean(gateOpened),
      gateOpenTime: gateOpened ? new Date() : undefined,
      location: request.location
    };

    return {
      success: true,
      message: reason ?? (gateOpened ? 'Tag recognized — gate opened' : 'Tag recognized — entry allowed'),
      registration,
      entry,
      matchFound: true,
      gateOpened
    };
  }

  private buildDeniedEntry(
    tag: string,
    request: RFIDDetectionRequest,
    reason?: string
  ): RFIDEntry {
    return {
      id: `deny-${Date.now()}`,
      tagId: tag,
      gateId: request.gateId,
      gateName: this.formatGateName(request.gateId),
      entryType: 'ENTRY',
      status: EntryStatus.DENIED,
      timestamp: new Date(),
      detectionMethod: 'AUTOMATIC',
      signalStrength: request.signalStrength,
      readDistance: request.readDistance,
      verifiedBy: 'GATE_HARDWARE',
      vehicleCategory: VehicleCategory.UNKNOWN,
      gateOpened: false,
      rejectionReason: reason ?? 'Access denied',
      location: request.location
    };
  }

  private fetchGateEvents(): Observable<Record<string, unknown>[]> {
    const societyId = this.session.getSocietyId();
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
    rows: RFIDRegistration[],
    filter?: RFIDFilter
  ): RFIDRegistration[] {
    let filtered = [...rows];
    if (filter?.tagType) {
      filtered = filtered.filter(r => r.tagType === filter.tagType);
    }
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
          r.tagId.toLowerCase().includes(search) ||
          r.vehicleNumber.toLowerCase().includes(search) ||
          r.ownerName.toLowerCase().includes(search) ||
          r.ownerPhone.includes(search) ||
          r.flatNumber?.toLowerCase().includes(search)
      );
    }
    return filtered.sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime());
  }

  private resolveOwnerId(): string {
    return this.session.getCurrentUserId();
  }

  private vehicleToApiBody(vehicle: Vehicle): Record<string, unknown> {
    return {
      societyId: this.session.getSocietyId(),
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

  private formatGateName(gateId: string): string {
    return gateId
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }
}
