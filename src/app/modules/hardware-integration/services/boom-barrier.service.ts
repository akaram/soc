import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { HardwareService } from './hardware.service';
import { HardwareType } from '../models/hardware.model';
import { apiToHardwareDevice, resolveGateName, toGenericTestType } from './hardware-api.mapper';
import {
  BoomBarrier,
  BoomBarrierType,
  BoomBarrierStatus,
  BoomBarrierProtocol,
  OperationMode,
  CreateBoomBarrierRequest,
  UpdateBoomBarrierRequest,
  BoomBarrierResponse,
  BoomBarrierOperationRequest,
  BoomBarrierOperationResponse,
  BoomBarrierTestRequest,
  BoomBarrierTestResult,
  BoomBarrierFilter,
  BoomBarrierStatistics
} from '../models/boom-barrier.model';

/** Map stored JSON to BoomBarrier UI model */
function apiToBoomBarrier(raw: Record<string, unknown>): BoomBarrier {
  const base = apiToHardwareDevice(raw);
  return {
    ...base,
    type: String(raw['barrierType'] ?? BoomBarrierType.SINGLE_ARM) as BoomBarrierType,
    status: String(raw['status'] ?? BoomBarrierStatus.CONFIGURING) as BoomBarrierStatus,
    connectionType: String(raw['connectionType'] ?? 'WIRED') as BoomBarrier['connectionType'],
    isOpen: Boolean(raw['isOpen']),
    laneNumber: raw['laneNumber'] != null ? Number(raw['laneNumber']) : undefined,
    direction: raw['direction'] as BoomBarrier['direction'],
    supportedProtocols: (raw['supportedProtocols'] as BoomBarrierProtocol[]) ?? [BoomBarrierProtocol.MODBUS],
    operationMode: (raw['operationMode'] as OperationMode) ?? OperationMode.AUTOMATIC,
    openTime: raw['openTime'] != null ? Number(raw['openTime']) : undefined,
    closeTime: raw['closeTime'] != null ? Number(raw['closeTime']) : undefined,
    autoCloseDelay: raw['autoCloseDelay'] != null ? Number(raw['autoCloseDelay']) : undefined,
    requiresApproval: Boolean(raw['requiresApproval']),
    safetyBeam: Boolean(raw['safetyBeam'] ?? true),
    loopDetector: Boolean(raw['loopDetector'] ?? true),
    photocell: Boolean(raw['photocell']),
    emergencyStop: Boolean(raw['emergencyStop'] ?? true),
    obstacleDetection: Boolean(raw['obstacleDetection'] ?? true),
    integratedWithRFID: Boolean(raw['integratedWithRFID']),
    integratedWithANPR: Boolean(raw['integratedWithANPR']),
    integratedWithBiometric: Boolean(raw['integratedWithBiometric']),
    totalOperations: Number(raw['totalOperations'] ?? 0),
    successfulOperations: Number(raw['successfulOperations'] ?? 0),
    failedOperations: Number(raw['failedOperations'] ?? 0)
  };
}

@Injectable({ providedIn: 'root' })
export class BoomBarrierService {
  constructor(private hardware: HardwareService) {}

  createBarrier(request: CreateBoomBarrierRequest): Observable<BoomBarrierResponse> {
    return this.hardware
      .createTypedDevice(HardwareType.BOOM_BARRIER, {
        ...request,
        barrierType: request.type,
        gateName: resolveGateName(request.gateId),
        isOpen: false,
        supportedProtocols: request.supportedProtocols ?? [BoomBarrierProtocol.MODBUS],
        operationMode: request.operationMode ?? OperationMode.AUTOMATIC
      })
      .pipe(
        map(res => ({
          success: res.success,
          message: res.message,
          barrier: res.device ? apiToBoomBarrier(res.device as unknown as Record<string, unknown>) : undefined,
          errors: res.errors
        }))
      );
  }

  updateBarrier(id: string, request: UpdateBoomBarrierRequest): Observable<BoomBarrierResponse> {
    return this.hardware.updateTypedDevice(id, request as Record<string, unknown>).pipe(
      map(res => ({
        success: res.success,
        message: res.message,
        barrier: res.device ? apiToBoomBarrier(res.device as unknown as Record<string, unknown>) : undefined,
        errors: res.errors
      }))
    );
  }

  getAllBarriers(filter?: BoomBarrierFilter): Observable<BoomBarrier[]> {
    return this.hardware.listRawDevices().pipe(
      map(rows => {
        const barriers = rows
          .filter(r => String(r['type']) === HardwareType.BOOM_BARRIER)
          .map(apiToBoomBarrier);
        return this.applyFilter(barriers, filter).sort((a, b) => a.name.localeCompare(b.name));
      })
    );
  }

