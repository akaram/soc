import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  SmartLockFormData,
  SmartLockRow,
  SmartLockStats,
  SmartLockStatus,
  SmartLockType
} from '../models/smart-lock.model';

/** REST client for society smart lock registry and remote lock/unlock commands. */
@Injectable({ providedIn: 'root' })
export class SmartLockApiService {
  constructor(private http: HttpClient) {}

  /** Map backend entity to UI row. */
  normalize(raw: Record<string, unknown>, flatNumber?: string): SmartLockRow {
    const lastUnlocked = raw['lastUnlockedAt'] ?? raw['last_unlocked_at'];
    const created = raw['createdAt'] ?? raw['created_at'];
    const updated = raw['updatedAt'] ?? raw['updated_at'];
    return {
      id: String(raw['id'] ?? ''),
      societyId: String(raw['societyId'] ?? raw['society_id'] ?? ''),
      flatId: raw['flatId'] != null ? String(raw['flatId']) : raw['flat_id'] != null ? String(raw['flat_id']) : undefined,
      flatNumber,
      lockName: String(raw['lockName'] ?? raw['lock_name'] ?? ''),
      location: String(raw['location'] ?? ''),
      lockType: (raw['lockType'] ?? raw['lock_type'] ?? 'SMART_DEADBOLT') as SmartLockType,
      manufacturer: raw['manufacturer'] != null ? String(raw['manufacturer']) : undefined,
      deviceId: raw['deviceId'] != null ? String(raw['deviceId']) : raw['device_id'] != null ? String(raw['device_id']) : undefined,
      serialNumber:
        raw['serialNumber'] != null
          ? String(raw['serialNumber'])
          : raw['serial_number'] != null
            ? String(raw['serial_number'])
            : undefined,
      status: (raw['status'] ?? 'LOCKED') as SmartLockStatus,
      batteryLevel:
        raw['batteryLevel'] != null
          ? Number(raw['batteryLevel'])
          : raw['battery_level'] != null
            ? Number(raw['battery_level'])
            : undefined,
      allowRemoteUnlock: raw['allowRemoteUnlock'] !== false && raw['allow_remote_unlock'] !== false,
      autoLockSeconds:
        raw['autoLockSeconds'] != null
          ? Number(raw['autoLockSeconds'])
          : raw['auto_lock_seconds'] != null
            ? Number(raw['auto_lock_seconds'])
            : undefined,
      lastUnlockedAt: lastUnlocked ? new Date(String(lastUnlocked)) : undefined,
      lastUnlockedBy:
        raw['lastUnlockedBy'] != null
          ? String(raw['lastUnlockedBy'])
          : raw['last_unlocked_by'] != null
            ? String(raw['last_unlocked_by'])
            : undefined,
      notes: raw['notes'] != null ? String(raw['notes']) : undefined,
      createdAt: created ? new Date(String(created)) : undefined,
      updatedAt: updated ? new Date(String(updated)) : undefined
    };
  }

  /** List locks for a society with flat numbers merged in. */
  listBySociety(societyId: string): Observable<SmartLockRow[]> {
    if (!societyId) {
      return of([]);
    }
    return forkJoin({
      rows: this.http
        .get<Record<string, unknown>[]>(`/smart-locks/society/${encodeURIComponent(societyId)}`)
        .pipe(catchError(() => of([] as Record<string, unknown>[]))),
      flats: this.http
        .get<Array<{ id: string; flatNumber?: string }>>(`/flats/society/${encodeURIComponent(societyId)}`)
        .pipe(catchError(() => of([])))
    }).pipe(
      map(({ rows, flats }) => {
        const byId = new Map(flats.map(f => [f.id, f.flatNumber]));
        return (rows ?? []).map(r =>
          this.normalize(r, r['flatId'] ? byId.get(String(r['flatId'])) : undefined)
        );
      })
    );
  }

  getStats(societyId: string): Observable<SmartLockStats> {
    if (!societyId) {
      return of({ total: 0, locked: 0, unlocked: 0, offline: 0 });
    }
    return this.http
      .get<SmartLockStats>(`/smart-locks/society/${encodeURIComponent(societyId)}/stats`)
      .pipe(catchError(() => of({ total: 0, locked: 0, unlocked: 0, offline: 0 })));
  }

  create(societyId: string, form: SmartLockFormData): Observable<SmartLockRow> {
    return this.http.post<Record<string, unknown>>('/smart-locks', this.toBody(societyId, form)).pipe(
      map(r => this.normalize(r))
    );
  }

  update(id: string, form: SmartLockFormData, societyId: string): Observable<SmartLockRow> {
    return this.http
      .put<Record<string, unknown>>(`/smart-locks/${encodeURIComponent(id)}`, this.toBody(societyId, form))
      .pipe(map(r => this.normalize(r)));
  }

  lock(id: string): Observable<SmartLockRow> {
    return this.http
      .post<Record<string, unknown>>(`/smart-locks/${encodeURIComponent(id)}/lock`, {})
      .pipe(map(r => this.normalize(r)));
  }

  unlock(id: string): Observable<SmartLockRow> {
    return this.http
      .post<Record<string, unknown>>(`/smart-locks/${encodeURIComponent(id)}/unlock`, {})
      .pipe(map(r => this.normalize(r)));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/smart-locks/${encodeURIComponent(id)}`);
  }

  private toBody(societyId: string, form: SmartLockFormData): Record<string, unknown> {
    return {
      societyId,
      flatId: form.flatId?.trim() || null,
      lockName: form.lockName.trim(),
      location: form.location.trim(),
      lockType: form.lockType,
      manufacturer: form.manufacturer?.trim() || null,
      deviceId: form.deviceId?.trim() || null,
      serialNumber: form.serialNumber?.trim() || null,
      status: form.status,
      batteryLevel: form.batteryLevel,
      allowRemoteUnlock: form.allowRemoteUnlock,
      autoLockSeconds: form.autoLockSeconds,
      notes: form.notes?.trim() || null
    };
  }
}
