import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HardwareService } from './hardware.service';
import { HardwareType } from '../models/hardware.model';
import { apiToHardwareDevice, resolveGateName, toGenericTestType } from './hardware-api.mapper';
import {
  BiometricDevice,
  BiometricType,
  BiometricStatus,
  BiometricProtocol,
  CreateBiometricDeviceRequest,
  UpdateBiometricDeviceRequest,
  BiometricDeviceResponse,
  BiometricTestRequest,
  BiometricTestResult,
  BiometricFilter,
  BiometricStatistics
} from '../models/biometric-device.model';

/** Map stored JSON to BiometricDevice UI model */
function apiToBiometricDevice(raw: Record<string, unknown>): BiometricDevice {
  const base = apiToHardwareDevice(raw);
  return {
    ...base,
    type: String(raw['biometricType'] ?? BiometricType.FINGERPRINT) as BiometricType,
    status: String(raw['status'] ?? BiometricStatus.CONFIGURING) as BiometricStatus,
    connectionType: String(raw['connectionType'] ?? 'USB') as BiometricDevice['connectionType'],
    supportedProtocols: (raw['supportedProtocols'] as BiometricProtocol[]) ?? [BiometricProtocol.CUSTOM],
    supportedTypes: (raw['supportedTypes'] as BiometricType[]) ?? undefined,
    enrollmentCapacity: raw['enrollmentCapacity'] != null ? Number(raw['enrollmentCapacity']) : undefined,
    currentEnrollments: raw['currentEnrollments'] != null ? Number(raw['currentEnrollments']) : undefined,
    totalScans: Number(raw['totalScans'] ?? raw['totalOperations'] ?? 0),
    successfulScans: Number(raw['successfulScans'] ?? 0),
    failedScans: Number(raw['failedScans'] ?? 0),
    enrollments: Number(raw['enrollments'] ?? raw['currentEnrollments'] ?? 0),
    verifications: Number(raw['verifications'] ?? 0),
    livenessDetection: Boolean(raw['livenessDetection']),
    antiSpoofing: Boolean(raw['antiSpoofing'])
  };
}

@Injectable({ providedIn: 'root' })
export class BiometricDeviceService {
  constructor(private hardware: HardwareService) {}

  createDevice(request: CreateBiometricDeviceRequest): Observable<BiometricDeviceResponse> {
    return this.hardware
      .createTypedDevice(HardwareType.BIOMETRIC_DEVICE, {
        ...request,
        biometricType: request.type,
        gateName: resolveGateName(request.gateId),
        supportedProtocols: request.supportedProtocols ?? [BiometricProtocol.CUSTOM],
        supportedTypes: request.supportedTypes ?? [request.type],
        livenessDetection: request.livenessDetection ?? false,
        antiSpoofing: request.antiSpoofing ?? false
      })
      .pipe(
        map(res => ({
          success: res.success,
          message: res.message,
          device: res.device ? apiToBiometricDevice(res.device as unknown as Record<string, unknown>) : undefined,
          errors: res.errors
        }))
      );
  }

  updateDevice(id: string, request: UpdateBiometricDeviceRequest): Observable<BiometricDeviceResponse> {
    return this.hardware.updateTypedDevice(id, request as Record<string, unknown>).pipe(
      map(res => ({
        success: res.success,
        message: res.message,
        device: res.device ? apiToBiometricDevice(res.device as unknown as Record<string, unknown>) : undefined,
        errors: res.errors
      }))
    );
  }

  getAllDevices(filter?: BiometricFilter): Observable<BiometricDevice[]> {
    return this.hardware.listRawDevices().pipe(
      map(rows => {
        const devices = rows
          .filter(r => String(r['type']) === HardwareType.BIOMETRIC_DEVICE)
          .map(apiToBiometricDevice);
        return this.applyFilter(devices, filter).sort((a, b) => a.name.localeCompare(b.name));
      })
    );
  }

  getDeviceById(id: string): Observable<BiometricDevice | null> {
    return this.hardware.getDeviceById(id).pipe(
      map(d =>
        d && String((d as unknown as Record<string, unknown>)['type']) === HardwareType.BIOMETRIC_DEVICE
          ? apiToBiometricDevice(d as unknown as Record<string, unknown>)
          : null
      )
    );
  }

  testDevice(request: BiometricTestRequest): Observable<BiometricTestResult> {
    return this.hardware
      .testDevice({ deviceId: request.deviceId, testType: toGenericTestType(request.testType) })
      .pipe(
        map(r => ({
          success: r.success,
          testType: request.testType,
          results: r.results,
          overallStatus: r.overallStatus,
          timestamp: r.timestamp
        }))
      );
  }

  getStatistics(): Observable<BiometricStatistics> {
    return this.getAllDevices().pipe(
      map(devices => {
        const byType: Record<string, number> = {};
        const byStatus: Record<string, number> = {};
        const byGate: Record<string, number> = {};
        devices.forEach(d => {
          byType[d.type] = (byType[d.type] || 0) + 1;
          byStatus[d.status] = (byStatus[d.status] || 0) + 1;
          if (d.gateId) byGate[d.gateId] = (byGate[d.gateId] || 0) + 1;
        });
        const totalUptime = devices.reduce((s, d) => s + (d.uptime ?? 0), 0);
        return {
          totalDevices: devices.length,
          onlineDevices: devices.filter(d => d.status === BiometricStatus.ONLINE).length,
          offlineDevices: devices.filter(d => d.status === BiometricStatus.OFFLINE).length,
          maintenanceDevices: devices.filter(d => d.status === BiometricStatus.MAINTENANCE).length,
          errorDevices: devices.filter(d => d.status === BiometricStatus.ERROR).length,
          byType,
          byStatus,
          byGate,
          totalScans: devices.reduce((s, d) => s + (d.totalScans ?? 0), 0),
          successfulScans: devices.reduce((s, d) => s + (d.successfulScans ?? 0), 0),
          failedScans: devices.reduce((s, d) => s + (d.failedScans ?? 0), 0),
          totalEnrollments: devices.reduce((s, d) => s + (d.enrollments ?? d.currentEnrollments ?? 0), 0),
          totalVerifications: devices.reduce((s, d) => s + (d.verifications ?? 0), 0),
          averageUptime: devices.length > 0 ? totalUptime / devices.length : 0,
          integrationStatus: {
            active: devices.filter(d => d.integrationStatus === 'ACTIVE').length,
            inactive: devices.filter(d => d.integrationStatus === 'INACTIVE').length,
            pending: devices.filter(d => d.integrationStatus === 'PENDING').length
          }
        };
      })
    );
  }

  private applyFilter(devices: BiometricDevice[], filter?: BiometricFilter): BiometricDevice[] {
    if (!filter) return devices;
    let list = [...devices];
    if (filter.type) list = list.filter(d => d.type === filter.type);
    if (filter.status) list = list.filter(d => d.status === filter.status);
    if (filter.gateId) list = list.filter(d => d.gateId === filter.gateId);
    if (filter.isIntegrated !== undefined) list = list.filter(d => d.isIntegrated === filter.isIntegrated);
    if (filter.searchTerm) {
      const s = filter.searchTerm.toLowerCase();
      list = list.filter(
        d =>
          d.name.toLowerCase().includes(s) ||
          d.model?.toLowerCase().includes(s) ||
          d.serialNumber?.toLowerCase().includes(s)
      );
    }
    return list;
  }
}
