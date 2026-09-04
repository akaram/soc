import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import { mapPatrolCompletionReportFromApi } from './patrol-completion-report-http.mapper';
import { CheckpointScanService } from './checkpoint-scan.service';
import { PatrollingRouteService } from './patrolling-route.service';
import { ActivePatrol, ScanStatus, CheckpointScan } from '../models/checkpoint-scan.model';
import { PatrollingRoute } from '../models/patrolling-route.model';
import {
  PatrolCompletionReport,
  ReportType,
  ReportStatus,
  CompletionStatus,
  PatrolCompletion,
  GenerateReportRequest,
  PatrolCompletionReportFilter,
  PatrolCompletionReportStatistics
} from '../models/patrol-completion-report.model';

/**
 * Patrol completion reports persisted via /patrol-completion-reports (society-scoped JSON).
 * Report generation aggregates live checkpoint scans and active patrol records.
 */
@Injectable({
  providedIn: 'root'
})
export class PatrolCompletionReportService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService,
    private checkpointScanService: CheckpointScanService,
    private routeService: PatrollingRouteService
  ) {}

  private societyId(): string {
    return this.session.getSocietyId() ?? '';
  }

  private toPlain(obj: object): Record<string, unknown> {
    return JSON.parse(JSON.stringify(obj, (_k, v) => (v instanceof Date ? v.toISOString() : v)));
  }

  /** Start of calendar day for inclusive date-range filtering. */
  private startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  /** End of calendar day for inclusive date-range filtering. */
  private endOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }

  /**
   * Build a report from live patrol records and checkpoint scans, then persist via API.
   */
  generateReport(request: GenerateReportRequest): Observable<PatrolCompletionReport> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }

    const rangeStart = this.startOfDay(request.startDate);
    const rangeEnd = this.endOfDay(request.endDate);

    return forkJoin({
      patrols: this.checkpointScanService.getAllPatrolRecords(),
      scans: this.checkpointScanService.getAllScans({ startDate: rangeStart, endDate: rangeEnd }),
      routes: this.routeService.getAllRoutes()
    }).pipe(
      switchMap(({ patrols, scans, routes }) => {
        const patrolCompletions = this.buildCompletionsFromLiveData(
          request,
          patrols,
          scans,
          routes,
          rangeStart,
          rangeEnd
        );
        const generatedBy = this.session.getCurrentUserId() || 'Current User';
        const report = this.buildReportFromCompletions(request, patrolCompletions, generatedBy);
        report.reportSource = 'MANUAL';
        const plain = this.toPlain(report);
        delete plain['id'];
        const body = { societyId: sid, ...plain };
        return this.http.post<Record<string, unknown>>('/patrol-completion-reports', body).pipe(
          map(r => mapPatrolCompletionReportFromApi(r))
        );
      }),
      catchError(err => {
        console.error('Failed to generate patrol completion report', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Aggregate patrol completions from active patrol records and orphan checkpoint scans.
   */
  private buildCompletionsFromLiveData(
    request: GenerateReportRequest,
    patrols: ActivePatrol[],
    scans: CheckpointScan[],
    routes: PatrollingRoute[],
    rangeStart: Date,
    rangeEnd: Date
  ): PatrolCompletion[] {
    let filteredPatrols = patrols.filter(
      p => p.startTime >= rangeStart && p.startTime <= rangeEnd
    );

    if (request.routeIds?.length) {
      const routeSet = new Set(request.routeIds);
      filteredPatrols = filteredPatrols.filter(p => routeSet.has(p.routeId));
    }
    if (request.guardIds?.length) {
      const guardSet = new Set(request.guardIds);
      filteredPatrols = filteredPatrols.filter(p => guardSet.has(p.guardId));
    }

    const completions = filteredPatrols.map(p => this.mapActivePatrolToCompletion(p));
    const orphanCompletions = this.buildCompletionsFromOrphanScans(
      scans,
      routes,
      completions,
      request
    );
    return [...completions, ...orphanCompletions].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );
  }

  /** Map a stored active patrol record to a report row. */
  private mapActivePatrolToCompletion(patrol: ActivePatrol): PatrolCompletion {
    const missedCheckpoints = patrol.checkpoints
      .filter(
        c =>
          c.status === 'MISSED' ||
          (patrol.status !== 'IN_PROGRESS' && c.status === 'PENDING')
      )
      .map(c => c.checkpointId);
    const lateCheckpoints = patrol.checkpoints
      .filter(c => c.status === 'LATE')
      .map(c => c.checkpointId);
    const onTimeCheckpoints = patrol.checkpoints.filter(
      c => c.status === 'COMPLETED' && !lateCheckpoints.includes(c.checkpointId)
    ).length;

    const scannedTimes = patrol.checkpoints
      .filter(c => c.scannedAt)
      .map(c => c.scannedAt!)
      .sort((a, b) => b.getTime() - a.getTime());
    const endTime = patrol.actualEndTime ?? scannedTimes[0];

    const startMs = patrol.startTime.getTime();
    const endMs = endTime ? endTime.getTime() : startMs;
    const duration = Math.max(0, Math.round((endMs - startMs) / 60000));

    const status = this.deriveCompletionStatus(patrol);
    const total = patrol.totalCheckpoints || patrol.checkpoints.length;
    const completed = patrol.completedCheckpoints;
    const completionPercentage = total > 0 ? (completed / total) * 100 : 0;

    const expectedEndTime = patrol.expectedEndTime;
    const expectedDuration = expectedEndTime
      ? Math.round((expectedEndTime.getTime() - startMs) / 60000)
      : undefined;

    const isOnTime =
      status !== CompletionStatus.DELAYED &&
      (!expectedEndTime || !endTime || endTime.getTime() <= expectedEndTime.getTime());

    return {
      patrolId: patrol.id,
      routeId: patrol.routeId,
      routeName: patrol.routeName,
      guardId: patrol.guardId,
      guardName: patrol.guardName,
      startTime: patrol.startTime,
      endTime,
      expectedEndTime,
      status,
      completedCheckpoints: completed,
      totalCheckpoints: total,
      missedCheckpoints,
      lateCheckpoints,
      onTimeCheckpoints,
      completionPercentage: Math.round(completionPercentage * 10) / 10,
      duration,
      expectedDuration,
      isOnTime,
      isComplete: status === CompletionStatus.COMPLETED
    };
  }

  /** Derive completion status from patrol progress and checkpoint states. */
  private deriveCompletionStatus(patrol: ActivePatrol): CompletionStatus {
    if (patrol.status === 'ABANDONED') {
      return CompletionStatus.ABANDONED;
    }
    const hasLate = patrol.checkpoints.some(c => c.status === 'LATE');
    const total = patrol.totalCheckpoints || patrol.checkpoints.length;
    const completed = patrol.completedCheckpoints;
    if (patrol.status === 'COMPLETED' && completed >= total) {
      return hasLate ? CompletionStatus.DELAYED : CompletionStatus.COMPLETED;
    }
    if (completed === 0) {
      return CompletionStatus.MISSED;
    }
    if (hasLate) {
      return CompletionStatus.DELAYED;
    }
    return CompletionStatus.PARTIAL;
  }

  /**
   * Build patrol rows from scans that are not linked to an active patrol record
   * (grouped by route + guard + calendar day).
   */
  private buildCompletionsFromOrphanScans(
    scans: CheckpointScan[],
    routes: PatrollingRoute[],
    existingCompletions: PatrolCompletion[],
    request: GenerateReportRequest
  ): PatrolCompletion[] {
    const routeMap = new Map(routes.map(r => [r.id, r]));
    const groups = new Map<string, CheckpointScan[]>();

    for (const scan of scans) {
      if (scan.status !== ScanStatus.VALID && scan.status !== ScanStatus.LATE) {
        continue;
      }
      if (request.routeIds?.length && !request.routeIds.includes(scan.routeId)) {
        continue;
      }
      if (request.guardIds?.length && !request.guardIds.includes(scan.guardId)) {
        continue;
      }
      const day = scan.scanTimestamp.toDateString();
      const key = `${scan.routeId}|${scan.guardId}|${day}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(scan);
    }

    const completions: PatrolCompletion[] = [];
    let virtualIdx = 0;

    for (const [key, groupScans] of groups) {
      const [routeId, guardId, day] = key.split('|');
      const hasPatrol = existingCompletions.some(
        c =>
          c.routeId === routeId &&
          c.guardId === guardId &&
          new Date(c.startTime).toDateString() === day
      );
      if (hasPatrol) {
        continue;
      }

      groupScans.sort((a, b) => a.scanTimestamp.getTime() - b.scanTimestamp.getTime());
      const route = routeMap.get(routeId);
      const uniqueScanned = new Set(groupScans.map(s => s.checkpointId));
      const totalCheckpoints =
        route?.checkpoints.length ?? uniqueScanned.size;
      const completedCheckpoints = uniqueScanned.size;
      const startTime = groupScans[0].scanTimestamp;
      const endTime = groupScans[groupScans.length - 1].scanTimestamp;
      const lateCheckpoints = [
        ...new Set(groupScans.filter(s => s.isLate).map(s => s.checkpointId))
      ];
      const missedCheckpoints = route
        ? route.checkpoints.filter(c => !uniqueScanned.has(c.id)).map(c => c.id)
        : [];
      const onTimeCheckpoints = completedCheckpoints - lateCheckpoints.length;
      const duration = Math.max(
        0,
        Math.round((endTime.getTime() - startTime.getTime()) / 60000)
      );
      const completionPercentage =
        totalCheckpoints > 0 ? (completedCheckpoints / totalCheckpoints) * 100 : 0;

      let status: CompletionStatus;
      if (completedCheckpoints >= totalCheckpoints && totalCheckpoints > 0) {
        status = lateCheckpoints.length > 0 ? CompletionStatus.DELAYED : CompletionStatus.COMPLETED;
      } else if (completedCheckpoints === 0) {
        status = CompletionStatus.MISSED;
      } else if (lateCheckpoints.length > 0) {
        status = CompletionStatus.DELAYED;
      } else {
        status = CompletionStatus.PARTIAL;
      }

      const isOnTime = lateCheckpoints.length === 0 && status !== CompletionStatus.DELAYED;

      completions.push({
        patrolId: `SCAN-SESSION-${virtualIdx++}`,
        routeId,
        routeName: groupScans[0].routeName,
        guardId,
        guardName: groupScans[0].guardName,
        startTime,
        endTime,
        status,
        completedCheckpoints,
        totalCheckpoints,
        missedCheckpoints,
        lateCheckpoints,
        onTimeCheckpoints: Math.max(0, onTimeCheckpoints),
        completionPercentage: Math.round(completionPercentage * 10) / 10,
        duration,
        isOnTime,
        isComplete: status === CompletionStatus.COMPLETED
      });
    }

    return completions;
  }

  private buildReportFromCompletions(
    request: GenerateReportRequest,
    patrolCompletions: PatrolCompletion[],
    generatedBy: string
  ): PatrolCompletionReport {
    const totalPatrols = patrolCompletions.length;
    const completedPatrols = patrolCompletions.filter(p => p.status === CompletionStatus.COMPLETED).length;
    const partialPatrols = patrolCompletions.filter(p => p.status === CompletionStatus.PARTIAL).length;
    const missedPatrols = patrolCompletions.filter(p => p.status === CompletionStatus.MISSED).length;
    const abandonedPatrols = patrolCompletions.filter(p => p.status === CompletionStatus.ABANDONED).length;
    const delayedPatrols = patrolCompletions.filter(p => p.status === CompletionStatus.DELAYED).length;

    const completionRate = totalPatrols > 0 ? (completedPatrols / totalPatrols) * 100 : 0;
    const onTimePatrols = patrolCompletions.filter(p => p.isOnTime).length;
    const onTimeRate = totalPatrols > 0 ? (onTimePatrols / totalPatrols) * 100 : 0;

    const avgTime =
      patrolCompletions.length > 0
        ? patrolCompletions.reduce((sum, p) => sum + p.duration, 0) / patrolCompletions.length
        : 0;

    const totalCheckpointsScanned = patrolCompletions.reduce((sum, p) => sum + p.completedCheckpoints, 0);
    const totalCheckpointsMissed = patrolCompletions.reduce((sum, p) => sum + p.missedCheckpoints.length, 0);
    const totalCheckpointsLate = patrolCompletions.reduce((sum, p) => sum + p.lateCheckpoints.length, 0);

    const routeStats: { [key: string]: Record<string, unknown> } = {};
    patrolCompletions.forEach(completion => {
      if (!routeStats[completion.routeId]) {
        routeStats[completion.routeId] = {
          routeId: completion.routeId,
          routeName: completion.routeName,
          totalPatrols: 0,
          completedPatrols: 0,
          totalTime: 0
        };
      }
      routeStats[completion.routeId]['totalPatrols'] =
        (routeStats[completion.routeId]['totalPatrols'] as number) + 1;
      if (completion.status === CompletionStatus.COMPLETED) {
        routeStats[completion.routeId]['completedPatrols'] =
          (routeStats[completion.routeId]['completedPatrols'] as number) + 1;
      }
      routeStats[completion.routeId]['totalTime'] =
        (routeStats[completion.routeId]['totalTime'] as number) + completion.duration;
    });

    const routeStatistics = Object.values(routeStats).map(stat => ({
      routeId: stat['routeId'] as string,
      routeName: stat['routeName'] as string,
      totalPatrols: stat['totalPatrols'] as number,
      completedPatrols: stat['completedPatrols'] as number,
      completionRate:
        (stat['totalPatrols'] as number) > 0
          ? ((stat['completedPatrols'] as number) / (stat['totalPatrols'] as number)) * 100
          : 0,
      averageTime:
        (stat['totalPatrols'] as number) > 0 ? (stat['totalTime'] as number) / (stat['totalPatrols'] as number) : 0
    }));

    const guardStats: { [key: string]: Record<string, unknown> } = {};
    patrolCompletions.forEach(completion => {
      if (!guardStats[completion.guardId]) {
        guardStats[completion.guardId] = {
          guardId: completion.guardId,
          guardName: completion.guardName,
          totalPatrols: 0,
          completedPatrols: 0,
          onTimePatrols: 0,
          totalTime: 0
        };
      }
      guardStats[completion.guardId]['totalPatrols'] =
        (guardStats[completion.guardId]['totalPatrols'] as number) + 1;
      if (completion.status === CompletionStatus.COMPLETED) {
        guardStats[completion.guardId]['completedPatrols'] =
          (guardStats[completion.guardId]['completedPatrols'] as number) + 1;
      }
      if (completion.isOnTime) {
        guardStats[completion.guardId]['onTimePatrols'] =
          (guardStats[completion.guardId]['onTimePatrols'] as number) + 1;
      }
      guardStats[completion.guardId]['totalTime'] =
        (guardStats[completion.guardId]['totalTime'] as number) + completion.duration;
    });

    const guardStatistics = Object.values(guardStats).map(stat => ({
      guardId: stat['guardId'] as string,
      guardName: stat['guardName'] as string,
      totalPatrols: stat['totalPatrols'] as number,
      completedPatrols: stat['completedPatrols'] as number,
      completionRate:
        (stat['totalPatrols'] as number) > 0
          ? ((stat['completedPatrols'] as number) / (stat['totalPatrols'] as number)) * 100
          : 0,
      onTimeRate:
        (stat['totalPatrols'] as number) > 0
          ? ((stat['onTimePatrols'] as number) / (stat['totalPatrols'] as number)) * 100
          : 0,
      averageTime:
        (stat['totalPatrols'] as number) > 0 ? (stat['totalTime'] as number) / (stat['totalPatrols'] as number) : 0
    }));

    const dailyStats: { [key: string]: Record<string, unknown> } = {};
    patrolCompletions.forEach(completion => {
      const dateKey = new Date(completion.startTime).toDateString();
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = {
          date: new Date(completion.startTime),
          totalPatrols: 0,
          completedPatrols: 0
        };
      }
      dailyStats[dateKey]['totalPatrols'] = (dailyStats[dateKey]['totalPatrols'] as number) + 1;
      if (completion.status === CompletionStatus.COMPLETED) {
        dailyStats[dateKey]['completedPatrols'] =
          (dailyStats[dateKey]['completedPatrols'] as number) + 1;
      }
    });

    const dailyStatistics = Object.values(dailyStats).map(stat => ({
      date: stat['date'] as Date,
      totalPatrols: stat['totalPatrols'] as number,
      completedPatrols: stat['completedPatrols'] as number,
      completionRate:
        (stat['totalPatrols'] as number) > 0
          ? ((stat['completedPatrols'] as number) / (stat['totalPatrols'] as number)) * 100
          : 0
    }));

    const now = new Date();
    return {
      id: 'REPORT-' + Date.now().toString(36).toUpperCase(),
      reportName: request.reportName,
      reportType: request.reportType,
      status: ReportStatus.GENERATED,
      startDate: request.startDate,
      endDate: request.endDate,
      generatedAt: now,
      generatedBy,
      routeIds: request.routeIds,
      guardIds: request.guardIds,
      totalPatrols,
      completedPatrols,
      partialPatrols,
      missedPatrols,
      abandonedPatrols,
      delayedPatrols,
      completionRate: Math.round(completionRate * 10) / 10,
      onTimeRate: Math.round(onTimeRate * 10) / 10,
      averageCompletionTime: Math.round(avgTime * 10) / 10,
      totalCheckpointsScanned,
      totalCheckpointsMissed,
      totalCheckpointsLate,
      patrolCompletions,
      routeStatistics,
      guardStatistics,
      dailyStatistics,
      totalIssues: missedPatrols + abandonedPatrols,
      criticalIssues: missedPatrols,
      createdAt: now,
      updatedAt: now
    };
  }

  getAllReports(filter?: PatrolCompletionReportFilter): Observable<PatrolCompletionReport[]> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.http
      .get<Record<string, unknown>[]>(`/patrol-completion-reports/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows => {
          let list = (rows ?? []).map(r => mapPatrolCompletionReportFromApi(r));
          if (filter) {
            if (filter.reportType) {
              list = list.filter(r => r.reportType === filter.reportType);
            }
            if (filter.status) {
              list = list.filter(r => r.status === filter.status);
            }
            if (filter.startDate) {
              list = list.filter(r => r.startDate >= filter.startDate!);
            }
            if (filter.endDate) {
              list = list.filter(r => r.endDate <= filter.endDate!);
            }
            if (filter.generatedBy) {
              list = list.filter(r => r.generatedBy === filter.generatedBy);
            }
            if (filter.searchTerm) {
              const search = filter.searchTerm.toLowerCase();
              list = list.filter(
                r =>
                  r.reportName.toLowerCase().includes(search) ||
                  r.reportType.toLowerCase().includes(search)
              );
            }
          }
          return list.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
        }),
        catchError(err => {
          console.error('Failed to load patrol completion reports', err);
          return throwError(() => err);
        })
      );
  }

  getReportById(id: string): Observable<PatrolCompletionReport | null> {
    return this.http.get<Record<string, unknown>>(`/patrol-completion-reports/${encodeURIComponent(id)}`).pipe(
      map(r => mapPatrolCompletionReportFromApi(r)),
      catchError(err => {
        console.error('Failed to load patrol completion report', err);
        return throwError(() => err);
      })
    );
  }

  deleteReport(id: string): Observable<boolean> {
    return this.http.delete<void>(`/patrol-completion-reports/${encodeURIComponent(id)}`).pipe(
      map(() => true),
      catchError(err => {
        console.error('Failed to delete patrol completion report', err);
        return throwError(() => err);
      })
    );
  }

  updateReportStatus(id: string, status: ReportStatus): Observable<boolean> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society selected'));
    }
    return this.getReportById(id).pipe(
      switchMap(report => {
        if (!report) {
          return throwError(() => new Error('Report not found'));
        }
        const plain = this.toPlain(report);
        plain['status'] = status;
        plain['updatedAt'] = new Date().toISOString();
        const body: Record<string, unknown> = { societyId: sid, ...plain };
        body['id'] = id;
        return this.http.put<Record<string, unknown>>(`/patrol-completion-reports/${encodeURIComponent(id)}`, body);
      }),
      map(() => true),
      catchError(err => {
        console.error('Failed to update report status', err);
        return throwError(() => err);
      })
    );
  }

  getStatistics(): Observable<PatrolCompletionReportStatistics> {
    return this.getAllReports().pipe(
      map(reports => {
        const byType: { [key: string]: number } = {};
        reports.forEach(r => {
          byType[r.reportType] = (byType[r.reportType] || 0) + 1;
        });
        return {
          totalReports: reports.length,
          generatedReports: reports.filter(r => r.status === ReportStatus.GENERATED).length,
          approvedReports: reports.filter(r => r.status === ReportStatus.APPROVED).length,
          draftReports: reports.filter(r => r.status === ReportStatus.DRAFT).length,
          archivedReports: reports.filter(r => r.status === ReportStatus.ARCHIVED).length,
          byType,
          recentReports: reports.slice(0, 5)
        };
      })
    );
  }

  /**
   * CSV/Excel: UTF-8 CSV in-browser. PDF: binary from {@code GET /patrol-completion-reports/{id}/export/pdf} when API is up; else printable HTML.
   */
  exportReport(id: string, format: 'PDF' | 'EXCEL' | 'CSV'): Observable<Blob> {
    if (format === 'CSV' || format === 'EXCEL') {
      return this.getReportById(id).pipe(
        switchMap(r => {
          if (!r) {
            return throwError(() => new Error('Report not found'));
          }
          const csv = this.reportToCsv(r);
          return of(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
        })
      );
    }
    return this.http
      .get(`/patrol-completion-reports/${encodeURIComponent(id)}/export/pdf`, { responseType: 'blob' })
      .pipe(
        catchError(() =>
          this.getReportById(id).pipe(
            switchMap(r => {
              if (!r) {
                return throwError(() => new Error('Report not found'));
              }
              return of(new Blob([this.reportToPrintableHtml(r)], { type: 'text/html;charset=utf-8' }));
            })
          )
        )
      );
  }

  /** One row per patrol completion; summary row at top. */
  private reportToCsv(r: PatrolCompletionReport): string {
    const esc = (v: string | number | boolean | undefined | null) => {
      const s = v === undefined || v === null ? '' : String(v);
      if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const lines: string[] = [];
    lines.push(['Field', 'Value'].join(','));
    lines.push(['Report Name', esc(r.reportName)].join(','));
    lines.push(['Type', esc(r.reportType)].join(','));
    lines.push(['Period', esc(`${r.startDate.toISOString()} – ${r.endDate.toISOString()}`)].join(','));
    lines.push(['Generated', esc(r.generatedAt.toISOString())].join(','));
    lines.push(['Generated By', esc(r.generatedBy)].join(','));
    lines.push(['Total Patrols', esc(r.totalPatrols)].join(','));
    lines.push(['Completed', esc(r.completedPatrols)].join(','));
    lines.push(['Completion %', esc(r.completionRate)].join(','));
    lines.push(['On-time %', esc(r.onTimeRate)].join(','));
    lines.push('');
    lines.push(
      [
        'PatrolId',
        'Route',
        'Guard',
        'Start',
        'End',
        'Status',
        'DurationMin',
        'CheckpointsDone',
        'OnTime'
      ].join(',')
    );
    for (const p of r.patrolCompletions ?? []) {
      lines.push(
        [
          esc(p.patrolId),
          esc(p.routeName),
          esc(p.guardName),
          esc(p.startTime.toISOString()),
          esc(p.endTime?.toISOString() ?? ''),
          esc(p.status),
          esc(p.duration),
          esc(p.completedCheckpoints),
          esc(p.isOnTime)
        ].join(',')
      );
    }
    return lines.join('\r\n');
  }

  private reportToPrintableHtml(r: PatrolCompletionReport): string {
    const rows = (r.patrolCompletions ?? [])
      .map(
        p => `<tr>
          <td>${this.escapeHtml(p.patrolId)}</td>
          <td>${this.escapeHtml(p.routeName)}</td>
          <td>${this.escapeHtml(p.guardName)}</td>
          <td>${this.escapeHtml(p.startTime.toLocaleString())}</td>
          <td>${this.escapeHtml(p.status)}</td>
          <td>${p.duration}</td>
        </tr>`
      )
      .join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${this.escapeHtml(r.reportName)}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 24px; color: #1e293b; }
        h1 { font-size: 1.25rem; }
        table { border-collapse: collapse; width: 100%; margin-top: 16px; font-size: 13px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
        th { background: #f1f5f9; }
        .meta { margin: 12px 0; line-height: 1.6; }
      </style></head><body>
      <h1>${this.escapeHtml(r.reportName)}</h1>
      <div class="meta">
        <div><strong>Type:</strong> ${this.escapeHtml(r.reportType)}</div>
        <div><strong>Period:</strong> ${this.escapeHtml(r.startDate.toLocaleDateString())} – ${this.escapeHtml(r.endDate.toLocaleDateString())}</div>
        <div><strong>Generated:</strong> ${this.escapeHtml(r.generatedAt.toLocaleString())} by ${this.escapeHtml(r.generatedBy)}</div>
        <div><strong>Summary:</strong> ${r.totalPatrols} patrols, ${r.completedPatrols} completed, ${r.completionRate}% completion, ${r.onTimeRate}% on-time</div>
      </div>
      <table><thead><tr>
        <th>Patrol ID</th><th>Route</th><th>Guard</th><th>Start</th><th>Status</th><th>Duration (min)</th>
      </tr></thead><tbody>${rows}</tbody></table>
      <p style="margin-top:24px;font-size:12px;color:#64748b;">Print this page (Ctrl+P) and choose &quot;Save as PDF&quot; for a PDF file.</p>
      </body></html>`;
  }

  private escapeHtml(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
