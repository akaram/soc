import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { HardwareService } from './hardware.service';
import { HardwareType } from '../models/hardware.model';
import {
  apiToHardwareDevice,
  parseApiDate,
  resolveGateName,
  toGenericTestType
} from './hardware-api.mapper';
import {
  ANPRCamera,
  ANPRCameraType,
  ANPRCameraStatus,
  ANPRProtocol,
  RecognitionMode,
  CreateANPRCameraRequest,
  UpdateANPRCameraRequest,
  ANPRCameraResponse,
  ANPRCameraTestRequest,
  ANPRCameraTestResult,
  ANPRCameraFilter,
  ANPRCameraStatistics
} from '../models/anpr-camera.model';

/** Map stored JSON to ANPRCamera UI model */
function apiToAnprCamera(raw: Record<string, unknown>): ANPRCamera {
  const base = apiToHardwareDevice(raw);
  return {
    ...base,
    type: String(raw['cameraType'] ?? ANPRCameraType.ENTRANCE) as ANPRCameraType,
    status: String(raw['status'] ?? ANPRCameraStatus.CONFIGURING) as ANPRCameraStatus,
    connectionType: String(raw['connectionType'] ?? 'ETHERNET') as ANPRCamera['connectionType'],
    laneNumber: raw['laneNumber'] != null ? Number(raw['laneNumber']) : undefined,
    direction: raw['direction'] as ANPRCamera['direction'],
    streamUrl: raw['streamUrl'] ? String(raw['streamUrl']) : undefined,
    supportedProtocols: (raw['supportedProtocols'] as ANPRProtocol[]) ?? [ANPRProtocol.HTTP],
    recognitionMode: (raw['recognitionMode'] as RecognitionMode) ?? RecognitionMode.BOTH,
    captureResolution: raw['captureResolution'] ? String(raw['captureResolution']) : undefined,
    fps: raw['fps'] != null ? Number(raw['fps']) : undefined,
    nightVision: Boolean(raw['nightVision']),
    infrared: Boolean(raw['infrared']),
    motionDetection: Boolean(raw['motionDetection'] ?? true),
    totalDetections: Number(raw['totalDetections'] ?? 0),
    successfulRecognitions: Number(raw['successfulRecognitions'] ?? 0),
    failedRecognitions: Number(raw['failedRecognitions'] ?? 0),
    recognitionAccuracy: raw['recognitionAccuracy'] != null ? Number(raw['recognitionAccuracy']) : undefined,
    lastPlateDetected: raw['lastPlateDetected'] ? String(raw['lastPlateDetected']) : undefined,
    lastPlateDetectedAt: parseApiDate(raw['lastPlateDetectedAt'])
  };
}

@Injectable({ providedIn: 'root' })
export class ANPRCameraService {
  constructor(private hardware: HardwareService) {}

  createCamera(request: CreateANPRCameraRequest): Observable<ANPRCameraResponse> {
    return this.hardware.createTypedDevice(HardwareType.ANPR_CAMERA, {
      ...request,
      cameraType: request.type,
      gateName: resolveGateName(request.gateId),
      connectionType: request.connectionType,
      supportedProtocols: request.supportedProtocols ?? [ANPRProtocol.HTTP],
      recognitionMode: request.recognitionMode ?? RecognitionMode.BOTH,
      nightVision: request.nightVision ?? false,
      infrared: request.infrared ?? false,
      motionDetection: request.motionDetection ?? true
    }).pipe(
      map(res => ({
        success: res.success,
        message: res.message,
        camera: res.device ? apiToAnprCamera(res.device as unknown as Record<string, unknown>) : undefined,
        errors: res.errors
      }))
    );
  }

  updateCamera(id: string, request: UpdateANPRCameraRequest): Observable<ANPRCameraResponse> {
    return this.hardware.updateTypedDevice(id, request as Record<string, unknown>).pipe(
      map(res => ({
        success: res.success,
        message: res.message,
        camera: res.device ? apiToAnprCamera(res.device as unknown as Record<string, unknown>) : undefined,
        errors: res.errors
      }))
    );
  }

