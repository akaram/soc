import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subscription, filter, forkJoin, of, switchMap } from 'rxjs';
import { MobileAuthService } from '../../services/mobile-auth.service';
import { loadPocListWithIds } from './poc-profile-list.util';
import { ResidentProfileAssetsService, PocPetRow } from './resident-profile-assets.service';
import { PetService } from '../pets/services/pet.service';
import { Pet, RegistrationStatus } from '../pets/models/pet.model';

/** Row shown in My Pets — backend records plus unsynced on-device entries. */
type MyPetRow = {
  id: string;
  backendId?: string;
  name: string;
  type: string;
  breed: string;
  status: string;
  /** True when the row exists only in localStorage until sync completes. */
  localOnly?: boolean;
};

/**
 * My Pets Component - Mobile
 * Lists pets from the backend (including admin-registered) and merges local POC drafts.
 */
@Component({
  selector: 'app-my-pets',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="pets-container">
      <div class="page-header">
        <h2>My Pets</h2>
        <button class="btn-add" (click)="addPet()">
          <i class="material-icons">add</i>
          <span>Add Pet</span>
        </button>
      </div>

      <p class="loading-hint" *ngIf="loading">Loading pets…</p>

      <div class="pets-list" *ngIf="!loading && pets.length > 0; else emptyState">
        <div *ngFor="let pet of pets" class="pet-card">
          <div class="pet-avatar">
            <i class="material-icons">pets</i>
          </div>
          <div class="pet-info">
            <h3>{{ pet.name }}</h3>
            <p>{{ pet.type }} • {{ pet.breed }}</p>
            <p
              class="pet-status"
              [class.approved]="pet.status === 'Approved' || pet.status === 'ACTIVE'"
              [class.pending]="pet.status === 'Pending'"
              [class.rejected]="pet.status === 'Rejected'">
              {{ pet.status }}
            </p>
          </div>
          <button
            class="btn-edit"
            type="button"
            (click)="openPet(pet)"
            [title]="pet.backendId ? 'View pet details' : 'Edit pet'">
            <i class="material-icons">{{ pet.backendId ? 'visibility' : 'edit' }}</i>
          </button>
        </div>
      </div>

      <ng-template #emptyState>
        <div class="empty-state" *ngIf="!loading">
          <i class="material-icons">pets</i>
          <p>No pets registered yet</p>
          <button class="btn-primary" (click)="addPet()">Register Pet</button>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .pets-container {
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

    .loading-hint {
      padding: 16px;
      color: #64748b;
      text-align: center;
    }

    .pets-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .pet-card {
      background: white;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .pet-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pet-avatar i {
      font-size: 28px;
      color: #667eea;
    }

    .pet-info {
      flex: 1;
    }

    .pet-info h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      color: #333;
    }

    .pet-info p {
      margin: 0;
      font-size: 14px;
      color: #666;
    }

    .pet-status {
      font-size: 12px !important;
      font-weight: 500;
      margin-top: 4px !important;
    }

    .pet-status.approved {
      color: #4caf50;
    }

    .pet-status.pending {
      color: #f59e0b;
    }

    .pet-status.rejected {
      color: #ef4444;
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
export class MyPetsComponent implements OnInit, OnDestroy {
  pets: MyPetRow[] = [];
  loading = false;
  private navSub?: Subscription;

  constructor(
    private router: Router,
    private auth: MobileAuthService,
    private assets: ResidentProfileAssetsService,
    private petService: PetService
  ) {}

  ngOnInit() {
    this.loadPets();
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.loadPets());
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  loadPets() {
    const user = this.auth.getCurrentUser();
    if (!user) {
      this.pets = [];
      return;
    }

    const storageKey = `poc:pets:${user.id}`;
    const localPets = loadPocListWithIds(storageKey, 'pet') as PocPetRow[];

    this.loading = true;
    this.auth
      .refreshProfileFromServer()
      .pipe(
        switchMap(freshUser => {
          const activeUser = freshUser ?? user;
          const byOwner$ = this.petService.getPetsByOwner(activeUser.id);
          const byFlat$ = activeUser.flatId
            ? this.petService.getPetsByFlat(activeUser.flatId)
            : of([] as Pet[]);
          return forkJoin({ byOwner: byOwner$, byFlat: byFlat$ });
        })
      )
      .subscribe({
        next: ({ byOwner, byFlat }) => {
          this.pets = this.mergePets(byOwner, byFlat, localPets);
          this.loading = false;
          this.syncUnsyncedPets(storageKey);
        },
        error: () => {
          this.pets = this.mapLocalRows(localPets);
          this.loading = false;
          this.syncUnsyncedPets(storageKey);
        }
      });
  }

  /** Combine API pets (owner + flat) with unsynced local entries. */
  private mergePets(byOwner: Pet[], byFlat: Pet[], localPets: PocPetRow[]): MyPetRow[] {
    const seen = new Set<string>();
    const apiRows: MyPetRow[] = [];

    for (const pet of [...byOwner, ...byFlat]) {
      if (!pet.id || seen.has(pet.id)) {
        continue;
      }
      seen.add(pet.id);
      apiRows.push({
        id: pet.id,
        backendId: pet.id,
        name: pet.name,
        type: pet.species,
        breed: pet.breed || '—',
        status: pet.registrationStatus || RegistrationStatus.PENDING
      });
    }

    const apiIds = new Set(apiRows.map(r => r.backendId).filter(Boolean) as string[]);
    const localRows = localPets
      .filter(lp => !lp.backendId || !apiIds.has(lp.backendId))
      .map(lp => ({
        id: lp.id,
        backendId: lp.backendId,
        name: lp.name,
        type: lp.type,
        breed: lp.breed,
        status: lp.status,
        localOnly: !lp.backendId
      }));

    return [...apiRows, ...localRows];
  }

  private mapLocalRows(localPets: PocPetRow[]): MyPetRow[] {
    return localPets.map(lp => ({
      id: lp.id,
      backendId: lp.backendId,
      name: lp.name,
      type: lp.type,
      breed: lp.breed,
      status: lp.status,
      localOnly: !lp.backendId
    }));
  }

  /** Push pets that were saved only on-device to the backend for admin visibility. */
  private syncUnsyncedPets(storageKey: string): void {
    const localPets = loadPocListWithIds(storageKey, 'pet') as PocPetRow[];
    const pending = localPets.filter(p => !p.backendId);
    if (pending.length === 0) {
      return;
    }

    let completed = 0;
    pending.forEach(pet => {
      this.assets.syncPet(pet).subscribe(backendId => {
        completed += 1;
        if (!backendId) {
          if (completed === pending.length) {
            this.loadPets();
          }
          return;
        }
        const list = loadPocListWithIds(storageKey, 'pet') as PocPetRow[];
        const idx = list.findIndex(p => p.id === pet.id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], backendId };
          localStorage.setItem(storageKey, JSON.stringify(list));
        }
        if (completed === pending.length) {
          this.loadPets();
        }
      });
    });
  }

  addPet() {
    this.router.navigate(['/mobile/profile/pets/add']);
  }

  openPet(pet: MyPetRow) {
    if (pet.backendId) {
      this.router.navigate(['/mobile/pets/detail', pet.backendId]);
      return;
    }
    if (!pet.id) {
      return;
    }
    this.router.navigate(['/mobile/profile/pets/edit', pet.id]);
  }
}
