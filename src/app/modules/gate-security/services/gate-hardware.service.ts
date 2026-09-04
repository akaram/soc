import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SessionContextService } from '../../../core/services/session-context.service';

export type GateHardwareDecision = {
  societyId: string;
  gateId?: string;
  deviceId?: string;
  eventType?: string;
  decidedAt?: string;
  decision: 'ALLOW' | 'DENY' | 'MANUAL_REVIEW';
  reason?: string;
  subjectType?: string;
  subjectId?: string;
  subjectLabel?: string;
  action?: {
    actionType: string;
    durationMs?: number;
  };
};

/**
 * Thin client for the backend gate-hardware event ingestion pipeline.
 * Keeps UI simulators vendor-agnostic: they emit normalized events and display decisions.
 */
@Injectable({ providedIn: 'root' })
export class GateHardwareService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  ingestRfidDetect(gateId: string, deviceId: string, tag: string): Observable<GateHardwareDecision> {
    const societyId = this.session.getSocietyId();
    return this.http.post<GateHardwareDecision>('/gate-hardware/events', {
      societyId,
      gateId,
      deviceId,
      eventType: 'RFID_TAG_DETECTED',
      occurredAt: new Date().toISOString(),
      payload: { tag }
    });
  }

  openBarrier(gateId: string, deviceId?: string, durationMs: number = 8000): Observable<Record<string, unknown>> {
    const societyId = this.session.getSocietyId();
    return this.http.post<Record<string, unknown>>('/gate-hardware/actions/open-barrier', {
      societyId,
      gateId,
      deviceId: deviceId ?? '',
      durationMs
    });
  }
}

