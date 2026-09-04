import { Injectable } from '@angular/core';
import { Observable, of, delay, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Guard,
  VideoCall,
  VideoCallStatus,
  VideoCallDirection,
  GuardStatus,
  MakeVideoCallRequest,
  VideoCallResponse,
  VideoCallStatistics,
  VideoCallFilter
} from '../models/video-calling.model';
import { VideoCallSignalingService } from './video-call-signaling.service';

const CUSTOM_GUARDS_KEY = 'society_custom_guards';
const CALL_HISTORY_KEY = 'society_video_call_history';

/**
 * Guard list + call history. Real media is handled by GuardVideoWebRtcService.
 */
@Injectable({
  providedIn: 'root'
})
export class VideoCallingService {
  private guards: Guard[] = [];
  private calls: VideoCall[] = [];
  private activeCall: VideoCall | null = null;
  private activeCallSubject = new BehaviorSubject<VideoCall | null>(null);

  constructor(private signaling: VideoCallSignalingService) {
    this.guards = this.loadAllGuards();
    this.calls = this.loadCallHistory();
  }

  /** Register or update a guard reachable by phone (for dial-by-number testing). */
  registerGuardByPhone(phoneNumber: string, name?: string, gateId?: string): Guard {
    const digits = normalizePhoneDigits(phoneNumber);
    const existing = this.guards.find(g => normalizePhoneDigits(g.phoneNumber) === digits);
    if (existing) {
      if (name) {
        existing.name = name;
      }
      existing.status = GuardStatus.AVAILABLE;
      existing.updatedAt = new Date();
      this.saveCustomGuards();
      return existing;
    }
    const guard: Guard = {
      id: `GUARD-P-${digits}`,
      name: name?.trim() || `Guard ${digits.slice(-4)}`,
      badgeNumber: `SG-${digits.slice(-4)}`,
      phoneNumber: phoneNumber.trim(),
      gateId: gateId || 'MAIN_GATE',
      gateName: this.getGateName(gateId || 'MAIN_GATE'),
      shift: 'MORNING',
      status: GuardStatus.AVAILABLE,
      isActive: true,
      lastSeen: new Date(),
      location: 'Gate desk',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.guards.unshift(guard);
    this.saveCustomGuards();
    return guard;
  }

  getAllGuards(filter?: { gateId?: string; status?: GuardStatus }): Observable<Guard[]> {
    return of(null).pipe(
      delay(200),
      map(() => {
        let filtered = [...this.guards];
        if (filter?.gateId) {
          filtered = filtered.filter(g => g.gateId === filter.gateId);
        }
        if (filter?.status) {
          filtered = filtered.filter(g => g.status === filter.status);
        }
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
      })
    );
  }

  getGuardById(id: string): Observable<Guard | null> {
    return of(this.guards.find(g => g.id === id) || null);
  }

  getGuardByPhone(phoneNumber: string): Guard | null {
    const digits = normalizePhoneDigits(phoneNumber);
    return (
      this.guards.find(g => normalizePhoneDigits(g.phoneNumber) === digits) || null
    );
  }

  /** Build room id from any phone input. */
  normalizePhone(phone: string): string {
    return this.signaling.normalizeRoomId(phone);
  }

  /** Start call session metadata (WebRTC runs in GuardVideoWebRtcService). */
  startCallRecord(guard: Guard, callerName: string): VideoCall {
    const call: VideoCall = {
      id: 'VIDEO-CALL-' + Date.now().toString(36).toUpperCase(),
      guardId: guard.id,
      guard,
      direction: VideoCallDirection.OUTGOING,
      status: VideoCallStatus.RINGING,
      startTime: new Date(),
      gateId: guard.gateId,
      gateName: guard.gateName,
      callerName,
      callerType: 'RESIDENT',
      isVideoEnabled: true,
      isAudioEnabled: true,
      isRemoteVideoEnabled: false,
      isRemoteAudioEnabled: false,
      isRecording: false,
      videoQuality: 'HIGH',
      connectionQuality: 'GOOD',
      createdAt: new Date()
    };
    this.activeCall = call;
    this.activeCallSubject.next(call);
    guard.status = GuardStatus.BUSY;
    return call;
  }

  markCallConnected(callId: string): void {
    const call = this.activeCall;
    if (call && call.id === callId) {
      call.status = VideoCallStatus.CONNECTED;
      call.isRemoteVideoEnabled = true;
      call.isRemoteAudioEnabled = true;
      call.connectionQuality = 'GOOD';
      this.activeCallSubject.next({ ...call });
    }
  }

  endCallRecord(callId: string): VideoCallResponse {
    const call = this.calls.find(c => c.id === callId) || this.activeCall;
    if (!call) {
      return { success: false, message: 'Call not found', errors: ['Call not found'] };
    }
    call.status = VideoCallStatus.ENDED;
    call.endTime = new Date();
    if (call.startTime) {
      call.duration = Math.floor((call.endTime.getTime() - call.startTime.getTime()) / 1000);
    }
    const guard = this.guards.find(g => g.id === call.guardId);
    if (guard) {
      guard.status = GuardStatus.AVAILABLE;
    }
    if (!this.calls.find(c => c.id === call.id)) {
      this.calls.unshift(call);
    }
    this.persistCallHistory();
    if (this.activeCall?.id === callId) {
      this.activeCall = null;
      this.activeCallSubject.next(null);
    }
    this.saveCustomGuards();
    return { success: true, message: 'Call ended', call };
  }

  makeVideoCall(request: MakeVideoCallRequest): Observable<VideoCallResponse> {
    return of(null).pipe(
      delay(100),
      map(() => {
        const guard = this.guards.find(g => g.id === request.guardId);
        if (!guard) {
          return { success: false, message: 'Guard not found', errors: ['Guard not found'] };
        }
        const call = this.startCallRecord(guard, request.callerName || 'Resident');
        return { success: true, message: 'Call started — use WebRTC panel to connect media', call };
      })
    );
  }

  endCall(callId: string): Observable<VideoCallResponse> {
    return of(this.endCallRecord(callId));
  }

  toggleVideo(callId: string, enabled: boolean): Observable<VideoCallResponse> {
    return of(null).pipe(
      map(() => {
        const call = this.activeCall;
        if (!call || call.id !== callId) {
          return { success: false, message: 'Call not found', errors: ['Call not found'] };
        }
        call.isVideoEnabled = enabled;
        this.activeCallSubject.next({ ...call });
        return { success: true, message: enabled ? 'Video on' : 'Video off', call };
      })
    );
  }

  toggleAudio(callId: string, enabled: boolean): Observable<VideoCallResponse> {
    return of(null).pipe(
      map(() => {
        const call = this.activeCall;
        if (!call || call.id !== callId) {
          return { success: false, message: 'Call not found', errors: ['Call not found'] };
        }
        call.isAudioEnabled = enabled;
        this.activeCallSubject.next({ ...call });
        return { success: true, message: enabled ? 'Unmuted' : 'Muted', call };
      })
    );
  }

  toggleRecording(callId: string, enabled: boolean): Observable<VideoCallResponse> {
    return of(null).pipe(
      map(() => {
        const call = this.activeCall;
        if (!call || call.id !== callId) {
          return { success: false, message: 'Call not found', errors: ['Call not found'] };
        }
        call.isRecording = enabled;
        this.activeCallSubject.next({ ...call });
        return {
          success: true,
          message: enabled ? 'Recording (browser-only POC)' : 'Recording stopped',
          call
        };
      })
    );
  }

  getActiveCall(): Observable<VideoCall | null> {
    return this.activeCallSubject.asObservable();
  }

  getCallHistory(filter?: VideoCallFilter): Observable<VideoCall[]> {
    return of(null).pipe(
      delay(150),
      map(() => {
        let filtered = [...this.calls];
        if (filter?.guardId) {
          filtered = filtered.filter(c => c.guardId === filter.guardId);
        }
        if (filter?.gateId) {
          filtered = filtered.filter(c => c.gateId === filter.gateId);
        }
        return filtered.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
      })
    );
  }

  getStatistics(): Observable<VideoCallStatistics> {
    return of(null).pipe(
      delay(100),
      map(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const callsToday = this.calls.filter(c => {
          const d = new Date(c.startTime);
          d.setHours(0, 0, 0, 0);
          return d.getTime() === today.getTime();
        });
        const ended = this.calls.filter(c => c.status === VideoCallStatus.ENDED && c.duration);
        const avg =
          ended.length > 0
            ? ended.reduce((s, c) => s + (c.duration || 0), 0) / ended.length
            : 0;
        const byGate: Record<string, number> = {};
        this.calls.forEach(c => {
          if (c.gateId) {
            byGate[c.gateId] = (byGate[c.gateId] || 0) + 1;
          }
        });
        return {
          totalCalls: this.calls.length,
          callsToday: callsToday.length,
          activeCalls:
            this.activeCall &&
            (this.activeCall.status === VideoCallStatus.CONNECTED ||
              this.activeCall.status === VideoCallStatus.RINGING)
              ? 1
              : 0,
          missedCalls: this.calls.filter(c => c.status === VideoCallStatus.MISSED).length,
          averageCallDuration: avg,
          totalGuards: this.guards.length,
          availableGuards: this.guards.filter(
            g => g.isActive && g.status === GuardStatus.AVAILABLE
          ).length,
          byGate,
          byGuard: {},
          byCallerType: { resident: this.calls.length, staff: 0, visitor: 0, management: 0 }
        };
      })
    );
  }