  getBarrierById(id: string): Observable<BoomBarrier | null> {
    return this.hardware.getDeviceById(id).pipe(
      map(d =>
        d && String((d as unknown as Record<string, unknown>)['type']) === HardwareType.BOOM_BARRIER
          ? apiToBoomBarrier(d as unknown as Record<string, unknown>)
          : null
      )
    );
  }

  /** Open/close/stop via device record update (no separate hardware command API) */
  operateBarrier(request: BoomBarrierOperationRequest): Observable<BoomBarrierOperationResponse> {
    return this.getBarrierById(request.barrierId).pipe(
      switchMap(barrier => {
        if (!barrier) {
          return of({ success: false, message: 'Boom barrier not found' });
        }
        const isOpen =
          request.operation === 'OPEN' ? true : request.operation === 'CLOSE' ? false : barrier.isOpen;
        const newStatus =
          request.operation === 'OPEN'
            ? BoomBarrierStatus.OPENING
            : request.operation === 'CLOSE'
              ? BoomBarrierStatus.CLOSING
              : barrier.status;
        return this.hardware
          .updateTypedDevice(request.barrierId, {
            isOpen,
            status: newStatus,
            lastOperationAt: new Date().toISOString(),
            lastOperationType: request.operation === 'STOP' ? barrier.lastOperationType : request.operation
          })
          .pipe(
            map(res => ({
              success: res.success,
              message: res.message || `${request.operation} command sent`,
              isOpen,
              newStatus
            }))
          );
      })
    );
  }

  testBarrier(request: BoomBarrierTestRequest): Observable<BoomBarrierTestResult> {
    return this.hardware
      .testDevice({ deviceId: request.barrierId, testType: toGenericTestType(request.testType) })
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

  getStatistics(): Observable<BoomBarrierStatistics> {
    return this.getAllBarriers().pipe(
      map(barriers => {
        const byType: Record<string, number> = {};
        const byStatus: Record<string, number> = {};
        const byGate: Record<string, number> = {};
        barriers.forEach(b => {
          byType[b.type] = (byType[b.type] || 0) + 1;
          byStatus[b.status] = (byStatus[b.status] || 0) + 1;
          if (b.gateId) byGate[b.gateId] = (byGate[b.gateId] || 0) + 1;
        });
        const totalUptime = barriers.reduce((s, b) => s + (b.uptime ?? 0), 0);
        return {
          totalBarriers: barriers.length,
          onlineBarriers: barriers.filter(b => b.status === BoomBarrierStatus.ONLINE).length,
          offlineBarriers: barriers.filter(b => b.status === BoomBarrierStatus.OFFLINE).length,
          maintenanceBarriers: barriers.filter(b => b.status === BoomBarrierStatus.MAINTENANCE).length,
          errorBarriers: barriers.filter(b => b.status === BoomBarrierStatus.ERROR).length,
          openBarriers: barriers.filter(b => b.isOpen).length,
          closedBarriers: barriers.filter(b => !b.isOpen).length,
          byType,
          byStatus,
          byGate,
          totalOperations: barriers.reduce((s, b) => s + (b.totalOperations ?? 0), 0),
          successfulOperations: barriers.reduce((s, b) => s + (b.successfulOperations ?? 0), 0),
          failedOperations: barriers.reduce((s, b) => s + (b.failedOperations ?? 0), 0),
          averageUptime: barriers.length > 0 ? totalUptime / barriers.length : 0,
          integrationStatus: {
            active: barriers.filter(b => b.integrationStatus === 'ACTIVE').length,
            inactive: barriers.filter(b => b.integrationStatus === 'INACTIVE').length,
            pending: barriers.filter(b => b.integrationStatus === 'PENDING').length
          }
        };
      })
    );
  }

  private applyFilter(barriers: BoomBarrier[], filter?: BoomBarrierFilter): BoomBarrier[] {
    if (!filter) return barriers;
    let list = [...barriers];
    if (filter.type) list = list.filter(b => b.type === filter.type);
    if (filter.status) list = list.filter(b => b.status === filter.status);
    if (filter.gateId) list = list.filter(b => b.gateId === filter.gateId);
    if (filter.isIntegrated !== undefined) list = list.filter(b => b.isIntegrated === filter.isIntegrated);
    if (filter.searchTerm) {
      const s = filter.searchTerm.toLowerCase();
      list = list.filter(
        b =>
          b.name.toLowerCase().includes(s) ||
          b.model?.toLowerCase().includes(s) ||
          b.serialNumber?.toLowerCase().includes(s)
      );
    }
    return list;
  }
}
