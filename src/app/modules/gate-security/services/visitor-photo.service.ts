import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, from } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  VisitorPhoto,
  PhotoCaptureSource,
  PhotoStatus,
  CapturePhotoRequest,
  CapturePhotoResponse,
  PhotoFilter,
  PhotoStatistics,
  PhotoStorageInfo
} from '../models/visitor-photo.model';
import { VisitorManagementService } from '../../visitor-management/services/visitor-management.service';
import { SessionContextService } from '../../../core/services/session-context.service';
import { Visitor, VisitorStatus, ApprovalStatus } from '../../visitor-management/models/visitor.model';
import { normalizeRecurringVisitor, normalizeMonthlyGatepass } from '../../visitor-management/services/visitor-ancillary.mappers';
import {
  buildPhotoGuardNotes,
  compressPhotoDataUrl,
  gatepassToPhoto,
  LOCAL_PHOTO_PREFIX,
  photoCacheKey,
  readCachedPhoto,
  recurringVisitorToPhoto,
  resolvePhotoDisplayUrl,
  visitorPhotoPatchBody,
  visitorToPhoto
} from './visitor-photo-api.mapper';

const ARCHIVED_PREFIX = 'visitor_photo_archived_';
const DELETED_PREFIX = 'visitor_photo_deleted_';

@Injectable({
  providedIn: 'root'
})
export class VisitorPhotoService {
  constructor(
    private http: HttpClient,
    private visitorService: VisitorManagementService,
    private session: SessionContextService
  ) {}