  private getGateName(gateId: string): string {
    const gates: Record<string, string> = {
      MAIN_GATE: 'Main Gate',
      SIDE_GATE: 'Side Gate',
      PARKING_GATE: 'Parking Gate',
      EMERGENCY_GATE: 'Emergency Gate'
    };
    return gates[gateId] || gateId;
  }

  private loadAllGuards(): Guard[] {
    const seed = this.seedGuards();
    const custom = this.loadCustomGuards();
    const byPhone = new Map<string, Guard>();
    [...seed, ...custom].forEach(g => {
      const key = normalizePhoneDigits(g.phoneNumber);
      byPhone.set(key, g);
    });
    return Array.from(byPhone.values());
  }

  private loadCustomGuards(): Guard[] {
    try {
      const raw = localStorage.getItem(CUSTOM_GUARDS_KEY);
      if (!raw) {
        return [];
      }
      return JSON.parse(raw) as Guard[];
    } catch {
      return [];
    }
  }

  private saveCustomGuards(): void {
    const custom = this.guards.filter(g => g.id.startsWith('GUARD-P-'));
    localStorage.setItem(CUSTOM_GUARDS_KEY, JSON.stringify(custom));
  }

  private loadCallHistory(): VideoCall[] {
    try {
      const raw = localStorage.getItem(CALL_HISTORY_KEY);
      if (!raw) {
        return [];
      }
      return (JSON.parse(raw) as VideoCall[]).map(c => ({
        ...c,
        startTime: new Date(c.startTime),
        endTime: c.endTime ? new Date(c.endTime) : undefined,
        createdAt: new Date(c.createdAt)
      }));
    } catch {
      return [];
    }
  }

  private persistCallHistory(): void {
    localStorage.setItem(CALL_HISTORY_KEY, JSON.stringify(this.calls.slice(0, 50)));
  }

  private seedGuards(): Guard[] {
    const now = new Date();
    return [
      {
        id: 'GUARD-001',
        name: 'Ramesh Kumar',
        badgeNumber: 'SG-001',
        phoneNumber: '9876543220',
        gateId: 'MAIN_GATE',
        gateName: 'Main Gate',
        shift: 'MORNING',
        status: GuardStatus.AVAILABLE,
        isActive: true,
        lastSeen: now,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'GUARD-002',
        name: 'Suresh Patel',
        badgeNumber: 'SG-002',
        phoneNumber: '9876543221',
        gateId: 'SIDE_GATE',
        gateName: 'Side Gate',
        shift: 'AFTERNOON',
        status: GuardStatus.AVAILABLE,
        isActive: true,
        lastSeen: now,
        createdAt: now,
        updatedAt: now
      }
    ];
  }
}

function normalizePhoneDigits(phone: string): string {
  return (phone || '').replace(/\D/g, '');
}
