import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PetService } from './services/pet.service';
import { Pet, VaccinationRecord, VaccineType } from './models/pet.model';
import { petsBasePath } from './pets-portal.util';
import { finalize, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

/**
 * Lists and adds vaccination rows for one pet via GET/POST /pets/:id/vaccinations.
 */
@Component({
  selector: 'app-vaccination-records',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="page">
      <div class="header">
        <button type="button" class="icon-btn" (click)="goBack()" aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1>Vaccinations</h1>
        <button type="button" class="icon-btn primary" (click)="toggleForm()" *ngIf="pet">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      <div class="banner error" *ngIf="error">{{ error }}</div>

      <div class="pet-summary" *ngIf="pet && !loading">
        <h2>{{ pet.name }}</h2>
        <p class="meta">{{ pet.species }} · Flat {{ pet.flatNumber }}</p>
      </div>

      <div class="loading" *ngIf="loading">Loading…</div>

      <div class="form-card" *ngIf="showForm && pet">
        <h3>Add vaccination</h3>
        <label>Vaccine name <input class="ctrl" [(ngModel)]="draft.vaccineName" /></label>
        <label>
          Type
          <select class="ctrl" [(ngModel)]="draft.vaccineType">
            <option *ngFor="let t of vaccineTypes" [ngValue]="t">{{ t }}</option>
          </select>
        </label>
        <label>Administered <input class="ctrl" type="date" [(ngModel)]="draft.administeredDateStr" /></label>
        <label>Next due <input class="ctrl" type="date" [(ngModel)]="draft.nextDueDateStr" /></label>
        <label>Veterinarian <input class="ctrl" [(ngModel)]="draft.veterinarianName" /></label>
        <label>Clinic <input class="ctrl" [(ngModel)]="draft.veterinaryClinic" /></label>
        <label>Batch # <input class="ctrl" [(ngModel)]="draft.batchNumber" /></label>
        <label>Notes <textarea class="ctrl" rows="2" [(ngModel)]="draft.notes"></textarea></label>
        <div class="row">
          <button type="button" class="btn secondary" (click)="toggleForm()">Cancel</button>
          <button type="button" class="btn primary" [disabled]="saving || !canSave()" (click)="save()">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>

      <div class="list" *ngIf="!loading && pet">
        <div class="empty" *ngIf="records.length === 0 && !showForm">No vaccination records yet.</div>
        <article class="card" *ngFor="let r of records">
          <div class="card-head">
            <strong>{{ r.vaccineName }}</strong>
            <span class="pill">{{ r.vaccineType }}</span>
          </div>
          <dl>
            <dt>Given</dt>
            <dd>{{ r.administeredDate | date: 'mediumDate' }}</dd>
            <dt *ngIf="r.nextDueDate">Next due</dt>
            <dd *ngIf="r.nextDueDate">{{ r.nextDueDate | date: 'mediumDate' }}</dd>
            <dt>Vet</dt>
            <dd>{{ r.veterinarianName }} — {{ r.veterinaryClinic }}</dd>
            <dt *ngIf="r.batchNumber">Batch</dt>
            <dd *ngIf="r.batchNumber">{{ r.batchNumber }}</dd>
            <dt *ngIf="r.notes">Notes</dt>
            <dd *ngIf="r.notes" class="notes">{{ r.notes }}</dd>
          </dl>
          <button type="button" class="btn text danger" (click)="remove(r)">Delete</button>
        </article>
      </div>
    </div>
  `,
  styles: [
    `
      .page {
        min-height: 100vh;
        background: #f5f5f5;
        padding: 12px 16px 88px;
      }
      .header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }
      .header h1 {
        flex: 1;
        margin: 0;
        font-size: 1.25rem;
      }
      .icon-btn {
        border: none;
        background: #fff;
        border-radius: 12px;
        padding: 10px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .icon-btn.primary {
        color: #1976d2;
      }
      .banner.error {
        background: #ffebee;
        color: #c62828;
        padding: 10px 12px;
        border-radius: 8px;
        margin-bottom: 12px;
        font-size: 0.9rem;
      }
      .pet-summary {
        margin-bottom: 16px;
      }
      .pet-summary h2 {
        margin: 0 0 4px 0;
        font-size: 1.1rem;
      }
      .meta {
        margin: 0;
        color: #666;
        font-size: 0.9rem;
      }
      .loading {
        color: #666;
        padding: 24px;
        text-align: center;
      }
      .form-card {
        background: #fff;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }
      .form-card h3 {
        margin: 0 0 12px 0;
        font-size: 1rem;
      }
      label {
        display: block;
        font-size: 0.8rem;
        color: #555;
        margin-bottom: 12px;
      }
      .ctrl {
        display: block;
        width: 100%;
        margin-top: 4px;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-sizing: border-box;
        font-size: 1rem;
      }
      .row {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 8px;
      }
      .btn {
        border: none;
        border-radius: 8px;
        padding: 10px 16px;
        font-weight: 600;
        cursor: pointer;
      }
      .btn.primary {
        background: #1976d2;
        color: #fff;
      }
      .btn.primary:disabled {
        opacity: 0.5;
      }
      .btn.secondary {
        background: #eee;
        color: #333;
      }
      .btn.text {
        background: transparent;
        color: #1976d2;
        padding: 8px 0;
        margin-top: 8px;
      }
      .btn.text.danger {
        color: #c62828;
      }
      .list .empty {
        text-align: center;
        color: #888;
        padding: 32px 16px;
      }
      .card {
        background: #fff;
        border-radius: 12px;
        padding: 14px 16px;
        margin-bottom: 12px;
        box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
      }
      .card-head {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
      }
      .pill {
        font-size: 0.7rem;
        background: #e3f2fd;
        color: #1565c0;
        padding: 2px 8px;
        border-radius: 999px;
      }
      dl {
        margin: 0;
        display: grid;
        grid-template-columns: 100px 1fr;
        gap: 6px 10px;
        font-size: 0.88rem;
      }
      dt {
        color: #888;
        margin: 0;
      }
      dd {
        margin: 0;
      }
      .notes {
        white-space: pre-wrap;
      }
    `
  ]
})
export class VaccinationRecordsComponent implements OnInit {
  pet: Pet | undefined;
  records: VaccinationRecord[] = [];
  loading = true;
  saving = false;
  error = '';
  showForm = false;
  petId = '';

  vaccineTypes = Object.values(VaccineType);

  draft = {
    vaccineName: '',
    vaccineType: VaccineType.RABIES as VaccineType,
    administeredDateStr: '',
    nextDueDateStr: '',
    veterinarianName: '',
    veterinaryClinic: '',
    batchNumber: '',
    notes: ''
  };

  constructor(
    private petService: PetService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap(params => {
          const id = params.get('id');
          this.petId = id ?? '';
          this.error = '';
          if (!id) {
            this.loading = false;
            this.error = 'Missing pet id.';
            return of(undefined);
          }
          this.loading = true;
          return this.petService.getPetById(id).pipe(
            switchMap(pet => {
              if (!pet) {
                this.pet = undefined;
                this.records = [];
                this.error = 'Pet not found.';
                this.loading = false;
                return of(undefined);
              }
              this.pet = pet;
              return this.petService.getVaccinationRecords(id, pet.name).pipe(
                finalize(() => (this.loading = false))
              );
            })
          );
        })
      )
      .subscribe({
        next: list => {
          if (Array.isArray(list)) {
            this.records = list;
          }
        },
        error: () => {
          this.loading = false;
          this.error = 'Could not load data.';
        }
      });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (this.showForm) {
      const today = new Date();
      const iso = today.toISOString().split('T')[0];
      this.draft = {
        vaccineName: '',
        vaccineType: VaccineType.RABIES,
        administeredDateStr: iso,
        nextDueDateStr: '',
        veterinarianName: '',
        veterinaryClinic: '',
        batchNumber: '',
        notes: ''
      };
    }
  }

  canSave(): boolean {
    return (
      !!this.draft.vaccineName.trim() &&
      !!this.draft.administeredDateStr &&
      !!this.draft.veterinarianName.trim() &&
      !!this.draft.veterinaryClinic.trim()
    );
  }

  save(): void {
    if (!this.pet || !this.canSave()) return;
    this.saving = true;
    this.error = '';
    const administeredDate = new Date(this.draft.administeredDateStr + 'T12:00:00');
    const nextDueDate = this.draft.nextDueDateStr
      ? new Date(this.draft.nextDueDateStr + 'T12:00:00')
      : undefined;
    this.petService
      .addVaccinationRecord({
        petId: this.pet.id,
        petName: this.pet.name,
        vaccineName: this.draft.vaccineName.trim(),
        vaccineType: this.draft.vaccineType,
        administeredDate,
        nextDueDate,
        batchNumber: this.draft.batchNumber.trim() || undefined,
        veterinarianName: this.draft.veterinarianName.trim(),
        veterinaryClinic: this.draft.veterinaryClinic.trim(),
        notes: this.draft.notes.trim() || undefined
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: row => {
          this.records = [row, ...this.records];
          this.showForm = false;
        },
        error: () => {
          this.error = 'Failed to save vaccination.';
        }
      });
  }

  remove(r: VaccinationRecord): void {
    if (!this.pet || !confirm('Delete this vaccination record?')) return;
    this.petService.deleteVaccinationRecord(this.pet.id, r.id).subscribe(ok => {
      if (ok) {
        this.records = this.records.filter(x => x.id !== r.id);
      } else {
        this.error = 'Delete failed.';
      }
    });
  }

  goBack(): void {
    this.router.navigate([petsBasePath(this.router.url)]);
  }
}
