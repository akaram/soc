import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { HardwareService } from './hardware.service';
import { HardwareType } from '../models/hardware.model';
import { apiToHardwareDevice, resolveGateName, toGenericTestType } from './hardware-api.mapper';
import {
  AccessControl,
  AccessControlType,
  AccessControlStatus,
  AccessControlProtocol,
  AccessMode,
  AuthenticationMethod,
  CreateAccessControlRequest,
  UpdateAccessControlRequest,
  AccessControlResponse,
  AccessControlOperationRequest,
  AccessControlOperationResponse,
  AccessControlTestRequest,
  AccessControlTestResult,
  AccessControlFilter,
  AccessControlStatistics
} from '../models/access-control.model';

/** Map stored JSON to AccessControl UI model */
function apiToAccessControl(raw: Record<string, unknown>): AccessControl {
  const base = apiToHardwareDevice(raw);
  return {
    ...base,
    type: String(raw['panelType'] ?? AccessControlType.ELECTRONIC_LOCK) as AccessControlType,
    status: String(raw['status'] ?? AccessControlStatus.CONFIGURING) as AccessControlStatus,
    connectionType: String(raw['connectionType'] ?? 'ETHERNET') as AccessControl['connectionType'],
    isLocked: Boolean(raw['isLocked'] ?? true),
    supportedProtocols: (raw['supportedProtocols'] as AccessControlProtocol[]) ?? [AccessControlProtocol.HTTP],
    accessMode: (raw['accessMode'] as AccessMode) ?? AccessMode.ALWAYS_LOCKED,
    authenticationMethods: (raw['authenticationMethods'] as AuthenticationMethod[]) ?? [AuthenticationMethod.CARD],
    antiTamper: Boolean(raw['antiTamper']),
    batteryBackup: Boolean(raw['batteryBackup']),
    lowBatteryAlert: Boolean(raw['lowBatteryAlert'] ?? true),
    forcedEntryAlert: Boolean(raw['forcedEntryAlert'] ?? true),
    doorSensor: Boolean(raw['doorSensor'] ?? true),
    integratedWithRFID: Boolean(raw['integratedWithRFID']),
    integratedWithBiometric: Boolean(raw['integratedWithBiometric']),
    integratedWithANPR: Boolean(raw['integratedWithANPR']),
    integratedWithIntercom: Boolean(raw['integratedWithIntercom']),
    supportsSchedules: Boolean(raw['supportsSchedules']),
    supportsGroups: Boolean(raw['supportsGroups']),
    supportsTemporaryAccess: Boolean(raw['supportsTemporaryAccess']),
    totalAccessAttempts: Number(raw['totalAccessAttempts'] ?? raw['totalOperations'] ?? 0),
    successfulAccess: Number(raw['successfulAccess'] ?? 0),
    failedAccess: Number(raw['failedAccess'] ?? 0),
    deniedAccess: Number(raw['deniedAccess'] ?? 0)
  };
}

@Injectable({ providedIn: 'root' })
export class AccessControlService {
  constructor(private hardware: HardwareService) {}

  createAccessControl(request: CreateAccessControlRequest): Observable<AccessControlResponse> {
    return this.hardware
      .createTypedDevice(HardwareType.ACCESS_CONTROL, {
        ...request,
        panelType: request.type,
        gateName: resolveGateName(request.gateId),
        isLocked: true,
        supportedProtocols: request.supportedProtocols ?? [AccessControlProtocol.HTTP],
        accessMode: request.accessMode ?? AccessMode.ALWAYS_LOCKED,
        authenticationMethods: request.authenticationMethods ?? [AuthenticationMethod.CARD]
      })
      .pipe(
        map(res => ({
          success: res.success,
          message: res.message,
          accessControl: res.device
            ? apiToAccessControl(res.device as unknown as Record<string, unknown>)
            : undefined,
          errors: res.errors
        }))
      );
  }

  updateAccessControl(id: string, request: UpdateAccessControlRequest): Observable<AccessControlResponse> {
    return this.hardware.updateTypedDevice(id, request as Record<string, unknown>).pipe(
      map(res => ({
        success: res.success,
        message: res.message,
        accessControl: res.device
          ? apiToAccessControl(res.device as unknown as Record<string, unknown>)
          : undefined,
        errors: res.errors
      }))
    );
  }

  getAllAccessControls(filter?: AccessControlFilter): Observable<AccessControl[]> {
    return this.hardware.listRawDevices().pipe(
      map(rows => {
        const systems = rows
          .filter(r => String(r['type']) === HardwareType.ACCESS_CONTROL)
          .map(apiToAccessControl);
        return this.applyFilter(systems, filter).sort((a, b) => a.name.localeCompare(b.name));
      })
    );
  }

