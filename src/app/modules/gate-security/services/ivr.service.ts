import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  IVRCall,
  ApprovalRequest,
  IVRFlow,
  IVRMenu,
  InitiateIVRCallRequest,
  IVRResponse,
  IVRStatistics,
  IVRFilter
} from '../models/ivr.model';
import { SessionContextService } from '../../../core/services/session-context.service';
import { VisitorManagementService } from '../../visitor-management/services/visitor-management.service';
import {
  apiToIvrCall,
  apiToIvrFlow,
  apiToIvrStatistics,
  applyIvrCallFilter,
  filterPendingVisitors,
  initiateCallToApiBody,
  visitorToApprovalRequest
} from './ivr-api.mapper';

@Injectable({
  providedIn: 'root'
})
export class IVRService {
  private approvalCache: ApprovalRequest[] = [];

  constructor(
    private http: HttpClient,
    private session: SessionContextService,
    private visitorService: VisitorManagementService
  ) {}

  /** Load call history via GET /ivr/calls/society/{id} */
  getAllCalls(filter?: IVRFilter): Observable<IVRCall[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of([]);
    }

    const searchTerm = filter?.searchTerm?.trim();
    const url = searchTerm
      ? `/ivr/calls/society/${encodeURIComponent(societyId)}/search?searchTerm=${encodeURIComponent(searchTerm)}`
      : `/ivr/calls/society/${encodeURIComponent(societyId)}`;

