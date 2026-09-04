import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

/** One signaling message from the backend WebRTC relay. */
export interface VideoCallSignalMessage {
  id: string;
  roomId: string;
  fromRole: 'CALLER' | 'GUARD' | string;
  type: 'offer' | 'answer' | 'ice' | 'hangup' | 'join' | string;
  payload: unknown;
  sequence: number;
  createdAt: number;
}

export interface VideoCallRoomStatus {
  roomId: string;
  active: boolean;
  callerJoined?: boolean;
  guardJoined?: boolean;
  lastSequence?: number;
}

/**
 * HTTP signaling client for guard video calls (SDP + ICE exchange via Spring Boot).
 */
@Injectable({ providedIn: 'root' })
export class VideoCallSignalingService {
  private readonly base = `${environment.apiUrl}/video-calls`;

  constructor(private http: HttpClient) {}

  /** Normalize phone to digits-only room id. */
  normalizeRoomId(phone: string): string {
    const digits = (phone || '').replace(/\D/g, '');
    return digits.length >= 6 ? digits : '';
  }

  /** Quick health check — fails if nginx serves HTML instead of JSON. */
  verifyBackend(): Observable<{ ok: boolean; detail: string }> {
    const probeRoom = '9999999999';
    return this.http.get(`${this.base}/rooms/${probeRoom}`, { responseType: 'text' }).pipe(
      map(body => {
        const trimmed = (body || '').trim();
        if (trimmed.startsWith('<!') || trimmed.startsWith('<html')) {
          return {
            ok: false,
            detail: 'Signaling API not reachable (server returned HTML). Reload nginx with /video-calls proxy and restart backend.'
          };
        }
        try {
          JSON.parse(trimmed);
          return { ok: true, detail: 'Signaling API OK' };
        } catch {
          return { ok: false, detail: 'Signaling API returned invalid JSON.' };
        }
      }),
      catchError(err => {
        const msg = err?.status === 404
          ? 'Signaling API OK (backend reachable)'
          : `Signaling API error (${err?.status || 'network'}). Is Spring Boot running on port 9999?`;
        return of({ ok: err?.status === 404 || err?.status === 200, detail: msg });
      })
    );
  }

  joinRoom(roomId: string, role: 'CALLER' | 'GUARD', displayName: string): Observable<VideoCallSignalMessage> {
    return this.http.post<VideoCallSignalMessage>(`${this.base}/rooms/${roomId}/join`, {
      role,
      displayName
    });
  }

  postSignal(
    roomId: string,
    role: 'CALLER' | 'GUARD',
    type: string,
    payload: unknown
  ): Observable<VideoCallSignalMessage> {
    return this.http.post<VideoCallSignalMessage>(`${this.base}/rooms/${roomId}/signals`, {
      role,
      type,
      payload
    });
  }

  pollSignals(roomId: string, afterSequence: number): Observable<VideoCallSignalMessage[]> {
    return this.http.get<VideoCallSignalMessage[]>(`${this.base}/rooms/${roomId}/signals`, {
      params: { after: String(afterSequence) }
    });
  }

  roomStatus(roomId: string): Observable<VideoCallRoomStatus> {
    return this.http.get<VideoCallRoomStatus>(`${this.base}/rooms/${roomId}`);
  }

  hangup(roomId: string, role: 'CALLER' | 'GUARD'): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/rooms/${roomId}`, {
      params: { role }
    });
  }
}
