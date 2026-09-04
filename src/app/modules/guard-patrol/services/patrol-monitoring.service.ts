import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, interval, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import { mapActivePatrolMonitoringFromApi, mapGuardFromApi, mapPatrolAlertFromApi } from './patrol-monitoring-http.mapper';
import {
  ActivePatrolMonitoring,
  Guard,
  GuardStatus,
  PatrolStatus,
  PatrolMonitoringStatistics,
  PatrolMonitoringFilter,
  PatrolAlert,
  RealTimeUpdate
} from '../models/patrol-monitoring.model';

/**
 * Live patrol dashboard: active patrols, guard roster, and dashboard alerts from REST JSON stores.
 */
@Injectable({
  providedIn: 'root'
})
export class PatrolMonitoringService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  private societyId(): string {
    return this.session.getSocietyId() ?? '';
  }

  private toPlain<T extends object>(obj: T): Record<string, unknown> {
    return JSON.parse(JSON.stringify(obj, (_k, v) => (v instanceof Date ? v.toISOString() : v)));
  }

  getActivePatrols(filter?: PatrolMonitoringFilter): Observable<ActivePatrolMonitoring[]> {
    const sid = this.societyId();
    if (!sid) {
      return of([]);
    }
    return this.http
      .get<Record<string, unknown>[]>(`/patrol-active-patrols/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows => {
          let list = (rows ?? []).map(r => mapActivePatrolMonitoringFromApi(r));
          if (filter) {
            if (filter.routeId) {
              list = list.filter(p => p.routeId === filter.routeId);
            }
            if (filter.guardId) {
              list = list.filter(p => p.guardId === filter.guardId);
            }
            if (filter.status) {
              list = list.filter(p => p.status === filter.status);
            }
            if (filter.showOnlyActive) {
              list = list.filter(p => p.status === PatrolStatus.IN_PROGRESS);
            }
            if (filter.showOnlyDelayed) {
              list = list.filter(p => p.isDelayed);
            }
            if (filter.showOnlyWithAlerts) {
              list = list.filter(p => p.alerts.length > 0);
            }
          }
          return list.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
        }),
        catchError(() => of([]))
      );
  }

  getPatrolById(id: string): Observable<ActivePatrolMonitoring | null> {
    return this.http.get<Record<string, unknown>>(`/patrol-active-patrols/${encodeURIComponent(id)}`).pipe(
      map(r => mapActivePatrolMonitoringFromApi(r)),
      catchError(() => of(null))
    );
  }

  getGuards(filter?: { status?: GuardStatus }): Observable<Guard[]> {
    const sid = this.societyId();
    if (!sid) {
      return of([]);
    }
    return this.http
      .get<Record<string, unknown>[]>(`/patrol-monitoring-guards/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows => {
          let list = (rows ?? []).map(r => mapGuardFromApi(r));
          if (filter?.status) {
            list = list.filter(g => g.status === filter.status);
          }
          return list;
        }),
        catchError(() => of([]))
      );
  }

  getStatistics(): Observable<PatrolMonitoringStatistics> {
    const sid = this.societyId();
    if (!sid) {
      return of(this.emptyStats());
    }
    return forkJoin({
      patrols: this.http
        .get<Record<string, unknown>[]>(`/patrol-active-patrols/society/${encodeURIComponent(sid)}`)
        .pipe(catchError(() => of([]))),
      guards: this.http
        .get<Record<string, unknown>[]>(`/patrol-monitoring-guards/society/${encodeURIComponent(sid)}`)
        .pipe(catchError(() => of([]))),
      alerts: this.http
        .get<Record<string, unknown>[]>(`/patrol-monitoring-alerts/society/${encodeURIComponent(sid)}`)
        .pipe(catchError(() => of([])))
    }).pipe(
      map(({ patrols, guards, alerts }) => {
        const activePatrols = (patrols ?? [])
          .map(p => mapActivePatrolMonitoringFromApi(p))
          .filter(p => p.status === PatrolStatus.IN_PROGRESS);
        const allPatrols = (patrols ?? []).map(p => mapActivePatrolMonitoringFromApi(p));
        const guardList = (guards ?? []).map(g => mapGuardFromApi(g));
        const alertList = (alerts ?? []).map(a => mapPatrolAlertFromApi(a));

        const completedToday = allPatrols.filter(
          p => p.status === PatrolStatus.COMPLETED && this.isToday(p.startTime)
        ).length;

        const guardsOnDuty = guardList.filter(
          g => g.status === GuardStatus.ON_DUTY || g.status === GuardStatus.ON_PATROL
        ).length;
        const guardsOnPatrol = guardList.filter(g => g.status === GuardStatus.ON_PATROL).length;
        const guardsOnBreak = guardList.filter(g => g.status === GuardStatus.BREAK).length;

        const totalCheckpoints = activePatrols.reduce((sum, p) => sum + p.totalCheckpoints, 0);
        const completedCheckpoints = activePatrols.reduce((sum, p) => sum + p.completedCheckpoints, 0);
        const missedCheckpoints = activePatrols.reduce(
          (sum, p) => sum + p.checkpoints.filter(cp => cp.status === 'MISSED').length,
          0
        );
        const lateCheckpoints = activePatrols.reduce(
          (sum, p) => sum + p.checkpoints.filter(cp => cp.status === 'LATE').length,
          0
        );

        const onTimePatrols = activePatrols.filter(p => p.isOnTime).length;
        const onTimePercentage =
          activePatrols.length > 0 ? (onTimePatrols / activePatrols.length) * 100 : 0;

        const activeAlerts = alertList.filter(a => !a.acknowledged);
        const criticalAlerts = activeAlerts.filter(a => a.severity === 'CRITICAL').length;

        const hourAgo = Date.now() - 60 * 60 * 1000;
        const recentScans = activePatrols.filter(
          p => p.lastScanTime && p.lastScanTime.getTime() > hourAgo
        ).length;
        const recentAlerts = alertList.filter(a => a.timestamp.getTime() > hourAgo).length;

        return {
          activePatrols: activePatrols.length,
          completedPatrolsToday: completedToday,
          totalPatrolsToday: completedToday + activePatrols.length,
          guardsOnDuty,
          guardsOnPatrol,
          guardsOnBreak,
          totalCheckpointsScanned: completedCheckpoints,
          checkpointsScannedToday: completedCheckpoints,
          missedCheckpoints,
          lateCheckpoints,
          averageCompletionRate:
            totalCheckpoints > 0 ? (completedCheckpoints / totalCheckpoints) * 100 : 0,
          onTimePercentage: Math.round(onTimePercentage * 10) / 10,
          averagePatrolDuration: 25,
          activeAlerts: activeAlerts.length,
          criticalAlerts,
          unacknowledgedAlerts: activeAlerts.length,
          recentScans,
          recentAlerts
        };
      })
    );
  }

  private emptyStats(): PatrolMonitoringStatistics {
    return {
      activePatrols: 0,
      completedPatrolsToday: 0,
      totalPatrolsToday: 0,
      guardsOnDuty: 0,
      guardsOnPatrol: 0,
      guardsOnBreak: 0,
      totalCheckpointsScanned: 0,
      checkpointsScannedToday: 0,
      missedCheckpoints: 0,
      lateCheckpoints: 0,
      averageCompletionRate: 0,
      onTimePercentage: 0,
      averagePatrolDuration: 0,
      activeAlerts: 0,
      criticalAlerts: 0,
      unacknowledgedAlerts: 0,
      recentScans: 0,
      recentAlerts: 0
    };
  }

  getActiveAlerts(): Observable<PatrolAlert[]> {
    const sid = this.societyId();
    if (!sid) {
      return of([]);
    }
    return this.http
      .get<Record<string, unknown>[]>(`/patrol-monitoring-alerts/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows =>
          (rows ?? [])
            .map(r => mapPatrolAlertFromApi(r))
            .filter(a => !a.acknowledged)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        ),
        catchError(() => of([]))
      );
  }

  acknowledgeAlert(alertId: string, acknowledgedBy: string): Observable<boolean> {
    const sid = this.societyId();
    if (!sid) {
      return of(false);
    }
    return this.http.get<Record<string, unknown>>(`/patrol-monitoring-alerts/${encodeURIComponent(alertId)}`).pipe(
      switchMap(raw => {
        const alert = mapPatrolAlertFromApi(raw);
        const plain = this.toPlain(alert as unknown as object);
        plain['acknowledged'] = true;
        plain['acknowledgedBy'] = acknowledgedBy;
        plain['acknowledgedAt'] = new Date().toISOString();
        const body: Record<string, unknown> = { societyId: sid, ...plain };
        body['id'] = alertId;
        return this.http.put<Record<string, unknown>>(
          `/patrol-monitoring-alerts/${encodeURIComponent(alertId)}`,
          body
        );
      }),
      map(() => true),
      catchError(() => of(false))
    );
  }

  /** Synthetic tick for UI demos; does not persist. */
  getRealTimeUpdates(): Observable<RealTimeUpdate> {
    return interval(5000).pipe(
      map(() => {
        const updateTypes: RealTimeUpdate['type'][] = [
          'CHECKPOINT_SCANNED',
          'LOCATION_UPDATE',
          'GUARD_STATUS_CHANGED'
        ];
        const randomType = updateTypes[Math.floor(Math.random() * updateTypes.length)];
        return {
          type: randomType,
          timestamp: new Date(),
          data: {}
        };
      })
    );
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }
}
