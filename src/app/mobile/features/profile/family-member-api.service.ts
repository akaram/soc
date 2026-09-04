import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, switchMap, map, catchError } from 'rxjs';
import { MobileAuthService, MobileUser } from '../../services/mobile-auth.service';
import { PetService } from '../pets/services/pet.service';

/** Family member row from GET /family-members/user/{userId}. */
export interface FamilyMemberRow {
  id: string;
  name: string;
  relation: string;
  phone?: string;
  email?: string;
  userId?: string;
  unitId?: string;
}

export type FamilyMemberSaveResult =
  | { success: true; member: FamilyMemberRow }
  | { success: false; message: string };

type FamilyMemberPayload = {
  name: string;
  relation: string;
  phone: string;
  userId: string;
  unitId?: string;
  addedBy: string;
};

/**
 * Backend API for flat owner family members (synced to admin user detail).
 */
@Injectable({ providedIn: 'root' })
export class FamilyMemberApiService {
  constructor(
    private http: HttpClient,
    private auth: MobileAuthService,
    private petService: PetService
  ) {}

  listByUser(userId: string): Observable<FamilyMemberRow[]> {
    if (!userId) {
      return of([]);
    }
    return this.http
      .get<FamilyMemberRow[]>(`/family-members/user/${encodeURIComponent(userId)}`)
      .pipe(catchError(() => of([])));
  }

  getById(id: string): Observable<FamilyMemberRow | null> {
    return this.http
      .get<FamilyMemberRow>(`/family-members/${encodeURIComponent(id)}`)
      .pipe(catchError(() => of(null)));
  }

  private create(payload: FamilyMemberPayload): Observable<FamilyMemberSaveResult> {
    return this.http.post<FamilyMemberRow>('/family-members', payload).pipe(
      map(member => ({ success: true as const, member })),
      catchError(err => of({ success: false as const, message: this.errorMessage(err) }))
    );
  }

  private update(id: string, payload: FamilyMemberPayload): Observable<FamilyMemberSaveResult> {
    return this.http
      .put<FamilyMemberRow>(`/family-members/${encodeURIComponent(id)}`, payload)
      .pipe(
        map(member => ({ success: true as const, member })),
        catchError(err => of({ success: false as const, message: this.errorMessage(err) }))
      );
  }

  delete(id: string): Observable<boolean> {
    return this.http
      .delete<void>(`/family-members/${encodeURIComponent(id)}`)
      .pipe(
        map(() => true),
        catchError(() => of(false))
      );
  }

  /**
   * Resolve flat UUID — session first, then live user profile, then flat number lookup.
   * Backend can also resolve from userId when unitId is omitted on POST.
   */
  private resolveUnitId(user: MobileUser): Observable<string | null> {
    return this.petService
      .resolveFlatForRegistration({
        flatId: user.flatId,
        flatNumber: user.flatNumber,
        userId: user.id,
        societyId: user.societyId
      })
      .pipe(map(f => f?.id ?? null));
  }

  /** Persist family member; server resolves flat from user profile when possible. */
  saveForUser(
    user: MobileUser,
    data: { name: string; relation: string; phone: string },
    backendId?: string | null
  ): Observable<FamilyMemberSaveResult> {
    return this.resolveUnitId(user).pipe(
      switchMap(unitId => {
        const payload: FamilyMemberPayload = {
          name: data.name.trim(),
          relation: data.relation.trim(),
          phone: data.phone.trim(),
          userId: user.id,
          addedBy: user.id
        };
        if (unitId) {
          payload.unitId = unitId;
        }
        if (backendId) {
          return this.update(backendId, payload);
        }
        return this.create(payload);
      })
    );
  }

  private errorMessage(err: { status?: number; error?: { message?: string }; message?: string }): string {
    if (err?.status === 401) {
      return 'Session expired. Please log out and log in again.';
    }
    if (err?.status === 403) {
      return 'You do not have permission to save family members. Contact society admin.';
    }
    const server = err?.error?.message;
    if (server) {
      if (server.toLowerCase().includes('unitid') || server.toLowerCase().includes('flat')) {
        return 'Your flat is not linked yet. In admin: Users → open your account → Link flat → then log out and log in on mobile.';
      }
      return server;
    }
    if (err?.status === 0) {
      return 'Cannot reach server. Start the backend on port 9999.';
    }
    return err?.message || 'Could not save family member.';
  }
}
