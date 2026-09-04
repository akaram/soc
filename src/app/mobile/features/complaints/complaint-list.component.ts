import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { ComplaintsApiService, ComplaintRow } from '../../../core/services/complaints-api.service';
import { SessionContextService } from '../../../core/services/session-context.service';

@Component({
  selector: 'app-complaint-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './complaint-list.component.html',
  styleUrls: ['./complaint-list.component.css']
})
export class ComplaintListComponent implements OnInit {
  complaints: ComplaintRow[] = [];
  loading = false;
  error = '';
  societyId = '';

  constructor(
    private api: ComplaintsApiService,
    private session: SessionContextService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.load());
  }

  load(): void {
    this.societyId = this.session.getSocietyId();
    const userId = this.session.getCurrentUserId();
    if (!this.societyId) {
      return;
    }
    this.loading = true;
    this.error = '';
    this.api.listBySociety(this.societyId).subscribe({
      next: rows => {
        this.complaints = userId ? rows.filter(r => r.complainantId === userId) : rows;
        this.loading = false;
      },
      error: err => {
        this.error = err?.message || 'Could not load complaints.';
        this.loading = false;
      }
    });
  }

  statusClass(s: string): string {
    const u = (s || '').toUpperCase();
    if (u.includes('OPEN') || u.includes('ASSIGNED') || u.includes('PROGRESS')) {
      return 'open';
    }
    if (u.includes('RESOLVED') || u.includes('CLOSED')) {
      return 'resolved';
    }
    return '';
  }
}
