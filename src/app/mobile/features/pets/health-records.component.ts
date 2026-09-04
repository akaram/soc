import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PetService } from './services/pet.service';
import { Pet, HealthRecord, HealthRecordType, Medication } from './models/pet.model';
import { petsBasePath } from './pets-portal.util';
import { finalize, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

/**
 * Vet visits / health history for one pet (GET/POST /pets/:id/health-records).
 */
@Component({
  selector: 'app-health-records',
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
        <h1>Health records</h1>
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
        <h3>Add health record</h3>
        <label>
          Visit type
          <select class="ctrl" [(ngModel)]="draft.recordType">
            <option *ngFor="let t of recordTypes" [ngValue]="t">{{ t }}</option>
          </select>
        </label>
        <label>Visit date <input class="ctrl" type="date" [(ngModel)]="draft.recordDateStr" /></label>
        <label>Veterinarian <input class="ctrl" [(ngModel)]="draft.veterinarianName" /></label>
        <label>Clinic <input class="ctrl" [(ngModel)]="draft.veterinaryClinic" /></label>
        <label>Diagnosis <textarea class="ctrl" rows="2" [(ngModel)]="draft.diagnosis"></textarea></label>
        <label>Treatment <textarea class="ctrl" rows="2" [(ngModel)]="draft.treatment"></textarea></label>
        <label>Follow-up date <input class="ctrl" type="date" [(ngModel)]="draft.followUpDateStr" /></label>
        <label>Document URL <input class="ctrl" [(ngModel)]="draft.documentUrl" placeholder="Optional link" /></label>
        <label>Notes <textarea class="ctrl" rows="2" [(ngModel)]="draft.notes"></textarea></label>
        <h4 class="sub">Medication (optional)</h4>
        <label>Name <input class="ctrl" [(ngModel)]="draft.medName" placeholder="Leave blank if none" /></label>
        <label>Dosage <input class="ctrl" [(ngModel)]="draft.medDosage" /></label>
        <label>Frequency <input class="ctrl" [(ngModel)]="draft.medFrequency" /></label>
        <label>Start <input class="ctrl" type="date" [(ngModel)]="draft.medStartStr" /></label>
        <label>End <input class="ctrl" type="date" [(ngModel)]="draft.medEndStr" /></label>
        <div class="row">
          <button type="button" class="btn secondary" (click)="toggleForm()">Cancel</button>
          <button type="button" class="btn primary" [disabled]="saving || !canSave()" (click)="save()">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>

      <div class="list" *ngIf="!loading && pet">
        <div class="empty" *ngIf="records.length === 0 && !showForm">No health records yet.</div>
        <article class="card" *ngFor="let r of records">
          <div class="card-head">
            <strong>{{ r.recordType }}</strong>
            <span class="pill">{{ r.date | date: 'mediumDate' }}</span>
          </div>
          <dl>
            <dt>Vet</dt>
            <dd>{{ r.veterinarianName }} — {{ r.veterinaryClinic }}</dd>
            <dt *ngIf="r.diagnosis">Diagnosis</dt>
            <dd *ngIf="r.diagnosis" class="notes">{{ r.diagnosis }}</dd>
            <dt *ngIf="r.treatment">Treatment</dt>
            <dd *ngIf="r.treatment" class="notes">{{ r.treatment }}</dd>
            <dt *ngIf="r.followUpDate">Follow-up</dt>
            <dd *ngIf="r.followUpDate">{{ r.followUpDate | date: 'mediumDate' }}</dd>
            <dt *ngIf="r.documentUrl">Document</dt>
            <dd *ngIf="r.documentUrl"><a [href]="r.documentUrl" target="_blank" rel="noopener">Open</a></dd>
            <dt *ngIf="r.notes">Notes</dt>
            <dd *ngIf="r.notes" class="notes">{{ r.notes }}</dd>
          </dl>
          <div class="meds" *ngIf="r.medications?.length">
            <strong>Medications</strong>
            <ul>
              <li *ngFor="let m of r.medications">
                {{ m.name }} — {{ m.dosage }}, {{ m.frequency }}
                <span class="muted">({{ m.startDate | date: 'mediumDate' }} – {{ m.endDate ? (m.endDate | date: 'mediumDate') : '…' }})</span>
              </li>
            </ul>
          </div>
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
        color: #2e7d32;
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
      .sub {
        margin: 16px 0 8px 0;
        font-size: 0.9rem;
        color: #555;
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
        background: #2e7d32;
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
        font-size: 0.75rem;
        background: #e8f5e9;
        color: #2e7d32;
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
      .meds {
        margin-top: 12px;
        font-size: 0.88rem;
      }
      .meds ul {
        margin: 6px 0 0 1.1rem;
        padding: 0;
      }
      .muted {
        color: #888;
        font-size: 0.8rem;
      }
    `
  ]
})
export class HealthRecordsComponent implements OnInit {
  pet: Pet | undefined;
  records: HealthRecord[] = [];
  loading = true;
  saving = false;
  error = '';
  showForm = false;

  recordTypes = Object.values(HealthRecordType);

  draft = {
    recordType: HealthRecordType.CHECKUP as HealthRecordType,
    recordDateStr: '',
    veterinarianName: '',
    veterinaryClinic: '',
    diagnosis: '',
    treatment: '',
    followUpDateStr: '',
    documentUrl: '',
    notes: '',
    medName: '',
    medDosage: '',
    medFrequency: '',
    medStartStr: '',
    medEndStr: ''
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
              return this.petService.getHealthRecords(id, pet.name).pipe(finalize(() => (this.loading = false)));
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
      const today = new Date().toISOString().split('T')[0];
      this.draft = {
        recordType: HealthRecordType.CHECKUP,
        recordDateStr: today,
        veterinarianName: '',
        veterinaryClinic: '',
        diagnosis: '',
        treatment: '',
        followUpDateStr: '',
        documentUrl: '',
        notes: '',
        medName: '',
        medDosage: '',
        medFrequency: '',
        medStartStr: today,
        medEndStr: ''
      };
    }
  }

  canSave(): boolean {
    return (
      !!this.draft.recordDateStr &&
      !!this.draft.veterinarianName.trim() &&
      !!this.draft.veterinaryClinic.trim()
    );
  }

  private buildMedications(): Medication[] | undefined {
    if (!this.draft.medName.trim()) return undefined;
    const start = this.draft.medStartStr || this.draft.recordDateStr;
    const meds: Medication[] = [
      {
        name: this.draft.medName.trim(),
        dosage: this.draft.medDosage.trim() || '—',
        frequency: this.draft.medFrequency.trim() || '—',
        startDate: new Date(start + 'T12:00:00'),
        endDate: this.draft.medEndStr ? new Date(this.draft.medEndStr + 'T12:00:00') : undefined
      }
    ];
    return meds;
  }

  save(): void {
    if (!this.pet || !this.canSave()) return;
    this.saving = true;
    this.error = '';
    const visitDate = new Date(this.draft.recordDateStr + 'T12:00:00');
    const followUp = this.draft.followUpDateStr
      ? new Date(this.draft.followUpDateStr + 'T12:00:00')
      : undefined;
    this.petService
      .addHealthRecord({
        petId: this.pet.id,
        petName: this.pet.name,
        recordType: this.draft.recordType,
        date: visitDate,
        veterinarianName: this.draft.veterinarianName.trim(),
        veterinaryClinic: this.draft.veterinaryClinic.trim(),
        diagnosis: this.draft.diagnosis.trim() || undefined,
        treatment: this.draft.treatment.trim() || undefined,
        followUpDate: followUp,
        documentUrl: this.draft.documentUrl.trim() || undefined,
        notes: this.draft.notes.trim() || undefined,
        medications: this.buildMedications()
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: row => {
          this.records = [row, ...this.records];
          this.showForm = false;
        },
        error: () => {
          this.error = 'Failed to save health record.';
        }
      });
  }

  remove(r: HealthRecord): void {
    if (!this.pet || !confirm('Delete this health record?')) return;
    this.petService.deleteHealthRecord(this.pet.id, r.id).subscribe(ok => {
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
