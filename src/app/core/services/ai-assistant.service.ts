import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SessionContextService } from './session-context.service';
import { ComplaintsApiService } from './complaints-api.service';
import { SosApiService } from './sos-api.service';
import { ModuleRecordService } from './module-record.service';
import { VisitorApiService } from '../../mobile/features/visitors/visitor-api.service';
import { UserManagementService } from '../../modules/user-management/services/user-management.service';
import { VerificationStatus } from '../../modules/user-management/models/user.model';

export const AI_KB_MODULE_CODE = 'AI_ASSISTANT_KB';

export interface AssistantAction {
  label: string;
  route: string;
}

export interface AssistantReply {
  text: string;
  actions?: AssistantAction[];
}

interface Intent {
  keywords: string[];
  handle: (societyId: string) => Observable<AssistantReply>;
}

/**
 * Answers admin questions from live society data — no external LLM call, no API key.
 * Falls back to the admin-managed FAQ knowledge base, then a help message.
 */
@Injectable({ providedIn: 'root' })
export class AiAssistantService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService,
    private complaintsApi: ComplaintsApiService,
    private sosApi: SosApiService,
    private visitors: VisitorApiService,
    private users: UserManagementService,
    private moduleRecords: ModuleRecordService
  ) {}

  readonly quickActions: string[] = [
    'How many open complaints?',
    'What bills are pending?',
    'Any active SOS alerts?',
    'How many visitors today?',
    'Pending user approvals?'
  ];

  private intents: Intent[] = [
    {
      keywords: ['complaint', 'complaints', 'grievance'],
      handle: societyId =>
        this.complaintsApi.listBySociety(societyId).pipe(
          map(rows => {
            const open = rows.filter(r => this.complaintsApi.isOpenStatus(r.status));
            if (!open.length) {
              return { text: 'No open complaints right now. Nice and quiet! 🎉' };
            }
            const top = open
              .slice(0, 3)
              .map(c => `• ${c.category || 'General'} — ${c.status}`)
              .join('\n');
            return {
              text: `There ${open.length === 1 ? 'is' : 'are'} ${open.length} open complaint${open.length === 1 ? '' : 's'}:\n${top}`,
              actions: [{ label: 'View all complaints', route: '/admin/complaints' }]
            };
          }),
          catchError(() => of(this.errorReply()))
        )
    },
    {
      keywords: ['bill', 'bills', 'due', 'dues', 'pending amount', 'outstanding'],
      handle: societyId =>
        this.http.get<Array<{ pendingAmount?: number; pending_amount?: number }>>(
          `/bills/society/${encodeURIComponent(societyId)}/pending`
        ).pipe(
          map(rows => {
            const list = rows ?? [];
            const total = list.reduce((s, r) => s + Number(r.pendingAmount ?? r.pending_amount ?? 0), 0);
            if (!list.length) {
              return { text: 'No pending bills — collections are fully up to date.' };
            }
            return {
              text: `${list.length} bill${list.length === 1 ? '' : 's'} pending, totalling ₹${total.toLocaleString('en-IN')}.`,
              actions: [{ label: 'View billing', route: '/admin/billing' }]
            };
          }),
          catchError(() => of(this.errorReply()))
        )
    },
    {
      keywords: ['sos', 'emergency', 'alert', 'alerts'],
      handle: societyId =>
        this.sosApi.listBySociety(societyId).pipe(
          map(rows => {
            const active = rows.filter(r => this.sosApi.isOpen(r.status));
            if (!active.length) {
              return { text: 'No active SOS alerts. All clear.' };
            }
            return {
              text: `⚠️ ${active.length} active SOS alert${active.length === 1 ? '' : 's'} need attention.`,
              actions: [{ label: 'Open Emergency & Safety', route: '/admin/emergency' }]
            };
          }),
          catchError(() => of(this.errorReply()))
        )
    },
    {
      keywords: ['visitor', 'visitors', 'guest', 'guests'],
      handle: societyId =>
        this.visitors.listBySociety(societyId).pipe(
          map(rows => {
            const today = new Date().toISOString().slice(0, 10);
            const count = rows.filter(v => v.visitDateIso === today).length;
            return {
              text: `${count} visitor${count === 1 ? '' : 's'} logged today.`,
              actions: [{ label: 'View visitors', route: '/admin/visitors' }]
            };
          }),
          catchError(() => of(this.errorReply()))
        )
    },
    {
      keywords: ['approval', 'approvals', 'pending user', 'new user', 'registration'],
      handle: () =>
        this.users.getAllUsers().pipe(
          map(rows => {
            const pending = rows.filter(u => u.verificationStatus === VerificationStatus.PENDING);
            if (!pending.length) {
              return { text: 'No pending user approvals.' };
            }
            return {
              text: `${pending.length} user registration${pending.length === 1 ? '' : 's'} awaiting approval.`,
              actions: [{ label: 'Review users', route: '/admin/users-list' }]
            };
          }),
          catchError(() => of(this.errorReply()))
        )
    }
  ];

  ask(question: string): Observable<AssistantReply> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({
        text: 'Select a society first in Society Setup, then ask me again.',
        actions: [{ label: 'Open Society Setup', route: '/admin/societies' }]
      });
    }

    const q = question.toLowerCase();
    const intent = this.intents.find(i => i.keywords.some(k => q.includes(k)));
    if (intent) {
      return intent.handle(societyId);
    }

    return this.searchKnowledgeBase(societyId, q);
  }

  private searchKnowledgeBase(societyId: string, q: string): Observable<AssistantReply> {
    return this.moduleRecords.list(societyId, AI_KB_MODULE_CODE).pipe(
      map(rows => {
        const match = rows.find(r => q.includes(r.title.toLowerCase()) || r.title.toLowerCase().includes(q));
        if (match) {
          return { text: match.body || match.title };
        }
        return {
          text:
            "I couldn't find an answer for that. I can help with: complaints, pending bills, SOS alerts, visitors today, and pending approvals — or ask your admin to add a FAQ entry below.",
        };
      }),
      catchError(() => of(this.errorReply()))
    );
  }

  private errorReply(): AssistantReply {
    return { text: 'Something went wrong fetching that data — please try again.' };
  }
}
