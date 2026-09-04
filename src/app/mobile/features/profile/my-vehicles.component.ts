import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { MobileAuthService } from '../../services/mobile-auth.service';
import { loadPocListWithIds } from './poc-profile-list.util';
import { ResidentProfileAssetsService, PocVehicleRow } from './resident-profile-assets.service';

/**
 * My Vehicles Component - Mobile
 * Manage user's vehicles (POC localStorage).
 */
@Component({
  selector: 'app-my-vehicles',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="vehicles-container">
      <div class="page-header">
        <h2>My Vehicles</h2>
        <button class="btn-add" (click)="addVehicle()">
          <i class="material-icons">add</i>
          <span>Add Vehicle</span>
        </button>
      </div>

      <div class="vehicles-list" *ngIf="vehicles.length > 0; else emptyState">
        <div *ngFor="let vehicle of vehicles" class="vehicle-card">
          <div class="vehicle-icon">
            <i class="material-icons">directions_car</i>
          </div>
          <div class="vehicle-info">
            <h3>{{ vehicle.registrationNumber }}</h3>
            <p>{{ vehicle.make }} {{ vehicle.model }}</p>
            <p class="vehicle-status" [class.active]="vehicle.status === 'ACTIVE'">
              {{ vehicle.status }}
            </p>
          </div>
          <button class="btn-edit" type="button" (click)="editVehicle(vehicle)" title="Edit vehicle">
            <i class="material-icons">edit</i>
          </button>
        </div>
      </div>

      <ng-template #emptyState>
        <div class="empty-state">
          <i class="material-icons">directions_car</i>
          <p>No vehicles registered yet</p>
          <button class="btn-primary" (click)="addVehicle()">Register Vehicle</button>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .vehicles-container {
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

    .vehicles-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .vehicle-card {
      background: white;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .vehicle-icon {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .vehicle-icon i {
      font-size: 28px;
      color: #667eea;
    }

    .vehicle-info {
      flex: 1;
    }

    .vehicle-info h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      color: #333;
    }

    .vehicle-info p {
      margin: 0;
      font-size: 14px;
      color: #666;
    }

    .vehicle-status {
      font-size: 12px !important;
      font-weight: 500;
      margin-top: 4px !important;
    }

    .vehicle-status.active {
      color: #4caf50;
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
  `]
})
export class MyVehiclesComponent implements OnInit, OnDestroy {
  vehicles: PocVehicleRow[] = [];
  private navSub?: Subscription;

  constructor(
    private router: Router,
    private auth: MobileAuthService,
    private assets: ResidentProfileAssetsService
  ) {}

  ngOnInit() {
    this.loadVehicles();
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.loadVehicles());
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  loadVehicles() {
    const user = this.auth.getCurrentUser();
    if (!user) {
      this.vehicles = [];
      return;
    }
    const key = `poc:vehicles:${user.id}`;
    this.vehicles = loadPocListWithIds(key, 'veh') as PocVehicleRow[];
    this.syncUnsyncedVehicles(key);
  }

  private syncUnsyncedVehicles(storageKey: string): void {
    const pending = this.vehicles.filter(v => !v.backendId);
    pending.forEach(vehicle => {
      this.assets.syncVehicle(vehicle).subscribe(backendId => {
        if (!backendId) return;
        const list = loadPocListWithIds(storageKey, 'veh') as PocVehicleRow[];
        const idx = list.findIndex(v => v.id === vehicle.id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], backendId };
          localStorage.setItem(storageKey, JSON.stringify(list));
          this.vehicles = list;
        }
      });
    });
  }

  addVehicle() {
    this.router.navigate(['/mobile/profile/vehicles/add']);
  }

  editVehicle(vehicle: { id?: string }) {
    if (!vehicle?.id) {
      alert('This entry cannot be edited. Please remove it and add again.');
      return;
    }
    this.router.navigate(['/mobile/profile/vehicles/edit', vehicle.id]);
  }
}
