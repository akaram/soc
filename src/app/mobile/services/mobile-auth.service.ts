import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { isValidProfilePhoto } from '../../core/utils/profile-photo.util';
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SOCIETY_ADMIN = 'SOCIETY_ADMIN',
  GUARD = 'GUARD',
  SECURITY_STAFF = 'SECURITY_STAFF',
  FACILITY_MANAGER = 'FACILITY_MANAGER',
  ACCOUNTANT = 'ACCOUNTANT',
  COMMITTEE_MEMBER = 'COMMITTEE_MEMBER',
  OWNER = 'OWNER',
  TENANT = 'TENANT',
  DOMESTIC_STAFF = 'DOMESTIC_STAFF'
}

export interface MobileUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  societyId: string;
  societyName: string;
  profilePhoto?: string;
  flatNumber?: string;
  flatId?: string;
  tower?: string;
  employeeId?: string;
  shiftTiming?: string;
}

interface LoginResponse {
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  societyId: string;
  societyName: string;
  flatNumber?: string;
  flatId?: string;
  tower?: string;
  sessionToken: string;
  refreshToken: string;
  expiresIn: number;
  profilePhoto?: string;
  biometricEnabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MobileAuthService {
  private currentUserSubject = new BehaviorSubject<MobileUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  /** Per-user avatar storage survives logout (mobileUser is cleared on logout). */
  private profilePhotoStorageKey(userId: string): string {
    return `poc:profilePhoto:${userId}`;
  }

  private loadPersistedProfilePhoto(userId: string): string | undefined {
    try {
      const raw = localStorage.getItem(this.profilePhotoStorageKey(userId));
      return isValidProfilePhoto(raw) ? raw!.trim() : undefined;
    } catch {
      return undefined;
    }
  }

  /** Normalize photo from API, session, or local storage — ignore broken asset paths. */
  private resolveProfilePhoto(...candidates: (string | undefined)[]): string | undefined {
    for (const candidate of candidates) {
      if (isValidProfilePhoto(candidate)) {
        return candidate!.trim();
      }
    }
    return undefined;
  }

  /**
   * Prefer login/backend photo, then the per-user saved avatar from a previous session.
   */
  private withProfilePhoto(user: MobileUser, backendPhoto?: string | undefined): MobileUser {
    const persisted = this.loadPersistedProfilePhoto(user.id);
    const photo = this.resolveProfilePhoto(backendPhoto, user.profilePhoto, persisted);
    return photo ? { ...user, profilePhoto: photo } : { ...user, profilePhoto: undefined };
  }

  /**
   * Store JWT before emitting currentUser$ so dashboard API calls include Authorization.
   * (persistSession runs synchronously in login tap; subscribers fire before tap returns.)
   */
  private saveAuthTokens(response: LoginResponse): void {
    if (!response.sessionToken?.trim()) {
      return;
    }
    // Dedicated mobile key so a later admin tab still has its own JWT.
    localStorage.setItem('mobileAuthToken', response.sessionToken);
    localStorage.setItem('authToken', response.sessionToken);
    const adminStillLoggedIn = !!(
      sessionStorage.getItem('adminSession') ||
      localStorage.getItem('adminSession') ||
      sessionStorage.getItem('adminAuthToken') ||
      localStorage.getItem('adminAuthToken')
    );
    if (!adminStillLoggedIn) {
      sessionStorage.setItem('authToken', response.sessionToken);
    }
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken);
    }
    if (response.societyId) {
      localStorage.setItem('societyId', response.societyId);
      sessionStorage.setItem('societyId', response.societyId);
    }
  }

  /** Write session user + keep avatar in a dedicated key. */
  private persistSession(user: MobileUser, backendPhoto?: string): void {
    const merged = this.withProfilePhoto(user, backendPhoto);
    this.currentUserSubject.next(merged);
    localStorage.setItem('mobileUser', JSON.stringify(merged));
    this.rememberUserForBiometricLogin(merged);
  }

  /** After password/OTP login, remember profile for the biometric quick-login screen. */
  private rememberUserForBiometricLogin(user: MobileUser): void {
    if (!user?.id) return;
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      profilePhoto: user.profilePhoto,
      role: user.role,
      flatNumber: user.flatNumber,
      societyName: user.societyName || '',
      biometricEnabled: false,
      biometricType: 'fingerprint' as const
    };
    localStorage.setItem('lastBiometricUserId', user.id);
    localStorage.setItem('lastBiometricUser', JSON.stringify(payload));
  }

  /**
   * Save avatar locally and sync to backend profileImage when possible.
   */
  persistProfilePhoto(
    userId: string,
    dataUrl: string,
    callbacks?: { onSuccess?: () => void; onError?: () => void }
  ): void {
    if (!userId || !isValidProfilePhoto(dataUrl)) {
      return;
    }
    localStorage.setItem(this.profilePhotoStorageKey(userId), dataUrl);

    const current = this.getCurrentUser();
    if (current?.id === userId) {
      this.persistSession({ ...current, profilePhoto: dataUrl });
    }

    this.http
      .put<Record<string, unknown>>(`/users/${encodeURIComponent(userId)}`, { profileImage: dataUrl })
      .subscribe({
        next: () => callbacks?.onSuccess?.(),
        error: () => callbacks?.onError?.()
      });
  }

  private loadUserFromStorage(): void {
    const storedUser = localStorage.getItem('mobileUser');
    const storedToken = localStorage.getItem('authToken');
    if (storedUser && storedToken) {
      const user = JSON.parse(storedUser) as MobileUser;
      this.currentUserSubject.next(this.withProfilePhoto(user));
    }
  }

  /**
   * Password-based login with username/email/phone and roleName
   * @param username - Can be email, phone, or username
   * @param password - User password
   * @param roleName - Optional role name for role-based validation (e.g., 'OWNER', 'GUARD', 'ADMIN')
   */
  login(username: string, password: string, roleName?: string): Observable<MobileUser> {
    const loginRequest: any = {
      username: username,
      password: password,
      deviceId: this.getDeviceId(),
      deviceType: this.getDeviceType()
    };

    // Add roleName if provided
    if (roleName) {
      loginRequest.roleName = roleName;
    }

    return this.http.post<LoginResponse>('/auth/login', loginRequest).pipe(
      tap(response => {
        this.saveAuthTokens(response);
        const user = this.withProfilePhoto(this.mapToMobileUser(response), response.profilePhoto);
        this.persistSession(user, response.profilePhoto);
      }),
      map(response => this.mapToMobileUser(response)),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => new Error(error.error?.message || 'Login failed'));
      })
    );
  }

  /**
   * Login with email and password (legacy method for backward compatibility)
   * @deprecated Use login() instead
   */
  loginWithEmail(email: string, password: string, role?: UserRole): Observable<MobileUser> {
    const roleName = role ? this.mapRoleToRoleName(role) : undefined;
    return this.login(email, password, roleName);
  }

  /**
   * Generate OTP
   */
  generateOtp(phone: string | null, email: string | null, purpose: string = 'LOGIN'): Observable<{ message: string; otp?: string }> {
    const otpRequest = {
      phone: phone || null,
      email: email || null,
      channel: phone ? 'SMS' : 'EMAIL',
      purpose: purpose
    };

    return this.http.post<{ message: string; otp?: string }>('/auth/otp/generate', otpRequest);
  }

  /**
   * Verify OTP and login
   */
  verifyOtpAndLogin(phone: string | null, email: string | null, otpCode: string): Observable<MobileUser> {
    const verifyRequest = {
      phone: phone || null,
      email: email || null,
      otpCode: otpCode,
      deviceId: this.getDeviceId(),
      deviceType: this.getDeviceType()
    };

    return this.http.post<LoginResponse>('/auth/otp/verify', verifyRequest).pipe(
      tap(response => {
        this.saveAuthTokens(response);
        const user = this.withProfilePhoto(this.mapToMobileUser(response), response.profilePhoto);
        this.persistSession(user, response.profilePhoto);
      }),
      map(response => this.mapToMobileUser(response)),
      catchError(error => {
        console.error('OTP verification error:', error);
        return throwError(() => new Error(error.error?.message || 'OTP verification failed'));
      })
    );
  }

  /**
   * Biometric login
   */
  biometricLogin(userId: string, biometricType: string, biometricToken: string): Observable<MobileUser> {
    const biometricRequest = {
      userId: userId,
      biometricType: biometricType,
      deviceId: this.getDeviceId(),
      biometricToken: biometricToken,
      deviceType: this.getDeviceType()
    };

    return this.http.post<LoginResponse>('/auth/biometric/login', biometricRequest).pipe(
      tap(response => {
        this.saveAuthTokens(response);
        const user = this.withProfilePhoto(this.mapToMobileUser(response), response.profilePhoto);
        this.persistSession(user, response.profilePhoto);
      }),
      map(response => this.mapToMobileUser(response)),
      catchError(error => {
        console.error('Biometric login error:', error);
        return throwError(() => new Error(error.error?.message || 'Biometric authentication failed'));
      })
    );
  }

  /**
   * Email-only login (magic link) - sends OTP to email
   * @param email - User email address
   */
  emailLogin(email: string): Observable<{ message: string; otp?: string }> {
    return this.http.post<{ message: string; otp?: string }>('/auth/email/login', {
      email: email
    }).pipe(
      catchError(error => {
        console.error('Email login error:', error);
        return throwError(() => new Error(error.error?.message || 'Email login failed'));
      })
    );
  }

  /**
   * Social login (Google, Apple, Facebook)
   * @param provider - Social provider: 'google', 'apple', or 'facebook'
   * @param socialToken - Token from social provider
   * @param roleName - Optional role name for role-based validation
   */
  socialLogin(provider: string, socialToken: string, roleName?: string): Observable<MobileUser> {
    const socialRequest: any = {
      token: socialToken,
      deviceId: this.getDeviceId(),
      deviceType: this.getDeviceType()
    };

    // Add roleName if provided
    if (roleName) {
      socialRequest.roleName = roleName;
    }

    return this.http.post<LoginResponse>(`/auth/social/${provider}`, socialRequest).pipe(
      tap(response => {
        this.saveAuthTokens(response);
        const user = this.withProfilePhoto(this.mapToMobileUser(response), response.profilePhoto);
        this.persistSession(user, response.profilePhoto);
      }),
      map(response => this.mapToMobileUser(response)),
      catchError(error => {
        console.error('Social login error:', error);
        return throwError(() => new Error(error.error?.message || 'Social login failed'));
      })
    );
  }

  /**
   * Logout
   */
  logout(): void {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Call logout API
      this.http.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: () => console.log('Logged out successfully'),
        error: (err) => console.error('Logout error:', err)
      });
    }
    
    this.currentUserSubject.next(null);
    localStorage.removeItem('mobileUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('mobileAuthToken');
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('societyId');
    sessionStorage.removeItem('societyId');
  }

  /**
   * Map backend response to MobileUser
   */
  private mapToMobileUser(response: LoginResponse): MobileUser {
    return {
      id: response.userId,
      name: response.name,
      email: response.email,
      phone: response.phone,
      role: this.mapRole(response.role),
      societyId: response.societyId,
      societyName: response.societyName,
      profilePhoto: this.resolveProfilePhoto(response.profilePhoto),
      flatNumber: response.flatNumber,
      flatId: response.flatId,
      tower: response.tower
    };
  }

  /**
   * Map backend role string to UserRole enum
   */
  private mapRole(role: string): UserRole {
    const roleMap: Record<string, UserRole> = {
      'RESIDENT': UserRole.OWNER,
      'OWNER': UserRole.OWNER,
      'TENANT': UserRole.TENANT,
      'SECURITY_GUARD': UserRole.GUARD,
      'GUARD': UserRole.GUARD,
      'SECURITY_STAFF': UserRole.SECURITY_STAFF,
      'FACILITY_MANAGER': UserRole.FACILITY_MANAGER,
      'STAFF': UserRole.FACILITY_MANAGER,
      'ADMIN': UserRole.SOCIETY_ADMIN,
      'SOCIETY_ADMIN': UserRole.SOCIETY_ADMIN,
      'SUPER_ADMIN': UserRole.SUPER_ADMIN,
      'ACCOUNTANT': UserRole.ACCOUNTANT,
      'COMMITTEE_MEMBER': UserRole.COMMITTEE_MEMBER,
      'DOMESTIC_STAFF': UserRole.DOMESTIC_STAFF
    };
    return roleMap[role.toUpperCase()] || UserRole.OWNER;
  }

  /**
   * Map UserRole enum to role name string for backend
   */
  private mapRoleToRoleName(role: UserRole): string {
    const roleNameMap: Record<UserRole, string> = {
      [UserRole.OWNER]: 'OWNER',
      [UserRole.TENANT]: 'TENANT',
      [UserRole.GUARD]: 'GUARD',
      [UserRole.SECURITY_STAFF]: 'SECURITY_STAFF',
      [UserRole.FACILITY_MANAGER]: 'STAFF',
      [UserRole.SOCIETY_ADMIN]: 'ADMIN',
      [UserRole.SUPER_ADMIN]: 'ADMIN',
      [UserRole.ACCOUNTANT]: 'ACCOUNTANT',
      [UserRole.COMMITTEE_MEMBER]: 'COMMITTEE_MEMBER',
      [UserRole.DOMESTIC_STAFF]: 'STAFF'
    };
    return roleNameMap[role] || 'OWNER';
  }

  /**
   * Get device ID (from localStorage or generate)
   */
  private getDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  /**
   * Get device type
   */
  private getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPad/.test(ua)) {
      return 'MOBILE';
    }
    return 'WEB';
  }

  getCurrentUser(): MobileUser | null {
    return this.currentUserSubject.value;
  }

  /**
   * Replace the current user in memory + localStorage.
   * Useful for profile edits that should immediately reflect in the UI.
   */
  setCurrentUser(user: MobileUser): void {
    this.persistSession(user);
  }

  /**
   * Patch the current user (no backend call).
   * If profilePhoto is updated, also persist per-user so it survives logout/login.
   */
  updateCurrentUser(patch: Partial<MobileUser>): void {
    const current = this.getCurrentUser();
    if (!current) return;
    const next: MobileUser = { ...current, ...patch };
    if (patch.profilePhoto) {
      this.persistProfilePhoto(current.id, patch.profilePhoto);
    } else {
      this.persistSession(next);
    }
  }

  /**
   * Sync flatId / flatNumber from the server after admin links a flat (avoids forced re-login).
   */
  refreshProfileFromServer(): Observable<MobileUser | null> {
    const user = this.getCurrentUser();
    if (!user?.id) {
      return of(null);
    }
    return this.http.get<Record<string, unknown>>(`/users/${encodeURIComponent(user.id)}`).pipe(
      map(profile => {
        const flatId = String(profile['flatId'] ?? '').trim() || user.flatId;
        const flatNumber = String(profile['flatNumber'] ?? '').trim() || user.flatNumber;
        const tower = String(profile['building'] ?? '').trim() || user.tower;
        const updated: MobileUser = { ...user, flatId, flatNumber, tower };
        if (flatId !== user.flatId || flatNumber !== user.flatNumber || tower !== user.tower) {
          this.persistSession(updated);
        }
        return updated;
      }),
      catchError(() => of(user))
    );
  }

  hasRole(roles: UserRole[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }

  isGuard(): boolean {
    return this.hasRole([UserRole.GUARD, UserRole.SECURITY_STAFF]);
  }

  isResident(): boolean {
    return this.hasRole([UserRole.OWNER, UserRole.TENANT]);
  }

  isAdmin(): boolean {
    return this.hasRole([UserRole.SUPER_ADMIN, UserRole.SOCIETY_ADMIN]);
  }

  isStaff(): boolean {
    return this.hasRole([
      UserRole.FACILITY_MANAGER,
      UserRole.ACCOUNTANT,
      UserRole.DOMESTIC_STAFF
    ]);
  }

  private getMockUser(email: string, role: UserRole): MobileUser {
    const baseUser = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      phone: '+966 50 123 4567',
      societyId: 'SOC001',
      societyName: 'Green Valley Residency'
    };

    switch (role) {
      case UserRole.GUARD:
        return {
          ...baseUser,
          name: 'Ahmed Hassan',
          role: UserRole.GUARD,
          employeeId: 'GRD001',
          shiftTiming: '6:00 AM - 2:00 PM'
        };
      
      case UserRole.OWNER:
        return {
          ...baseUser,
          name: 'Mohammed Ali',
          role: UserRole.OWNER,
          flatNumber: 'A-501',
          tower: 'Tower A'
        };
      
      case UserRole.TENANT:
        return {
          ...baseUser,
          name: 'Fatima Khan',
          role: UserRole.TENANT,
          flatNumber: 'B-302',
          tower: 'Tower B'
        };
      
      case UserRole.FACILITY_MANAGER:
        return {
          ...baseUser,
          name: 'Khalid Rahman',
          role: UserRole.FACILITY_MANAGER,
          employeeId: 'FM001'
        };
      
      case UserRole.SOCIETY_ADMIN:
        return {
          ...baseUser,
          name: 'Abdullah Ibrahim',
          role: UserRole.SOCIETY_ADMIN
        };
      
      case UserRole.ACCOUNTANT:
        return {
          ...baseUser,
          name: 'Sara Al-Mansouri',
          role: UserRole.ACCOUNTANT,
          employeeId: 'ACC001'
        };
      
      default:
        return {
          ...baseUser,
          name: 'User',
          role
        };
    }
  }
}
