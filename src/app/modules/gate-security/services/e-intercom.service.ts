import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin, of, interval, Subscription } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import {
  IntercomContact,
  IntercomCall,
  CallStatus,
  CallDirection,
  ContactType,
  MakeCallRequest,
  CallResponse,
  EIntercomStatistics,
  IntercomFilter
} from '../models/e-intercom.model';
import { UserManagementService } from '../../user-management/services/user-management.service';
import { VideoCallSignalingService } from './video-call-signaling.service';
import { SessionContextService } from '../../../core/services/session-context.service';
import { societyToIntercomContact, userToIntercomContact } from './e-intercom-api.mapper';

const HISTORY_PREFIX = 'society_intercom_history_';

@Injectable({
  providedIn: 'root'
})
export class EIntercomService implements OnDestroy {
  private activeCall: IntercomCall | null = null;
  private activeRoomId: string | null = null;
  private activeCallSubject = new BehaviorSubject<IntercomCall | null>(null);
  private roomPollSub?: Subscription;
  private contactCache: IntercomContact[] = [];

  constructor(
    private http: HttpClient,
    private userService: UserManagementService,
    private signaling: VideoCallSignalingService,
    private session: SessionContextService
  ) {}

  ngOnDestroy(): void {
    this.stopRoomPolling();
  }

  /** Contacts from GET /users/society/{id} plus society office line */
  getAllContacts(filter?: IntercomFilter): Observable<IntercomContact[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of([]);
    }

