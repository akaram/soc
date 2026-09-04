import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import { mapMissedPatrolAlertFromApi, mapPatrolNotificationFromApi } from './missed-patrol-alert-http.mapper';
import {
  MissedPatrolAlert,
  AlertSeverity,
  AlertStatus,
  MissedPatrolReason,
  NotificationType,
  PatrolNotification,
  CreateMissedPatrolAlertRequest,
  UpdateMissedPatrolAlertRequest,
  MissedPatrolAlertFilter,
  MissedPatrolAlertStatistics,
  MissedPatrolAlertResponse
} from '../models/missed-patrol-alert.model';

/**
 * Missed patrol alerts and notifications via /missed-patrol-alerts and /patrol-notifications.
 */
@Injectable({
  providedIn: 'root'
})
export class MissedPatrolAlertService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  private societyId(): string {
    return this.session.getSocietyId() ?? '';
  }

  private toPlain(obj: object): Record<string, unknown> {
    return JSON.parse(JSON.stringify(obj, (_k, v) => (v instanceof Date ? v.toISOString() : v)));
  }

  createAlert(request: CreateMissedPatrolAlertRequest): Observable<MissedPatrolAlertResponse> {
    const sid = this.societyId();
    if (!sid) {
      return of({
        success: false,
        message: 'No society in session',
        errors: ['societyId']
      });
    }
    const now = new Date();
    const draft: MissedPatrolAlert = {
      id: '',
      patrolId: request.patrolId,
      routeId: request.routeId,
      routeName: request.routeName,
      guardId: request.guardId,
      guardName: request.guardName,
      severity: request.severity,
      status: AlertStatus.PENDING,
      reason: request.reason,
      description: request.description,
      expectedStartTime: request.expectedStartTime,
      expectedEndTime: request.expectedEndTime,
      missedCheckpoints: request.missedCheckpoints ?? [],
      missedCheckpointNames: request.missedCheckpointNames ?? [],
      detectedAt: now,
      detectedBy: 'System',
      priority: request.priority ?? this.calculatePriority(request.severity),
      tags: request.tags ?? [],
      createdAt: now,
      updatedAt: now
    };
    const plain = this.toPlain(draft);
    delete plain['id'];
    const body = { societyId: sid, ...plain };
    return this.http.post<Record<string, unknown>>('/missed-patrol-alerts', body).pipe(
      switchMap(created => {
        const alert = mapMissedPatrolAlertFromApi(created);
        const built = this.buildNotifications(alert);
        if (built.length === 0) {
          return of({
            success: true,
            message: 'Missed patrol alert created successfully',
            alert,
            notifications: [] as PatrolNotification[]
          });
        }
        return forkJoin(
          built.map(n => {
            const p = this.toPlain(n);
            delete p['id'];
            return this.http
              .post<Record<string, unknown>>('/patrol-notifications', { societyId: sid, ...p })
              .pipe(map(r => mapPatrolNotificationFromApi(r)));
          })
        ).pipe(
          map(notifications => ({
            success: true,
            message: 'Missed patrol alert created successfully',
            alert,
            notifications
          }))
        );
      }),
      catchError(err => {
        const msg = err?.error?.message ?? 'Failed to create alert';
        return of({ success: false, message: msg, errors: [msg] });
      })
    );
  }

  getAllAlerts(filter?: MissedPatrolAlertFilter): Observable<MissedPatrolAlert[]> {
    const sid = this.societyId();
    if (!sid) {
      return of([]);
    }
    return this.http
      .get<Record<string, unknown>[]>(`/missed-patrol-alerts/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows => {
          let list = (rows ?? []).map(r => mapMissedPatrolAlertFromApi(r));
          if (filter) {
            if (filter.status) {
              list = list.filter(a => a.status === filter.status);
            }
            if (filter.severity) {
              list = list.filter(a => a.severity === filter.severity);
            }
            if (filter.reason) {
              list = list.filter(a => a.reason === filter.reason);
            }
            if (filter.guardId) {
              list = list.filter(a => a.guardId === filter.guardId);
            }
            if (filter.routeId) {
              list = list.filter(a => a.routeId === filter.routeId);
            }
            if (filter.startDate) {
              list = list.filter(a => a.expectedStartTime >= filter.startDate!);
            }
            if (filter.endDate) {
              list = list.filter(a => a.expectedStartTime <= filter.endDate!);
            }
            if (filter.searchTerm) {
              const search = filter.searchTerm.toLowerCase();
              list = list.filter(
                a =>
                  a.routeName.toLowerCase().includes(search) ||
                  a.guardName.toLowerCase().includes(search) ||
                  a.description.toLowerCase().includes(search) ||
                  a.reason.toLowerCase().includes(search)
              );
            }
            if (filter.showOnlyUnacknowledged) {
              list = list.filter(a => a.status === AlertStatus.PENDING);
            }
            if (filter.showOnlyUnresolved) {
              list = list.filter(
                a => a.status === AlertStatus.PENDING || a.status === AlertStatus.ACKNOWLEDGED
              );
            }
          }
          return list.sort((a, b) => {
            if (a.priority !== b.priority) {
              return b.priority - a.priority;
            }
            return b.createdAt.getTime() - a.createdAt.getTime();
          });
        }),
        catchError(() => of([]))
      );
  }

  getAlertById(id: string): Observable<MissedPatrolAlert | null> {
    return this.http.get<Record<string, unknown>>(`/missed-patrol-alerts/${encodeURIComponent(id)}`).pipe(
      map(r => mapMissedPatrolAlertFromApi(r)),
      catchError(() => of(null))
    );
  }

  updateAlert(id: string, request: UpdateMissedPatrolAlertRequest): Observable<MissedPatrolAlertResponse> {
    const sid = this.societyId();
    if (!sid) {
      return of({ success: false, message: 'No society in session', errors: ['societyId'] });
    }
    return this.getAlertById(id).pipe(
      switchMap(alert => {
        if (!alert) {
          return of({ success: false, message: 'Alert not found', errors: ['Alert not found'] });
        }
        const merged = { ...alert };
        const now = new Date();
        if (request.status !== undefined) {
          merged.status = request.status;
          if (request.status === AlertStatus.ACKNOWLEDGED && request.acknowledgedBy) {
            merged.acknowledgedAt = now;
            merged.acknowledgedBy = request.acknowledgedBy;
          }
          if (request.status === AlertStatus.RESOLVED && request.resolvedBy) {
            merged.resolvedAt = now;
            merged.resolvedBy = request.resolvedBy;
            if (request.resolutionNotes) {
              merged.resolutionNotes = request.resolutionNotes;
            }
          }
          if (request.status === AlertStatus.ESCALATED && request.escalatedTo) {
            merged.escalatedAt = now;
            merged.escalatedTo = request.escalatedTo;
          }
        }
        if (request.tags !== undefined) {
          merged.tags = request.tags;
        }
        if (request.priority !== undefined) {
          merged.priority = request.priority;
        }
        merged.updatedAt = now;
        const plain = this.toPlain(merged);
        const body: Record<string, unknown> = { societyId: sid, ...plain };
        body['id'] = id;
        return this.http.put<Record<string, unknown>>(`/missed-patrol-alerts/${encodeURIComponent(id)}`, body).pipe(
          map(r => ({
            success: true,
            message: 'Alert updated successfully',
            alert: mapMissedPatrolAlertFromApi(r)
          })),
          catchError(err => {
            const msg = err?.error?.message ?? 'Update failed';
            return of({ success: false, message: msg, errors: [msg] });
          })
        );
      })
    );
  }

  deleteAlert(id: string): Observable<MissedPatrolAlertResponse> {
    return this.http.delete<void>(`/missed-patrol-alerts/${encodeURIComponent(id)}`).pipe(
      map(() => ({ success: true, message: 'Alert deleted successfully' })),
      catchError(err => {
        const msg = err?.error?.message ?? 'Delete failed';
        return of({ success: false, message: msg, errors: [msg] });
      })
    );
  }

  getStatistics(filter?: MissedPatrolAlertFilter): Observable<MissedPatrolAlertStatistics> {
    const sid = this.societyId();
    if (!sid) {
      return of(this.emptyStats());
    }
    return this.http
      .get<Record<string, unknown>[]>(`/missed-patrol-alerts/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows => {
          let filteredAlerts = (rows ?? []).map(r => mapMissedPatrolAlertFromApi(r));
          if (filter) {
            if (filter.guardId) {
              filteredAlerts = filteredAlerts.filter(a => a.guardId === filter.guardId);
            }
            if (filter.routeId) {
              filteredAlerts = filteredAlerts.filter(a => a.routeId === filter.routeId);
            }
            if (filter.startDate) {
              filteredAlerts = filteredAlerts.filter(a => a.expectedStartTime >= filter.startDate!);
            }
            if (filter.endDate) {
              filteredAlerts = filteredAlerts.filter(a => a.expectedStartTime <= filter.endDate!);
            }
          }
          return this.buildStatistics(filteredAlerts);
        }),
        catchError(() => of(this.emptyStats()))
      );
  }

  private emptyStats(): MissedPatrolAlertStatistics {
    return {
      totalAlerts: 0,
      pendingAlerts: 0,
      acknowledgedAlerts: 0,
      resolvedAlerts: 0,
      escalatedAlerts: 0,
      bySeverity: {},
      byReason: {},
      byStatus: {},
      averageResolutionTime: undefined,
      alertsToday: 0,
      alertsThisWeek: 0,
      alertsThisMonth: 0,
      topGuardsWithAlerts: [],
      topRoutesWithAlerts: []
    };
  }

  private buildStatistics(filteredAlerts: MissedPatrolAlert[]): MissedPatrolAlertStatistics {
    const bySeverity: { [key: string]: number } = {};
    const byReason: { [key: string]: number } = {};
    const byStatus: { [key: string]: number } = {};

    filteredAlerts.forEach(alert => {
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
      byReason[alert.reason] = (byReason[alert.reason] || 0) + 1;
      byStatus[alert.status] = (byStatus[alert.status] || 0) + 1;
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const alertsToday = filteredAlerts.filter(a => a.createdAt >= today).length;
    const alertsThisWeek = filteredAlerts.filter(a => a.createdAt >= weekAgo).length;
    const alertsThisMonth = filteredAlerts.filter(a => a.createdAt >= monthAgo).length;

    const resolvedAlerts = filteredAlerts.filter(
      a => a.status === AlertStatus.RESOLVED && a.resolvedAt && a.acknowledgedAt
    );
    const avgResolutionTime =
      resolvedAlerts.length > 0
        ? resolvedAlerts.reduce((sum, a) => {
            const resolutionTime =
              (a.resolvedAt!.getTime() - a.acknowledgedAt!.getTime()) / (1000 * 60 * 60);
            return sum + resolutionTime;
          }, 0) / resolvedAlerts.length
        : undefined;

    const guardCounts: { [key: string]: { name: string; count: number } } = {};
    filteredAlerts.forEach(alert => {
      if (!guardCounts[alert.guardId]) {
        guardCounts[alert.guardId] = { name: alert.guardName, count: 0 };
      }
      guardCounts[alert.guardId].count++;
    });
    const topGuards = Object.entries(guardCounts)
      .map(([guardId, data]) => ({
        guardId,
        guardName: data.name,
        alertCount: data.count
      }))
      .sort((a, b) => b.alertCount - a.alertCount)
      .slice(0, 5);

    const routeCounts: { [key: string]: { name: string; count: number } } = {};
    filteredAlerts.forEach(alert => {
      if (!routeCounts[alert.routeId]) {
        routeCounts[alert.routeId] = { name: alert.routeName, count: 0 };
      }
      routeCounts[alert.routeId].count++;
    });
    const topRoutes = Object.entries(routeCounts)
      .map(([routeId, data]) => ({
        routeId,
        routeName: data.name,
        alertCount: data.count
      }))
      .sort((a, b) => b.alertCount - a.alertCount)
      .slice(0, 5);

    return {
      totalAlerts: filteredAlerts.length,
      pendingAlerts: filteredAlerts.filter(a => a.status === AlertStatus.PENDING).length,
      acknowledgedAlerts: filteredAlerts.filter(a => a.status === AlertStatus.ACKNOWLEDGED).length,
      resolvedAlerts: filteredAlerts.filter(a => a.status === AlertStatus.RESOLVED).length,
      escalatedAlerts: filteredAlerts.filter(a => a.status === AlertStatus.ESCALATED).length,
      bySeverity,
      byReason,
      byStatus,
      averageResolutionTime: avgResolutionTime ? Math.round(avgResolutionTime * 10) / 10 : undefined,
      alertsToday,
      alertsThisWeek,
      alertsThisMonth,
      topGuardsWithAlerts: topGuards,
      topRoutesWithAlerts: topRoutes
    };
  }

  getNotificationsForAlert(alertId: string): Observable<PatrolNotification[]> {
    return this.getAllNotifications().pipe(
      map(list => list.filter(n => n.alertId === alertId))
    );
  }

  getAllNotifications(): Observable<PatrolNotification[]> {
    const sid = this.societyId();
    if (!sid) {
      return of([]);
    }
    return this.http
      .get<Record<string, unknown>[]>(`/patrol-notifications/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows =>
          (rows ?? [])
            .map(r => mapPatrolNotificationFromApi(r))
            .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
        ),
        catchError(() => of([]))
      );
  }

  private calculatePriority(severity: AlertSeverity): number {
    const priorityMap: { [key: string]: number } = {
      LOW: 3,
      MEDIUM: 5,
      HIGH: 8,
      CRITICAL: 10
    };
    return priorityMap[severity] || 5;
  }

  /** Build in-app/email notification payloads for a persisted alert. */
  private buildNotifications(alert: MissedPatrolAlert): PatrolNotification[] {
    const notifications: PatrolNotification[] = [];
    const now = new Date();

    notifications.push({
      id: '',
      alertId: alert.id,
      type: NotificationType.IN_APP,
      recipientId: 'SUPERVISOR-001',
      recipientName: 'Supervisor',
      message: `Missed patrol alert: ${alert.routeName} by ${alert.guardName}`,
      sentAt: now,
      deliveredAt: now,
      status: 'DELIVERED'
    });

    if (alert.severity === AlertSeverity.HIGH || alert.severity === AlertSeverity.CRITICAL) {
      notifications.push({
        id: '',
        alertId: alert.id,
        type: NotificationType.EMAIL,
        recipientId: 'SUPERVISOR-001',
        recipientName: 'Supervisor',
        recipientEmail: 'supervisor@example.com',
        subject: `[${alert.severity}] Missed Patrol Alert: ${alert.routeName}`,
        message: alert.description,
        sentAt: now,
        status: 'SENT'
      });
    }

    return notifications;
  }
}
