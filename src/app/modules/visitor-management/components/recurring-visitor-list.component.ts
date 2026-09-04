import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { VisitorManagementService } from '../services/visitor-management.service';
import {
  RecurringVisitor,
  RecurringVisitorResponse,
  DailyHelpType
} from '../models/recurring-visitor.model';
import { RecurringPattern } from '../models/visitor.model';

@Component({
  selector: 'app-recurring-visitor-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="recurring-visitor-container">
      <div class="page-header">
        <div class="page-header-text">
          <h1><i class="material-icons">repeat</i> Recurring Visitors - Daily Help</h1>
          <p>Manage recurring visitors for daily help services</p>
        </div>
        <div class="header-actions">
          <a class="btn-primary" routerLink="/admin/visitors/recurring/add">
            <i class="material-icons">add</i>
            <span>Add Recurring Visitor</span>
          </a>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon active">
            <i class="material-icons">check_circle</i>
          </div>
          <div class="stat-content">
            <h3>{{ activeCount }}</h3>
            <p>Active</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon inactive">
            <i class="material-icons">cancel</i>
          </div>
          <div class="stat-content">
            <h3>{{ inactiveCount }}</h3>
            <p>Inactive</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon total">
            <i class="material-icons">people</i>
          </div>
          <div class="stat-content">
            <h3>{{ recurringVisitors.length }}</h3>
            <p>Total</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon visits">
            <i class="material-icons">event</i>
          </div>
          <div class="stat-content">
            <h3>{{ totalVisits }}</h3>
            <p>Total Visits</p>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="search-box">
          <i class="material-icons">search</i>
          <input 
            type="text" 
            placeholder="Search by name, phone, flat number..."
            [(ngModel)]="searchTerm"
            (ngModelChange)="applyFilters()">
        </div>
        
        <div class="filter-buttons">
          <select [(ngModel)]="statusFilter" (change)="applyFilters()">
            <option [value]="null">All Status</option>
            <option [value]="true">Active</option>
            <option [value]="false">Inactive</option>
          </select>

          <select [(ngModel)]="patternFilter" (change)="applyFilters()">
            <option [value]="null">All Patterns</option>
            <option [value]="recurringPatterns.DAILY">Daily</option>
            <option [value]="recurringPatterns.WEEKLY">Weekly</option>
            <option [value]="recurringPatterns.MONTHLY">Monthly</option>
          </select>

          <button class="btn-clear" (click)="clearFilters()">
            <i class="material-icons">clear</i>
            Clear Filters
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <i class="material-icons">hourglass_empty</i>
        <p>Loading recurring visitors...</p>
      </div>

      <!-- Recurring Visitor Cards -->
      <div class="visitor-cards-grid" *ngIf="!isLoading && filteredVisitors.length > 0">
        <div *ngFor="let visitor of filteredVisitors" class="visitor-card" [ngClass]="{'inactive': !visitor.isActive}">
          <div class="card-header">
            <div class="visitor-avatar">
              {{ visitor.name.charAt(0).toUpperCase() }}
            </div>
            <div class="visitor-title">
              <h3>{{ visitor.name }}</h3>
              <span class="status-badge" [ngClass]="visitor.isActive ? 'active' : 'inactive'">
                {{ visitor.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <div class="card-actions">
              <button type="button" class="btn-icon" (click)="viewDetails(visitor)" title="View Details">
                <i class="material-icons">visibility</i>
              </button>
              <button type="button" class="btn-icon" (click)="editVisitor(visitor)" title="Edit">
                <i class="material-icons">edit</i>
              </button>
              <div class="options-wrap">
                <button
                  type="button"
                  class="btn-icon"
                  (click)="toggleOptionsMenu(visitor, $event)"
                  title="More Options">
                  <i class="material-icons">more_vert</i>
                </button>
                <div
                  class="options-menu"
                  *ngIf="optionsMenuVisitorId === visitor.id"
                  (click)="$event.stopPropagation()">
                  <button type="button" (click)="viewDetails(visitor)">
                    <i class="material-icons">visibility</i> View details
                  </button>
                  <button type="button" (click)="editVisitor(visitor)">
                    <i class="material-icons">edit</i> Edit
                  </button>
                  <button type="button" (click)="viewQRCode(visitor)">
                    <i class="material-icons">qr_code</i> QR code
                  </button>
                  <button type="button" (click)="toggleVisitor(visitor); closeOptionsMenu()">
                    <i class="material-icons">{{ visitor.isActive ? 'pause' : 'play_arrow' }}</i>
                    {{ visitor.isActive ? 'Deactivate' : 'Activate' }}
                  </button>
                  <button type="button" class="danger" (click)="deleteVisitor(visitor)">
                    <i class="material-icons">delete</i> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="card-body">
            <div class="info-row">
              <i class="material-icons">phone</i>
              <span>{{ visitor.phone }}</span>
            </div>
            <div class="info-row">
              <i class="material-icons">home</i>
              <span>{{ visitor.visitingFlat }} <span *ngIf="visitor.visitingUnit">- {{ visitor.visitingUnit }}</span></span>
            </div>
            <div class="info-row">
              <i class="material-icons">work</i>
              <span>{{ visitor.purpose }}</span>
            </div>
            <div class="info-row">
              <i class="material-icons">schedule</i>
              <span>{{ visitor.visitTime }} ({{ visitor.expectedDuration }} min)</span>
            </div>
            <div class="info-row">
              <i class="material-icons">repeat</i>
              <span>{{ getPatternLabel(visitor.recurringPattern) }}</span>
              <span *ngIf="visitor.daysOfWeek" class="days-badge">
                {{ getDaysLabel(visitor.daysOfWeek) }}
              </span>
            </div>
            <div class="info-row" *ngIf="visitor.vehicleNumber">
              <i class="material-icons">directions_car</i>
              <span>{{ visitor.vehicleNumber }}</span>
            </div>
          </div>

          <div class="card-footer">
            <div class="footer-info">
              <div class="info-item">
                <span class="label">Total Visits:</span>
                <span class="value">{{ visitor.totalVisits }}</span>
              </div>
              <div class="info-item" *ngIf="visitor.lastVisitDate">
                <span class="label">Last Visit:</span>
                <span class="value">{{ formatDate(visitor.lastVisitDate) }}</span>
              </div>
            </div>
            <div class="footer-actions">
              <button 
                class="btn-toggle" 
                [ngClass]="visitor.isActive ? 'deactivate' : 'activate'"
                (click)="toggleVisitor(visitor)">
                <i class="material-icons">{{ visitor.isActive ? 'pause' : 'play_arrow' }}</i>
                {{ visitor.isActive ? 'Deactivate' : 'Activate' }}
              </button>
              <button type="button" class="btn-qr" (click)="viewQRCode(visitor)">
                <i class="material-icons">qr_code</i>
                QR Code
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && filteredVisitors.length === 0">
        <i class="material-icons empty-hero-icon">repeat</i>
        <h3>No Recurring Visitors Found</h3>
        <p>{{ searchTerm || statusFilter !== null || patternFilter ? 'Try adjusting your filters' : 'Start by adding a recurring visitor for daily help' }}</p>
        <div class="empty-state-actions">
          <a class="btn-primary" routerLink="/admin/visitors/recurring/add">
            <i class="material-icons">add</i>
            <span>Add Recurring Visitor</span>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .recurring-visitor-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .page-header-text {
      flex: 1;
      min-width: 0;
    }

    .page-header h1 {
      font-size: 28px;
      margin: 0 0 8px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 10px;
      line-height: 1.25;
    }

    .page-header h1 .material-icons {
      font-size: 30px;
      width: 30px;
      height: 30px;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 15px;
      line-height: 1.4;
    }

    .header-actions {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .btn-primary {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.2;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      text-decoration: none;
      white-space: nowrap;
      width: fit-content;
      max-width: 100%;
      box-sizing: border-box;
      transition: background 0.2s, box-shadow 0.2s, transform 0.2s;
    }

    .btn-primary .material-icons {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .btn-primary:hover {
      background: #5568d3;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.35);
      color: white;
      text-decoration: none;
    }

    /* Statistics Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .stat-icon.active { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
    .stat-icon.inactive { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
    .stat-icon.total { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .stat-icon.visits { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }

    .stat-icon .material-icons {
      font-size: 28px;
    }

    .stat-content h3 {
      margin: 0 0 4px 0;
      font-size: 28px;
      font-weight: 700;
      color: #2c3e50;
    }

    .stat-content p {
      margin: 0;
      font-size: 14px;
      color: #7f8c8d;
    }

    /* Filters Section */
    .filters-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #f5f5f5;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .search-box .material-icons {
      color: #999;
    }

    .search-box input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 15px;
    }

    .filter-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .filter-buttons select {
      padding: 10px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
    }

    .filter-buttons select:focus {
      border-color: #667eea;
    }

    .btn-clear {
      background: #f5f5f5;
      border: 2px solid #e0e0e0;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-clear:hover {
      background: #e0e0e0;
    }

    /* Visitor Cards Grid */
    .visitor-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
    }

    .visitor-card {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    }

    .visitor-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }

    .visitor-card.inactive {
      opacity: 0.7;
    }

    .card-header {
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .visitor-avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 24px;
    }

    .visitor-title {
      flex: 1;
    }

    .visitor-title h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.active {
      background: rgba(255,255,255,0.3);
    }

    .status-badge.inactive {
      background: rgba(255,255,255,0.2);
    }

    .card-actions {
      display: flex;
      gap: 4px;
      position: relative;
    }

    .options-wrap {
      position: relative;
    }

    .options-menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      z-index: 20;
      min-width: 180px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.18);
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .options-menu button {
      border: none;
      background: transparent;
      color: #2c3e50;
      text-align: left;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }

    .options-menu button:hover {
      background: #f5f6fa;
    }

    .options-menu button.danger {
      color: #dc3545;
    }

    .options-menu button .material-icons {
      font-size: 18px;
      color: inherit;
    }

    .btn-icon {
      background: rgba(255,255,255,0.2);
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: white;
      transition: all 0.2s;
    }

    .btn-icon:hover {
      background: rgba(255,255,255,0.3);
    }

    .card-body {
      padding: 20px;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      font-size: 14px;
      color: #2c3e50;
    }

    .info-row:last-child {
      margin-bottom: 0;
    }

    .info-row .material-icons {
      font-size: 18px;
      color: #667eea;
    }

    .days-badge {
      margin-left: auto;
      padding: 4px 8px;
      background: #f0f0f0;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      color: #667eea;
    }

    .card-footer {
      padding: 16px 20px;
      background: #f8f9fa;
      border-top: 1px solid #e0e0e0;
    }

    .footer-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 12px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .info-item .label {
      color: #7f8c8d;
      font-weight: 500;
    }

    .info-item .value {
      color: #2c3e50;
      font-weight: 600;
    }

    .footer-actions {
      display: flex;
      gap: 8px;
    }

    .btn-toggle,
    .btn-qr {
      flex: 1;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .btn-toggle.activate {
      background: #28a745;
      color: white;
    }

    .btn-toggle.deactivate {
      background: #ffc107;
      color: #2c3e50;
    }

    .btn-qr {
      background: #667eea;
      color: white;
    }

    .btn-toggle:hover,
    .btn-qr:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .loading-state,
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .loading-state .material-icons {
      font-size: 64px;
      color: #ddd;
      margin-bottom: 16px;
    }

    /* Hero icon only — do not target all .material-icons (would blow up button icons). */
    .empty-state .empty-hero-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ddd;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      color: #2c3e50;
    }

    .empty-state p {
      margin: 0 0 20px 0;
      color: #7f8c8d;
    }

    .empty-state-actions {
      display: flex;
      justify-content: center;
    }

    .empty-state-actions .btn-primary {
      min-height: 42px;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: stretch;
      }

      .header-actions {
        width: 100%;
      }

      .header-actions .btn-primary {
        width: 100%;
      }

      .page-header h1 {
        font-size: 22px;
      }

      .visitor-cards-grid {
        grid-template-columns: 1fr;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .filter-buttons {
        flex-direction: column;
      }

      .filter-buttons select,
      .filter-buttons .btn-clear {
        width: 100%;
      }

      .empty-state-actions .btn-primary {
        width: 100%;
        max-width: 320px;
      }
    }
  `]
})
export class RecurringVisitorListComponent implements OnInit {
  recurringVisitors: RecurringVisitor[] = [];
  filteredVisitors: RecurringVisitor[] = [];
  isLoading = false;

  searchTerm = '';
  statusFilter: boolean | null = null;
  patternFilter: RecurringPattern | null = null;

  recurringPatterns = RecurringPattern;
  /** Which card's ⋮ menu is open (if any). */
  optionsMenuVisitorId: string | null = null;

  constructor(
    private visitorService: VisitorManagementService,
    private router: Router
  ) {}

  @HostListener('document:click')
  closeOptionsMenu(): void {
    this.optionsMenuVisitorId = null;
  }

  ngOnInit(): void {
    this.loadRecurringVisitors();
  }

  loadRecurringVisitors(): void {
    this.isLoading = true;
    this.visitorService.getAllRecurringVisitors().subscribe({
      next: (visitors) => {
        this.recurringVisitors = visitors;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading recurring visitors:', error);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.recurringVisitors];

    // Search filter
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.name.toLowerCase().includes(searchLower) ||
        v.phone.includes(searchLower) ||
        v.visitingFlat.toLowerCase().includes(searchLower) ||
        v.purpose.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (this.statusFilter !== null) {
      filtered = filtered.filter(v => v.isActive === this.statusFilter);
    }

    // Pattern filter
    if (this.patternFilter) {
      filtered = filtered.filter(v => v.recurringPattern === this.patternFilter);
    }

    this.filteredVisitors = filtered;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = null;
    this.patternFilter = null;
    this.applyFilters();
  }

  get activeCount(): number {
    return this.recurringVisitors.filter(v => v.isActive).length;
  }

  get inactiveCount(): number {
    return this.recurringVisitors.filter(v => !v.isActive).length;
  }

  get totalVisits(): number {
    return this.recurringVisitors.reduce((sum, v) => sum + v.totalVisits, 0);
  }

  getPatternLabel(pattern: RecurringPattern): string {
    const labels: { [key: string]: string } = {
      'DAILY': 'Daily',
      'WEEKLY': 'Weekly',
      'MONTHLY': 'Monthly',
      'CUSTOM': 'Custom'
    };
    return labels[pattern] || pattern;
  }

  getDaysLabel(days: number[]): string {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (days.length === 7) return 'All Days';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
    return days.map(d => dayNames[d]).join(', ');
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  viewDetails(visitor: RecurringVisitor): void {
    this.closeOptionsMenu();
    this.router.navigate(['/admin/visitors/recurring', visitor.id]);
  }

  editVisitor(visitor: RecurringVisitor): void {
    this.closeOptionsMenu();
    this.router.navigate(['/admin/visitors/recurring', visitor.id, 'edit']);
  }

  viewQRCode(visitor: RecurringVisitor): void {
    this.closeOptionsMenu();
    this.router.navigate(['/admin/visitors/recurring', visitor.id, 'qr']);
  }

  toggleOptionsMenu(visitor: RecurringVisitor, event: Event): void {
    event.stopPropagation();
    this.optionsMenuVisitorId =
      this.optionsMenuVisitorId === visitor.id ? null : visitor.id;
  }

  deleteVisitor(visitor: RecurringVisitor): void {
    this.closeOptionsMenu();
    if (!confirm(`Delete ${visitor.name}? This cannot be undone.`)) {
      return;
    }
    this.visitorService.deleteRecurringVisitor(visitor.id).subscribe({
      next: response => {
        if (response.success) {
          this.loadRecurringVisitors();
        } else {
          alert(response.message || 'Delete failed');
        }
      },
      error: () => alert('Failed to delete recurring visitor')
    });
  }

  toggleVisitor(visitor: RecurringVisitor): void {
    const action = visitor.isActive ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} ${visitor.name}?`)) {
      this.visitorService.toggleRecurringVisitor(visitor.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadRecurringVisitors();
          }
        },
        error: (error) => {
          console.error('Error toggling visitor:', error);
          alert('Failed to update visitor status');
        }
      });
    }
  }

}

