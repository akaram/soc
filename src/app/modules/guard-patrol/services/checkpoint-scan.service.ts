import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import { mapActivePatrolFromApi, mapCheckpointScanFromApi } from './checkpoint-scan-http.mapper';
import {
  CheckpointScan,
  ScanType,
  ScanStatus,
  ScanCheckpointRequest,
  ScanCheckpointResponse,
  CheckpointScanFilter,
  CheckpointScanStatistics,
  ActivePatrol
} from '../models/checkpoint-scan.model';
import { PatrollingRouteService } from './patrolling-route.service';
import { Checkpoint, PatrollingRoute } from '../models/patrolling-route.model';
import { normalizePatrolScanToken } from '../utils/patrol-qr.util';

/**
 * Checkpoint scans and scanner active patrols persisted via /checkpoint-scans and /checkpoint-active-patrols.
 */
@Injectable({
  providedIn: 'root'
})
export class CheckpointScanService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService,
    private routeService: PatrollingRouteService
  ) {}

  private societyId(): string {
    return this.session.getSocietyId() ?? '';
  }

  private toPlain(obj: object): Record<string, unknown> {
    return JSON.parse(JSON.stringify(obj, (_k, v) => (v instanceof Date ? v.toISOString() : v)));
  }

  /**
   * Resolve scanned token against configured patrol routes.
   * Also matches checkpoint name/location (case-insensitive).
   */
  private matchCheckpoint(
    routes: PatrollingRoute[],
    scannedData: string
  ): { route: PatrollingRoute; checkpoint: Checkpoint } | null {
    const n = normalizePatrolScanToken(scannedData);
    if (!n) {
      return null;
    }
    const upper = n.toUpperCase();
    const lower = n.toLowerCase();
    for (const route of routes) {
      for (const cp of route.checkpoints) {
        const code = (cp.checkpointCode || '').trim();
        const qr = (cp.qrCode || '').trim();
        if (code && code.toUpperCase() === upper) {
          return { route, checkpoint: cp };
        }
        if (qr && qr.toUpperCase() === upper) {
          return { route, checkpoint: cp };
        }
        if (cp.id === n) {
          return { route, checkpoint: cp };
        }
        if (cp.nfcTagId && cp.nfcTagId === n) {
          return { route, checkpoint: cp };
        }
        const name = (cp.name || cp.location || '').trim().toLowerCase();
        if (name && (name === lower || name.includes(lower) || lower.includes(name))) {
          return { route, checkpoint: cp };
        }
      }
    }
    return null;
  }

  /** Find checkpoint when guard tapped Scan on a known checkpoint row. */
  private findCheckpointById(
    routes: PatrollingRoute[],
    checkpointId: string
  ): { route: PatrollingRoute; checkpoint: Checkpoint } | null {
    if (!checkpointId?.trim()) {
      return null;
    }
    const token = checkpointId.trim();
    const upper = token.toUpperCase();
    for (const route of routes) {
      const cp = route.checkpoints.find(c => c.id === token);
      if (cp) {
        return { route, checkpoint: cp };
      }
      // Query param may carry the QR code instead of the internal checkpoint id.
      const byCode = route.checkpoints.find(c => {
        const code = (c.checkpointCode || '').trim().toUpperCase();
        const qr = (c.qrCode || '').trim().toUpperCase();
        return code === upper || qr === upper;
      });
      if (byCode) {
        return { route, checkpoint: byCode };
      }
    }
    return null;
  }

  /** Resolve checkpoint from scan request — id from UI first, then scanned QR/text. */
  private resolveCheckpoint(
    routes: PatrollingRoute[],
    request: ScanCheckpointRequest
  ): { route: PatrollingRoute; checkpoint: Checkpoint } | null {
    if (request.checkpointId) {
      const byId = this.findCheckpointById(routes, request.checkpointId);
      if (byId) {
        return byId;
      }
    }
    const token = normalizePatrolScanToken(request.scannedData || request.checkpointId || '');
    if (token) {
      return this.matchCheckpoint(routes, token);
    }
    return null;
  }

  scanCheckpoint(request: ScanCheckpointRequest): Observable<ScanCheckpointResponse> {
    const sid = this.societyId();
    if (!sid) {
      return of({
        success: false,
        message: 'No society in session',
        errors: ['societyId']
      });
    }
    return this.routeService.getAllRoutes().pipe(
      switchMap(routes => {
        const found = this.resolveCheckpoint(routes, request);
        if (!found) {
          const sid = this.societyId();
          return of({
            success: false,
            message: sid
              ? 'Invalid scan — code does not match any patrol checkpoint. Check the QR matches your society route.'
              : 'No society in session — log in again.',
            errors: ['The scanned code does not match any checkpoint on configured routes']
          });
        }
        const { route, checkpoint } = found;
        return this.http
          .get<Record<string, unknown>[]>(`/checkpoint-scans/society/${encodeURIComponent(sid)}`)
          .pipe(
            switchMap(rows => {
              const scans = (rows ?? []).map(r => mapCheckpointScanFromApi(r));
              const recentScan = scans.find(
                s =>
                  s.checkpointId === checkpoint.id &&
                  s.scanTimestamp.getTime() > Date.now() - 5 * 60 * 1000
              );
              if (recentScan) {
                return of({
                  success: false,
                  message: 'Duplicate scan detected',
                  errors: ['This checkpoint was already scanned recently'],
                  scan: recentScan
                });
              }
              const now = new Date();
              const guardId = request.guardId ?? this.session.getCurrentUserId();
              const scan: CheckpointScan = {
                id: '',
                checkpointId: checkpoint.id,
                checkpointName: checkpoint.name,
                checkpointCode: checkpoint.checkpointCode ?? request.scannedData,
                routeId: route.id,
                routeName: route.name,
                scanType: request.scanType,
                scannedData: request.scannedData,
                scanTimestamp: now,
                latitude: request.latitude,
                longitude: request.longitude,
                guardId,
                guardName: guardId,
                status: ScanStatus.VALID,
                isValid: true,
                validationMessage: 'Checkpoint scanned successfully',
                actualTime: now,
                isOnTime: true,
                isLate: false,
                photoUrl: request.photoUrl,
                notes: request.notes,
                deviceInfo: 'Mobile App',
                appVersion: '1.0.0',
                createdAt: now,
                updatedAt: now
              };
              const plain = this.toPlain(scan);
              delete plain['id'];
              const body = { societyId: sid, ...plain };
              return this.http.post<Record<string, unknown>>('/checkpoint-scans', body).pipe(
                switchMap(r => {
                  const saved = mapCheckpointScanFromApi(r);
                  return this.syncActivePatrolAfterScan(saved).pipe(
                    map(() => ({
                      success: true,
                      message: 'Checkpoint scanned successfully',
                      scan: saved,
                      checkpoint: {
                        id: checkpoint.id,
                        name: checkpoint.name,
                        routeId: route.id,
                        routeName: route.name,
                        order: checkpoint.order
                      }
                    }))
                  );
                }),
                catchError(err => {
                  const msg = err?.error?.message ?? 'Failed to save scan';
                  return of({ success: false, message: msg, errors: [msg] });
                })
              );
            }),
            catchError(() =>
              of({
                success: false,
                message: 'Failed to load scans',
                errors: ['Failed to load scans']
              })
            )
          );
      })
    );
  }

  getAllScans(filter?: CheckpointScanFilter): Observable<CheckpointScan[]> {
    const sid = this.societyId();
    if (!sid) {
      return of([]);
    }
    return this.http
      .get<Record<string, unknown>[]>(`/checkpoint-scans/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows => {
          let list = (rows ?? []).map(r => mapCheckpointScanFromApi(r));
          if (filter) {
            if (filter.routeId) {
              list = list.filter(s => s.routeId === filter.routeId);
            }
            if (filter.checkpointId) {
              list = list.filter(s => s.checkpointId === filter.checkpointId);
            }
            if (filter.guardId) {
              list = list.filter(s => s.guardId === filter.guardId);
            }
            if (filter.status) {
              list = list.filter(s => s.status === filter.status);
            }
            if (filter.scanType) {
              list = list.filter(s => s.scanType === filter.scanType);
            }
            if (filter.startDate) {
              list = list.filter(s => s.scanTimestamp >= filter.startDate!);
            }
            if (filter.endDate) {
              list = list.filter(s => s.scanTimestamp <= filter.endDate!);
            }
            if (filter.searchTerm) {
              const search = filter.searchTerm.toLowerCase();
              list = list.filter(
                s =>
                  s.checkpointName.toLowerCase().includes(search) ||
                  s.routeName.toLowerCase().includes(search) ||
                  s.guardName.toLowerCase().includes(search) ||
                  s.scannedData.toLowerCase().includes(search)
              );
            }
          }
          return list.sort((a, b) => b.scanTimestamp.getTime() - a.scanTimestamp.getTime());
        }),
        catchError(err => {
          console.error('Failed to load checkpoint scans', err);
          return throwError(() => err);
        })
      );
  }

  getScanById(id: string): Observable<CheckpointScan | null> {
    return this.http.get<Record<string, unknown>>(`/checkpoint-scans/${encodeURIComponent(id)}`).pipe(
      map(r => mapCheckpointScanFromApi(r)),
      catchError(() => of(null))
    );
  }

  getStatistics(filter?: CheckpointScanFilter): Observable<CheckpointScanStatistics> {
    return this.getAllScans(filter).pipe(
      map(filteredScans => {
        const totalScans = filteredScans.length;
        const validScans = filteredScans.filter(s => s.status === ScanStatus.VALID).length;
        const invalidScans = filteredScans.filter(s => s.status === ScanStatus.INVALID).length;
        const lateScans = filteredScans.filter(s => s.isLate).length;
        const missedCheckpoints = filteredScans.filter(s => s.status === ScanStatus.MISSED).length;
        const duplicateScans = filteredScans.filter(s => s.status === ScanStatus.DUPLICATE).length;

        const onTimeScans = filteredScans.filter(s => s.isOnTime && s.isValid).length;
        const onTimePercentage = totalScans > 0 ? (onTimeScans / totalScans) * 100 : 0;

        const timeDifferences = filteredScans
          .filter(s => s.timeDifference !== undefined)
          .map(s => s.timeDifference!);
        const averageScanTime =
          timeDifferences.length > 0
            ? timeDifferences.reduce((a, b) => a + b, 0) / timeDifferences.length
            : 0;

        const byRoute: CheckpointScanStatistics['byRoute'] = {};
        filteredScans.forEach(scan => {
          if (!byRoute[scan.routeId]) {
            byRoute[scan.routeId] = {
              routeName: scan.routeName,
              totalScans: 0,
              validScans: 0,
              completionRate: 0
            };
          }
          byRoute[scan.routeId].totalScans++;
          if (scan.isValid) {
            byRoute[scan.routeId].validScans++;
          }
        });
        Object.keys(byRoute).forEach(routeId => {
          const b = byRoute[routeId];
          b.completionRate = b.totalScans > 0 ? (b.validScans / b.totalScans) * 100 : 0;
        });

        const byGuard: CheckpointScanStatistics['byGuard'] = {};
        filteredScans.forEach(scan => {
          if (!byGuard[scan.guardId]) {
            byGuard[scan.guardId] = {
              guardName: scan.guardName,
              totalScans: 0,
              validScans: 0,
              onTimeScans: 0
            };
          }
          byGuard[scan.guardId].totalScans++;
          if (scan.isValid) {
            byGuard[scan.guardId].validScans++;
          }
          if (scan.isOnTime) {
            byGuard[scan.guardId].onTimeScans++;
          }
        });

        return {
          totalScans,
          validScans,
          invalidScans,
          lateScans,
          missedCheckpoints,
          duplicateScans,
          averageScanTime: Math.round(averageScanTime * 10) / 10,
          onTimePercentage: Math.round(onTimePercentage * 10) / 10,
          byRoute,
          byGuard,
          recentScans: filteredScans.slice(0, 10)
        };
      })
    );
  }

  /** All patrol records for the society (any status) — used by completion reports. */
  getAllPatrolRecords(guardId?: string): Observable<ActivePatrol[]> {
    const sid = this.societyId();
    if (!sid) {
      return of([]);
    }
    return this.http
      .get<Record<string, unknown>[]>(`/checkpoint-active-patrols/society/${encodeURIComponent(sid)}`)
      .pipe(
        map(rows => {
          let list = (rows ?? []).map(r => mapActivePatrolFromApi(r));
          if (guardId) {
            list = list.filter(p => p.guardId === guardId);
          }
          return list;
        }),
        catchError(err => {
          console.error('Failed to load patrol records', err);
          return throwError(() => err);
        })
      );
  }

  /** In-progress patrols only (scanner UI). */
  getActivePatrols(guardId?: string): Observable<ActivePatrol[]> {
    return this.getAllPatrolRecords(guardId).pipe(
      map(list => list.filter(p => p.status === 'IN_PROGRESS'))
    );
  }

  startPatrol(routeId: string, guardId: string): Observable<ActivePatrol> {
    const sid = this.societyId();
    if (!sid) {
      return throwError(() => new Error('No society in session'));
    }
    return this.routeService.getRouteById(routeId).pipe(
      switchMap(route => {
        if (!route) {
          const fallback: ActivePatrol = {
            id: '',
            routeId,
            routeName: 'Unknown route',
            guardId,
            guardName: 'Guard User',
            startTime: new Date(),
            status: 'IN_PROGRESS',
            checkpoints: [],
            progress: 0,
            completedCheckpoints: 0,
            totalCheckpoints: 0
          };
          const plain = this.toPlain(fallback);
          delete plain['id'];
          return this.http
            .post<Record<string, unknown>>('/checkpoint-active-patrols', { societyId: sid, ...plain })
            .pipe(map(r => mapActivePatrolFromApi(r)));
        }
        const patrol: ActivePatrol = {
          id: '',
          routeId: route.id,
          routeName: route.name,
          guardId,
          guardName: 'Guard User',
          startTime: new Date(),
          status: 'IN_PROGRESS',
          checkpoints: route.checkpoints.map((c, idx) => ({
            checkpointId: c.id,
            checkpointName: c.name,
            checkpointCode: c.checkpointCode,
            order: c.order ?? idx + 1,
            status: 'PENDING' as const
          })),
          progress: 0,
          completedCheckpoints: 0,
          totalCheckpoints: route.checkpoints.length
        };
        const plain = this.toPlain(patrol);
        delete plain['id'];
        return this.http
          .post<Record<string, unknown>>('/checkpoint-active-patrols', { societyId: sid, ...plain })
          .pipe(map(r => mapActivePatrolFromApi(r)));
      }),
    );
  }

  /** Update or create active patrol progress after a successful checkpoint scan. */
  private syncActivePatrolAfterScan(scan: CheckpointScan): Observable<ActivePatrol | null> {
    const sid = this.societyId();
    if (!sid) return of(null);

    return this.getActivePatrols(scan.guardId).pipe(
      switchMap(patrols => {
        let patrol = patrols.find(p => p.routeId === scan.routeId && p.status === 'IN_PROGRESS');
        if (!patrol) {
          return this.startPatrol(scan.routeId, scan.guardId).pipe(
            switchMap(created => this.applyScanToPatrol(created, scan))
          );
        }
        return this.applyScanToPatrol(patrol, scan);
      }),
      catchError(err => {
        console.error('Failed to sync active patrol after scan', err);
        return of(null);
      })
    );
  }

  private applyScanToPatrol(patrol: ActivePatrol, scan: CheckpointScan): Observable<ActivePatrol> {
    const sid = this.societyId();
    const checkpoints = patrol.checkpoints.map(cp =>
      cp.checkpointId === scan.checkpointId
        ? {
            ...cp,
            status: 'COMPLETED' as const,
            scannedAt: scan.scanTimestamp,
            scanId: scan.id
          }
        : cp
    );
    const completedCheckpoints = checkpoints.filter(c => c.status === 'COMPLETED').length;
    const totalCheckpoints = patrol.totalCheckpoints || checkpoints.length;
    const progress = totalCheckpoints > 0 ? (completedCheckpoints / totalCheckpoints) * 100 : 0;
    const updated: ActivePatrol = {
      ...patrol,
      checkpoints,
      completedCheckpoints,
      totalCheckpoints,
      progress,
      status: completedCheckpoints >= totalCheckpoints ? 'COMPLETED' : 'IN_PROGRESS',
      actualEndTime: completedCheckpoints >= totalCheckpoints ? new Date() : patrol.actualEndTime
    };
    const plain = this.toPlain(updated);
    plain['id'] = patrol.id;
    return this.http
      .put<Record<string, unknown>>(`/checkpoint-active-patrols/${encodeURIComponent(patrol.id)}`, {
        societyId: sid,
        ...plain
      })
      .pipe(map(r => mapActivePatrolFromApi(r)));
  }
}
