import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { PetService } from './services/pet.service';
import { Pet, RegistrationStatus } from './models/pet.model';
import { isAdminPetsPortal, petsBasePath } from './pets-portal.util';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Pet profile with admin approve/reject and links to vaccinations / health records.
 */
@Component({
  selector: 'app-pet-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <div class="header">
        <button type="button" class="icon-btn" (click)="goBack()" aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1>Pet Details</h1>
        <span class="spacer"></span>
      </div>

      <div class="loading" *ngIf="loading">Loading pet…</div>
      <div class="error" *ngIf="!loading && !pet">Pet not found.</div>

      <div class="content" *ngIf="pet && !loading">
        <div class="hero">
          <div class="photo-wrap">
            <img *ngIf="pet.photoUrl" [src]="pet.photoUrl" [alt]="pet.name" class="photo" />
            <div *ngIf="!pet.photoUrl" class="photo placeholder">{{ speciesEmoji(pet.species) }}</div>
          </div>
          <div class="hero-info">
            <h2>{{ pet.name }}</h2>
            <p class="meta">{{ pet.species }} · {{ pet.breed }} · {{ pet.gender }}</p>
            <span class="status-badge" [ngClass]="statusClass(pet.registrationStatus)">
              {{ pet.registrationStatus }}
            </span>
          </div>
        </div>

        <div class="section">
          <h3>Owner & Flat</h3>
          <dl>
            <dt>Owner</dt>
            <dd>{{ pet.ownerName || '—' }}</dd>
            <dt>Flat</dt>
            <dd>{{ pet.flatNumber || '—' }}</dd>
            <dt>Registration #</dt>
            <dd>{{ pet.registrationNumber || '—' }}</dd>
          </dl>
        </div>

        <div class="section">
          <h3>Records</h3>
          <div class="link-row">
            <button type="button" class="link-btn" (click)="openVaccinations()">Vaccinations</button>
            <button type="button" class="link-btn" (click)="openHealth()">Health Records</button>
            <button type="button" class="link-btn" (click)="openActivities()">Activity</button>
          </div>
        </div>

        <div class="admin-actions" *ngIf="isAdmin && pet.registrationStatus === pendingStatus">
          <button type="button" class="btn reject" [disabled]="acting" (click)="reject()">Reject</button>
          <button type="button" class="btn approve" [disabled]="acting" (click)="approve()">Approve</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page { min-height: 100vh; background: #f5f5f5; padding-bottom: 32px; }
      .header {
        display: flex; align-items: center; gap: 12px;
        padding: 14px 16px; background: linear-gradient(135deg, #10b981, #059669); color: #fff;
      }
      .header h1 { flex: 1; margin: 0; font-size: 1.2rem; }
      .spacer { width: 40px; }
      .icon-btn {
        border: none; background: rgba(255,255,255,0.2); border-radius: 10px;
        width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff;
      }
      .loading, .error { padding: 24px; text-align: center; color: #666; }
      .content { padding: 16px; }
      .hero {
        display: flex; gap: 16px; align-items: center;
        background: #fff; border-radius: 16px; padding: 16px; margin-bottom: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }
      .photo-wrap { flex-shrink: 0; }
      .photo {
        width: 88px; height: 88px; border-radius: 50%; object-fit: cover; border: 3px solid #e5e7eb;
      }
      .photo.placeholder {
        display: flex; align-items: center; justify-content: center;
        font-size: 2.5rem; background: #f0fdf4;
      }
      .hero-info h2 { margin: 0 0 6px; font-size: 1.35rem; color: #1f2937; }
      .meta { margin: 0 0 8px; color: #6b7280; font-size: 0.9rem; }
      .status-badge {
        display: inline-block; padding: 4px 10px; border-radius: 12px;
        font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
      }
      .status-badge.pending { background: #fef3c7; color: #92400e; }
      .status-badge.approved { background: #d1fae5; color: #065f46; }
      .status-badge.rejected { background: #fee2e2; color: #991b1b; }
      .section {
        background: #fff; border-radius: 16px; padding: 16px; margin-bottom: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }
      .section h3 { margin: 0 0 12px; font-size: 1rem; color: #374151; }
      dl {
        display: grid; grid-template-columns: 110px 1fr; gap: 8px 12px; margin: 0; font-size: 0.95rem;
      }
      dt { color: #9ca3af; margin: 0; }
      dd { margin: 0; color: #1f2937; font-weight: 600; }
      .link-row { display: flex; flex-wrap: wrap; gap: 10px; }
      .link-btn {
        flex: 1; min-width: 120px; padding: 12px; border: 1px solid #10b981;
        background: #f0fdf4; color: #047857; border-radius: 10px; font-weight: 600; cursor: pointer;
      }
      .admin-actions {
        display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px;
      }
      .btn {
        padding: 12px 20px; border: none; border-radius: 10px; font-weight: 700; cursor: pointer;
      }
      .btn:disabled { opacity: 0.6; cursor: not-allowed; }
      .btn.approve { background: #10b981; color: #fff; }
      .btn.reject { background: #fee2e2; color: #b91c1c; }
    `
  ]
})
export class PetDetailComponent implements OnInit {
  pet: Pet | undefined;
  loading = true;
  acting = false;
  isAdmin = false;
  private basePath = '/admin/pets';
  readonly pendingStatus = RegistrationStatus.PENDING;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private petService: PetService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.isAdmin = isAdminPetsPortal(this.router.url);
    this.basePath = petsBasePath(this.router.url);
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!id) {
      this.loading = false;
      return;
    }
    this.petService.getPetById(id).subscribe({
      next: pet => {
        this.pet = pet;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  speciesEmoji(species: string): string {
    const s = (species || '').toLowerCase();
    if (s.includes('dog')) return '🐕';
    if (s.includes('cat')) return '🐈';
    if (s.includes('bird')) return '🐦';
    return '🐾';
  }

  statusClass(status: RegistrationStatus): string {
    return (status || '').toLowerCase();
  }

  goBack(): void {
    this.router.navigate([this.basePath]);
  }

  openVaccinations(): void {
    if (!this.pet) return;
    this.router.navigate([this.basePath, 'vaccinations', this.pet.id]);
  }

  openHealth(): void {
    if (!this.pet) return;
    this.router.navigate([this.basePath, 'health-records', this.pet.id]);
  }

  openActivities(): void {
    if (!this.pet) return;
    this.router.navigate([this.basePath, 'activities', this.pet.id]);
  }

  approve(): void {
    if (!this.pet || !confirm('Approve this pet registration?')) return;
    this.acting = true;
    this.petService.updateRegistrationStatus(this.pet.id, RegistrationStatus.APPROVED).subscribe({
      next: updated => {
        this.pet = updated;
        this.acting = false;
        this.toast.success('Pet approved successfully.');
      },
      error: () => {
        this.acting = false;
        this.toast.error('Failed to approve pet.');
      }
    });
  }

  reject(): void {
    if (!this.pet || !confirm('Reject this pet registration?')) return;
    this.acting = true;
    this.petService.updateRegistrationStatus(this.pet.id, RegistrationStatus.REJECTED).subscribe({
      next: updated => {
        this.pet = updated;
        this.acting = false;
        this.toast.success('Pet registration rejected.');
      },
      error: () => {
        this.acting = false;
        this.toast.error('Failed to reject pet.');
      }
    });
  }
}
