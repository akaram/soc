import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { VisitorManagementService } from '../services/visitor-management.service';
import { BusRoute, CreateSchoolBusRequest } from '../models/school-bus-tracking.model';

@Component({
  selector: 'app-school-bus-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="form-container">
      <div class="page-header">
        <button type="button" class="btn-back" routerLink="/admin/visitors/school-bus">
          <i class="material-icons">arrow_back</i>
        </button>
        <h1>Add School Bus</h1>
        <p>Register a bus for live tracking on your society routes</p>
      </div>

      <div class="form-wrapper" *ngIf="!routesLoading">
        <p class="route-hint" *ngIf="routes.length === 0">
          No bus routes found for this society. In dev, routes are created on backend startup;
          restart the backend with profile <code>dev</code> or add routes via API first.
        </p>

        <form (ngSubmit)="onSubmit()" #busForm="ngForm">
          <div class="form-section">
            <h3><i class="material-icons">directions_bus</i> Bus &amp; Driver</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="busNumber">Bus Number <span class="required">*</span></label>
                <input id="busNumber" name="busNumber" [(ngModel)]="formData.busNumber" required placeholder="e.g. BUS-004" />
              </div>
              <div class="form-group">
                <label for="vehicleNumber">Vehicle Number <span class="required">*</span></label>
                <input id="vehicleNumber" name="vehicleNumber" [(ngModel)]="formData.vehicleNumber" required placeholder="e.g. MH-12-XX-1234" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="driverName">Driver Name <span class="required">*</span></label>
                <input id="driverName" name="driverName" [(ngModel)]="formData.driverName" required />
              </div>
              <div class="form-group">
                <label for="driverPhone">Driver Phone <span class="required">*</span></label>
                <input id="driverPhone" name="driverPhone" type="tel" [(ngModel)]="formData.driverPhone" required />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="driverLicense">Driver License</label>
                <input id="driverLicense" name="driverLicense" [(ngModel)]="formData.driverLicense" />
              </div>
              <div class="form-group">
                <label for="maxCapacity">Max Capacity <span class="required">*</span></label>
                <input id="maxCapacity" name="maxCapacity" type="number" min="1" [(ngModel)]="formData.maxCapacity" required />
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3><i class="material-icons">route</i> Route &amp; Schedule</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="routeId">Route <span class="required">*</span></label>
                <select id="routeId" name="routeId" [(ngModel)]="formData.routeId" required>
                  <option value="">Select route</option>
                  <option *ngFor="let route of routes" [value]="route.id">
                    {{ route.routeName }} ({{ route.routeNumber }})
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label for="scheduledPickupTime">Pickup Time</label>
                <input id="scheduledPickupTime" name="scheduledPickupTime" type="time" [(ngModel)]="formData.scheduledPickupTime" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="scheduledDropoffTime">Dropoff Time</label>
                <input id="scheduledDropoffTime" name="scheduledDropoffTime" type="time" [(ngModel)]="formData.scheduledDropoffTime" />
              </div>
              <div class="form-group">
                <label for="notes">Notes</label>
                <input id="notes" name="notes" [(ngModel)]="formData.notes" placeholder="Optional" />
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" routerLink="/admin/visitors/school-bus">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="!busForm.valid || isSubmitting || routes.length === 0">
              <i class="material-icons" *ngIf="!isSubmitting">add</i>
              <span>{{ isSubmitting ? 'Saving…' : 'Add School Bus' }}</span>
            </button>
          </div>
        </form>
      </div>

      <div class="loading" *ngIf="routesLoading">Loading routes…</div>
    </div>
  `,
  styles: [`
    .form-container { max-width: 900px; margin: 0 auto; padding: 0; }
    .page-header { margin-bottom: 24px; }
    .btn-back { background: none; border: none; color: #667eea; cursor: pointer; margin-bottom: 12px; display: flex; align-items: center; }
    .page-header h1 { margin: 0 0 8px; font-size: 28px; color: #2c3e50; }
    .page-header p { margin: 0; color: #7f8c8d; }
    .form-wrapper { background: white; border-radius: 16px; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .route-hint { background: #fff8e6; border: 1px solid #ffe08a; padding: 12px; border-radius: 8px; font-size: 13px; color: #856404; margin-bottom: 20px; }
    .form-section { margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #eee; }
    .form-section h3 { margin: 0 0 16px; display: flex; align-items: center; gap: 8px; font-size: 18px; }
    .form-section h3 .material-icons { color: #667eea; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 13px; font-weight: 600; color: #2c3e50; }
    .required { color: #e74c3c; }
    .form-group input, .form-group select { padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; }
    .btn-primary, .btn-secondary { border: none; border-radius: 8px; padding: 10px 18px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .btn-primary { background: #667eea; color: white; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary { background: white; color: #667eea; border: 2px solid #667eea; }
    .loading { text-align: center; padding: 40px; color: #7f8c8d; }
    @media (max-width: 768px) { .form-row { grid-template-columns: 1fr; } }
  `]
})
export class SchoolBusFormComponent implements OnInit {
  routes: BusRoute[] = [];
  routesLoading = true;
  isSubmitting = false;

  formData: CreateSchoolBusRequest = {
    busNumber: '',
    vehicleNumber: '',
    driverName: '',
    driverPhone: '',
    routeId: '',
    maxCapacity: 40,
    scheduledPickupTime: '07:00',
    scheduledDropoffTime: '14:30'
  };

  constructor(
    private visitorService: VisitorManagementService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.visitorService.getAllBusRoutes().subscribe({
      next: routes => {
        this.routes = routes;
        this.routesLoading = false;
      },
      error: () => {
        this.routesLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.visitorService.createSchoolBus(this.formData).subscribe({
      next: response => {
        this.isSubmitting = false;
        if (response.success && response.bus) {
          this.router.navigate(['/admin/visitors/school-bus', response.bus.id]);
          return;
        }
        alert(response.message || 'Failed to add school bus');
      },
      error: () => {
        this.isSubmitting = false;
        alert('Failed to add school bus. Is the backend running?');
      }
    });
  }
}
