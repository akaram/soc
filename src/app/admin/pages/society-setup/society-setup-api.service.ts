import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError, of } from 'rxjs';

export interface SocietyRow {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  totalFlats?: number;
  /** Live count from flats table (authoritative for Society Setup list). */
  flatCount?: number;
}

export interface SocietySetupPayload {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  flatCount: number;
  flatPrefix: string;
}

export interface SocietyUpdateResult {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  flatCount?: number;
  flatsAdded?: number;
  flatsRemoved?: number;
  flatPrefix?: string;
}

export interface SocietySetupResult {
  societyId: string;
  societyName: string;
  buildingId?: string;
  flatsCreated: number;
}

@Injectable({ providedIn: 'root' })
export class SocietySetupApiService {
  constructor(private http: HttpClient) {}

  listSocieties(): Observable<SocietyRow[]> {
    return this.http.get<Record<string, unknown>[]>('/societies').pipe(
      map(rows =>
        (rows ?? []).map(r => this.mapSocietyRow(r))
      ),
      catchError(err => throwError(() => this.message(err)))
    );
  }

  getSocietyById(societyId: string): Observable<SocietyRow> {
    return this.http.get<Record<string, unknown>>(`/societies/${encodeURIComponent(societyId)}`).pipe(
      map(r => this.mapSocietyRow(r)),
      catchError(err => throwError(() => this.message(err)))
    );
  }

  private mapSocietyRow(r: Record<string, unknown>): SocietyRow {
    return {
      id: String(r['id'] ?? ''),
      name: String(r['name'] ?? ''),
      address: r['address'] != null ? String(r['address']) : undefined,
      city: r['city'] != null ? String(r['city']) : undefined,
      state: r['state'] != null ? String(r['state']) : undefined,
      pincode: r['pincode'] != null ? String(r['pincode']) : undefined,
      phone: r['phone'] != null ? String(r['phone']) : undefined,
      email: r['email'] != null ? String(r['email']) : undefined,
      totalFlats: r['totalFlats'] != null ? Number(r['totalFlats']) : undefined,
      flatCount: r['flatCount'] != null ? Number(r['flatCount']) : undefined
    };
  }

  setup(payload: SocietySetupPayload): Observable<SocietySetupResult> {
    return this.http.post<Record<string, unknown>>('/societies/setup', payload).pipe(
      map(r => ({
        societyId: String(r['societyId'] ?? ''),
        societyName: String(r['societyName'] ?? payload.name),
        buildingId: r['buildingId'] != null ? String(r['buildingId']) : undefined,
        flatsCreated: Number(r['flatsCreated'] ?? 0)
      })),
      catchError(err => throwError(() => this.message(err)))
    );
  }

  countFlats(societyId: string): Observable<number> {
    return this.listFlats(societyId).pipe(map(list => list.length), catchError(() => of(0)));
  }

  /** Flats for a society — used to infer prefix when editing. */
  listFlats(societyId: string): Observable<Array<{ flatNumber: string }>> {
    return this.http
      .get<Record<string, unknown>[]>(`/flats/society/${encodeURIComponent(societyId)}`)
      .pipe(
        map(rows =>
          (rows ?? []).map(r => ({
            flatNumber: String(r['flatNumber'] ?? r['flat_number'] ?? '')
          }))
        ),
        catchError(() => of([]))
      );
  }

  deleteSociety(societyId: string): Observable<void> {
    return this.http.delete<void>(`/societies/${encodeURIComponent(societyId)}`).pipe(
      catchError(err => throwError(() => this.message(err)))
    );
  }

  updateSociety(
    societyId: string,
    payload: {
      name: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      phone?: string;
      email?: string;
      flatCount?: number;
      flatPrefix?: string;
    }
  ): Observable<SocietyUpdateResult> {
    return this.http
      .put<Record<string, unknown>>(`/societies/${encodeURIComponent(societyId)}`, payload)
      .pipe(
        map(r => ({
          id: String(r['id'] ?? societyId),
          name: String(r['name'] ?? payload.name),
          address: r['address'] != null ? String(r['address']) : undefined,
          city: r['city'] != null ? String(r['city']) : undefined,
          state: r['state'] != null ? String(r['state']) : undefined,
          pincode: r['pincode'] != null ? String(r['pincode']) : undefined,
          flatCount: r['flatCount'] != null ? Number(r['flatCount']) : undefined,
          flatsAdded: r['flatsAdded'] != null ? Number(r['flatsAdded']) : 0,
          flatsRemoved: r['flatsRemoved'] != null ? Number(r['flatsRemoved']) : 0,
          flatPrefix: r['flatPrefix'] != null ? String(r['flatPrefix']) : undefined
        })),
        catchError(err => throwError(() => this.message(err)))
      );
  }

  private message(err: { error?: { message?: string }; message?: string }): string {
    return err?.error?.message || err?.message || 'Request failed';
  }
}
