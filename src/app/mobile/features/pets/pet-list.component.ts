import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PetService } from './services/pet.service';
import { Pet, PetSpecies, RegistrationStatus } from './models/pet.model';
import { SessionContextService } from '../../../core/services/session-context.service';
import { ToastService } from '../../../core/services/toast.service';
import { isAdminPetsPortal, petsBasePath } from './pets-portal.util';
import { Observable, of } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-pet-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="pet-list-container">
      <!-- Header -->
      <div class="header">
        <button class="back-btn" (click)="goBack()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>{{ isAdminPortal ? 'Pet Registration' : 'My Pets' }}</h1>
        <button class="add-btn" (click)="addPet()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      <!-- Search and Filter -->
      <div class="search-filter-section">
        <div class="search-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input 
            type="text" 
            placeholder="Search by name or breed..." 
            [(ngModel)]="searchTerm"
            (ngModelChange)="filterPets()"
          >
        </div>

        <div class="filter-chips">
          <button 
            class="chip" 
            [class.active]="selectedSpecies === null"
            (click)="filterBySpecies(null)"
          >
            All ({{ getTotalCount() }})
          </button>
          <button 
            *ngFor="let species of petSpecies" 
            class="chip"
            [class.active]="selectedSpecies === species"
            (click)="filterBySpecies(species)"
          >
            {{ species }} ({{ getCountBySpecies(species) }})
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-cards">
        <div class="stat-card dogs">
          <div class="stat-icon">🐕</div>
          <div class="stat-value">{{ getDogCount() }}</div>
          <div class="stat-label">Dogs</div>
        </div>
        <div class="stat-card cats">
          <div class="stat-icon">🐈</div>
          <div class="stat-value">{{ getCatCount() }}</div>
          <div class="stat-label">Cats</div>
        </div>
        <div class="stat-card pending">
          <div class="stat-icon">⏳</div>
          <div class="stat-value">{{ getPendingCount() }}</div>
          <div class="stat-label">Pending</div>
        </div>
      </div>

      <!-- Pet List -->
      <div class="pet-list" *ngIf="!loading && filteredPets.length > 0">
        <div 
          class="pet-card" 
          *ngFor="let pet of filteredPets"
        >
          <div class="pet-card-header" (click)="viewPetDetails(pet.id)">
            <div class="pet-photo-wrap">
              <img
                *ngIf="pet.photoUrl"
                [src]="pet.photoUrl"
                [alt]="pet.name"
                class="pet-photo"
                (error)="hidePhoto($event)"
              />
              <div *ngIf="!pet.photoUrl" class="pet-photo pet-photo-fallback">{{ speciesEmoji(pet.species) }}</div>
            </div>
            <div class="pet-info">
              <h3>{{ pet.name }}</h3>
              <div class="pet-meta">
                <span class="breed-badge">{{ pet.breed }}</span>
                <span class="age-text">{{ pet.age }}</span>
              </div>
            </div>
            <span class="status-badge" [ngClass]="getStatusClass(pet.registrationStatus)">
              {{ pet.registrationStatus }}
            </span>
          </div>

          <div class="pet-card-body">
            <div class="info-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
              <span>{{ pet.species }} • {{ pet.gender }}</span>
            </div>

            <div class="info-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              </svg>
              <span>Flat {{ pet.flatNumber }}</span>
            </div>

            <div class="info-row" *ngIf="pet.weight">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
              <span>Weight: {{ pet.weight }} kg</span>
            </div>

            <div class="info-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>{{ pet.ownerName }}</span>
            </div>

            <div class="vaccination-status">
              <div class="vac-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>Vaccination Status</span>
              </div>
              <button type="button" class="vac-btn" (click)="viewVaccinations(pet.id, $event)">
                View Records
              </button>
            </div>
          </div>

          <div class="pet-card-footer">
            <button type="button" class="action-btn" (click)="viewVaccinations(pet.id, $event)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Vaccinations
            </button>
            <button type="button" class="action-btn" (click)="viewHealthRecords(pet.id, $event)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              Health
            </button>
            <button type="button" class="action-btn" (click)="viewActivities(pet.id, $event)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              Activity
            </button>
          </div>

          <div
            class="admin-approval-bar"
            *ngIf="isAdminPortal && pet.registrationStatus === registrationStatus.PENDING"
            (click)="$event.stopPropagation()"
          >
            <button type="button" class="admin-btn reject" (click)="rejectPet(pet, $event)">Reject</button>
            <button type="button" class="admin-btn approve" (click)="approvePet(pet, $event)">Approve</button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!loading && filteredPets.length === 0">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"></path>
          <circle cx="10" cy="12" r="2"></circle>
        </svg>
        <h3>No Pets Found</h3>
        <p>{{ searchTerm ? 'Try different search terms' : 'Register your first pet' }}</p>
        <button class="primary-btn" (click)="addPet()">Register Pet</button>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Loading pets...</p>
      </div>
    </div>
  `,
  styles: [`
    .pet-list-container {
      min-height: 100vh;
      background: #f5f5f5;
      padding-bottom: 80px;
    }

    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .header h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .back-btn, .add-btn {
      background: rgba(255,255,255,0.2);
      border: none;
      border-radius: 8px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s;
    }

    .back-btn:hover, .add-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    .search-filter-section {
      padding: 1rem;
      background: white;
      border-bottom: 1px solid #e0e0e0;
    }

    .search-box {
      display: flex;
      align-items: center;
      background: #f5f5f5;
      border-radius: 12px;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
    }

    .search-box svg {
      margin-right: 0.5rem;
      color: #666;
    }

    .search-box input {
      flex: 1;
      border: none;
      background: none;
      outline: none;
      font-size: 0.95rem;
    }

    .filter-chips {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
    }

    .filter-chips::-webkit-scrollbar {
      display: none;
    }

    .chip {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      border: 1px solid #e0e0e0;
      background: white;
      font-size: 0.85rem;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.3s;
    }

    .chip.active {
      background: #10b981;
      color: white;
      border-color: #10b981;
    }

    .stats-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      padding: 1rem;
    }

    .stat-card {
      background: white;
      padding: 1rem;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .stat-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
      color: #10b981;
    }

    .stat-label {
      font-size: 0.85rem;
      color: #666;
    }

    .pet-list {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .pet-card {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      transition: all 0.3s;
    }

    .pet-card-header {
      cursor: pointer;
    }

    .pet-card-header:active {
      background: #fafafa;
    }

    .pet-card-header {
      display: flex;
      align-items: center;
      padding: 1rem;
      gap: 1rem;
      border-bottom: 1px solid #f0f0f0;
    }

    .pet-photo-wrap {
      flex-shrink: 0;
    }

    .pet-photo {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid #f0f0f0;
    }

    .pet-photo-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      background: #f0fdf4;
    }

    .pet-info {
      flex: 1;
    }

    .pet-info h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
      color: #333;
    }

    .pet-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .breed-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: #e0f2fe;
      color: #0369a1;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .age-text {
      font-size: 0.85rem;
      color: #666;
    }

    .status-badge {
      padding: 0.35rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-badge.approved { background: #d1fae5; color: #065f46; }
    .status-badge.pending { background: #fef3c7; color: #92400e; }
    .status-badge.rejected { background: #fee2e2; color: #991b1b; }
    .status-badge.expired { background: #f3f4f6; color: #6b7280; }

    .pet-card-body {
      padding: 1rem;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      color: #666;
      font-size: 0.9rem;
    }

    .info-row svg {
      color: #999;
    }

    .vaccination-status {
      background: #f0fdf4;
      padding: 0.75rem;
      border-radius: 8px;
      margin-top: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .vac-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #065f46;
    }

    .vac-btn {
      background: #10b981;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }

    .vac-btn:hover {
      background: #059669;
    }

    .pet-card-footer {
      display: flex;
      border-top: 1px solid #f0f0f0;
    }

    .action-btn {
      flex: 1;
      padding: 0.75rem;
      border: none;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #10b981;
      cursor: pointer;
      transition: all 0.3s;
    }

    .action-btn:not(:last-child) {
      border-right: 1px solid #f0f0f0;
    }

    .action-btn:hover {
      background: #f9fafb;
    }

    .admin-approval-bar {
      display: flex;
      gap: 10px;
      padding: 12px 16px;
      border-top: 1px solid #f0f0f0;
      background: #fafafa;
    }

    .admin-btn {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
    }

    .admin-btn.approve {
      background: #10b981;
      color: #fff;
    }

    .admin-btn.reject {
      background: #fee2e2;
      color: #b91c1c;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 2rem;
    }

    .empty-state svg {
      color: #d1d5db;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      margin: 1rem 0 0.5rem 0;
      color: #333;
    }

    .empty-state p {
      color: #666;
      margin-bottom: 1.5rem;
    }

    .primary-btn {
      background: #10b981;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s;
    }

    .primary-btn:hover {
      background: #059669;
      transform: translateY(-2px);
    }

    .loading-state {
      text-align: center;
      padding: 3rem 2rem;
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #f3f4f6;
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class PetListComponent implements OnInit {
  /** Admin portal lists all society pets; mobile/resident lists own flat pets. */
  isAdminPortal = false;
  private petsBasePath = '/admin/pets';

  pets: Pet[] = [];
  filteredPets: Pet[] = [];
  loading = true;
  searchTerm = '';
  selectedSpecies: PetSpecies | null = null;
  petSpecies = [PetSpecies.DOG, PetSpecies.CAT, PetSpecies.BIRD, PetSpecies.OTHER];
  readonly registrationStatus = RegistrationStatus;

  constructor(
    private petService: PetService,
    private router: Router,
    private session: SessionContextService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.detectPortalContext();
    this.loadPets();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this.detectPortalContext();
        if (this.router.url.includes('/pets') && !this.router.url.includes('/add')) {
          this.loadPets();
        }
      });
  }

  /** Admin vs mobile route prefixes for navigation and data scope. */
  private detectPortalContext(): void {
    const url = this.router.url;
    this.isAdminPortal = isAdminPetsPortal(url);
    this.petsBasePath = petsBasePath(url);
  }

  loadPets() {
    this.loading = true;
    const sid = this.session.getSocietyId();

    let req$: Observable<Pet[]>;
    if (this.isAdminPortal) {
      // Admin portal: show every pet in the society (not only the admin's linked flat).
      req$ = sid ? this.petService.getPetsBySociety(sid) : of([]);
    } else {
      const flatId = this.session.getFlatId();
      const uid = this.session.getCurrentUserId();
      if (flatId) {
        req$ = this.petService.getPetsByFlat(flatId);
      } else if (uid) {
        req$ = this.petService.getPetsByOwner(uid);
      } else if (sid) {
        req$ = this.petService.getPetsBySociety(sid);
      } else {
        req$ = of([]);
      }
    }
    req$.subscribe({
      next: pets => {
        this.pets = pets;
        this.filteredPets = pets;
        this.loading = false;
      },
      error: err => {
        console.error('Error loading pets:', err);
        this.loading = false;
      }
    });
  }

  filterPets() {
    let filtered = this.pets;

    // Filter by species
    if (this.selectedSpecies) {
      filtered = filtered.filter(p => p.species === this.selectedSpecies);
    }

    // Filter by search term
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.breed.toLowerCase().includes(term) ||
        p.species.toLowerCase().includes(term)
      );
    }

    this.filteredPets = filtered;
  }

  filterBySpecies(species: PetSpecies | null) {
    this.selectedSpecies = species;
    this.filterPets();
  }

  getStatusClass(status: RegistrationStatus): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }

  getTotalCount(): number {
    return this.pets.length;
  }

  getDogCount(): number {
    return this.pets.filter(p => p.species === PetSpecies.DOG).length;
  }

  getCatCount(): number {
    return this.pets.filter(p => p.species === PetSpecies.CAT).length;
  }

  getPendingCount(): number {
    return this.pets.filter(p => p.registrationStatus === RegistrationStatus.PENDING).length;
  }

  getCountBySpecies(species: PetSpecies): number {
    return this.pets.filter(p => p.species === species).length;
  }

  viewPetDetails(petId: string) {
    this.router.navigate([this.petsBasePath, 'detail', petId]);
  }

  viewVaccinations(petId: string, event: Event) {
    event.stopPropagation();
    this.router.navigate([this.petsBasePath, 'vaccinations', petId]);
  }

  viewHealthRecords(petId: string, event: Event) {
    event.stopPropagation();
    this.router.navigate([this.petsBasePath, 'health-records', petId]);
  }

  viewActivities(petId: string, event: Event) {
    event.stopPropagation();
    this.router.navigate([this.petsBasePath, 'activities', petId]);
  }

  addPet() {
    this.router.navigate([this.petsBasePath, 'add']);
  }

  speciesEmoji(species: PetSpecies | string): string {
    const s = String(species).toLowerCase();
    if (s.includes('dog')) return '🐕';
    if (s.includes('cat')) return '🐈';
    if (s.includes('bird')) return '🐦';
    return '🐾';
  }

  /** Hide broken image URLs and show emoji placeholder instead. */
  hidePhoto(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const wrap = img.parentElement;
    if (wrap && !wrap.querySelector('.pet-photo-fallback')) {
      const fallback = document.createElement('div');
      fallback.className = 'pet-photo pet-photo-fallback';
      fallback.textContent = '🐾';
      wrap.appendChild(fallback);
    }
  }

  approvePet(pet: Pet, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Approve pet "${pet.name}"?`)) return;
    this.petService.updateRegistrationStatus(pet.id, RegistrationStatus.APPROVED).subscribe({
      next: () => {
        this.toast.success('Pet approved successfully.');
        this.loadPets();
      },
      error: () => this.toast.error('Failed to approve pet.')
    });
  }

  rejectPet(pet: Pet, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Reject pet "${pet.name}"?`)) return;
    this.petService.updateRegistrationStatus(pet.id, RegistrationStatus.REJECTED).subscribe({
      next: () => {
        this.toast.success('Pet registration rejected.');
        this.loadPets();
      },
      error: () => this.toast.error('Failed to reject pet.')
    });
  }

  goBack() {
    this.router.navigate([this.isAdminPortal ? '/admin/users' : '/mobile/dashboard']);
  }
}
