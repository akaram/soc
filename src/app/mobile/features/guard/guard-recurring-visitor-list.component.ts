import { Component, OnInit } from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { RouterModule } from '@angular/router';

import {

  GuardActiveRecurringVisitor,

  GuardDashboardService

} from '../../services/guard-dashboard.service';

import { ToastService } from '../../../core/services/toast.service';

import { VisitorManagementService } from '../../../modules/visitor-management/services/visitor-management.service';

import { ProfileAvatarComponent } from '../../../core/components/profile-avatar.component';



/**

 * Guard view: active recurring visitors (daily help — maid, cook, driver, etc.).

 */

@Component({

  selector: 'app-guard-recurring-visitor-list',

  standalone: true,

  imports: [CommonModule, FormsModule, RouterModule, ProfileAvatarComponent],

  template: `

    <div class="recurring-page">

      <div class="page-intro">

        <h2>Daily Help</h2>

        <p>Active recurring visitors — verify ID and allow entry during scheduled time.</p>

      </div>



      <div class="search-bar">

        <i class="material-icons">search</i>

        <input

          type="search"

          [(ngModel)]="searchTerm"

          placeholder="Search name, flat, or phone"

        />

      </div>



      <div class="loading" *ngIf="loading">Loading daily help list…</div>

      <div class="error" *ngIf="loadError">{{ loadError }}</div>



      <div class="empty" *ngIf="!loading && !loadError && filtered.length === 0">

        <i class="material-icons">engineering</i>

        <p>No active daily help visitors for your society.</p>

      </div>



      <div class="visitor-list" *ngIf="!loading && filtered.length > 0">

        <article class="visitor-card" *ngFor="let rv of filtered">

          <div class="card-head">

            <app-profile-avatar

              [photoUrl]="rv.photo"

              [name]="rv.name"

              role="GUARD"

              size="md"

              fallbackGradient="linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)"

            ></app-profile-avatar>

            <div class="head-text">

              <h3>{{ rv.name }}</h3>

              <span class="schedule-pill">{{ rv.visitTime }} · {{ formatPattern(rv.recurringPattern) }}</span>

            </div>

          </div>



          <div class="details">

            <p><i class="material-icons">home</i> Flat {{ rv.flatNumber }}</p>

            <p><i class="material-icons">phone</i> {{ rv.phone }}</p>

            <p><i class="material-icons">work</i> {{ rv.purpose }}</p>

            <p><i class="material-icons">schedule</i> {{ rv.expectedDuration }} min window</p>

          </div>



          <button type="button" class="allow-btn" (click)="allowEntry(rv)" [disabled]="entryBusy === rv.id">

            <i class="material-icons">how_to_reg</i>

            {{ entryBusy === rv.id ? 'Logging…' : 'Allow entry' }}

          </button>

        </article>

      </div>

    </div>

  `,

  styles: [`

    .recurring-page {

      padding: 16px 16px 100px;

      background: #f5f7fa;

      min-height: 100%;

    }



    .page-intro h2 {

      margin: 0 0 4px;

      font-size: 20px;

      color: #1e293b;

    }



    .page-intro p {

      margin: 0 0 16px;

      font-size: 13px;

      color: #64748b;

    }



    .search-bar {

      display: flex;

      align-items: center;

      gap: 8px;

      background: white;

      border-radius: 12px;

      padding: 10px 12px;

      margin-bottom: 16px;

      box-shadow: 0 2px 8px rgba(0,0,0,0.06);

    }



    .search-bar .material-icons { color: #94a3b8; font-size: 20px; }

    .search-bar input {

      border: none;

      outline: none;

      flex: 1;

      font-size: 14px;

    }



    .loading, .error, .empty {

      text-align: center;

      padding: 24px 16px;

      color: #64748b;

      background: white;

      border-radius: 12px;

    }



    .error { color: #dc2626; }



    .empty .material-icons {

      font-size: 40px;

      color: #cbd5e1;

      display: block;

      margin-bottom: 8px;

    }



    .visitor-list {

      display: flex;

      flex-direction: column;

      gap: 12px;

    }



    .visitor-card {

      background: white;

      border-radius: 14px;

      padding: 16px;

      box-shadow: 0 2px 8px rgba(0,0,0,0.06);

      border-left: 4px solid #0ea5e9;

    }



    .card-head {

      display: flex;

      align-items: center;

      gap: 14px;

      margin-bottom: 12px;

    }



    .head-text h3 {

      margin: 0 0 6px;

      font-size: 18px;

      color: #1e293b;

    }



    .schedule-pill {

      display: inline-block;

      background: #e0f2fe;

      color: #0369a1;

      font-size: 12px;

      font-weight: 600;

      padding: 4px 10px;

      border-radius: 999px;

    }



    .details p {

      display: flex;

      align-items: flex-start;

      gap: 8px;

      margin: 0 0 8px;

      font-size: 14px;

      color: #475569;

    }



    .details .material-icons {

      font-size: 18px;

      color: #0ea5e9;

      flex-shrink: 0;

    }



    .allow-btn {

      width: 100%;

      margin-top: 12px;

      padding: 12px;

      border: none;

      border-radius: 10px;

      background: #0ea5e9;

      color: white;

      font-size: 15px;

      font-weight: 600;

      display: flex;

      align-items: center;

      justify-content: center;

      gap: 8px;

      cursor: pointer;

    }



    .allow-btn:disabled {

      opacity: 0.7;

      cursor: wait;

    }

  `]

})

export class GuardRecurringVisitorListComponent implements OnInit {

  visitors: GuardActiveRecurringVisitor[] = [];

  searchTerm = '';

  loading = false;

  loadError = '';

  entryBusy = '';



  constructor(

    private guardDashboard: GuardDashboardService,

    private visitorService: VisitorManagementService,

    private toast: ToastService

  ) {}



  ngOnInit(): void {

    this.load();

  }



  get filtered(): GuardActiveRecurringVisitor[] {

    const q = this.searchTerm.trim().toLowerCase();

    if (!q) {

      return this.visitors;

    }

    return this.visitors.filter(

      rv =>

        rv.name.toLowerCase().includes(q) ||

        rv.flatNumber.toLowerCase().includes(q) ||

        rv.phone.includes(q)

    );

  }



  load(): void {

    this.loading = true;

    this.loadError = '';

    this.guardDashboard.loadActiveRecurringVisitors().subscribe({

      next: rows => {

        this.visitors = rows;

        this.loading = false;

      },

      error: () => {

        this.loadError = 'Could not load daily help visitors.';

        this.loading = false;

      }

    });

  }



  allowEntry(rv: GuardActiveRecurringVisitor): void {

    this.entryBusy = rv.id;

    this.visitorService.recordRecurringVisitorCheckIn(rv.id).subscribe({

      next: res => {

        this.entryBusy = '';

        if (res.success) {

          this.toast.success(res.message);

        } else {

          this.toast.warning(res.message || 'Could not log entry.');

        }

      },

      error: () => {

        this.entryBusy = '';

        this.toast.error('Failed to log daily help entry.');

      }

    });

  }



  formatPattern(pattern: string): string {

    const labels: Record<string, string> = {

      DAILY: 'Daily',

      WEEKLY: 'Weekly',

      MONTHLY: 'Monthly',

      CUSTOM: 'Custom'

    };

    return labels[pattern?.toUpperCase()] ?? pattern ?? 'Daily';

  }

}


