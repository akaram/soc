import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UserManagementService } from '../services/user-management.service';
import {
  User,
  UserRole,
  UserStatus,
  VerificationStatus,
  Gender
} from '../models/user.model';
import {
  ADMIN_ASSIGNABLE_ROLES,
  formatRoleLabel
} from '../../../core/constants/role.constants';

/**
 * Admin form to create or edit staff users (including Security Guard).
 * Residents self-register via /mobile/auth/register; staff are provisioned here.
 */
@Component({
  selector: 'app-staff-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './staff-user-form.component.html',
  styleUrls: ['./staff-user-form.component.scss']
})
export class StaffUserFormComponent implements OnInit {
  /** Dropdown options for RBAC role assignment. */
  assignableRoles = ADMIN_ASSIGNABLE_ROLES;

  isEditMode = false;
  userId = '';
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  showPassword = false;

  /** Form model mapped to backend User entity. */
  form = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    userRole: UserRole.SECURITY_GUARD as UserRole,
    status: UserStatus.ACTIVE as UserStatus,
    password: '',
    confirmPassword: ''
  };

  constructor(
    private userService: UserManagementService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Pre-select Security Guard when opened via /staff/create/guard
    if (this.route.snapshot.url.some(s => s.path === 'guard')) {
      this.form.userRole = UserRole.SECURITY_GUARD;
    }
    this.userId = this.route.snapshot.paramMap.get('id') ?? '';
    this.isEditMode = !!this.userId;
    if (this.isEditMode) {
      this.loadUser();
    }
  }

  /** Load existing user for edit. */
  private loadUser(): void {
    this.isLoading = true;
    this.userService.getUserById(this.userId).subscribe({
      next: user => {
        this.form = {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          userRole: user.userRole,
          status: user.status,
          password: '',
          confirmPassword: ''
        };
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Could not load user.';
        this.isLoading = false;
      }
    });
  }

  /** Validate and submit create/update. */
  save(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.firstName.trim() || !this.form.lastName.trim()) {
      this.errorMessage = 'First and last name are required.';
      return;
    }
    if (!this.form.email.trim() || !this.form.phone.trim()) {
      this.errorMessage = 'Email and phone are required.';
      return;
    }
    if (!this.isEditMode) {
      if (!this.form.password || this.form.password.length < 8) {
        this.errorMessage = 'Password must be at least 8 characters.';
        return;
      }
      if (this.form.password !== this.form.confirmPassword) {
        this.errorMessage = 'Passwords do not match.';
        return;
      }
    } else if (this.form.password && this.form.password !== this.form.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isSaving = true;
    const societyId = this.userService.getActiveSocietyId();
    if (!societyId) {
      this.errorMessage = 'Select a society in Society Setup before creating staff.';
      this.isSaving = false;
      return;
    }

    const payload: Record<string, unknown> = {
      firstName: this.form.firstName.trim(),
      lastName: this.form.lastName.trim(),
      email: this.form.email.trim().toLowerCase(),
      phone: this.form.phone.trim(),
      userRole: this.form.userRole,
      // userType omitted — Owner/Tenant applies to residents only; backend sets STAFF for staff roles.
      status: this.form.status,
      verificationStatus: VerificationStatus.APPROVED,
      documentsVerified: true,
      emailVerified: true,
      phoneVerified: true,
      gender: Gender.MALE,
      societyId,
      flatNumber: '',
      building: ''
    };

    if (this.form.password) {
      payload['password'] = this.form.password;
    }

    const request$ = this.isEditMode
      ? this.userService.updateUser(this.userId, payload as Partial<User>)
      : this.userService.createStaffUser(payload);

    request$.subscribe({
      next: () => {
        this.isSaving = false;
        this.successMessage = this.isEditMode ? 'User updated.' : 'Staff user created.';
        setTimeout(() => this.router.navigate(['/admin/users-list']), 800);
      },
      error: err => {
        this.isSaving = false;
        this.errorMessage =
          err.error?.message || err.message || 'Save failed. Check API is running.';
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/users-list']);
  }

  formatRoleLabel = formatRoleLabel;

  /** Page title reflects guard vs generic staff. */
  get pageTitle(): string {
    if (this.isEditMode) {
      return 'Edit Staff User';
    }
    return this.form.userRole === UserRole.SECURITY_GUARD ? 'Add Security Guard' : 'Add Staff User';
  }
}
