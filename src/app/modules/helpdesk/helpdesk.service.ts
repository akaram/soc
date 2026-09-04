import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ModuleRecordService, SocietyModuleRecordRow } from '../../core/services/module-record.service';

export const HELPDESK_MODULE_CODE = 'HELPDESK';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';

/** SLA response window per priority — breach past this triggers auto-escalation. */
export const SLA_HOURS: Record<TicketPriority, number> = {
  URGENT: 2,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 72
};

export const PRIORITIES: TicketPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
export const OPEN_STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'ESCALATED'];

export interface HelpdeskTicket {
  id: string;
  ref: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string;
  createdAt?: Date;
  slaHours: number;
  hoursOpen: number;
  hoursOverdue: number;
  isBreached: boolean;
}

interface TicketBody {
  description?: string;
  priority?: TicketPriority;
  assignedTo?: string;
}

/**
 * Ticket system layered on the generic society-module-records backend (moduleCode HELPDESK).
 * "Auto-escalation" is evaluated whenever the list loads: any OPEN/IN_PROGRESS ticket past its
 * priority's SLA window is flagged ESCALATED and persisted, so escalation is visible to every
 * admin without needing a manual sweep.
 */
@Injectable({ providedIn: 'root' })
export class HelpdeskService {
  constructor(private moduleRecords: ModuleRecordService) {}

  list(societyId: string): Observable<HelpdeskTicket[]> {
    return this.moduleRecords.list(societyId, HELPDESK_MODULE_CODE).pipe(
      map(rows => rows.map(r => this.toTicket(r))),
      switchMap(tickets => this.applyAutoEscalation(tickets))
    );
  }

  create(societyId: string, input: { title: string; description: string; priority: TicketPriority }): Observable<HelpdeskTicket> {
    const body: TicketBody = { description: input.description, priority: input.priority };
    return this.moduleRecords
      .create({
        societyId,
        moduleCode: HELPDESK_MODULE_CODE,
        title: input.title,
        body: JSON.stringify(body),
        status: 'OPEN'
      })
      .pipe(map(r => this.toTicket(r)));
  }

  setStatus(ticket: HelpdeskTicket, status: TicketStatus): Observable<HelpdeskTicket> {
    return this.moduleRecords.update(ticket.id, { status }).pipe(map(r => this.toTicket(r)));
  }

  remove(ticketId: string): Observable<void> {
    return this.moduleRecords.delete(ticketId);
  }

  private toTicket(r: SocietyModuleRecordRow): HelpdeskTicket {
    let meta: TicketBody = {};
    try {
      meta = r.body ? (JSON.parse(r.body) as TicketBody) : {};
    } catch {
      meta = { description: r.body ?? '' };
    }
    const priority: TicketPriority = meta.priority && SLA_HOURS[meta.priority] ? meta.priority : 'MEDIUM';
    const status = (r.status as TicketStatus) || 'OPEN';
    const createdAt = r.createdAt ? new Date(r.createdAt) : undefined;
    const slaHours = SLA_HOURS[priority];
    const hoursOpen = createdAt ? (Date.now() - createdAt.getTime()) / 3600000 : 0;
    const hoursOverdue = Math.max(0, hoursOpen - slaHours);
    const isBreached = OPEN_STATUSES.includes(status) && hoursOverdue > 0;

    return {
      id: r.id,
      ref: `HD-${r.id.slice(0, 8).toUpperCase()}`,
      title: r.title,
      description: meta.description ?? '',
      priority,
      status,
      assignedTo: meta.assignedTo,
      createdAt,
      slaHours,
      hoursOpen,
      hoursOverdue,
      isBreached
    };
  }

  /**
   * Persist ESCALATED for any ticket still sitting untouched in OPEN past its SLA.
   * Only fires from OPEN — once an admin acknowledges (IN_PROGRESS), the ticket is being
   * handled and must not bounce back to ESCALATED on the next list refresh.
   */
  private applyAutoEscalation(tickets: HelpdeskTicket[]): Observable<HelpdeskTicket[]> {
    const toEscalate = tickets.filter(t => t.isBreached && t.status === 'OPEN');
    if (!toEscalate.length) {
      return of(tickets);
    }
    return forkJoin(toEscalate.map(t => this.moduleRecords.update(t.id, { status: 'ESCALATED' }))).pipe(
      map(() => {
        const escalatedIds = new Set(toEscalate.map(t => t.id));
        return tickets.map(t => (escalatedIds.has(t.id) ? { ...t, status: 'ESCALATED' as TicketStatus } : t));
      })
    );
  }
}