    return forkJoin({
      users: this.userService.getAllUsers().pipe(catchError(() => of([]))),
      society: this.http
        .get<Record<string, unknown>>(`/societies/${encodeURIComponent(societyId)}`)
        .pipe(catchError(() => of(null)))
    }).pipe(
      map(({ users, society }) => {
        const contacts: IntercomContact[] = users.map(u =>
          userToIntercomContact(u, this.signaling)
        );

        if (society) {
          const office = societyToIntercomContact(society, this.signaling);
          if (office) {
            contacts.unshift(office);
          }
        }

        this.contactCache = contacts;
        return this.applyContactFilter(contacts, filter);
      }),
      catchError(err => {
        console.error('Failed to load intercom contacts', err);
        return of([]);
      })
    );
  }

  getContactById(id: string): Observable<IntercomContact | null> {
    if (this.contactCache.length > 0) {
      return of(this.contactCache.find(c => c.id === id) ?? null);
    }
    return this.getAllContacts().pipe(
      map(contacts => contacts.find(c => c.id === id) ?? null)
    );
  }

  getAvailableContacts(): Observable<IntercomContact[]> {
    return this.getAllContacts().pipe(
      map(contacts => contacts.filter(c => c.isActive && c.isAvailable))
    );
  }

  /**
   * Start intercom session via POST /video-calls/rooms/{phone}/join.
   * Room id = contact phone digits (phone never shown in UI).
   */
  makeCall(request: MakeCallRequest): Observable<CallResponse> {
    return this.getContactById(request.contactId).pipe(
      switchMap(contact => {
        if (!contact) {
          return of({
            success: false,
            message: 'Contact not found',
            errors: ['Contact not found']
          } as CallResponse);
        }

        if (!contact.isAvailable) {
          return of({
            success: false,
            message: 'Contact is not available (inactive or missing valid phone)',
            errors: ['Contact unavailable']
          } as CallResponse);
        }

        const roomId = this.signaling.normalizeRoomId(contact.phoneNumber);
        if (roomId.length < 6) {
          return of({
            success: false,
            message: 'Contact phone cannot be used for signaling (min 6 digits required)',
            errors: ['Invalid phone']
          } as CallResponse);
        }

        return this.signaling
          .joinRoom(roomId, 'GUARD', 'Gate Desk')
          .pipe(
            map(() => {
              const call: IntercomCall = {
                id: `CALL-${Date.now().toString(36).toUpperCase()}`,
                contactId: contact.id,
                contact,
                direction: CallDirection.OUTGOING,
                status: CallStatus.RINGING,
                startTime: new Date(),
                gateId: request.gateId ?? 'MAIN_GATE',
                gateName: this.formatGateName(request.gateId ?? 'MAIN_GATE'),
                createdAt: new Date()
              };

              this.activeCall = call;
              this.activeRoomId = roomId;
              this.activeCallSubject.next({ ...call });
              this.startRoomPolling(roomId, call.id);

              return {
                success: true,
                message: 'Call initiated — waiting for contact to join',
                call
              } as CallResponse;
            }),
            catchError(err => {
              console.error('Intercom join failed', err);
              return of({
                success: false,
                message: err.error?.message || 'Failed to start call via signaling API',
                errors: ['API error']
              } as CallResponse);
            })
          );
      })
    );
  }

  /** End call via DELETE /video-calls/rooms/{roomId} */
  endCall(callId: string): Observable<CallResponse> {
    const call = this.activeCall?.id === callId ? this.activeCall : null;
    if (!call || !this.activeRoomId) {
      return of({
        success: false,
        message: 'No active call to end',
        errors: ['Call not found']
      });
    }

    const roomId = this.activeRoomId;
    return this.signaling.hangup(roomId, 'GUARD').pipe(
      map(() => this.finalizeCall(call, CallStatus.ENDED)),
      catchError(err => {
        console.error('Intercom hangup failed', err);
        // Still finalize locally so the UI is not stuck
        return of(this.finalizeCall(call, CallStatus.ENDED));
      })
    );
  }

  getActiveCall(): Observable<IntercomCall | null> {
    return this.activeCallSubject.asObservable();
  }

  /** Call history persisted per society (real sessions only) */
  getCallHistory(filter?: IntercomFilter): Observable<IntercomCall[]> {
    let history = this.loadCallHistory();

    if (filter?.gateId) {
      history = history.filter(c => c.gateId === filter.gateId);
    }
    if (filter?.dateFrom) {
      history = history.filter(c => c.startTime >= filter.dateFrom!);
    }
    if (filter?.dateTo) {
      history = history.filter(c => c.startTime <= filter.dateTo!);
    }

    return of(history.sort((a, b) => b.startTime.getTime() - a.startTime.getTime()));
  }

  /** Stats from live contacts + persisted call history */
  getStatistics(): Observable<EIntercomStatistics> {
    return forkJoin({
      contacts: this.getAllContacts().pipe(catchError(() => of([] as IntercomContact[]))),
      history: this.getCallHistory().pipe(catchError(() => of([] as IntercomCall[])))
    }).pipe(
      map(({ contacts, history }) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const callsToday = history.filter(c => {
          const d = new Date(c.startTime);
          d.setHours(0, 0, 0, 0);
          return d.getTime() === today.getTime();
        });

        const endedCalls = history.filter(c => c.status === CallStatus.ENDED && c.duration);
        const avgDuration =
          endedCalls.length > 0
            ? endedCalls.reduce((sum, c) => sum + (c.duration || 0), 0) / endedCalls.length
            : 0;

        const byGate: Record<string, number> = {};
        history.forEach(c => {
          if (c.gateId) {
            byGate[c.gateId] = (byGate[c.gateId] || 0) + 1;
          }
        });

        const activeCalls =
          this.activeCall &&
          (this.activeCall.status === CallStatus.CONNECTED ||
            this.activeCall.status === CallStatus.RINGING)
            ? 1
            : 0;

        return {
          totalCalls: history.length,
          callsToday: callsToday.length,
          activeCalls,
          missedCalls: history.filter(c => c.status === CallStatus.MISSED).length,
          averageCallDuration: avgDuration,
          totalContacts: contacts.length,
          availableContacts: contacts.filter(c => c.isActive && c.isAvailable).length,
          byContactType: {
            resident: contacts.filter(c => c.contactType === ContactType.RESIDENT).length,
            staff: contacts.filter(c => c.contactType === ContactType.STAFF).length,
            security: contacts.filter(c => c.contactType === ContactType.SECURITY).length,
            management: contacts.filter(c => c.contactType === ContactType.MANAGEMENT).length,
            emergency: contacts.filter(c => c.contactType === ContactType.EMERGENCY).length,
            vendor: contacts.filter(c => c.contactType === ContactType.VENDOR).length
          },
          byGate
        } as EIntercomStatistics;
      }),
      catchError(() =>
        of({
          totalCalls: 0,
          callsToday: 0,
          activeCalls: 0,
          missedCalls: 0,
          averageCallDuration: 0,
          totalContacts: 0,
          availableContacts: 0,
          byContactType: {
            resident: 0,
            staff: 0,
            security: 0,
            management: 0,
            emergency: 0,
            vendor: 0
          },
          byGate: {}
        })
      )
    );
  }

  /** Poll signaling room until peer joins or call ends */
  private startRoomPolling(roomId: string, callId: string): void {
    this.stopRoomPolling();
    this.roomPollSub = interval(1000).subscribe(() => {
      if (!this.activeCall || this.activeCall.id !== callId) {
        this.stopRoomPolling();
        return;
      }

      this.signaling.roomStatus(roomId).pipe(take(1)).subscribe({
        next: status => {
          if (!this.activeCall || this.activeCall.id !== callId) {
            return;
          }
          if (status.callerJoined && this.activeCall.status === CallStatus.RINGING) {
            this.activeCall.status = CallStatus.CONNECTED;
            this.activeCallSubject.next({ ...this.activeCall });
          }
          if (!status.active && this.activeCall.status !== CallStatus.ENDED) {
            this.finalizeCall(this.activeCall, CallStatus.ENDED);
          }
        },
        error: () => {
          /* ignore transient poll errors */
        }
      });
    });

    // Auto-miss if nobody joins within 45 seconds
    setTimeout(() => {
      if (
        this.activeCall?.id === callId &&
        this.activeCall.status === CallStatus.RINGING
      ) {
        this.signaling.hangup(roomId, 'GUARD').pipe(take(1)).subscribe({
          next: () => this.finalizeCall(this.activeCall!, CallStatus.MISSED),
          error: () => this.finalizeCall(this.activeCall!, CallStatus.MISSED)
        });
      }
    }, 45000);
  }

  private stopRoomPolling(): void {
    if (this.roomPollSub) {
      this.roomPollSub.unsubscribe();
      this.roomPollSub = undefined;
    }
  }

  private finalizeCall(call: IntercomCall, status: CallStatus): CallResponse {
    this.stopRoomPolling();
    call.status = status;
    call.endTime = new Date();
    if (call.startTime) {
      call.duration = Math.floor((call.endTime.getTime() - call.startTime.getTime()) / 1000);
    }

    this.persistCall(call);
    this.activeCall = null;
    this.activeRoomId = null;
    this.activeCallSubject.next(null);

    return {
      success: true,
      message: status === CallStatus.MISSED ? 'Call missed' : 'Call ended',
      call
    };
  }

  private persistCall(call: IntercomCall): void {
    const history = this.loadCallHistory();
    history.unshift({ ...call, contact: call.contact });
    const key = this.historyStorageKey();
    if (key) {
      localStorage.setItem(key, JSON.stringify(history.slice(0, 100)));
    }
  }

  private loadCallHistory(): IntercomCall[] {
    const key = this.historyStorageKey();
    if (!key) {
      return [];
    }
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return [];
      }
      return (JSON.parse(raw) as IntercomCall[]).map(c => ({
        ...c,
        startTime: new Date(c.startTime),
        endTime: c.endTime ? new Date(c.endTime) : undefined,
        createdAt: new Date(c.createdAt)
      }));
    } catch {
      return [];
    }
  }

  private historyStorageKey(): string | null {
    const societyId = this.session.getSocietyId();
    return societyId ? `${HISTORY_PREFIX}${societyId}` : null;
  }

  private applyContactFilter(
    contacts: IntercomContact[],
    filter?: IntercomFilter
  ): IntercomContact[] {
    let filtered = [...contacts];
    if (filter?.contactType) {
      filtered = filtered.filter(c => c.contactType === filter.contactType);
    }
    if (filter?.searchTerm) {
      const search = filter.searchTerm.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.name.toLowerCase().includes(search) ||
          c.displayName.toLowerCase().includes(search) ||
          c.flatNumber?.toLowerCase().includes(search) ||
          c.extension?.includes(search)
      );
    }
    return filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  private formatGateName(gateId: string): string {
    return gateId
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }
}