  getAccessControlById(id: string): Observable<AccessControl | null> {
    return this.hardware.getDeviceById(id).pipe(
      map(d =>
        d && String((d as unknown as Record<string, unknown>)['type']) === HardwareType.ACCESS_CONTROL
          ? apiToAccessControl(d as unknown as Record<string, unknown>)
          : null
      )
    );
  }

  /** Lock/unlock via device record update (no separate hardware command API) */
  operateAccessControl(request: AccessControlOperationRequest): Observable<AccessControlOperationResponse> {
    return this.getAccessControlById(request.accessControlId).pipe(
      switchMap(ac => {
        if (!ac) {
          return of({ success: false, message: 'Access control system not found' });
        }
        const isLocked =
          request.operation === 'LOCK' ? true : request.operation === 'UNLOCK' ? false : !ac.isLocked;
        const newStatus = isLocked ? AccessControlStatus.LOCKED : AccessControlStatus.UNLOCKED;
        return this.hardware
          .updateTypedDevice(request.accessControlId, { isLocked, status: newStatus })
          .pipe(
            map(res => ({
              success: res.success,
              message: res.message || `${request.operation} command sent`,
              isLocked,
              newStatus
            }))
          );
      })
    );
  }

  testAccessControl(request: AccessControlTestRequest): Observable<AccessControlTestResult> {
    return this.hardware
      .testDevice({ deviceId: request.accessControlId, testType: toGenericTestType(request.testType) })
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

  getStatistics(): Observable<AccessControlStatistics> {
    return this.getAllAccessControls().pipe(
      map(systems => {
        const byType: Record<string, number> = {};
        const byStatus: Record<string, number> = {};
        const byGate: Record<string, number> = {};
        systems.forEach(s => {
          byType[s.type] = (byType[s.type] || 0) + 1;
          byStatus[s.status] = (byStatus[s.status] || 0) + 1;
          if (s.gateId) byGate[s.gateId] = (byGate[s.gateId] || 0) + 1;
        });
        const totalUptime = systems.reduce((s, p) => s + (p.uptime ?? 0), 0);
        return {
          totalSystems: systems.length,
          onlineSystems: systems.filter(p => p.status === AccessControlStatus.ONLINE).length,
          offlineSystems: systems.filter(p => p.status === AccessControlStatus.OFFLINE).length,
          maintenanceSystems: systems.filter(p => p.status === AccessControlStatus.MAINTENANCE).length,
          errorSystems: systems.filter(p => p.status === AccessControlStatus.ERROR).length,
          lockedSystems: systems.filter(p => p.isLocked).length,
          unlockedSystems: systems.filter(p => !p.isLocked).length,
          byType,
          byStatus,
          byGate,
          totalAccessAttempts: systems.reduce((s, p) => s + (p.totalAccessAttempts ?? 0), 0),
          successfulAccess: systems.reduce((s, p) => s + (p.successfulAccess ?? 0), 0),
          failedAccess: systems.reduce((s, p) => s + (p.failedAccess ?? 0), 0),
          deniedAccess: systems.reduce((s, p) => s + (p.deniedAccess ?? 0), 0),
          averageUptime: systems.length > 0 ? totalUptime / systems.length : 0,
          integrationStatus: {
            active: systems.filter(p => p.integrationStatus === 'ACTIVE').length,
            inactive: systems.filter(p => p.integrationStatus === 'INACTIVE').length,
            pending: systems.filter(p => p.integrationStatus === 'PENDING').length
          }
        };
      })
    );
  }

  private applyFilter(systems: AccessControl[], filter?: AccessControlFilter): AccessControl[] {
    if (!filter) return systems;
    let list = [...systems];
    if (filter.type) list = list.filter(p => p.type === filter.type);
    if (filter.status) list = list.filter(p => p.status === filter.status);
    if (filter.gateId) list = list.filter(p => p.gateId === filter.gateId);
    if (filter.accessMode) list = list.filter(p => p.accessMode === filter.accessMode);
    if (filter.isIntegrated !== undefined) list = list.filter(p => p.isIntegrated === filter.isIntegrated);
    if (filter.searchTerm) {
      const s = filter.searchTerm.toLowerCase();
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(s) ||
          p.model?.toLowerCase().includes(s) ||
          p.serialNumber?.toLowerCase().includes(s)
      );
    }
    return list;
  }
}
