import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { SessionContextService } from '../../../../core/services/session-context.service';
import { User, UserStatus, VerificationStatus } from '../../../../modules/user-management/models/user.model';

/**
 * Service to load users for facial recognition enrollment dropdown.
 * Always scoped to the Society Setup / session society (not JWT alone).
 */
@Injectable({
  providedIn: 'root'
})
export class UserDropdownService {
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  /**
   * Users eligible for face enrollment in the active society only.
   * Passes societyId so Super Admins see the Society Setup selection, not JWT home society.
   */
  getUsersForEnrollment(societyId?: string): Observable<User[]> {
    // Prefer explicit Society Setup id; never rely on JWT when admin is enrolling.
    const fromSetup =
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('societyId')?.trim()) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('societyId')?.trim()) ||
      '';
    const sid = (societyId || fromSetup || this.session.getSocietyId() || '').trim();
    if (!sid || sid === 'default-society-id') {
      return throwError(
        () => new Error('No society selected. Open Society Setup and click Select on Sterling Raheja (or your society).')
      );
    }

    const params = new HttpParams().set('societyId', sid);
    const url = '/users/current-society';
    console.log('UserDropdownService: Fetching users for society:', sid);

    return this.http.get<User[]>(url, { params }).pipe(
      tap(response => {
        console.log('UserDropdownService: Raw API response count:', Array.isArray(response) ? response.length : 0);
      }),
      map((users: any[]) => {
        if (!Array.isArray(users)) {
          console.warn('UserDropdownService: Response is not an array, converting...', users);
          users = users ? [users] : [];
        }

        const mappedUsers = users.map(user => this.mapBackendUserToFrontend(user));

        // Hard filter: never show users from another society (safety net).
        const societyScoped = mappedUsers.filter(u => {
          if (!u.societyId) {
            return true; // backend list is already society-scoped; keep if field missing
          }
          return u.societyId === sid;
        });

        const filteredUsers = societyScoped.filter(
          u =>
            u.status !== UserStatus.BLOCKED &&
            u.verificationStatus !== VerificationStatus.REJECTED
        );

        console.log(
          'UserDropdownService: Society-scoped eligible users:',
          filteredUsers.length,
          'for',
          sid
        );

        filteredUsers.sort((a, b) => {
          const nameA = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase().trim();
          const nameB = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase().trim();
          return nameA.localeCompare(nameB);
        });

        return filteredUsers;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('UserDropdownService: Error fetching users:', error);

        let errorMessage = 'Failed to load users';

        if (error.status === 0) {
          errorMessage = 'Cannot connect to server. Please check if the backend is running.';
        } else if (error.status === 401) {
          errorMessage = 'Unauthorized. Please log in as admin.';
        } else if (error.status === 403) {
          errorMessage = 'Access denied. Admin privileges required.';
        } else if (error.status === 404) {
          errorMessage = `Users endpoint not found. URL: ${error.url}`;
        } else if (error.status === 400) {
          errorMessage = error.error?.message || 'Invalid society selection.';
        } else if (error.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = error.error?.message || error.message || 'Unknown error occurred';
        }

        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /** Map backend User entity to frontend User model. */
  private mapBackendUserToFrontend(backendUser: any): User {
    return {
      id: backendUser.id || backendUser.userId,
      firstName: backendUser.firstName || backendUser.first_name || '',
      lastName: backendUser.lastName || backendUser.last_name || '',
      email: backendUser.email || '',
      phone: backendUser.phone || '',
      alternatePhone: backendUser.alternatePhone || backendUser.alternate_phone,
      dateOfBirth: backendUser.dateOfBirth || backendUser.date_of_birth,
      gender: backendUser.gender || 'MALE',
      profileImage: backendUser.profileImage || backendUser.profile_image,
      flatId: backendUser.flatId || backendUser.flat_id,
      flatNumber: backendUser.flatNumber || backendUser.flat_number || '',
      building: backendUser.building || '',
      floor: backendUser.floor || '',
      society: backendUser.society || backendUser.societyName || '',
      societyId: backendUser.societyId || backendUser.society_id || '',
      userType: backendUser.userType || backendUser.user_type || 'OWNER',
      userRole: backendUser.userRole || backendUser.user_role || 'RESIDENT',
      status: (backendUser.status || UserStatus.INACTIVE) as UserStatus,
      verificationStatus: (backendUser.verificationStatus ||
        backendUser.verification_status ||
        VerificationStatus.PENDING) as VerificationStatus,
      documentsVerified: backendUser.documentsVerified || backendUser.documents_verified || false,
      emailVerified: backendUser.emailVerified || backendUser.email_verified || false,
      phoneVerified: backendUser.phoneVerified || backendUser.phone_verified || false,
      documents: backendUser.documents || [],
      familyMembers: backendUser.familyMembers || backendUser.family_members || [],
      primaryMemberId: backendUser.primaryMemberId || backendUser.primary_member_id,
      vehicleCount: backendUser.vehicleCount || backendUser.vehicle_count || 0,
      petCount: backendUser.petCount || backendUser.pet_count || 0,
      rfidTagAssigned: backendUser.rfidTagAssigned || backendUser.rfid_tag_assigned || false,
      facialRecognitionSetup: backendUser.facialRecognitionSetup || backendUser.facial_recognition_setup || false,
      registrationDate: backendUser.registrationDate || backendUser.registration_date || new Date(),
      lastLogin: backendUser.lastLogin || backendUser.last_login,
      lastModified: backendUser.lastModified || backendUser.last_modified || new Date(),
      approvedBy: backendUser.approvedBy || backendUser.approved_by,
      approvedDate: backendUser.approvedDate || backendUser.approved_date,
      remarks: backendUser.remarks
    } as User;
  }

  /** Prefer Society Setup selection for admin enrollment dropdown. */
  getSocietyId(): string | null {
    const setup =
      sessionStorage.getItem('societyId')?.trim() ||
      localStorage.getItem('societyId')?.trim() ||
      '';
    if (setup) {
      return setup;
    }
    const societyId = this.session.getSocietyId();
    return societyId || null;
  }
}