    return forkJoin({
      calls: this.http.get<Record<string, unknown>[]>(url).pipe(catchError(() => of([]))),
      approvals: this.getAllApprovalRequests().pipe(catchError(() => of([])))
    }).pipe(
      map(({ calls, approvals }) => {
        const approvalMap = new Map(approvals.map(a => [a.id, a]));
        return applyIvrCallFilter(
          calls.map(raw => apiToIvrCall(raw, approvalMap.get(String(raw['approvalRequestId'] ?? '')))),
          filter
        );
      })
    );
  }

  /** Get single call via GET /ivr/calls/{id} */
  getCallById(id: string): Observable<IVRCall | null> {
    return this.http.get<Record<string, unknown>>(`/ivr/calls/${encodeURIComponent(id)}`).pipe(
      switchMap(raw => {
        const approvalId = raw['approvalRequestId'] ? String(raw['approvalRequestId']) : '';
        if (!approvalId) {
          return of(apiToIvrCall(raw));
        }
        return this.getApprovalRequestById(approvalId).pipe(
          map(approval => apiToIvrCall(raw, approval ?? undefined))
        );
      }),
      catchError(() => of(null))
    );
  }

  /** Active calls via GET /ivr/calls/society/{id}/active */
  getActiveCalls(): Observable<IVRCall[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of([]);
    }

    return this.http
      .get<Record<string, unknown>[]>(`/ivr/calls/society/${encodeURIComponent(societyId)}/active`)
      .pipe(
        map(rows => rows.map(raw => apiToIvrCall(raw))),
        catchError(() => of([]))
      );
  }

  /** Initiate call via POST /ivr/calls */
  initiateCall(request: InitiateIVRCallRequest): Observable<IVRResponse> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({
        success: false,
        message: 'No society selected',
        errors: ['societyId required']
      });
    }

    const body = initiateCallToApiBody(request, societyId);

    return this.http.post<Record<string, unknown>>('/ivr/calls', body).pipe(
      map(raw => {
        const success = raw['success'] !== false;
        const callRaw = (raw['call'] as Record<string, unknown>) ?? raw;
        const nextMenuRaw = raw['nextMenu'] as Record<string, unknown> | undefined;
        return {
          success,
          message: String(raw['message'] ?? 'IVR call initiated'),
          call: apiToIvrCall(callRaw),
          nextMenu: nextMenuRaw ? this.mapNextMenu(nextMenuRaw) : undefined,
          errors: raw['errors'] as string[] | undefined
        } as IVRResponse;
      }),
      catchError(err =>
        of({
          success: false,
          message: err.error?.message || 'Failed to initiate IVR call',
          errors: ['API error']
        })
      )
    );
  }

  /** Process DTMF via POST /ivr/calls/{id}/dtmf */
  processDTMF(callId: string, dtmfKey: string): Observable<IVRResponse> {
    return this.http
      .post<Record<string, unknown>>(`/ivr/calls/${encodeURIComponent(callId)}/dtmf`, {
        dtmfKey,
        processedBy: this.session.getCurrentUserId()
      })
      .pipe(
        map(raw => {
          const callRaw = (raw['call'] as Record<string, unknown>) ?? {};
          const nextMenuRaw = raw['nextMenu'] as Record<string, unknown> | undefined;
          return {
            success: Boolean(raw['success']),
            message: String(raw['message'] ?? ''),
            call: apiToIvrCall(callRaw),
            nextMenu: nextMenuRaw ? this.mapNextMenu(nextMenuRaw) : undefined,
            errors: raw['errors'] as string[] | undefined
          } as IVRResponse;
        }),
        catchError(err =>
          of({
            success: false,
            message: err.error?.message || 'Failed to process DTMF',
            errors: ['API error']
          })
        )
      );
  }

  /**
   * Pending approvals from live visitors (GET /visitors/society/{id})
   * with approvalStatus PENDING — no dummy APR-001 rows.
   */
  getAllApprovalRequests(): Observable<ApprovalRequest[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of([]);
    }

    return this.visitorService.getAllVisitors().pipe(
      map(visitors => {
        const approvals = filterPendingVisitors(visitors).map(visitorToApprovalRequest);
        this.approvalCache = approvals;
        return approvals;
      }),
      catchError(err => {
        console.error('Failed to load pending visitor approvals', err);
        return of([]);
      })
    );
  }

  getApprovalRequestById(id: string): Observable<ApprovalRequest | null> {
    if (this.approvalCache.length > 0) {
      return of(this.approvalCache.find(a => a.id === id) ?? null);
    }
    return this.getAllApprovalRequests().pipe(
      map(approvals => approvals.find(a => a.id === id) ?? null)
    );
  }

  /** Flows via GET /ivr/flows/society/{id} (default flow auto-created on backend) */
  getFlows(): Observable<IVRFlow[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of([]);
    }

    return this.http
      .get<Record<string, unknown>[]>(`/ivr/flows/society/${encodeURIComponent(societyId)}`)
      .pipe(
        map(rows => rows.map(apiToIvrFlow)),
        catchError(err => {
          console.error('Failed to load IVR flows', err);
          return of([]);
        })
      );
  }

  /** Statistics via GET /ivr/society/{id}/statistics */
  getStatistics(): Observable<IVRStatistics> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of(this.emptyStatistics());
    }

    return this.http
      .get<Record<string, unknown>>(`/ivr/society/${encodeURIComponent(societyId)}/statistics`)
      .pipe(
        map(raw => apiToIvrStatistics(raw)),
        catchError(err => {
          console.error('Failed to load IVR statistics', err);
          return of(this.emptyStatistics());
        })
      );
  }

  private mapNextMenu(raw: Record<string, unknown>): IVRMenu {
    return {
      id: String(raw['id'] ?? ''),
      name: String(raw['name'] ?? ''),
      prompt: String(raw['prompt'] ?? ''),
      timeout: Number(raw['timeout'] ?? 10),
      maxAttempts: Number(raw['maxAttempts'] ?? 3),
      options: []
    };
  }

  private emptyStatistics(): IVRStatistics {
    return {
      totalCalls: 0,
      callsToday: 0,
      activeCalls: 0,
      completedCalls: 0,
      failedCalls: 0,
      averageCallDuration: 0,
      totalApprovals: 0,
      approvedViaIVR: 0,
      rejectedViaIVR: 0,
      byCallType: {
        approvalRequest: 0,
        visitorEntry: 0,
        deliveryEntry: 0,
        emergency: 0,
        information: 0
      },
      byGate: {}
    };
  }
}
