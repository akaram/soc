import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import { mapPatrolRouteFromApi } from './patrol-route-http.mapper';
import {
  PatrollingRoute,
  RouteStatus,
  CreatePatrollingRouteRequest,
  UpdatePatrollingRouteRequest,
  PatrollingRouteResponse,
  PatrollingRouteFilter,
  PatrollingRouteStatistics
} from '../models/patrolling-route.model';

/**
 * Patrol routes persisted via GET/POST/PUT/DELETE /patrol-routes (society-scoped).
 */
@Injectable({
  providedIn: 'root'
})
export class PatrollingRouteService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  private societyId(): string {
    return this.session.getSocietyId() ?? '';
  }

  /** Assign stable ids to checkpoints before persisting a new route. */
  private withCheckpointIds(
    checkpoints: CreatePatrollingRouteRequest['checkpoints']
  ): Record<string, unknown>[] {
    const now = new Date().toISOString();
    return (checkpoints ?? []).map((cp, index) => ({
      ...cp,
      id: `cp-${crypto.randomUUID()}`,
      order: cp.order ?? index + 1,
      createdAt: now,
      updatedAt: now
    }));
  }

  createRoute(request: CreatePatrollingRouteRequest): Observable<PatrollingRouteResponse> {
    const sid = this.societyId();
    if (!sid) {
      return of({ success: false, message: 'No society in session', errors: ['societyId'] });
    }
    const body: Record<string, unknown> = {
      societyId: sid,
      name: request.name,
      description: request.description ?? null,
      code: request.code ?? null,
      checkpoints: this.withCheckpointIds(request.checkpoints),
      status: request.status,
      scheduleType: request.scheduleType,
      scheduleDays: request.scheduleDays ?? null,
      scheduleTime: request.scheduleTime ?? null,
      startTime: request.startTime ?? null,
      endTime: request.endTime ?? null,
      estimatedDuration: request.estimatedDuration ?? null,
      assignedGuards: request.assignedGuards ?? null,
      assignedShifts: request.assignedShifts ?? null,
      requiresAllCheckpoints: request.requiresAllCheckpoints,
      allowSkipping: request.allowSkipping,
      maxLateMinutes: request.maxLateMinutes ?? null,
      notes: request.notes ?? null,
      tags: request.tags ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: this.session.getCurrentUserId(),
      totalPatrols: 0,
      completedPatrols: 0
    };
    return this.http.post<Record<string, unknown>>('/patrol-routes', body).pipe(
      map(r => ({
        success: true,
        message: 'Patrol route created',
        route: mapPatrolRouteFromApi(r)
      })),
      catchError(err => {
        const msg = err?.error?.message ?? 'Failed to create route';
        return of({ success: false, message: msg, errors: [msg] });
      })
    );
  }

  updateRoute(id: string, request: UpdatePatrollingRouteRequest): Observable<PatrollingRouteResponse> {
    return this.getRouteById(id).pipe(
      switchMap(current => {
        if (!current) {
          return of({
            success: false,
            message: 'Patrolling route not found',
            errors: ['Patrolling route not found']
          });
        }
        const sid = this.societyId();
        const merged = { ...current, ...request } as PatrollingRoute;
        merged.id = current.id;
        if (request.checkpoints) {
          merged.checkpoints = request.checkpoints.map((cp, i) => {
            const existing =
              current.checkpoints.find(
                e =>
                  (cp.checkpointCode && e.checkpointCode === cp.checkpointCode) ||
                  (cp.qrCode && e.qrCode === cp.qrCode) ||
                  (e.name === cp.name && (e.order ?? i + 1) === (cp.order ?? i + 1))
              ) ?? current.checkpoints[i];
            return {
              id: existing?.id ?? `cp-${crypto.randomUUID()}`,
            name: cp.name,
            description: cp.description,
            type: cp.type,
            location: cp.location,
            buildingName: cp.buildingName,
            floorNumber: cp.floorNumber,
            area: cp.area,
            latitude: cp.latitude,
            longitude: cp.longitude,
            qrCode: cp.qrCode,
            nfcTagId: cp.nfcTagId,
            checkpointCode: cp.checkpointCode,
            expectedDuration: cp.expectedDuration,
            scanWindow: cp.scanWindow,
            order: cp.order,
            isRequired: cp.isRequired,
            requiresPhoto: cp.requiresPhoto,
            requiresNotes: cp.requiresNotes,
            notes: cp.notes,
            createdAt: existing?.createdAt ?? new Date(),
            updatedAt: new Date()
            };
          });
        }
        const body: Record<string, unknown> = {
          societyId: sid,
          ...this.routeToJson(merged)
        };
        body['id'] = id;
        body['updatedAt'] = new Date().toISOString();
        body['updatedBy'] = this.session.getCurrentUserId();
        return this.http.put<Record<string, unknown>>(`/patrol-routes/${encodeURIComponent(id)}`, body).pipe(
          map(r => ({
            success: true,
            message: 'Patrol route updated',
            route: mapPatrolRouteFromApi(r)
          })),
          catchError(err => {
            const msg = err?.error?.message ?? 'Update failed';
            return of({ success: false, message: msg, errors: [msg] });
          })
        );
      })
    );
  }

  /** Serialize route to plain JSON-friendly object for PUT body. */
  private routeToJson(r: PatrollingRoute): Record<string, unknown> {
    return {
      id: r.id,
      name: r.name,
      description: r.description ?? null,
      code: r.code ?? null,
      checkpoints: r.checkpoints,
      status: r.status,
      scheduleType: r.scheduleType,
      scheduleDays: r.scheduleDays ?? null,
      scheduleTime: r.scheduleTime ?? null,
      startTime: r.startTime ?? null,
      endTime: r.endTime ?? null,
      estimatedDuration: r.estimatedDuration ?? null,
      assignedGuards: r.assignedGuards ?? null,
      assignedShifts: r.assignedShifts ?? null,
      requiresAllCheckpoints: r.requiresAllCheckpoints,
      allowSkipping: r.allowSkipping,
      maxLateMinutes: r.maxLateMinutes ?? null,
      notes: r.notes ?? null,
      tags: r.tags ?? null,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
      createdBy: r.createdBy,
      updatedBy: r.updatedBy ?? null,
      totalPatrols: r.totalPatrols ?? 0,
      completedPatrols: r.completedPatrols ?? 0
    };
  }

  getAllRoutes(filter?: PatrollingRouteFilter): Observable<PatrollingRoute[]> {
    const sid = this.societyId();
    if (!sid) {
      return of([]);
    }
    return this.http.get<Record<string, unknown>[]>(`/patrol-routes/society/${encodeURIComponent(sid)}`).pipe(
      map(rows => {
        let list = (rows ?? []).map(r => mapPatrolRouteFromApi(r));
        if (filter) {
          if (filter.status) {
            list = list.filter(r => r.status === filter.status);
          }
          if (filter.scheduleType) {
            list = list.filter(r => r.scheduleType === filter.scheduleType);
          }
          if (filter.assignedGuard) {
            list = list.filter(r => r.assignedGuards?.includes(filter.assignedGuard!));
          }
          if (filter.searchTerm) {
            const search = filter.searchTerm.toLowerCase();
            list = list.filter(
              r =>
                r.name.toLowerCase().includes(search) ||
                (r.code?.toLowerCase().includes(search) ?? false) ||
                (r.description?.toLowerCase().includes(search) ?? false)
            );
          }
        }
        return list.sort((a, b) => a.name.localeCompare(b.name));
      }),
      catchError(err => {
        console.error('Failed to load patrol routes', err);
        return throwError(() => err);
      })
    );
  }

  getRouteById(id: string): Observable<PatrollingRoute | null> {
    return this.http.get<Record<string, unknown>>(`/patrol-routes/${encodeURIComponent(id)}`).pipe(
      map(r => mapPatrolRouteFromApi(r)),
      catchError(() => of(null))
    );
  }

  deleteRoute(id: string): Observable<PatrollingRouteResponse> {
    return this.http.delete<void>(`/patrol-routes/${encodeURIComponent(id)}`).pipe(
      map(() => ({ success: true, message: 'Patrol route deleted' })),
      catchError(err => {
        const msg = err?.error?.message ?? 'Delete failed';
        return of({ success: false, message: msg, errors: [msg] });
      })
    );
  }

  getStatistics(): Observable<PatrollingRouteStatistics> {
    return this.getAllRoutes().pipe(
      map(routes => {
        const byScheduleType: { [key: string]: number } = {};
        routes.forEach(r => {
          byScheduleType[r.scheduleType] = (byScheduleType[r.scheduleType] || 0) + 1;
        });
        const byStatus: { [key: string]: number } = {};
        routes.forEach(r => {
          byStatus[r.status] = (byStatus[r.status] || 0) + 1;
        });
        const totalCheckpoints = routes.reduce((sum, r) => sum + r.checkpoints.length, 0);
        const avgCheckpoints = routes.length > 0 ? totalCheckpoints / routes.length : 0;
        const totalPatrols = routes.reduce((sum, r) => sum + (r.totalPatrols || 0), 0);
        const completedPatrols = routes.reduce((sum, r) => sum + (r.completedPatrols || 0), 0);
        const avgCompletionRate = totalPatrols > 0 ? (completedPatrols / totalPatrols) * 100 : 0;
        return {
          totalRoutes: routes.length,
          activeRoutes: routes.filter(r => r.status === RouteStatus.ACTIVE).length,
          inactiveRoutes: routes.filter(r => r.status === RouteStatus.INACTIVE).length,
          draftRoutes: routes.filter(r => r.status === RouteStatus.DRAFT).length,
          archivedRoutes: routes.filter(r => r.status === RouteStatus.ARCHIVED).length,
          totalCheckpoints: totalCheckpoints,
          averageCheckpointsPerRoute: Math.round(avgCheckpoints * 10) / 10,
          totalPatrols: totalPatrols,
          completedPatrols: completedPatrols,
          averageCompletionRate: Math.round(avgCompletionRate * 10) / 10,
          byScheduleType: byScheduleType,
          byStatus: byStatus
        };
      })
    );
  }
}