  getAllCameras(filter?: ANPRCameraFilter): Observable<ANPRCamera[]> {
    return this.hardware.listRawDevices().pipe(
      map(rows => {
        const cameras = rows
          .filter(r => String(r['type']) === HardwareType.ANPR_CAMERA)
          .map(apiToAnprCamera);
        return this.applyFilter(cameras, filter).sort((a, b) => a.name.localeCompare(b.name));
      })
    );
  }

  getCameraById(id: string): Observable<ANPRCamera | null> {
    return this.hardware.getDeviceById(id).pipe(
      map(d => (d && d.type === HardwareType.ANPR_CAMERA ? apiToAnprCamera(d as unknown as Record<string, unknown>) : null))
    );
  }

  testCamera(request: ANPRCameraTestRequest): Observable<ANPRCameraTestResult> {
    return this.hardware
      .testDevice({ deviceId: request.cameraId, testType: toGenericTestType(request.testType) })
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

  getStatistics(): Observable<ANPRCameraStatistics> {
    return this.getAllCameras().pipe(
      map(cameras => {
        const byType: Record<string, number> = {};
        const byStatus: Record<string, number> = {};
        const byGate: Record<string, number> = {};
        cameras.forEach(c => {
          byType[c.type] = (byType[c.type] || 0) + 1;
          byStatus[c.status] = (byStatus[c.status] || 0) + 1;
          if (c.gateId) byGate[c.gateId] = (byGate[c.gateId] || 0) + 1;
        });
        const totalUptime = cameras.reduce((s, c) => s + (c.uptime ?? 0), 0);
        const accuracySum = cameras.reduce((s, c) => s + (c.recognitionAccuracy ?? 0), 0);
        return {
          totalCameras: cameras.length,
          onlineCameras: cameras.filter(c => c.status === ANPRCameraStatus.ONLINE).length,
          offlineCameras: cameras.filter(c => c.status === ANPRCameraStatus.OFFLINE).length,
          maintenanceCameras: cameras.filter(c => c.status === ANPRCameraStatus.MAINTENANCE).length,
          errorCameras: cameras.filter(c => c.status === ANPRCameraStatus.ERROR).length,
          byType,
          byStatus,
          byGate,
          totalDetections: cameras.reduce((s, c) => s + (c.totalDetections ?? 0), 0),
          successfulRecognitions: cameras.reduce((s, c) => s + (c.successfulRecognitions ?? 0), 0),
          failedRecognitions: cameras.reduce((s, c) => s + (c.failedRecognitions ?? 0), 0),
          averageRecognitionAccuracy: cameras.length > 0 ? accuracySum / cameras.length : 0,
          averageUptime: cameras.length > 0 ? totalUptime / cameras.length : 0,
          integrationStatus: {
            active: cameras.filter(c => c.integrationStatus === 'ACTIVE').length,
            inactive: cameras.filter(c => c.integrationStatus === 'INACTIVE').length,
            pending: cameras.filter(c => c.integrationStatus === 'PENDING').length
          }
        };
      })
    );
  }

  deleteCamera(id: string): Observable<ANPRCameraResponse> {
    return this.hardware.deleteDevice(id).pipe(
      map(res => ({ success: res.success, message: res.message, errors: res.errors }))
    );
  }

  private applyFilter(cameras: ANPRCamera[], filter?: ANPRCameraFilter): ANPRCamera[] {
    if (!filter) return cameras;
    let list = [...cameras];
    if (filter.type) list = list.filter(c => c.type === filter.type);
    if (filter.status) list = list.filter(c => c.status === filter.status);
    if (filter.gateId) list = list.filter(c => c.gateId === filter.gateId);
    if (filter.recognitionMode) list = list.filter(c => c.recognitionMode === filter.recognitionMode);
    if (filter.isIntegrated !== undefined) list = list.filter(c => c.isIntegrated === filter.isIntegrated);
    if (filter.searchTerm) {
      const s = filter.searchTerm.toLowerCase();
      list = list.filter(
        c =>
          c.name.toLowerCase().includes(s) ||
          c.model?.toLowerCase().includes(s) ||
          c.serialNumber?.toLowerCase().includes(s)
      );
    }
    return list;
  }
}
