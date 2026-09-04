import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ComplaintsApiService } from '../../core/services/complaints-api.service';
import { SessionContextService } from '../../core/services/session-context.service';
import { UserManagementService } from '../../modules/user-management/services/user-management.service';
import { VerificationStatus } from '../../modules/user-management/models/user.model';

/**
 * Live badge counts for the admin header (replaces hardcoded notification/mail numbers).
 */
@Injectable({ providedIn: 'root' })
export class AdminHeaderCountsService {
  private readonly notificationCountSubject = new BehaviorSubject<number>(0);
  private readonly messageCountSubject = new BehaviorSubject<number>(0);
  private readonly openComplaintsSubject = new BehaviorSubject<number>(0);

  /** Bell icon — open complaints for the active society. */
  readonly notificationCount$ = this.notificationCountSubject.asObservable();
  /** Mail icon — users pending verification / approval. */
  readonly messageCount$ = this.messageCountSubject.asObservable();
  /** Sidebar Complaints menu badge. */
  readonly openComplaintsCount$ = this.openComplaintsSubject.asObservable();

  constructor(
    private complaintsApi: ComplaintsApiService,
    private session: SessionContextService,
    private userService: UserManagementService
  ) {}

  /** Reload counts from backend (complaints + user approvals). */
  refresh(): void {
    const societyId = this.session.getSocietyId();

    const openComplaints$ = societyId
      ? this.complaintsApi.listBySociety(societyId).pipe(
          map(rows => rows.filter(r => this.complaintsApi.isOpenStatus(r.status)).length),
          catchError(() => of(0))
        )
      : of(0);

    const pendingUsers$ = this.userService.getAllUsers().pipe(
      map(
        users =>
          users.filter(u => u.verificationStatus === VerificationStatus.PENDING).length
      ),
      catchError(() => of(0))
    );

    forkJoin({ openComplaints: openComplaints$, pendingUsers: pendingUsers$ }).subscribe(
      ({ openComplaints, pendingUsers }) => {
        this.openComplaintsSubject.next(openComplaints);
        this.notificationCountSubject.next(openComplaints);
        this.messageCountSubject.next(pendingUsers);
      }
    );
  }
}
