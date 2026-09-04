import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import { mapIncidentFromApi } from './incident-report-http.mapper';
import {
  IncidentReport,
  IncidentSeverity,
  IncidentStatus,
  Priority,
  CreateIncidentReportRequest,
  UpdateIncidentReportRequest,
  IncidentReportFilter,
  IncidentReportStatistics,
  IncidentReportResponse
} from '../models/incident-report.model';

/**
 * Incident reports persisted via GET/POST/PUT/DELETE /patrol-incidents (society-scoped JSON blob).
 */
@Injectable({
  providedIn: 'root'
})
export class IncidentReportService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  private societyId(): string {
    return this.session.getSocietyId() ?? '';
  }

  /** Serialize incident for API bodies (dates → ISO strings). */
  private incidentToPlain(inc: IncidentReport): Record<string, unknown> {
    return JSON.parse(
      JSON.stringify(inc, (_k, v) => (v instanceof Date ? v.toISOString() : v))
    ) as Record<string, unknown>;
  }

  createIncident(request: CreateIncidentReportRequest): Observable<IncidentReportResponse> {
    const sid = this.societyId();
    if (!sid) {
      return of({ success: false, message: 'No society in session', errors: ['societyId'] });
    }
    const now = new Date();
    const incidentNumber = 'INC-' + Date.now().toString(36).toUpperCase();
    const incident: IncidentReport = {
      id: '',
      incidentNumber,
      title: request.title,
      description: request.description,
      type: request.type,
      severity: request.severity,
      priority: request.priority,
      status: IncidentStatus.REPORTED,
      location: request.location,
      locationDetails: request.locationDetails,
      latitude: request.latitude,
      longitude: request.longitude,
      patrolId: request.patrolId,
      routeId: request.routeId,
      routeName: request.routeName,
      checkpointId: request.checkpointId,
      checkpointName: request.checkpointName,
      reportedByGuardId: request.reportedByGuardId,
      reportedByGuardName: request.reportedByGuardName,
      incidentDateTime: request.incidentDateTime,
      reportedDateTime: now,
      policeNotified: false,
      fireDepartmentNotified: false,
      medicalServicesNotified: false,
      evidenceCollected: (request.attachments?.length ?? 0) > 0,
      attachments: request.attachments ?? [],
      requiresFollowUp: false,
      witnesses: request.witnesses ?? [],
      tags: request.tags ?? [],
      createdAt: now,
      updatedAt: now
    };
    const plain = this.incidentToPlain(incident);
    delete plain['id'];
    const body: Record<string, unknown> = { societyId: sid, ...plain };
    return this.http.post<Record<string, unknown>>('/patrol-incidents', body).pipe(
      map(r => ({
        success: true,
        message: 'Incident report created successfully',
        incident: mapIncidentFromApi(r)
      })),
      catchError(err => {
        const msg = err?.error?.message ?? 'Failed to create incident';
        return of({ success: false, message: msg, errors: [msg] });
      })
    );
  }

  /** Load incidents for active society (Society Setup selection passed as query param). */
  private fetchIncidentRows(): Observable<Record<string, unknown>[]> {
    const sid = this.societyId();
    return this.http
      .get<Record<string, unknown>[]>(
        '/patrol-incidents/current-society',
        sid ? { params: { societyId: sid } } : undefined
      )
      .pipe(
        catchError(() => {
          if (!sid) {
            return of([] as Record<string, unknown>[]);
          }
          return this.http.get<Record<string, unknown>[]>(
            `/patrol-incidents/society/${encodeURIComponent(sid)}`
          );
        }),
        map(rows => (Array.isArray(rows) ? rows : [])),
        catchError(() => of([] as Record<string, unknown>[]))
      );
  }

  private applyIncidentFilter(
    list: IncidentReport[],
    filter?: IncidentReportFilter
  ): IncidentReport[] {
    if (!filter) {
      return list;
    }
    let filtered = list;
    if (filter.type) {
      filtered = filtered.filter(i => i.type === filter.type);
    }
    if (filter.severity) {
      filtered = filtered.filter(i => i.severity === filter.severity);
    }
    if (filter.status) {
      filtered = filtered.filter(i => i.status === filter.status);
    }
    if (filter.priority) {
      filtered = filtered.filter(i => i.priority === filter.priority);
    }
    if (filter.reportedByGuardId) {
      filtered = filtered.filter(i => i.reportedByGuardId === filter.reportedByGuardId);
    }
    if (filter.assignedTo) {
      filtered = filtered.filter(i => i.assignedTo === filter.assignedTo);
    }
    if (filter.routeId) {
      filtered = filtered.filter(i => i.routeId === filter.routeId);
    }
    if (filter.startDate) {
      filtered = filtered.filter(i => i.incidentDateTime >= filter.startDate!);
    }
    if (filter.endDate) {
      filtered = filtered.filter(i => i.incidentDateTime <= filter.endDate!);
    }
    if (filter.searchTerm) {
      const search = filter.searchTerm.toLowerCase();
      filtered = filtered.filter(
        i =>
          i.title.toLowerCase().includes(search) ||
          i.description.toLowerCase().includes(search) ||
          i.location.toLowerCase().includes(search) ||
          i.incidentNumber.toLowerCase().includes(search)
      );
    }
    if (filter.showOnlyOpen) {
      filtered = filtered.filter(
        i =>
          i.status === IncidentStatus.REPORTED || i.status === IncidentStatus.UNDER_INVESTIGATION
      );
    }
    if (filter.showOnlyCritical) {
      filtered = filtered.filter(i => i.severity === IncidentSeverity.CRITICAL);
    }
    if (filter.requiresFollowUp !== undefined) {
      filtered = filtered.filter(i => i.requiresFollowUp === filter.requiresFollowUp);
    }
    return filtered;
  }

  getAllIncidents(filter?: IncidentReportFilter): Observable<IncidentReport[]> {
    return this.fetchIncidentRows().pipe(
      map(rows => {
        let list = this.applyIncidentFilter(rows.map(r => mapIncidentFromApi(r)), filter);
        return list.sort((a, b) => {
          const priorityOrder: { [key: string]: number } = {
            URGENT: 4,
            HIGH: 3,
            NORMAL: 2,
            LOW: 1
          };
          const aPriority = priorityOrder[a.priority] || 0;
          const bPriority = priorityOrder[b.priority] || 0;
          if (aPriority !== bPriority) {
            return bPriority - aPriority;
          }
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
      })
    );
  }

  getIncidentById(id: string): Observable<IncidentReport | null> {
    return this.http.get<Record<string, unknown>>(`/patrol-incidents/${encodeURIComponent(id)}`).pipe(
      map(r => mapIncidentFromApi(r)),
      catchError(() => of(null))
    );
  }

  updateIncident(id: string, request: UpdateIncidentReportRequest): Observable<IncidentReportResponse> {
    return this.getIncidentById(id).pipe(
      switchMap(incident => {
        if (!incident) {
          return of({
            success: false,
            message: 'Incident not found',
            errors: ['Incident not found']
          });
        }
        const sid = this.societyId();
        if (!sid) {
          return of({
            success: false,
            message: 'No society in session',
            errors: ['societyId']
          });
        }
        const merged = this.mergeUpdate(incident, request);
        const body: Record<string, unknown> = {
          societyId: sid,
          ...this.incidentToPlain(merged)
        };
        body['id'] = id;
        return this.http.put<Record<string, unknown>>(`/patrol-incidents/${encodeURIComponent(id)}`, body).pipe(
          map(r => ({
            success: true,
            message: 'Incident updated successfully',
            incident: mapIncidentFromApi(r)
          })),
          catchError(err => {
            const msg = err?.error?.message ?? 'Update failed';
            return of({ success: false, message: msg, errors: [msg] });
          })
        );
      })
    );
  }

  /** Apply partial update and status-transition side effects (same rules as former in-memory impl). */
  private mergeUpdate(incident: IncidentReport, request: UpdateIncidentReportRequest): IncidentReport {
    const out = { ...incident } as IncidentReport;
    const now = new Date();

    if (request.title !== undefined) out.title = request.title;
    if (request.description !== undefined) out.description = request.description;
    if (request.type !== undefined) out.type = request.type;
    if (request.severity !== undefined) out.severity = request.severity;
    if (request.priority !== undefined) out.priority = request.priority;
    if (request.location !== undefined) out.location = request.location;
    if (request.locationDetails !== undefined) out.locationDetails = request.locationDetails;
    if (request.assignedTo !== undefined) {
      out.assignedTo = request.assignedTo;
      out.assignedToName = request.assignedTo;
    }
    if (request.tags !== undefined) out.tags = request.tags;

    if (request.status !== undefined) {
      out.status = request.status;
      if (request.status === IncidentStatus.UNDER_INVESTIGATION && !incident.investigationStartedAt) {
        out.investigationStartedAt = now;
      }
      if (request.status === IncidentStatus.RESOLVED) {
        out.resolvedAt = now;
        out.resolvedBy = 'Current User';
        out.resolvedByName = 'Current User';
        if (request.resolutionNotes) {
          out.resolutionNotes = request.resolutionNotes;
        }
      }
      if (request.status === IncidentStatus.ESCALATED) {
        out.escalatedAt = now;
        if (request.escalatedTo) {
          out.escalatedTo = request.escalatedTo;
        }
        if (request.escalationReason) {
          out.escalationReason = request.escalationReason;
        }
      }
    }

    if (request.investigationNotes !== undefined) {
      out.investigationNotes = request.investigationNotes;
    }
    if (request.resolutionNotes !== undefined) {
      out.resolutionNotes = request.resolutionNotes;
    }
    if (request.policeNotified !== undefined) out.policeNotified = request.policeNotified;
    if (request.policeReportNumber !== undefined) out.policeReportNumber = request.policeReportNumber;
    if (request.fireDepartmentNotified !== undefined) out.fireDepartmentNotified = request.fireDepartmentNotified;
    if (request.medicalServicesNotified !== undefined) {
      out.medicalServicesNotified = request.medicalServicesNotified;
    }
    if (request.evidenceCollected !== undefined) out.evidenceCollected = request.evidenceCollected;
    if (request.evidenceDescription !== undefined) out.evidenceDescription = request.evidenceDescription;
    if (request.requiresFollowUp !== undefined) out.requiresFollowUp = request.requiresFollowUp;
    if (request.followUpDate !== undefined) out.followUpDate = request.followUpDate;
    if (request.followUpNotes !== undefined) out.followUpNotes = request.followUpNotes;

    out.updatedAt = now;
    return out;
  }

  deleteIncident(id: string): Observable<IncidentReportResponse> {
    return this.http.delete<void>(`/patrol-incidents/${encodeURIComponent(id)}`).pipe(
      map(() => ({ success: true, message: 'Incident deleted successfully' })),
      catchError(err => {
        const msg = err?.error?.message ?? 'Delete failed';
        return of({ success: false, message: msg, errors: [msg] });
      })
    );
  }

  getStatistics(filter?: IncidentReportFilter): Observable<IncidentReportStatistics> {
    return this.fetchIncidentRows().pipe(
      map(rows => {
        const filteredIncidents = this.applyIncidentFilter(
          rows.map(r => mapIncidentFromApi(r)),
          filter
        );
        return this.buildStatistics(filteredIncidents);
      }),
      catchError(() => of(this.emptyStatistics()))
    );
  }

  private emptyStatistics(): IncidentReportStatistics {
    return {
      totalIncidents: 0,
      openIncidents: 0,
      resolvedIncidents: 0,
      criticalIncidents: 0,
      byType: {},
      bySeverity: {},
      byStatus: {},
      incidentsToday: 0,
      incidentsThisWeek: 0,
      incidentsThisMonth: 0,
      topReporters: [],
      topLocations: []
    };
  }

  private buildStatistics(filteredIncidents: IncidentReport[]): IncidentReportStatistics {
    const byType: { [key: string]: number } = {};
    const bySeverity: { [key: string]: number } = {};
    const byStatus: { [key: string]: number } = {};

    filteredIncidents.forEach(incident => {
      byType[incident.type] = (byType[incident.type] || 0) + 1;
      bySeverity[incident.severity] = (bySeverity[incident.severity] || 0) + 1;
      byStatus[incident.status] = (byStatus[incident.status] || 0) + 1;
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const incidentsToday = filteredIncidents.filter(i => i.incidentDateTime >= today).length;
    const incidentsThisWeek = filteredIncidents.filter(i => i.incidentDateTime >= weekAgo).length;
    const incidentsThisMonth = filteredIncidents.filter(i => i.incidentDateTime >= monthAgo).length;

    const incidentsWithResponseTime = filteredIncidents.filter(i => i.responseTime !== undefined);
    const avgResponseTime =
      incidentsWithResponseTime.length > 0
        ? incidentsWithResponseTime.reduce((sum, i) => sum + (i.responseTime || 0), 0) /
          incidentsWithResponseTime.length
        : undefined;

    const reporterCounts: { [key: string]: { name: string; count: number } } = {};
    filteredIncidents.forEach(incident => {
      if (!reporterCounts[incident.reportedByGuardId]) {
        reporterCounts[incident.reportedByGuardId] = { name: incident.reportedByGuardName, count: 0 };
      }
      reporterCounts[incident.reportedByGuardId].count++;
    });
    const topReporters = Object.entries(reporterCounts)
      .map(([guardId, data]) => ({
        guardId,
        guardName: data.name,
        incidentCount: data.count
      }))
      .sort((a, b) => b.incidentCount - a.incidentCount)
      .slice(0, 5);

    const locationCounts: { [key: string]: number } = {};
    filteredIncidents.forEach(incident => {
      locationCounts[incident.location] = (locationCounts[incident.location] || 0) + 1;
    });
    const topLocations = Object.entries(locationCounts)
      .map(([location, count]) => ({
        location,
        incidentCount: count
      }))
      .sort((a, b) => b.incidentCount - a.incidentCount)
      .slice(0, 5);

    return {
      totalIncidents: filteredIncidents.length,
      openIncidents: filteredIncidents.filter(
        i => i.status === IncidentStatus.REPORTED || i.status === IncidentStatus.UNDER_INVESTIGATION
      ).length,
      resolvedIncidents: filteredIncidents.filter(i => i.status === IncidentStatus.RESOLVED).length,
      criticalIncidents: filteredIncidents.filter(i => i.severity === IncidentSeverity.CRITICAL).length,
      byType,
      bySeverity,
      byStatus,
      averageResponseTime: avgResponseTime ? Math.round(avgResponseTime * 10) / 10 : undefined,
      incidentsToday,
      incidentsThisWeek,
      incidentsThisMonth,
      topReporters,
      topLocations
    };
  }
}
