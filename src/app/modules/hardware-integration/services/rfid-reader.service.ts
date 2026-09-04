import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HardwareService } from './hardware.service';
import { HardwareType } from '../models/hardware.model';
import { apiToHardwareDevice, resolveGateName, toGenericTestType } from './hardware-api.mapper';
import {
  RFIDReader,
  ReaderType,
  ReaderStatus,
  ReaderProtocol,
  CreateRFIDReaderRequest,
  UpdateRFIDReaderRequest,
  RFIDReaderResponse,
  ReaderTestRequest,
  ReaderTestResult,
  ReaderFilter,
  ReaderStatistics
} from '../models/rfid-reader.model';

const RFID_TYPES = new Set([
  HardwareType.RFID_READER,
  HardwareType.SMART_CARD_READER,
  ReaderType.RFID_READER,
  ReaderType.SMART_CARD_READER,
  ReaderType.NFC_READER,
  ReaderType.FASTAG_READER,
  ReaderType.COMBO_READER
]);

function apiToRfidReader(raw: Record<string, unknown>): RFIDReader {
  const base = apiToHardwareDevice(raw);
  const readerType = String(raw['readerType'] ?? raw['type'] ?? ReaderType.RFID_READER);
  return {
    ...base,
    type: (RFID_TYPES.has(readerType as ReaderType) ? readerType : ReaderType.RFID_READER) as ReaderType,
    status: String(raw['status'] ?? ReaderStatus.CONFIGURING) as ReaderStatus,
    connectionType: String(raw['connectionType'] ?? 'ETHERNET') as RFIDReader['connectionType'],
    baudRate: raw['baudRate'] != null ? Number(raw['baudRate']) : undefined,
    supportedProtocols: (raw['supportedProtocols'] as ReaderProtocol[]) ?? [ReaderProtocol.MIFARE],
    readRange: raw['readRange'] != null ? Number(raw['readRange']) : undefined,
    autoOpenGate: Boolean(raw['autoOpenGate']),
    requiresApproval: Boolean(raw['requiresApproval'] ?? true),
    totalReads: Number(raw['totalReads'] ?? raw['totalOperations'] ?? 0),
    successfulReads: Number(raw['successfulReads'] ?? 0),
    failedReads: Number(raw['failedReads'] ?? 0)
  };
}

function isRfidDevice(raw: Record<string, unknown>): boolean {
  const t = String(raw['type'] ?? '');
  return t === HardwareType.RFID_READER || t === HardwareType.SMART_CARD_READER || RFID_TYPES.has(t as ReaderType);
}

@Injectable({ providedIn: 'root' })
export class RFIDReaderService {
  constructor(private hardware: HardwareService) {}

  createReader(request: CreateRFIDReaderRequest): Observable<RFIDReaderResponse> {
    const hwType =
      request.type === ReaderType.SMART_CARD_READER
        ? HardwareType.SMART_CARD_READER
        : HardwareType.RFID_READER;
    return this.hardware
      .createTypedDevice(hwType, {
        ...request,
        readerType: request.type,
        gateName: resolveGateName(request.gateId),
        supportedProtocols: request.supportedProtocols ?? [ReaderProtocol.MIFARE],
        autoOpenGate: request.autoOpenGate ?? false,
        requiresApproval: request.requiresApproval ?? true
      })
      .pipe(
        map(res => ({
          success: res.success,
          message: res.message,
          reader: res.device ? apiToRfidReader(res.device as unknown as Record<string, unknown>) : undefined,
          errors: res.errors
        }))
      );
  }

  updateReader(id: string, request: UpdateRFIDReaderRequest): Observable<RFIDReaderResponse> {
    return this.hardware.updateTypedDevice(id, request as Record<string, unknown>).pipe(
      map(res => ({
        success: res.success,
        message: res.message,
        reader: res.device ? apiToRfidReader(res.device as unknown as Record<string, unknown>) : undefined,
        errors: res.errors
      }))
    );
  }

  getAllReaders(filter?: ReaderFilter): Observable<RFIDReader[]> {
    return this.hardware.listRawDevices().pipe(
      map(rows => {
        const readers = rows.filter(isRfidDevice).map(apiToRfidReader);
        return this.applyFilter(readers, filter).sort((a, b) => a.name.localeCompare(b.name));
      })
    );
  }

  getReaderById(id: string): Observable<RFIDReader | null> {
    return this.hardware.getDeviceById(id).pipe(
      map(d => (d && isRfidDevice(d as unknown as Record<string, unknown>) ? apiToRfidReader(d as unknown as Record<string, unknown>) : null))
    );
  }

  testReader(request: ReaderTestRequest): Observable<ReaderTestResult> {
    return this.hardware
      .testDevice({ deviceId: request.readerId, testType: toGenericTestType(request.testType) })
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

  getStatistics(): Observable<ReaderStatistics> {
    return this.getAllReaders().pipe(
      map(readers => {
        const byType: Record<string, number> = {};
        const byStatus: Record<string, number> = {};
        const byGate: Record<string, number> = {};
        readers.forEach(r => {
          byType[r.type] = (byType[r.type] || 0) + 1;
          byStatus[r.status] = (byStatus[r.status] || 0) + 1;
          if (r.gateId) byGate[r.gateId] = (byGate[r.gateId] || 0) + 1;
        });
        const totalUptime = readers.reduce((s, r) => s + (r.uptime ?? 0), 0);
        return {
          totalReaders: readers.length,
          onlineReaders: readers.filter(r => r.status === ReaderStatus.ONLINE).length,
          offlineReaders: readers.filter(r => r.status === ReaderStatus.OFFLINE).length,
          maintenanceReaders: readers.filter(r => r.status === ReaderStatus.MAINTENANCE).length,
          errorReaders: readers.filter(r => r.status === ReaderStatus.ERROR).length,
          byType,
          byStatus,
          byGate,
          totalReads: readers.reduce((s, r) => s + (r.totalReads ?? 0), 0),
          successfulReads: readers.reduce((s, r) => s + (r.successfulReads ?? 0), 0),
          failedReads: readers.reduce((s, r) => s + (r.failedReads ?? 0), 0),
          averageUptime: readers.length > 0 ? totalUptime / readers.length : 0,
          integrationStatus: {
            active: readers.filter(r => r.integrationStatus === 'ACTIVE').length,
            inactive: readers.filter(r => r.integrationStatus === 'INACTIVE').length,
            pending: readers.filter(r => r.integrationStatus === 'PENDING').length
          }
        };
      })
    );
  }

  private applyFilter(readers: RFIDReader[], filter?: ReaderFilter): RFIDReader[] {
    if (!filter) return readers;
    let list = [...readers];
    if (filter.type) list = list.filter(r => r.type === filter.type);
    if (filter.status) list = list.filter(r => r.status === filter.status);
    if (filter.gateId) list = list.filter(r => r.gateId === filter.gateId);
    if (filter.isIntegrated !== undefined) list = list.filter(r => r.isIntegrated === filter.isIntegrated);
    if (filter.searchTerm) {
      const s = filter.searchTerm.toLowerCase();
      list = list.filter(
        r =>
          r.name.toLowerCase().includes(s) ||
          r.model?.toLowerCase().includes(s) ||
          r.serialNumber?.toLowerCase().includes(s)
      );
    }
    return list;
  }
}
