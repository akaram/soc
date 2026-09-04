import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  FamilyMember,
  FamilyMemberRequest,
  FamilyMemberResponse,
  FamilyMemberListResponse,
  FamilyStatistics,
  FamilyMemberFilter,
  Gender
} from '../models/family-member.model';
import { SessionContextService } from '../../../core/services/session-context.service';
import { memberMatchesFilter } from './family-user.mapper';
import { FamilyMemberApiRow, mapApiRowToFamilyMember } from './family-api.mapper';

/**
 * Family Profiles admin — backed by GET /family-members/society/{id}
 * (same records owners add from mobile profile).
 */
@Injectable({
  providedIn: 'root'
})
export class FamilyMemberService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  getAllMembers(): Observable<FamilyMemberListResponse> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({
        success: false,
        members: [],
        totalCount: 0,
        message: 'Select a society in Society Setup first.'
      });
    }
    return this.http
      .get<FamilyMemberApiRow[]>(`/family-members/society/${encodeURIComponent(societyId)}`)
      .pipe(
        map(rows => {
          const members = (rows ?? []).map(mapApiRowToFamilyMember);
          return {
            success: true,
            members,
            totalCount: members.length
          };
        }),
        catchError(() =>
          of({
            success: false,
            members: [] as FamilyMember[],
            totalCount: 0,
            message: 'Could not load family members. Is the backend running on port 9999?'
          })
        )
      );
  }

  getMembersByUnit(unitId: string): Observable<FamilyMemberListResponse> {
    return this.getAllMembers().pipe(
      map(res => {
        const members = res.members.filter(
          m => m.unitId === unitId || m.unitNumber === unitId
        );
        return { success: res.success, members, totalCount: members.length, message: res.message };
      })
    );
  }

  getMemberById(id: string): Observable<FamilyMember | undefined> {
    return this.http.get<FamilyMemberApiRow>(`/family-members/${encodeURIComponent(id)}`).pipe(
      map(row => mapApiRowToFamilyMember(row)),
      catchError(() => of(undefined))
    );
  }

  addMember(request: FamilyMemberRequest): Observable<FamilyMemberResponse> {
    const societyId = this.session.getSocietyId();
    if (!societyId) {
      return of({ success: false, message: 'No society in session', errors: ['societyId'] });
    }
    const name = `${request.firstName} ${request.lastName}`.trim();
    const payload = {
      name,
      relation: request.relationship,
      phone: request.phoneNumber ?? '',
      email: request.email,
      userId: '',
      unitId: request.unitId,
      addedBy: 'admin'
    };
    return this.http.post<FamilyMemberApiRow>('/family-members', payload).pipe(
      map(row => ({
        success: true,
        message: 'Family member added',
        member: mapApiRowToFamilyMember(row)
      })),
      catchError(err => {
        const msg = err?.error?.message || err?.message || 'Create failed';
        return of({ success: false, message: String(msg), errors: [String(msg)] });
      })
    );
  }

  updateMember(id: string, updates: Partial<FamilyMember>): Observable<FamilyMemberResponse> {
    const name = updates.fullName ?? `${updates.firstName ?? ''} ${updates.lastName ?? ''}`.trim();
    const payload = {
      name,
      relation: updates.relationship,
      phone: updates.phoneNumber ?? '',
      email: updates.email,
      addedBy: 'admin'
    };
    return this.http.put<FamilyMemberApiRow>(`/family-members/${encodeURIComponent(id)}`, payload).pipe(
      map(row => ({
        success: true,
        message: 'Updated',
        member: mapApiRowToFamilyMember(row)
      })),
      catchError(err => of({ success: false, message: String(err?.message || 'Update failed') }))
    );
  }

  deleteMember(id: string): Observable<FamilyMemberResponse> {
    return this.http.delete<void>(`/family-members/${encodeURIComponent(id)}`).pipe(
      map(() => ({ success: true, message: 'Deleted' })),
      catchError(err => of({ success: false, message: String(err?.message || 'Delete failed') }))
    );
  }

  searchMembers(filter: FamilyMemberFilter): Observable<FamilyMemberListResponse> {
    return this.getAllMembers().pipe(
      map(res => {
        const members = res.members.filter(m => memberMatchesFilter(m, filter));
        return { success: res.success, members, totalCount: members.length, message: res.message };
      })
    );
  }

  getFamilyStatistics(unitId?: string): Observable<FamilyStatistics> {
    return this.getAllMembers().pipe(
      map(res => {
        const members = unitId
          ? res.members.filter(m => m.unitId === unitId || m.unitNumber === unitId)
          : res.members;
        const total = Math.max(members.length, 1);
        return {
          totalMembers: members.length,
          maleCount: members.filter(m => m.gender === Gender.MALE).length,
          femaleCount: members.filter(m => m.gender === Gender.FEMALE).length,
          childrenCount: members.filter(m => m.age < 18).length,
          adultsCount: members.filter(m => m.age >= 18 && m.age < 60).length,
          seniorsCount: members.filter(m => m.age >= 60).length,
          averageAge: members.reduce((s, m) => s + m.age, 0) / total,
          relationshipDistribution: members.reduce(
            (acc, m) => {
              acc[m.relationship] = (acc[m.relationship] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
          bloodGroupDistribution: {}
        };
      })
    );
  }

  toggleAccess(memberId: string, accessType: 'gate' | 'amenity'): Observable<FamilyMemberResponse> {
    return of({
      success: false,
      message:
        accessType === 'gate'
          ? 'Gate access flags are not stored on the family member API in this POC.'
          : 'Amenity access flags are not stored on the family member API in this POC.'
    });
  }
}