  /**
   * Capture photo: POST /visitors then PUT local:{id} reference; JPEG kept in localStorage.
   */
  capturePhoto(request: CapturePhotoRequest, photoData: string): Observable<CapturePhotoResponse> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({
        success: false,
        message: 'No society selected',
        errors: ['societyId required']
      });
    }

    return from(compressPhotoDataUrl(photoData)).pipe(
      switchMap(compressed => {
        if (!compressed) {
          return of({
            success: false,
            message: 'Invalid photo data',
            errors: ['Empty photo']
          } as CapturePhotoResponse);
        }

        const guardNotes = buildPhotoGuardNotes(
          request.captureSource,
          request.gateId,
          request.capturedBy,
          request.notes
        );

        if (request.visitorId) {
          return this.visitorService.getVisitorById(request.visitorId).pipe(
            switchMap(visitor =>
              this.http
                .put<Record<string, unknown>>(
                  `/visitors/${encodeURIComponent(visitor.id)}`,
                  visitorPhotoPatchBody(
                    visitor,
                    societyId,
                    compressed,
                    guardNotes
                  )
                )
                .pipe(
                  map(raw => {
                    const id = String(raw['id'] ?? visitor.id);
                    this.cachePhotoLocally(societyId, id, compressed);
                    const photo = this.enrichPhotoForDisplay(
                      visitorToPhoto(
                        { ...this.mapRawVisitor(raw), photo: compressed },
                        this.loadArchivedIds(),
                        this.loadDeletedIds(),
                        societyId
                      ),
                      societyId
                    );
                    return {
                      success: true,
                      message: 'Photo saved on visitor record',
                      photo: photo ?? undefined
                    } as CapturePhotoResponse;
                  })
                )
            ),
            catchError(err =>
              of({
                success: false,
                message: err.error?.message || 'Failed to update visitor photo',
                errors: ['API error']
              })
            )
          );
        }

        const now = new Date();
        const visitDate = now.toISOString().split('T')[0];
        const visitTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
        const userId = this.session.getCurrentUserId();

        const payload: Record<string, unknown> = {
          societyId,
          name: request.visitorName.trim(),
          phone: (request.visitorPhone ?? '').trim() || '0000000000',
          purpose: 'Walk-in entry',
          visitingFlat: (request.visitingFlat ?? '—').trim(),
          hostName: (request.hostName ?? 'Gate Desk').trim(),
          hostPhone: '0000000000',
          hostId: userId || societyId,
          visitDate,
          visitTime,
          expectedDuration: 60,
          vehicleType: 'NONE',
          numberOfVisitors: 1,
          status: VisitorStatus.CHECKED_IN,
          approvalStatus: ApprovalStatus.APPROVED,
          invitedBy: userId || societyId,
          guardNotes
        };

        // Create visitor first, then attach local photo reference + browser cache
        return this.http.post<Record<string, unknown>>('/visitors', payload).pipe(
          switchMap(raw => {
            const id = String(raw['id'] ?? '');
            if (!id) {
              return of({
                success: false,
                message: 'Visitor created but id missing in response',
                errors: ['Missing id']
              } as CapturePhotoResponse);
            }
            this.cachePhotoLocally(societyId, id, compressed);
            const visitor = this.mapRawVisitor(raw);
            return this.http
              .put<Record<string, unknown>>(
                `/visitors/${encodeURIComponent(id)}`,
                visitorPhotoPatchBody(
                  visitor,
                  societyId,
                  compressed,
                  guardNotes
                )
              )
              .pipe(
                map(updated => ({
                  success: true,
                  message: 'Visitor created with gate photo',
                  raw: { ...updated, photo: compressed }
                }))
              );
          }),
          map(result => {
            if (!result.success) {
              return result as CapturePhotoResponse;
            }
            const raw = (result as { raw: Record<string, unknown> }).raw;
            const photo = this.enrichPhotoForDisplay(
              visitorToPhoto(
                this.mapRawVisitor(raw),
                this.loadArchivedIds(),
                this.loadDeletedIds(),
                societyId
              ),
              societyId
            );
            return {
              success: true,
              message: 'Visitor created with gate photo',
              photo: photo ?? undefined
            } as CapturePhotoResponse;
          }),
          catchError(err =>
            of({
              success: false,
              message: err.error?.message || 'Failed to save visitor photo',
              errors: ['API error']
            })
          )
        );
      }),
      catchError(err =>
        of({
          success: false,
          message: err.message || 'Failed to process photo image',
          errors: ['Compression error']
        })
      )
    );
  }

  /** Photos from visitors, recurring visitors, and monthly gatepass rows that have images */
  getAllPhotos(filter?: PhotoFilter): Observable<VisitorPhoto[]> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of([]);
    }

    const archived = this.loadArchivedIds();
    const deleted = this.loadDeletedIds();

    return forkJoin({
      visitors: this.visitorService.getAllVisitors().pipe(catchError(() => of([]))),
      recurring: this.http
        .get<Record<string, unknown>[]>(`/recurring-visitors/society/${encodeURIComponent(societyId)}`)
        .pipe(catchError(() => of([]))),
      gatepass: this.http
        .get<Record<string, unknown>[]>(`/monthly-gatepass/society/${encodeURIComponent(societyId)}`)
        .pipe(catchError(() => of([])))
    }).pipe(
      map(({ visitors, recurring, gatepass }) => {
        const photos: VisitorPhoto[] = [];

        for (const v of visitors) {
          const card = visitorToPhoto(v, archived, deleted, societyId);
          if (card) {
            photos.push(card);
          }
        }

        for (const raw of recurring) {
          const row = normalizeRecurringVisitor(raw);
          const card = recurringVisitorToPhoto(row, archived);
          if (card) {
            photos.push(card);
          }
        }

        for (const raw of gatepass) {
          const row = normalizeMonthlyGatepass(raw);
          const card = gatepassToPhoto(row, archived);
          if (card) {
            photos.push(card);
          }
        }

        return this.applyPhotoFilter(
          photos
            .map(p => this.enrichPhotoForDisplay(p, societyId))
            .filter((p): p is VisitorPhoto => p !== null),
          filter
        );
      }),
      catchError(err => {
        console.error('Failed to load visitor photos', err);
        return of([]);
      })
    );
  }

  getPhotoById(id: string): Observable<VisitorPhoto | null> {
    return this.getAllPhotos().pipe(map(rows => rows.find(p => p.id === id) ?? null));
  }

  getPhotosByVisitorId(visitorId: string): Observable<VisitorPhoto[]> {
    return this.getAllPhotos({ visitorId });
  }

  /** Clear photo on visitor record (PUT) or hide recurring/gatepass locally */
  deletePhoto(photoId: string, deletedBy?: string): Observable<CapturePhotoResponse> {
    if (photoId.startsWith('recurring::') || photoId.startsWith('gatepass::')) {
      const deleted = this.loadDeletedIds();
      deleted.add(photoId);
      this.saveDeletedIds(deleted);
      return of({ success: true, message: 'Photo hidden from gallery' });
    }

    return this.visitorService.getVisitorById(photoId).pipe(
      switchMap(visitor => {
        const societyId = this.session.getSocietyId();
        const notes = [visitor.guardNotes, deletedBy ? `deletedBy:${deletedBy}` : undefined]
          .filter(Boolean)
          .join(' | ');
        return this.http.put<Record<string, unknown>>(
          `/visitors/${encodeURIComponent(photoId)}`,
          visitorPhotoPatchBody(visitor, societyId, '', notes)
        );
      }),
      map(() => {
        const deleted = this.loadDeletedIds();
        deleted.add(photoId);
        this.saveDeletedIds(deleted);
        try {
          localStorage.removeItem(photoCacheKey(this.session.getSocietyId(), photoId));
        } catch {
          /* ignore */
        }
        return { success: true, message: 'Photo removed from visitor record' };
      }),
      catchError(err =>
        of({
          success: false,
          message: err.error?.message || 'Failed to delete photo',
          errors: ['API error']
        })
      )
    );
  }

  /** Keep photo beyond 7-day window (client-side archive flag) */
  archivePhoto(photoId: string): Observable<CapturePhotoResponse> {
    const archived = this.loadArchivedIds();
    archived.add(photoId);
    this.saveArchivedIds(archived);
    return this.getPhotoById(photoId).pipe(
      map(photo => ({
        success: true,
        message: 'Photo archived (retained beyond 7-day policy)',
        photo: photo ? { ...photo, status: PhotoStatus.ARCHIVED } : undefined
      }))
    );
  }

  getExpiringPhotos(days = 1): Observable<VisitorPhoto[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    return this.getAllPhotos().pipe(
      map(rows =>
        rows.filter(
          p =>
            p.status === PhotoStatus.ACTIVE &&
            !p.isExpired &&
            p.expiryDate <= cutoff
        )
      )
    );
  }

  getStatistics(): Observable<PhotoStatistics> {
    return this.getAllPhotos().pipe(
      map(photos => this.buildStatistics(photos)),
      catchError(() => of(this.emptyStatistics()))
    );
  }

  getStorageInfo(): Observable<PhotoStorageInfo> {
    return this.getAllPhotos({ status: PhotoStatus.ACTIVE }).pipe(
      map(activePhotos => {
        if (activePhotos.length === 0) {
          return {
            totalPhotos: 0,
            totalSize: 0,
            oldestPhoto: null,
            newestPhoto: null,
            photosExpiringIn24Hours: 0,
            photosExpiringIn7Days: 0
          };
        }
        const sorted = [...activePhotos].sort(
          (a, b) => a.captureDate.getTime() - b.captureDate.getTime()
        );
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const week = new Date(now);
        week.setDate(week.getDate() + 7);
        return {
          totalPhotos: activePhotos.length,
          totalSize: activePhotos.reduce((s, p) => s + (p.fileSize || 0), 0),
          oldestPhoto: sorted[0].captureDate,
          newestPhoto: sorted[sorted.length - 1].captureDate,
          photosExpiringIn24Hours: activePhotos.filter(
            p => p.expiryDate <= tomorrow && p.expiryDate > now
          ).length,
          photosExpiringIn7Days: activePhotos.filter(
            p => p.expiryDate <= week && p.expiryDate > now
          ).length
        };
      })
    );
  }

  /** 7-day policy is enforced by expiry metadata; server has no batch delete yet */
  cleanupExpiredPhotos(): Observable<number> {
    return this.getAllPhotos().pipe(
      map(rows => rows.filter(p => p.isExpired && p.status === PhotoStatus.ACTIVE).length)
    );
  }

  private applyPhotoFilter(rows: VisitorPhoto[], filter?: PhotoFilter): VisitorPhoto[] {
    let filtered = rows.filter(p => p.status !== PhotoStatus.DELETED);

    if (filter?.visitorId) {
      filtered = filtered.filter(p => p.visitorId === filter.visitorId);
    }
    if (filter?.visitorName) {
      const search = filter.visitorName.toLowerCase();
      filtered = filtered.filter(p => p.visitorName.toLowerCase().includes(search));
    }
    if (filter?.gateId) {
      filtered = filtered.filter(p => p.gateId === filter.gateId);
    }
    if (filter?.captureSource) {
      filtered = filtered.filter(p => p.captureSource === filter.captureSource);
    }
    if (filter?.status) {
      filtered = filtered.filter(p => p.status === filter.status);
    }
    if (filter?.quality) {
      filtered = filtered.filter(p => p.quality === filter.quality);
    }
    if (filter?.faceDetected !== undefined) {
      filtered = filtered.filter(p => p.faceDetected === filter.faceDetected);
    }
    if (filter?.dateFrom) {
      filtered = filtered.filter(p => p.captureDate >= filter.dateFrom!);
    }
    if (filter?.dateTo) {
      filtered = filtered.filter(p => p.captureDate <= filter.dateTo!);
    }
    if (filter?.searchTerm) {
      const search = filter.searchTerm.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.visitorName.toLowerCase().includes(search) ||
          p.visitorPhone?.toLowerCase().includes(search) ||
          p.visitingFlat?.toLowerCase().includes(search) ||
          p.hostName?.toLowerCase().includes(search)
      );
    }

    return filtered.sort((a, b) => b.captureDate.getTime() - a.captureDate.getTime());
  }

  private buildStatistics(photos: VisitorPhoto[]): PhotoStatistics {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activePhotos = photos.filter(p => p.status === PhotoStatus.ACTIVE);
    const photosToday = photos.filter(p => {
      const d = new Date(p.captureDate);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });

    const expiringToday = activePhotos.filter(p => {
      const d = new Date(p.expiryDate);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });

    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const expiringThisWeek = activePhotos.filter(
      p => p.expiryDate <= weekFromNow && p.expiryDate > today
    );

    const totalSize = activePhotos.reduce((s, p) => s + (p.fileSize || 0), 0);
    const byGate: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byQuality: Record<string, number> = {};
    photos.forEach(p => {
      if (p.gateId) {
        byGate[p.gateId] = (byGate[p.gateId] || 0) + 1;
      }
      bySource[p.captureSource] = (bySource[p.captureSource] || 0) + 1;
      byQuality[p.quality] = (byQuality[p.quality] || 0) + 1;
    });

    return {
      totalPhotos: photos.length,
      activePhotos: activePhotos.length,
      photosToday: photosToday.length,
      photosExpiringToday: expiringToday.length,
      photosExpiringThisWeek: expiringThisWeek.length,
      totalStorageUsed: totalSize / (1024 * 1024),
      averagePhotoSize: activePhotos.length ? totalSize / activePhotos.length / 1024 : 0,
      byGate,
      bySource,
      byQuality,
      storageBreakdown: {
        active: activePhotos.length,
        pendingDeletion: photos.filter(p => p.status === PhotoStatus.PENDING_DELETION).length,
        archived: photos.filter(p => p.status === PhotoStatus.ARCHIVED).length
      }
    };
  }

  private emptyStatistics(): PhotoStatistics {
    return {
      totalPhotos: 0,
      activePhotos: 0,
      photosToday: 0,
      photosExpiringToday: 0,
      photosExpiringThisWeek: 0,
      totalStorageUsed: 0,
      averagePhotoSize: 0,
      byGate: {},
      bySource: {},
      byQuality: {},
      storageBreakdown: { active: 0, pendingDeletion: 0, archived: 0 }
    };
  }

  private loadArchivedIds(): Set<string> {
    const key = this.metaKey(ARCHIVED_PREFIX);
    if (!key) {
      return new Set();
    }
    try {
      const raw = localStorage.getItem(key);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  }

  private saveArchivedIds(ids: Set<string>): void {
    const key = this.metaKey(ARCHIVED_PREFIX);
    if (key) {
      localStorage.setItem(key, JSON.stringify([...ids]));
    }
  }

  private loadDeletedIds(): Set<string> {
    const key = this.metaKey(DELETED_PREFIX);
    if (!key) {
      return new Set();
    }
    try {
      const raw = localStorage.getItem(key);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  }

  private saveDeletedIds(ids: Set<string>): void {
    const key = this.metaKey(DELETED_PREFIX);
    if (key) {
      localStorage.setItem(key, JSON.stringify([...ids]));
    }
  }

  private metaKey(prefix: string): string | null {
    const societyId = this.session.getSocietyId();
    return societyId ? `${prefix}${societyId}` : null;
  }

  private cachePhotoLocally(societyId: string, visitorId: string, dataUrl: string): void {
    try {
      localStorage.setItem(photoCacheKey(societyId, visitorId), dataUrl);
    } catch {
      /* quota exceeded — API copy still used */
    }
  }

  /** Apply local cache / placeholder so gallery never shows a broken black tile */
  private enrichPhotoForDisplay(
    photo: VisitorPhoto | null,
    societyId: string
  ): VisitorPhoto | null {
    if (!photo) {
      return null;
    }
    const display = resolvePhotoDisplayUrl(photo.photoUrl, societyId, photo.visitorId);
    return {
      ...photo,
      photoUrl: display,
      thumbnailUrl: display
    };
  }

  /** Lightweight visitor map for PUT response parsing */
  private mapRawVisitor(raw: Record<string, unknown>): Visitor {
    const parseDate = (v: unknown): Date | undefined => {
      if (!v) {
        return undefined;
      }
      const d = new Date(String(v));
      return isNaN(d.getTime()) ? undefined : d;
    };
    return {
      id: String(raw['id'] ?? ''),
      name: String(raw['name'] ?? ''),
      phone: String(raw['phone'] ?? ''),
      email: raw['email'] != null ? String(raw['email']) : undefined,
      purpose: String(raw['purpose'] ?? ''),
      visitingFlat: String(raw['visitingFlat'] ?? raw['visiting_flat'] ?? ''),
      visitingUnit: raw['visitingUnit'] != null ? String(raw['visitingUnit']) : undefined,
      hostName: String(raw['hostName'] ?? raw['host_name'] ?? ''),
      hostPhone: String(raw['hostPhone'] ?? raw['host_phone'] ?? ''),
      hostId: String(raw['hostId'] ?? raw['host_id'] ?? ''),
      visitDate: parseDate(raw['visitDate']) ?? new Date(),
      visitTime: String(raw['visitTime'] ?? raw['visit_time'] ?? '09:00'),
      status: (raw['status'] as VisitorStatus) ?? VisitorStatus.PENDING,
      approvalStatus: (raw['approvalStatus'] as ApprovalStatus) ?? ApprovalStatus.PENDING,
      photo: raw['photo'] != null ? String(raw['photo']) : undefined,
      guardNotes: raw['guardNotes'] != null ? String(raw['guardNotes']) : undefined,
      checkInTime: parseDate(raw['checkInTime']),
      checkedInBy: raw['checkedInBy'] != null ? String(raw['checkedInBy']) : undefined,
      invitedBy: String(raw['invitedBy'] ?? ''),
      invitedDate: parseDate(raw['invitedDate']) ?? new Date(),
      createdAt: parseDate(raw['createdAt']) ?? new Date(),
      updatedAt: parseDate(raw['updatedAt']) ?? new Date()
    };
  }
}
