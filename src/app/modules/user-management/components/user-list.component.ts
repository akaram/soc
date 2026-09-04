import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { UserManagementService } from '../services/user-management.service';
import {
  User,
  UserType,
  UserStatus,
  VerificationStatus,
  UserRole
} from '../models/user.model';
import {
  formatRoleLabel,
  getRoleIcon,
  isStaffMemberRole
} from '../../../core/constants/role.constants';
import { filter, skip } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import { ProfileAvatarComponent } from '../../../core/components/profile-avatar.component';
import { isValidProfilePhoto } from '../../../core/utils/profile-photo.util';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ProfileAvatarComponent],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit, OnDestroy {
  users: User[] = [];
  /** Total rows matching filters (from server). */
  totalCount = 0;

  /** Active society from Society Setup / login session. */
  activeSocietyId = '';
  activeSocietyName = '—';

  // Filters
  searchTerm = '';
  filterUserType: UserType | 'ALL' = 'ALL';
  filterUserRole: UserRole | 'ALL' | 'STAFF' | 'GUARD' = 'ALL';
  filterStatus: UserStatus | 'ALL' = 'ALL';
  filterVerification: VerificationStatus | 'ALL' = 'ALL';
  filterBuilding = 'ALL';
  /** Filter by whether the user has a database flat_id (required for mobile complaints). */
  filterFlatLink: 'ALL' | 'UNLINKED' | 'LINKED' = 'ALL';

  /** Flats in the active society from Society Setup; null until loaded. */
  societyFlatCount: number | null = null;
  
  // Filter options
  userTypes = Object.values(UserType);
  userRoles = Object.values(UserRole);
  userStatuses = Object.values(UserStatus);
  verificationStatuses = Object.values(VerificationStatus);
  buildings: string[] = [];
  
  // View options
  viewMode: 'card' | 'table' = 'table';
  selectedUser: User | null = null;
  showDetailModal = false;
  
  // Loading & Pagination (server-side; page is 1-based in UI, 0-based in API)
  isLoading = false;
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  readonly pageSizeOptions = [5, 10, 20, 50];
  private searchDebounce?: ReturnType<typeof setTimeout>;
  private routerSub?: Subscription;

  // Direct lookup (works even if user belongs to another society)
  lookup = {
    email: '',
    phone: '',
    busy: false,
    message: ''
  };

  /** Flat linking in user detail modal (required for mobile complaints). */
  flatLink = {
    societyId: '',
    flats: [] as Array<{ id: string; flatNumber: string; floorNumber?: string }>,
    selectedFlatId: '',
    loading: false,
    saving: false,
    message: '',
    error: ''
  };
  
  // Statistics
  stats = {
    totalUsers: 0,
    activeUsers: 0,
    pendingApproval: 0,
    owners: 0,
    tenants: 0,
    suspended: 0,
    usersWithoutFlatLink: 0
  };

  constructor(
    public userService: UserManagementService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.userService.ensureSocietyNamesLoaded();
    this.loadActiveSocietyLabel();
    this.loadStats();
    this.loadBuildings();
    this.loadUsers();
    this.loadSocietyFlatCount();
    this.route.queryParamMap.subscribe(params => {
      const q = params.get('q');
      if (q) {
        this.searchTerm = q;
      }
      if (params.get('flatLink') === 'unlinked') {
        this.filterFlatLink = 'UNLINKED';
      }
      if (q || params.get('flatLink') === 'unlinked') {
        this.currentPage = 1;
        this.loadUsers();
      }
    });
    // Reload when returning from Society Setup after changing selection.
    this.routerSub = this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        filter(e => e.urlAfterRedirects.includes('users-list')),
        skip(1)
      )
      .subscribe(() => this.reloadForActiveSociety());
  }

  /** Refresh list after Society Setup changes the selected society. */
  private reloadForActiveSociety(): void {
    this.loadActiveSocietyLabel();
    this.currentPage = 1;
    this.loadStats();
    this.loadBuildings();
    this.loadUsers();
    this.loadSocietyFlatCount();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
  }

  /** Resolve selected society id + display name for the page header. */
  loadActiveSocietyLabel(): void {
    this.activeSocietyId = this.userService.getActiveSocietyId();
    if (!this.activeSocietyId) {
      this.activeSocietyName = 'No society selected';
      return;
    }
    this.activeSocietyName = this.userService.getSocietyDisplayName(this.activeSocietyId);
    this.userService.resolveSocietyName(this.activeSocietyId).subscribe(name => {
      this.activeSocietyName = name;
    });
  }

  /** Summary cards — loaded once per refresh (not per table page). */
  loadStats(): void {
    this.userService.getUserStats().subscribe({
      next: stats => {
        this.stats = stats;
      },
      error: () => {
        /* keep previous stats */
      }
    });
  }

  /** Building filter options from all users in scope. */
  loadBuildings(): void {
    this.userService.getBuildings().subscribe({
      next: buildings => {
        this.buildings = buildings;
      },
      error: () => {
        this.buildings = [];
      }
    });
  }

  /** Residents without flat_id — from stats refresh. */
  get usersWithoutFlatLink(): number {
    return this.stats.usersWithoutFlatLink;
  }

  /** Load flat inventory for the active society (Society Setup session). */
  loadSocietyFlatCount(): void {
    const societyId = this.userService.getActiveSocietyId();
    if (!societyId) {
      this.societyFlatCount = 0;
      return;
    }
    this.userService.listFlatsBySociety(societyId).subscribe({
      next: flats => {
        this.societyFlatCount = flats.length;
      },
      error: () => {
        this.societyFlatCount = 0;
      }
    });
  }

  /** Quick filter: show only users missing a database flat link. */
  showUnlinkedUsersOnly(): void {
    this.filterFlatLink = 'UNLINKED';
    this.currentPage = 1;
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService
      .getUsersPaged({
        page: this.currentPage - 1,
        pageSize: this.pageSize,
        searchTerm: this.searchTerm.trim() || undefined,
        userType: this.filterUserType,
        userRole: this.filterUserRole,
        userStatus: this.filterStatus,
        verificationStatus: this.filterVerification,
        building: this.filterBuilding,
        flatLink: this.filterFlatLink,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })
      .subscribe({
        next: response => {
          this.users = response.users;
          this.totalCount = response.totalCount;
          this.totalPages = Math.max(1, response.totalPages);
          if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages;
          }
          this.isLoading = false;
        },
        error: error => {
          console.error('Error loading users:', error);
          this.isLoading = false;
        }
      });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  onSearchChange(): void {
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
    this.searchDebounce = setTimeout(() => this.applyFilters(), 350);
  }

  /**
   * Fetch a user directly by email and add them to the list.
   * Useful when the current society context doesn't match the user's society.
   */
  findByEmail(): void {
    const email = this.lookup.email.trim();
    if (!email) return;
    this.lookup.busy = true;
    this.lookup.message = '';
    this.userService.getUserByEmail(email).subscribe({
      next: user => {
        this.upsertUser(user);
        this.lookup.busy = false;
        this.lookup.message = 'User loaded. Open “View” to activate/approve.';
      },
      error: () => {
        this.lookup.busy = false;
        this.lookup.message = 'User not found by email (or backend not reachable).';
      }
    });
  }

  /**
   * Fetch a user directly by phone and add them to the list.
   */
  findByPhone(): void {
    const phone = this.lookup.phone.trim();
    if (!phone) return;
    this.lookup.busy = true;
    this.lookup.message = '';
    this.userService.getUserByPhone(phone).subscribe({
      next: user => {
        this.upsertUser(user);
        this.lookup.busy = false;
        this.lookup.message = 'User loaded. Open “View” to activate/approve.';
      },
      error: () => {
        this.lookup.busy = false;
        this.lookup.message = 'User not found by phone (or backend not reachable).';
      }
    });
  }

  /** Insert or replace user in list after email/phone lookup, then reload table. */
  private upsertUser(user: User): void {
    const idx = this.users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      this.users[idx] = user;
    } else {
      this.users = [user, ...this.users];
      this.totalCount += 1;
    }
    this.loadStats();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterUserType = 'ALL';
    this.filterUserRole = 'ALL';
    this.filterStatus = 'ALL';
    this.filterVerification = 'ALL';
    this.filterBuilding = 'ALL';
    this.filterFlatLink = 'ALL';
    this.applyFilters();
  }

  get paginatedUsers(): User[] {
    return this.users;
  }

  /** First row index on this page (1-based display). */
  get pageRangeStart(): number {
    if (this.totalCount === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  /** Last row index on this page (1-based display). */
  get pageRangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalCount);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  /** Reload table + summary after approve/link/delete. */
  private refreshList(): void {
    this.loadStats();
    this.loadUsers();
  }

  viewDetails(user: User): void {
    this.selectedUser = { ...user, vehicleCount: 0, petCount: 0 };
    this.showDetailModal = true;
    this.loadFlatsForUser(user);

    if (user.societyId && (!user.society || this.userService.getSocietyDisplayName(user.societyId, user.society) === '—')) {
      this.userService.resolveSocietyName(user.societyId).subscribe(name => {
        if (this.selectedUser?.id === user.id) {
          this.selectedUser = { ...this.selectedUser, society: name };
        }
      });
    }

    this.userService.getRegisteredAssetCounts(user.id).subscribe({
      next: counts => {
        if (this.selectedUser?.id === user.id) {
          this.selectedUser = {
            ...this.selectedUser,
            vehicleCount: counts.vehicleCount,
            petCount: counts.petCount
          };
        }
      },
      error: () => {
        /* keep zeros if API unavailable */
      }
    });

    this.userService.getFamilyMembersByUser(user.id).subscribe({
      next: members => {
        if (this.selectedUser?.id === user.id) {
          this.selectedUser = { ...this.selectedUser, familyMembers: members };
        }
      },
      error: () => {
        /* section hidden when empty */
      }
    });
  }

  closeModal(): void {
    this.showDetailModal = false;
    this.selectedUser = null;
    this.resetFlatLink();
  }

  /** Load flats for the user's society, or the active society from Society Setup. */
  private loadFlatsForUser(user: User): void {
    const societyId = user.societyId || this.userService.getActiveSocietyId();
    this.flatLink = {
      societyId,
      flats: [],
      selectedFlatId: user.flatId ?? '',
      loading: !!societyId,
      saving: false,
      message: user.flatId ? 'Flat linked. Resident must log out and log in again on mobile.' : '',
      error: ''
    };
    if (!societyId) {
      this.flatLink.loading = false;
      this.flatLink.error = 'Select a society in Society Setup first, or set the user’s society.';
      return;
    }
    this.userService.listFlatsBySociety(societyId).subscribe({
      next: flats => {
        this.flatLink.flats = flats;
        this.flatLink.loading = false;
        if (!flats.length) {
          this.flatLink.error =
            'No flats in this society. In Society Setup, create a society with “Generate flats” > 0.';
        } else if (!user.flatId) {
          this.flatLink.message = 'Choose a flat and click Link flat — required for mobile complaints.';
        }
      },
      error: () => {
        this.flatLink.loading = false;
        this.flatLink.error = 'Could not load flats from the API.';
      }
    });
  }

  private resetFlatLink(): void {
    this.flatLink = {
      societyId: '',
      flats: [],
      selectedFlatId: '',
      loading: false,
      saving: false,
      message: '',
      error: ''
    };
  }

  /** Save flat_id on the user record in the database. */
  linkFlatToUser(): void {
    if (!this.selectedUser || !this.flatLink.selectedFlatId) {
      return;
    }
    const flat = this.flatLink.flats.find(f => f.id === this.flatLink.selectedFlatId);
    if (!flat || !this.flatLink.societyId) {
      return;
    }
    this.flatLink.saving = true;
    this.flatLink.error = '';
    this.userService
      .linkUserToFlat(this.selectedUser.id, {
        flatId: flat.id,
        flatNumber: flat.flatNumber,
        societyId: this.flatLink.societyId
      })
      .subscribe({
        next: updated => {
          this.flatLink.saving = false;
          this.flatLink.message =
            `Linked to flat ${flat.flatNumber}. Ask the resident to log out and log in again on mobile.`;
          this.selectedUser = { ...this.selectedUser!, ...updated, flatId: flat.id, flatNumber: flat.flatNumber };
          this.toast.success(`User linked to flat ${flat.flatNumber}.`);
          this.refreshList();
        },
        error: err => {
          this.flatLink.saving = false;
          this.flatLink.error = err?.message || 'Failed to link flat';
          this.toast.error(this.flatLink.error);
        }
      });
  }

  approveUser(userId: string): void {
    this.userService.approveUser(userId, 'ADMIN-001').subscribe({
      next: response => {
        if (response.success) {
          this.toast.success('User approved successfully.');
          this.refreshList();
          this.closeModal();
        }
      },
      error: error => {
        console.error('Error approving user:', error);
        this.toast.error('Failed to approve user.');
      }
    });
  }

  rejectUser(userId: string): void {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason?.trim()) {
      if (reason !== null) {
        this.toast.warning('Rejection reason is required.');
      }
      return;
    }
    this.userService.rejectUser(userId, reason.trim()).subscribe({
      next: response => {
        if (response.success) {
          this.toast.success('User registration rejected.');
          this.refreshList();
          this.closeModal();
        }
      },
      error: error => {
        console.error('Error rejecting user:', error);
        this.toast.error('Failed to reject user.');
      }
    });
  }

  suspendUser(userId: string): void {
    const reason = prompt('Please provide a reason for suspension:');
    if (!reason?.trim()) {
      if (reason !== null) {
        this.toast.warning('Suspension reason is required.');
      }
      return;
    }
    this.userService.suspendUser(userId, reason.trim()).subscribe({
      next: response => {
        if (response.success) {
          this.toast.success('User suspended.');
          this.refreshList();
          this.closeModal();
        }
      },
      error: error => {
        console.error('Error suspending user:', error);
        this.toast.error('Failed to suspend user.');
      }
    });
  }

  activateUser(userId: string): void {
    this.userService.activateUser(userId).subscribe({
      next: response => {
        if (response.success) {
          this.toast.success('User activated.');
          this.refreshList();
          this.closeModal();
        }
      },
      error: error => {
        console.error('Error activating user:', error);
        this.toast.error('Failed to activate user.');
      }
    });
  }

  deleteUser(userId: string): void {
    this.userService.deleteUser(userId).subscribe({
      next: response => {
        if (response.success) {
          this.toast.warning('User deleted.');
          this.refreshList();
          this.closeModal();
        }
      },
      error: error => {
        console.error('Error deleting user:', error);
        this.toast.error('Failed to delete user.');
      }
    });
  }

  /** Admin flow: create resident via the registration wizard inside admin layout. */
  navigateToRegister(): void {
    sessionStorage.setItem('fromAdmin', 'true');
    this.router.navigate(['/admin/user-registration']);
  }

  /** Admin flow: create resident via mobile registration. */
  navigateToAddResident(): void {
    sessionStorage.setItem('fromAdmin', 'true');
    this.navigateToRegister();
  }

  /** Shortcut: create security guard with SECURITY_GUARD role pre-selected. */
  navigateToAddGuard(): void {
    this.navigateToAddStaff(UserRole.SECURITY_GUARD);
  }

  /** Admin flow: provision staff or security guard with RBAC role. */
  navigateToAddStaff(role?: UserRole): void {
    if (role === UserRole.SECURITY_GUARD) {
      this.router.navigate(['/admin/users-list/staff/create/guard']);
    } else {
      this.router.navigate(['/admin/users-list/staff/create']);
    }
  }

  editStaffUser(user: User): void {
    if (isStaffMemberRole(user.userRole)) {
      this.router.navigate(['/admin/users-list/staff/edit', user.id]);
    }
  }

  // Helper methods
  getFullName(user: User): string {
    return `${user.firstName} ${user.lastName}`;
  }

  getStatusClass(status: UserStatus): string {
    const classes: Record<UserStatus, string> = {
      [UserStatus.ACTIVE]: 'status-active',
      [UserStatus.INACTIVE]: 'status-inactive',
      [UserStatus.SUSPENDED]: 'status-suspended',
      [UserStatus.MOVED_OUT]: 'status-moved-out',
      [UserStatus.BLOCKED]: 'status-blocked',
      [UserStatus.PENDING]: 'status-pending'
    };
    return classes[status];
  }

  getVerificationClass(status: VerificationStatus): string {
    const classes: Record<VerificationStatus, string> = {
      [VerificationStatus.APPROVED]: 'verification-approved',
      [VerificationStatus.PENDING]: 'verification-pending',
      [VerificationStatus.REJECTED]: 'verification-rejected',
      [VerificationStatus.UNDER_REVIEW]: 'verification-review',
      [VerificationStatus.DOCUMENTS_REQUIRED]: 'verification-docs'
    };
    return classes[status];
  }

  getUserTypeClass(type: UserType): string {
    const classes: Record<UserType, string> = {
      [UserType.OWNER]: 'type-owner',
      [UserType.TENANT]: 'type-tenant',
      [UserType.FAMILY_MEMBER]: 'type-family',
      [UserType.PG_GUEST]: 'type-pg',
      [UserType.STAFF]: 'type-staff'
    };
    return classes[type];
  }

  getRoleIcon(role: UserRole | string): string {
    return getRoleIcon(role);
  }

  formatLabel(text: string): string {
    return formatRoleLabel(text);
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatDateTime(date: Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getInitials(user: User): string {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  }

  hasProfilePhoto(user: User): boolean {
    return isValidProfilePhoto(user.profileImage);
  }

  isGuardRole(user: User): boolean {
    return user.userRole === UserRole.SECURITY_GUARD;
  }

  /** Admin uploads guard ID photo from user detail modal. */
  onAdminProfilePhotoChange(dataUrl: string): void {
    if (!this.selectedUser) {
      return;
    }
    this.userService.updateUser(this.selectedUser.id, { profileImage: dataUrl }).subscribe({
      next: updated => {
        this.selectedUser = { ...this.selectedUser!, profileImage: updated.profileImage ?? dataUrl };
        this.toast.success('Guard photo saved.');
        this.refreshList();
      },
      error: () => this.toast.error('Could not save guard photo.')
    });
  }

  onPhotoUploadError(message: string): void {
    this.toast.warning(message);
  }
}
