import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  User,
  UserType,
  UserRole,
  UserStatus,
  VerificationStatus,
  Gender,
  DocumentType,
  UserListRequest,
  UserListResponse,
  UserActionResponse,
  FamilyMember
} from '../models/user.model';
import { isStaffMemberRole } from '../../../core/constants/role.constants';

/** Spring Data Page JSON as returned by the backend for /users/.../paged and /search */
interface SpringPage<T> {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  
  constructor(
    private http: HttpClient,
    private session: SessionContextService
  ) {}

  /** Cached society id → name for user detail labels (API users only have societyId). */
  private readonly societyNames = new Map<string, string>();

  /** Preload society names so user details show labels instead of UUIDs. */
  ensureSocietyNamesLoaded(): void {
    if (this.societyNames.size > 0) {
      return;
    }
    this.http.get<Array<{ id?: string; name?: string }>>('/societies').subscribe({
      next: rows => {
        (rows ?? []).forEach(s => {
          if (s.id && s.name) {
            this.societyNames.set(s.id, s.name);
          }
        });
      },
      error: () => {
        /* list may be empty; single fetch on demand still works */
      }
    });
  }

  /** Fetch and cache society name by id (for user detail modal). */
  resolveSocietyName(societyId: string): Observable<string> {
    const cached = this.societyNames.get(societyId);
    if (cached && !this.looksLikeUuid(cached)) {
      return of(cached);
    }
    return this.http.get<{ id?: string; name?: string }>(`/societies/${encodeURIComponent(societyId)}`).pipe(
      map(s => {
        const name = s?.name?.trim() || 'Unknown society';
        if (s?.id) {
          this.societyNames.set(s.id, name);
        } else {
          this.societyNames.set(societyId, name);
        }
        return name;
      }),
      catchError(() => of('Unknown society'))
    );
  }

  /** Human-readable society name from cache (use {@link resolveSocietyName} to load). */
  getSocietyDisplayName(societyId?: string, societyLabel?: string): string {
    if (societyLabel && !this.looksLikeUuid(societyLabel)) {
      return societyLabel;
    }
    if (!societyId) {
      return '—';
    }
    return this.societyNames.get(societyId) ?? '—';
  }

