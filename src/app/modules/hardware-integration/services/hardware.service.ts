import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  HardwareDevice,
  HardwareType,
  CreateHardwareDeviceRequest,
  UpdateHardwareDeviceRequest,
  HardwareDeviceResponse,
  DeviceTestRequest,
  DeviceTestResult,
  HardwareFilter,
  HardwareStatistics
} from '../models/hardware.model';
import {
  apiToHardwareDevice,
  applyHardwareFilter,
  computeHardwareStatistics,
  createRequestToApiBody,
  mergeDeviceUpdate,
  runDeviceTest
} from './hardware-api.mapper';

@Injectable({
  providedIn: 'root'
})
export class HardwareService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  /** Create device via POST /hardware-devices */
  createDevice(request: CreateHardwareDeviceRequest): Observable<HardwareDeviceResponse> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({
        success: false,
        message: 'No society selected',
        errors: ['societyId required']
      });
    }

    const body = createRequestToApiBody(request, societyId, this.session.getCurrentUserId());

    return this.http.post<Record<string, unknown>>('/hardware-devices', body).pipe(
      map(raw => ({
        success: true,
        message: 'Device added successfully',
        device: apiToHardwareDevice(raw)
      })),
      catchError(err =>
        of({
          success: false,
          message: err.error?.message || 'Failed to create device',
          errors: ['API error']
        })
      )
    );
  }

  /** Update device via PUT /hardware-devices/{id} */
  updateDevice(id: string, request: UpdateHardwareDeviceRequest): Observable<HardwareDeviceResponse> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({
        success: false,
        message: 'No society selected',
        errors: ['societyId required']
      });
    }

    return this.getDeviceById(id).pipe(
      switchMap(device => {
        if (!device) {
          return of({
            success: false,
            message: 'Device not found',
            errors: ['Device not found']
          });
        }
        const body = mergeDeviceUpdate(device, request, societyId);
        return this.http
          .put<Record<string, unknown>>(`/hardware-devices/${encodeURIComponent(id)}`, body)
          .pipe(
            map(raw => ({
              success: true,
              message: 'Device updated successfully',
              device: apiToHardwareDevice(raw)
            })),
            catchError(err =>
              of({
                success: false,
                message: err.error?.message || 'Failed to update device',
                errors: ['API error']
              })
            )
          );
      })
    );
  }

  /** Load all devices for active society (GET /hardware-devices/society/{id}) */
  getAllDevices(filter?: HardwareFilter): Observable<HardwareDevice[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of([]);
    }

    return this.http
      .get<Record<string, unknown>[]>(`/hardware-devices/society/${encodeURIComponent(societyId)}`)
      .pipe(
        map(rows => applyHardwareFilter((rows ?? []).map(apiToHardwareDevice), filter)),
        catchError(err => {
          console.error('Failed to load hardware devices from API', err);
          return of([]);
        })
      );
  }

  /** Raw device rows for typed hardware services */
  listRawDevices(): Observable<Record<string, unknown>[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of([]);
    }
    return this.http
      .get<Record<string, unknown>[]>(`/hardware-devices/society/${encodeURIComponent(societyId)}`)
      .pipe(catchError(() => of([])));
  }

  /** Get single device via GET /hardware-devices/{id} */
  getDeviceById(id: string): Observable<HardwareDevice | null> {
    return this.http
      .get<Record<string, unknown>>(`/hardware-devices/${encodeURIComponent(id)}`)
      .pipe(
        map(raw => apiToHardwareDevice(raw)),
        catchError(() => of(null))
      );
  }

  /** Delete device via DELETE /hardware-devices/{id} */
  deleteDevice(id: string): Observable<HardwareDeviceResponse> {
    return this.http.delete<void>(`/hardware-devices/${encodeURIComponent(id)}`).pipe(
      map(() => ({ success: true, message: 'Device deleted successfully' })),
      catchError(err =>
        of({
          success: false,
          message: err.error?.message || 'Failed to delete device',
          errors: ['API error']
        })
      )
    );
  }

  /** Test device using live device record from API */
  testDevice(request: DeviceTestRequest): Observable<DeviceTestResult> {
    return this.getDeviceById(request.deviceId).pipe(
      map(device => runDeviceTest(device, request))
    );
  }

  /** Statistics computed from society device list */
  getStatistics(): Observable<HardwareStatistics> {
    return this.getAllDevices().pipe(map(devices => computeHardwareStatistics(devices)));
  }

  /**
   * Create a typed hardware device (ANPR, RFID, etc.) via POST /hardware-devices.
   * Stores {@link hardwareType} for hub filtering and spreads type-specific fields in JSON.
   */
  createTypedDevice(
    hardwareType: HardwareType,
    payload: Record<string, unknown>
  ): Observable<HardwareDeviceResponse> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({ success: false, message: 'No society selected', errors: ['societyId required'] });
    }

    const body = {
      societyId,
      type: hardwareType,
      status: 'CONFIGURING',
      isIntegrated: false,
      integrationStatus: 'PENDING',
      createdBy: this.session.getCurrentUserId(),
      uptime: 0,
      totalOperations: 0,
      errorCount: 0,
      tags: [],
      ...payload
    };

    return this.http.post<Record<string, unknown>>('/hardware-devices', body).pipe(
      map(raw => ({
        success: true,
        message: 'Device added successfully',
        device: apiToHardwareDevice(raw)
      })),
      catchError(err =>
        of({
          success: false,
          message: err.error?.message || 'Failed to create device',
          errors: ['API error']
        })
      )
    );
  }

  /** Update typed device preserving societyId and hardware type */
  updateTypedDevice(
    id: string,
    payload: Record<string, unknown>
  ): Observable<HardwareDeviceResponse> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({ success: false, message: 'No society selected', errors: ['societyId required'] });
    }

    return this.getDeviceById(id).pipe(
      switchMap(existing => {
        if (!existing) {
          return of({ success: false, message: 'Device not found', errors: ['Device not found'] });
        }
        const body = {
          societyId,
          ...JSON.parse(JSON.stringify(existing, (_k, v) => (v instanceof Date ? v.toISOString() : v))),
          ...payload,
          id,
          updatedAt: new Date().toISOString(),
          updatedBy: this.session.getCurrentUserId()
        };
        return this.http
          .put<Record<string, unknown>>(`/hardware-devices/${encodeURIComponent(id)}`, body)
          .pipe(
            map(raw => ({
              success: true,
              message: 'Device updated successfully',
              device: apiToHardwareDevice(raw)
            })),
            catchError(err =>
              of({
                success: false,
                message: err.error?.message || 'Failed to update device',
                errors: ['API error']
              })
            )
          );
      })
    );
  }
}
