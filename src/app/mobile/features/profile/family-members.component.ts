import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { MobileAuthService } from '../../services/mobile-auth.service';
import { FamilyMemberApiService, FamilyMemberRow } from './family-member-api.service';

/**
 * Family Members Component - Mobile
 * Manage family members for the user
 */
@Component({
  selector: 'app-family-members',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="family-members-container">
      <div class="page-header">
        <h2>Family Members</h2>
        <button class="btn-add" (click)="addFamilyMember()">
          <i class="material-icons">add</i>
          <span>Add Member</span>
        </button>
      </div>

      <p class="loading-hint" *ngIf="loading">Loading family members…</p>

      <div class="members-list" *ngIf="!loading && familyMembers.length > 0; else emptyState">
        <div *ngFor="let member of familyMembers" class="member-card">
          <div class="member-avatar">
            <i class="material-icons">person</i>
          </div>
          <div class="member-info">
            <h3>{{ member.name }}</h3>
            <p>{{ member.relation }}</p>
            <p class="member-details">{{ member.phone }}</p>
          </div>
          <button class="btn-edit" (click)="editMember(member)">
            <i class="material-icons">edit</i>
          </button>
        </div>
      </div>

      <ng-template #emptyState>
        <div class="empty-state">
          <i class="material-icons">family_restroom</i>
          <p>No family members added yet</p>
          <button class="btn-primary" (click)="addFamilyMember()">Add Family Member</button>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .family-members-container {
      padding: 16px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .page-header h2 {
      margin: 0;
      font-size: 24px;
      color: #333;
    }

    .btn-add {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
    }

    .members-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .member-card {
      background: white;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .member-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .member-avatar i {
      font-size: 28px;
      color: #667eea;
    }

    .member-info {
      flex: 1;
    }

    .member-info h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      color: #333;
    }

    .member-info p {
      margin: 0;
      font-size: 14px;
      color: #666;
    }

    .member-details {
      font-size: 12px !important;
      color: #999 !important;
      margin-top: 4px !important;
    }

    .btn-edit {
      background: none;
      border: none;
      color: #667eea;
      cursor: pointer;
      padding: 8px;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
    }

    .empty-state i {
      font-size: 64px;
      color: #ccc;
      margin-bottom: 16px;
    }

    .empty-state p {
      color: #999;
      margin-bottom: 24px;
    }

    .btn-primary {
      padding: 12px 24px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
    }

    .loading-hint {
      padding: 16px;
      color: #64748b;
      text-align: center;
    }
  `]
})
export class FamilyMembersComponent implements OnInit, OnDestroy {
  familyMembers: FamilyMemberRow[] = [];
  loading = false;
  private navSub?: Subscription;

  constructor(
    private router: Router,
    private auth: MobileAuthService,
    private familyApi: FamilyMemberApiService
  ) {}

  ngOnInit() {
    this.loadFamilyMembers();
    // Refresh list when returning from add/edit form.
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.loadFamilyMembers());
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  loadFamilyMembers() {
    const user = this.auth.getCurrentUser();
    if (!user) {
      this.familyMembers = [];
      return;
    }
    this.loading = true;
    this.familyApi.listByUser(user.id).subscribe(rows => {
      this.familyMembers = rows ?? [];
      this.loading = false;
    });
  }

  addFamilyMember() {
    this.router.navigate(['/mobile/profile/family/add']);
  }

  editMember(member: { id?: string }) {
    if (!member?.id) {
      return;
    }
    this.router.navigate(['/mobile/profile/family/edit', member.id]);
  }
}