  private looksLikeUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
  }

  /**
   * Society for API calls: prefer admin/mobile session (sessionStorage) over stale localStorage.
   */
  private getSocietyId(): string {
    return this.session.getSocietyId();
  }

  /** Maps backend User JSON (Jackson camelCase) to admin UI {@link User}. */
  private normalizeUser(raw: any): User {
    const sid = raw.societyId ?? raw.society_id ?? '';
    return {
      id: raw.id,
      flatId: raw.flatId ?? raw.flat_id,
      firstName: raw.firstName ?? '',
      lastName: raw.lastName ?? '',
      email: raw.email ?? '',
      phone: raw.phone ?? '',
      alternatePhone: raw.alternatePhone,
      dateOfBirth: raw.dateOfBirth ? new Date(raw.dateOfBirth) : undefined,
      gender: raw.gender ?? Gender.MALE,
      profileImage: raw.profileImage,
      flatNumber: raw.flatNumber ?? '',
      building: raw.building ?? '',
      floor: raw.floor,
      society: this.resolveSocietyLabel(raw),
      societyId: sid || undefined,
      userType: raw.userType ?? UserType.OWNER,
      userRole: raw.userRole ?? UserRole.RESIDENT,
      status: raw.status ?? UserStatus.PENDING,
      verificationStatus: raw.verificationStatus ?? VerificationStatus.PENDING,
      documentsVerified: !!raw.documentsVerified,
      emailVerified: !!raw.emailVerified,
      phoneVerified: !!raw.phoneVerified,
      documents: Array.isArray(raw.documents) ? raw.documents : [],
      familyMembers: raw.familyMembers,
      primaryMemberId: raw.primaryMemberId,
      vehicleCount: typeof raw.vehicleCount === 'number' ? raw.vehicleCount : 0,
      petCount: typeof raw.petCount === 'number' ? raw.petCount : 0,
      rfidTagAssigned: !!raw.rfidTagAssigned,
      facialRecognitionSetup: !!raw.facialRecognitionSetup,
      registrationDate: raw.registrationDate ? new Date(raw.registrationDate) : new Date(0),
      lastLogin: raw.lastLogin ? new Date(raw.lastLogin) : undefined,
      lastModified: raw.lastModified ? new Date(raw.lastModified) : new Date(0),
      approvedBy: raw.approvedBy,
      approvedDate: raw.approvedDate ? new Date(raw.approvedDate) : undefined,
      emergencyContact: raw.emergencyContact,
      remarks: raw.remarks
    };
  }

  /** Prefer explicit society name from API; never treat societyId UUID as a display name. */
  private resolveSocietyLabel(raw: Record<string, unknown>): string | undefined {
    const sid = String(raw['societyId'] ?? raw['society_id'] ?? '');
    const candidates = [raw['societyName'], raw['society_name'], raw['society']];
    for (const c of candidates) {
      if (c == null || c === '') continue;
      const s = String(c);
      if (!this.looksLikeUuid(s) && s !== sid) {
        return s;
      }
    }
    if (sid && this.societyNames.has(sid)) {
      return this.societyNames.get(sid);
    }
    return undefined;
  }

  private mapSpringPageToUserListResponse(page: SpringPage<any>): UserListResponse {
    return {
      users: (page.content ?? []).map(c => this.normalizeUser(c)),
      totalCount: page.totalElements ?? 0,
      page: page.number ?? 0,
      pageSize: page.size ?? 0,
      totalPages: page.totalPages ?? 0
    };
  }

  /**
   * Paginated user list scoped to JWT society (Registered Users admin page).
   */
  getUsersPaged(request: UserListRequest): Observable<UserListResponse> {
    const societyId = this.getSocietyId();
    let params = new HttpParams()
      .set('page', String(request.page))
      .set('size', String(request.pageSize))
      .set('sortBy', request.sortBy || 'createdAt')
      .set('sortDir', request.sortOrder?.toUpperCase() || 'DESC');

    if (societyId) {
      params = params.set('societyId', societyId);
    }

    if (request.searchTerm?.trim()) {
      params = params.set('searchTerm', request.searchTerm.trim());
    }
    if (request.userType && request.userType !== 'ALL') {
      params = params.set('userType', request.userType);
    }
    if (request.userStatus && request.userStatus !== 'ALL') {
      params = params.set('status', request.userStatus);
    }
    if (request.verificationStatus && request.verificationStatus !== 'ALL') {
      params = params.set('verificationStatus', request.verificationStatus);
    }
    if (request.building && request.building !== 'ALL') {
      params = params.set('building', request.building);
    }
    if (request.flatLink && request.flatLink !== 'ALL') {
      params = params.set('flatLink', request.flatLink);
    }
    if (request.userRole === 'STAFF' || request.userRole === 'GUARD') {
      params = params.set('staffGroup', request.userRole);
    } else if (request.userRole && request.userRole !== 'ALL') {
      params = params.set('userRole', request.userRole);
    }

    return this.http
      .get<SpringPage<any>>('/users/current-society/paged', { params })
      .pipe(map(p => this.mapSpringPageToUserListResponse(p)));
  }

  /**
   * Get all users with pagination and filters (legacy: session society id in URL).
   */
  getUsers(request: UserListRequest): Observable<UserListResponse> {
    const societyId = this.getSocietyId();
    // Spring Page is 0-based; pass request.page as the page index from callers
    let params = new HttpParams()
      .set('page', String(request.page))
      .set('size', request.pageSize.toString());
    
    if (request.searchTerm) {
      return this.http
        .get<SpringPage<any>>(`/users/society/${societyId}/search`, {
          params: params.set('searchTerm', request.searchTerm)
        })
        .pipe(map(p => this.mapSpringPageToUserListResponse(p)));
    }
    
    if (request.sortBy) {
      params = params.set('sortBy', request.sortBy);
      params = params.set('sortDir', request.sortOrder?.toUpperCase() || 'DESC');
    }
    
    return this.http
      .get<SpringPage<any>>(`/users/society/${societyId}/paged`, { params })
      .pipe(map(p => this.mapSpringPageToUserListResponse(p)));
  }

  /**
   * Family members registered by a flat owner (mobile profile → admin user detail).
   */
  getFamilyMembersByUser(userId: string): Observable<FamilyMember[]> {
    if (!userId) {
      return of([]);
    }
    return this.http
      .get<Array<{ id?: string; name?: string; relation?: string; phone?: string; email?: string }>>(
        `/family-members/user/${encodeURIComponent(userId)}`
      )
      .pipe(
        map(rows =>
          (rows ?? []).map(m => ({
            id: m.id ?? '',
            name: m.name ?? '',
            relation: m.relation ?? '',
            phone: m.phone,
            email: m.email
          }))
        ),
        catchError(() => of([]))
      );
  }

  /**
   * Count vehicles and pets registered in the backend for a user (admin Registered Assets).
   */
  getRegisteredAssetCounts(userId: string): Observable<{ vehicleCount: number; petCount: number }> {
    if (!userId) {
      return of({ vehicleCount: 0, petCount: 0 });
    }
    return this.http
      .get<{ vehicleCount?: number; petCount?: number }>(
        `/users/${encodeURIComponent(userId)}/registered-assets`
      )
      .pipe(
        map(row => ({
          vehicleCount: typeof row?.vehicleCount === 'number' ? row.vehicleCount : 0,
          petCount: typeof row?.petCount === 'number' ? row.petCount : 0
        })),
        catchError(() =>
          forkJoin({
            vehicles: this.http
              .get<unknown[]>(`/vehicles/owner/${encodeURIComponent(userId)}`)
              .pipe(catchError(() => of([]))),
            pets: this.http
              .get<unknown[]>(`/pets/owner/${encodeURIComponent(userId)}`)
              .pipe(catchError(() => of([])))
          }).pipe(
            map(({ vehicles, pets }) => ({
              vehicleCount: Array.isArray(vehicles) ? vehicles.length : 0,
              petCount: Array.isArray(pets) ? pets.length : 0
            }))
          )
        )
      );
  }

  /**
   * Get all users without pagination (scoped to logged-in admin's society via JWT).
   */
  getAllUsers(): Observable<User[]> {
    const societyId = this.getSocietyId();
    let params = new HttpParams();
    if (societyId) {
      params = params.set('societyId', societyId);
    }
    return this.http
      .get<any[]>('/users/current-society', { params })
      .pipe(map(rows => (rows ?? []).map(r => this.normalizeUser(r))));
  }

  /**
   * Get user by ID
   */
  getUserById(id: string): Observable<User> {
    return this.http.get<any>(`/users/${id}`).pipe(map(r => this.normalizeUser(r)));
  }

  /**
   * Get user by email
   */
  getUserByEmail(email: string): Observable<User> {
    return this.http.get<any>(`/users/email/${encodeURIComponent(email)}`).pipe(map(r => this.normalizeUser(r)));
  }

  /**
   * Get user by phone
   */
  getUserByPhone(phone: string): Observable<User> {
    return this.http.get<any>(`/users/phone/${encodeURIComponent(phone)}`).pipe(map(r => this.normalizeUser(r)));
  }

  /**
   * Search users (backend returns a Spring Page)
   */
  searchUsers(term: string): Observable<User[]> {
    const societyId = this.getSocietyId();
    const params = new HttpParams()
      .set('searchTerm', term)
      .set('page', '0')
      .set('size', '200');
    return this.http
      .get<SpringPage<any>>(`/users/society/${societyId}/search`, { params })
      .pipe(map(p => (p.content ?? []).map(c => this.normalizeUser(c))));
  }

  /**
   * Create a new user
   */
  createUser(user: User): Observable<User> {
    return this.http.post<any>('/users', user).pipe(map(r => this.normalizeUser(r)));
  }

  /**
   * Create staff/guard user with password (backend hashes via UserService).
   */
  createStaffUser(payload: Record<string, unknown>): Observable<User> {
    return this.http.post<any>('/users/create', payload).pipe(map(r => this.normalizeUser(r)));
  }

  /**
   * Update user
   */
  updateUser(id: string, user: Partial<User>): Observable<User> {
    return this.http.put<any>(`/users/${id}`, user).pipe(
      map(r => this.normalizeUser(r)),
      catchError(err =>
        throwError(() => new Error(err?.error?.message || err?.message || 'Update failed'))
      )
    );
  }

  /**
   * Approve user registration
   */
  approveUser(userId: string, approvedBy: string): Observable<UserActionResponse> {
    return this.updateUser(userId, {
      verificationStatus: VerificationStatus.APPROVED,
      status: UserStatus.ACTIVE,
      approvedBy,
      approvedDate: new Date()
    } as Partial<User>).pipe(
      map(user => ({
        success: true,
        message: 'User approved successfully',
        user
      }))
    );
  }

  /**
   * Reject user registration
   */
  rejectUser(userId: string, reason: string): Observable<UserActionResponse> {
    return this.updateUser(userId, {
      verificationStatus: VerificationStatus.REJECTED,
      remarks: reason
    } as Partial<User>).pipe(
      map(user => ({
        success: true,
        message: 'User registration rejected',
        user
      }))
    );
  }

  /**
   * Suspend user
   */
  suspendUser(userId: string, reason: string): Observable<UserActionResponse> {
    return this.updateUser(userId, {
      status: UserStatus.SUSPENDED,
      remarks: reason
    } as Partial<User>).pipe(
      map(user => ({
        success: true,
        message: 'User suspended',
        user
      }))
    );
  }

  /**
   * Activate user
   */
  activateUser(userId: string): Observable<UserActionResponse> {
    return this.updateUser(userId, {
      status: UserStatus.ACTIVE
    } as Partial<User>).pipe(
      map(user => ({
        success: true,
        message: 'User activated',
        user
      }))
    );
  }

  /**
   * Delete user
   */
  deleteUser(userId: string): Observable<UserActionResponse> {
    return this.http.delete<void>(`/users/${userId}`).pipe(
      map(() => ({
        success: true,
        message: 'User deleted successfully'
      }))
    );
  }

  /**
   * Get users by status
   */
  getUsersByStatus(status: UserStatus): Observable<User[]> {
    const societyId = this.getSocietyId();
    return this.http
      .get<any[]>(`/users/society/${societyId}/status/${status}`)
      .pipe(map(rows => (rows ?? []).map(r => this.normalizeUser(r))));
  }

  /**
   * Get users by flat
   */
  getUsersByFlat(flatId: string): Observable<User[]> {
    return this.http
      .get<any[]>(`/users/flat/${flatId}`)
      .pipe(map(rows => (rows ?? []).map(r => this.normalizeUser(r))));
  }

  /** Active society from Society Setup (localStorage / admin session). */
  getActiveSocietyId(): string {
    return this.getSocietyId();
  }

  /** Flats in a society — used to link residents for complaints / amenities. */
  listFlatsBySociety(societyId: string): Observable<Array<{ id: string; flatNumber: string; floorNumber?: string }>> {
    if (!societyId) {
      return of([]);
    }
    return this.http.get<any[]>(`/flats/society/${encodeURIComponent(societyId)}`).pipe(
      map(rows =>
        (rows ?? []).map(r => ({
          id: String(r.id ?? ''),
          flatNumber: String(r.flatNumber ?? r.flat_number ?? ''),
          floorNumber: r.floorNumber ?? r.floor_number
        }))
      ),
      catchError(() => of([]))
    );
  }

  /** Persist flat_id on the user so mobile complaints and bookings work. */
  linkUserToFlat(
    userId: string,
    payload: { flatId: string; flatNumber: string; societyId: string }
  ): Observable<User> {
    return this.updateUser(userId, {
      flatId: payload.flatId,
      flatNumber: payload.flatNumber,
      societyId: payload.societyId
    } as Partial<User>);
  }

  /**
   * Get user count by society
   */
  getUserCount(): Observable<number> {
    const societyId = this.getSocietyId();
    return this.http.get<number>(`/users/society/${societyId}/count`);
  }


  /** Derive summary stats from an in-memory user list (avoids duplicate API calls). */
  buildUserStats(users: User[]): {
    totalUsers: number;
    activeUsers: number;
    pendingApproval: number;
    owners: number;
    tenants: number;
    suspended: number;
    staffMembers: number;
    usersWithoutFlatLink: number;
  } {
    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status === UserStatus.ACTIVE).length,
      pendingApproval: users.filter(u => u.verificationStatus === VerificationStatus.PENDING).length,
      owners: users.filter(u => u.userType === UserType.OWNER).length,
      tenants: users.filter(u => u.userType === UserType.TENANT).length,
      suspended: users.filter(u => u.status === UserStatus.SUSPENDED).length,
      staffMembers: users.filter(u => isStaffMemberRole(u.userRole)).length,
      usersWithoutFlatLink: users.filter(u => !u.flatId).length
    };
  }

  /** Unique building names for filter dropdowns. */
  extractBuildingNames(users: User[]): string[] {
    const buildings = [...new Set(users.map(u => u.building).filter(b => b))];
    return buildings.sort();
  }

  /**
   * Get user statistics
   */
  getUserStats(): Observable<any> {
    return this.getAllUsers().pipe(map(users => this.buildUserStats(users)));
  }

  /**
   * Summary cards for /admin/users — live counts from the active society.
   */
  getOverviewStats(): Observable<{
    totalResidents: number;
    flats: number;
    tenants: number;
    staffMembers: number;
    usersWithoutFlatLink: number;
  }> {
    const societyId = this.getSocietyId();
    return forkJoin({
      users: this.getAllUsers(),
      flats: this.listFlatsBySociety(societyId)
    }).pipe(
      map(({ users, flats }) => ({
        totalResidents: users.length,
        flats: flats.length,
        tenants: users.filter(u => u.userType === UserType.TENANT).length,
        staffMembers: users.filter(u => isStaffMemberRole(u.userRole)).length,
        usersWithoutFlatLink: users.filter(u => !u.flatId).length
      }))
    );
  }

  /**
   * Get unique buildings for filter
   * Note: This requires fetching all users first, which may not be efficient
   * Consider creating a dedicated endpoint for this
   */
  getBuildings(): Observable<string[]> {
    return this.getAllUsers().pipe(map(users => this.extractBuildingNames(users)));
  }
}
//       {
//         id: 'USR-001',
//         firstName: 'Rajesh',
//         lastName: 'Kumar',
//         email: 'rajesh.kumar@email.com',
//         phone: '9876543210',
//         alternatePhone: '9876543211',
//         dateOfBirth: new Date('1985-05-15'),
//         gender: Gender.MALE,
//         profileImage: '',
//         flatNumber: 'A-101',
//         building: 'Tower A',
//         floor: '1',
//         society: 'Green Valley Society',
//         userType: UserType.OWNER,
//         userRole: UserRole.RESIDENT,
//         status: UserStatus.ACTIVE,
//         verificationStatus: VerificationStatus.APPROVED,
//         documentsVerified: true,
//         emailVerified: true,
//         phoneVerified: true,
//         documents: [
//           {
//             id: 'DOC-001',
//             documentType: DocumentType.AADHAAR,
//             documentNumber: 'XXXX-XXXX-1234',
//             fileUrl: '/documents/aadhaar_001.pdf',
//             fileName: 'aadhaar.pdf',
//             uploadedDate: new Date('2024-01-10'),
//             verified: true,
//             verifiedBy: 'ADMIN-001',
//             verifiedDate: new Date('2024-01-11')
//           }
//         ],
//         familyMembers: [
//           { id: 'FM-001', name: 'Priya Kumar', relation: 'Wife', phone: '9876543212' },
//           { id: 'FM-002', name: 'Aryan Kumar', relation: 'Son' }
//         ],
//         vehicleCount: 2,
//         petCount: 1,
//         rfidTagAssigned: true,
//         facialRecognitionSetup: true,
//         registrationDate: new Date('2024-01-10'),
//         lastLogin: new Date('2024-12-17'),
//         lastModified: new Date('2024-12-10'),
//         approvedBy: 'ADMIN-001',
//         approvedDate: new Date('2024-01-11'),
//         emergencyContact: {
//           name: 'Suresh Kumar',
//           relation: 'Brother',
//           phone: '9876543220'
//         }
//       },
//       {
//         id: 'USR-002',
//         firstName: 'Priya',
//         lastName: 'Sharma',
//         email: 'priya.sharma@email.com',
//         phone: '9876543220',
//         dateOfBirth: new Date('1990-08-22'),
//         gender: Gender.FEMALE,
//         flatNumber: 'B-205',
//         building: 'Tower B',
//         floor: '2',
//         society: 'Green Valley Society',
//         userType: UserType.TENANT,
//         userRole: UserRole.RESIDENT,
//         status: UserStatus.ACTIVE,
//         verificationStatus: VerificationStatus.APPROVED,
//         documentsVerified: true,
//         emailVerified: true,
//         phoneVerified: true,
//         documents: [
//           {
//             id: 'DOC-002',
//             documentType: DocumentType.RENT_AGREEMENT,
//             documentNumber: 'RA-2024-001',
//             fileUrl: '/documents/rent_001.pdf',
//             fileName: 'rent_agreement.pdf',
//             uploadedDate: new Date('2024-02-01'),
//             verified: true,
//             verifiedBy: 'ADMIN-001',
//             verifiedDate: new Date('2024-02-02'),
//             expiryDate: new Date('2025-01-31')
//           }
//         ],
//         vehicleCount: 1,
//         petCount: 0,
//         rfidTagAssigned: true,
//         facialRecognitionSetup: false,
//         registrationDate: new Date('2024-02-01'),
//         lastLogin: new Date('2024-12-16'),
//         lastModified: new Date('2024-12-05'),
//         approvedBy: 'ADMIN-001',
//         approvedDate: new Date('2024-02-02')
//       },
//       {
//         id: 'USR-003',
//         firstName: 'Amit',
//         lastName: 'Patel',
//         email: 'amit.patel@email.com',
//         phone: '9876543230',
//         dateOfBirth: new Date('1988-03-10'),
//         gender: Gender.MALE,
//         flatNumber: 'C-310',
//         building: 'Tower C',
//         floor: '3',
//         society: 'Green Valley Society',
//         userType: UserType.OWNER,
//         userRole: UserRole.COMMITTEE_MEMBER,
//         status: UserStatus.ACTIVE,
//         verificationStatus: VerificationStatus.APPROVED,
//         documentsVerified: true,
//         emailVerified: true,
//         phoneVerified: true,
//         documents: [],
//         familyMembers: [
//           { id: 'FM-003', name: 'Neha Patel', relation: 'Wife', phone: '9876543231' }
//         ],
//         vehicleCount: 1,
//         petCount: 2,
//         rfidTagAssigned: true,
//         facialRecognitionSetup: true,
//         registrationDate: new Date('2023-06-15'),
//         lastLogin: new Date('2024-12-17'),
//         lastModified: new Date('2024-11-20'),
//         approvedBy: 'ADMIN-001',
//         approvedDate: new Date('2023-06-16')
//       },
//       {
//         id: 'USR-004',
//         firstName: 'Sneha',
//         lastName: 'Reddy',
//         email: 'sneha.reddy@email.com',
//         phone: '9876543240',
//         dateOfBirth: new Date('1992-11-05'),
//         gender: Gender.FEMALE,
//         flatNumber: 'A-402',
//         building: 'Tower A',
//         floor: '4',
//         society: 'Green Valley Society',
//         userType: UserType.OWNER,
//         userRole: UserRole.SECRETARY,
//         status: UserStatus.ACTIVE,
//         verificationStatus: VerificationStatus.APPROVED,
//         documentsVerified: true,
//         emailVerified: true,
//         phoneVerified: true,
//         documents: [],
//         vehicleCount: 2,
//         petCount: 0,
//         rfidTagAssigned: true,
//         facialRecognitionSetup: true,
//         registrationDate: new Date('2023-03-20'),
//         lastLogin: new Date('2024-12-17'),
//         lastModified: new Date('2024-10-15'),
//         approvedBy: 'ADMIN-001',
//         approvedDate: new Date('2023-03-21')
//       },
//       {
//         id: 'USR-005',
//         firstName: 'Mohammed',
//         lastName: 'Khan',
//         email: 'mohammed.khan@email.com',
//         phone: '9876543250',
//         dateOfBirth: new Date('1995-07-18'),
//         gender: Gender.MALE,
//         flatNumber: 'B-102',
//         building: 'Tower B',
//         floor: '1',
//         society: 'Green Valley Society',
//         userType: UserType.TENANT,
//         userRole: UserRole.RESIDENT,
//         status: UserStatus.ACTIVE,
//         verificationStatus: VerificationStatus.PENDING,
//         documentsVerified: false,
//         emailVerified: true,
//         phoneVerified: true,
//         documents: [
//           {
//             id: 'DOC-005',
//             documentType: DocumentType.AADHAAR,
//             documentNumber: 'XXXX-XXXX-5678',
//             fileUrl: '/documents/aadhaar_005.pdf',
//             fileName: 'aadhaar.pdf',
//             uploadedDate: new Date('2024-12-10'),
//             verified: false
//           }
//         ],
//         vehicleCount: 0,
//         petCount: 0,
//         rfidTagAssigned: false,
//         facialRecognitionSetup: false,
//         registrationDate: new Date('2024-12-10'),
//         lastModified: new Date('2024-12-10'),
//         remarks: 'Documents under verification'
//       },
//       {
//         id: 'USR-006',
//         firstName: 'Anita',
//         lastName: 'Desai',
//         email: 'anita.desai@email.com',
//         phone: '9876543260',
//         dateOfBirth: new Date('1980-01-25'),
//         gender: Gender.FEMALE,
//         flatNumber: 'C-501',
//         building: 'Tower C',
//         floor: '5',
//         society: 'Green Valley Society',
//         userType: UserType.OWNER,
//         userRole: UserRole.CHAIRMAN,
//         status: UserStatus.ACTIVE,
//         verificationStatus: VerificationStatus.APPROVED,
//         documentsVerified: true,
//         emailVerified: true,
//         phoneVerified: true,
//         documents: [],
//         familyMembers: [
//           { id: 'FM-006', name: 'Ramesh Desai', relation: 'Husband', phone: '9876543261' },
//           { id: 'FM-007', name: 'Kavya Desai', relation: 'Daughter', phone: '9876543262' }
//         ],
//         vehicleCount: 3,
//         petCount: 1,
//         rfidTagAssigned: true,
//         facialRecognitionSetup: true,
//         registrationDate: new Date('2022-05-10'),
//         lastLogin: new Date('2024-12-17'),
//         lastModified: new Date('2024-09-20'),
//         approvedBy: 'ADMIN-001',
//         approvedDate: new Date('2022-05-11')
//       },
//       {
//         id: 'USR-007',
//         firstName: 'Vikram',
//         lastName: 'Singh',
//         email: 'vikram.singh@email.com',
//         phone: '9876543270',
//         dateOfBirth: new Date('1987-09-12'),
//         gender: Gender.MALE,
//         flatNumber: 'A-203',
//         building: 'Tower A',
//         floor: '2',
//         society: 'Green Valley Society',
//         userType: UserType.OWNER,
//         userRole: UserRole.RESIDENT,
//         status: UserStatus.SUSPENDED,
//         verificationStatus: VerificationStatus.APPROVED,
//         documentsVerified: true,
//         emailVerified: true,
//         phoneVerified: true,
//         documents: [],
//         vehicleCount: 1,
//         petCount: 0,
//         rfidTagAssigned: true,
//         facialRecognitionSetup: false,
//         registrationDate: new Date('2023-08-05'),
//         lastLogin: new Date('2024-11-01'),
//         lastModified: new Date('2024-11-15'),
//         approvedBy: 'ADMIN-001',
//         approvedDate: new Date('2023-08-06'),
//         remarks: 'Suspended due to maintenance dues'
//       },
//       {
//         id: 'USR-008',
//         firstName: 'Lakshmi',
//         lastName: 'Nair',
//         email: 'lakshmi.nair@email.com',
//         phone: '9876543280',
//         dateOfBirth: new Date('1993-04-30'),
//         gender: Gender.FEMALE,
//         flatNumber: 'B-301',
//         building: 'Tower B',
//         floor: '3',
//         society: 'Green Valley Society',
//         userType: UserType.FAMILY_MEMBER,
//         userRole: UserRole.RESIDENT,
//         status: UserStatus.ACTIVE,
//         verificationStatus: VerificationStatus.APPROVED,
//         documentsVerified: true,
//         emailVerified: true,
//         phoneVerified: false,
//         documents: [],
//         primaryMemberId: 'USR-009',
//         vehicleCount: 0,
//         petCount: 0,
//         rfidTagAssigned: true,
//         facialRecognitionSetup: false,
//         registrationDate: new Date('2024-03-15'),
//         lastLogin: new Date('2024-12-15'),
//         lastModified: new Date('2024-06-20'),
//         approvedBy: 'ADMIN-001',
//         approvedDate: new Date('2024-03-16')
//       },
//       {
//         id: 'USR-009',
//         firstName: 'Ravi',
//         lastName: 'Nair',
//         email: 'ravi.nair@email.com',
//         phone: '9876543290',
//         dateOfBirth: new Date('1982-12-08'),
//         gender: Gender.MALE,
//         flatNumber: 'B-301',
//         building: 'Tower B',
//         floor: '3',
//         society: 'Green Valley Society',
//         userType: UserType.OWNER,
//         userRole: UserRole.TREASURER,
//         status: UserStatus.ACTIVE,
//         verificationStatus: VerificationStatus.APPROVED,
//         documentsVerified: true,
//         emailVerified: true,
//         phoneVerified: true,
//         documents: [],
//         familyMembers: [
//           { id: 'FM-008', name: 'Lakshmi Nair', relation: 'Wife', phone: '9876543280' }
//         ],
//         vehicleCount: 2,
//         petCount: 0,
//         rfidTagAssigned: true,
//         facialRecognitionSetup: true,
//         registrationDate: new Date('2022-11-20'),
//         lastLogin: new Date('2024-12-17'),
//         lastModified: new Date('2024-08-10'),
//         approvedBy: 'ADMIN-001',
//         approvedDate: new Date('2022-11-21')
//       },
//       {
//         id: 'USR-010',
//         firstName: 'Deepak',
//         lastName: 'Gupta',
//         email: 'deepak.gupta@email.com',
//         phone: '9876543300',
//         dateOfBirth: new Date('1998-06-20'),
//         gender: Gender.MALE,
//         flatNumber: 'C-105',
//         building: 'Tower C',
//         floor: '1',
//         society: 'Green Valley Society',
//         userType: UserType.PG_GUEST,
//         userRole: UserRole.RESIDENT,
//         status: UserStatus.ACTIVE,
//         verificationStatus: VerificationStatus.UNDER_REVIEW,
//         documentsVerified: false,
//         emailVerified: true,
//         phoneVerified: true,
//         documents: [
//           {
//             id: 'DOC-010',
//             documentType: DocumentType.AADHAAR,
//             documentNumber: 'XXXX-XXXX-9012',
//             fileUrl: '/documents/aadhaar_010.pdf',
//             fileName: 'aadhaar.pdf',
//             uploadedDate: new Date('2024-12-15'),
//             verified: false
//           }
//         ],
//         vehicleCount: 0,
//         petCount: 0,
//         rfidTagAssigned: false,
//         facialRecognitionSetup: false,
//         registrationDate: new Date('2024-12-15'),
//         lastModified: new Date('2024-12-15'),
//         remarks: 'PG accommodation - 6 months'
//       }
//     ];
//   }
// }
