import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { BlacklistService } from '../services/blacklist.service';
import { SessionContextService } from '../../../core/services/session-context.service';
import {
  BlacklistEntry,
  BlacklistType,
  BlacklistReason,
  BlacklistSeverity,
  CreateBlacklistRequest,
  UpdateBlacklistRequest,
  TimeSlot
} from '../models/blacklist.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-blacklist-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="blacklist-form-container">
      <div class="page-header">
        <h1>
          <i class="material-icons">{{ isEditMode ? 'edit' : 'add_circle' }}</i>
          {{ isEditMode ? 'Edit Blacklist Entry' : 'Add to Blacklist' }}
        </h1>
        <p>{{ isEditMode ? 'Update blacklist entry details' : 'Add a new entry to the blacklist' }}</p>
      </div>

      <div class="form-card">
        <form (ngSubmit)="onSubmit()">
          <!-- Entry Type -->
          <div class="form-section">
            <h3>Entry Type</h3>
            <div class="form-group">
              <label>Type *</label>
              <select 
                [(ngModel)]="formData.type" 
                name="type" 
                required 
                [disabled]="isEditMode"
                (change)="onTypeChange()"
                class="form-control">
                <option value="">Select Type</option>
                <option [value]="BlacklistType.PERSON">Person</option>
                <option [value]="BlacklistType.VEHICLE">Vehicle</option>
                <option [value]="BlacklistType.PHONE_NUMBER">Phone Number</option>
                <option [value]="BlacklistType.EMAIL">Email</option>
                <option [value]="BlacklistType.ID_PROOF">ID Proof</option>
              </select>
            </div>
            <div class="form-group">
              <label>Identifier *</label>
              <input 
                type="text" 
                [(ngModel)]="formData.identifier" 
                name="identifier" 
                required
                [placeholder]="getIdentifierPlaceholder()"
                class="form-control">
              <small class="form-hint">{{ getIdentifierHint() }}</small>
            </div>
          </div>

          <!-- Person Details (if type is PERSON) -->
          <div class="form-section" *ngIf="formData.type === BlacklistType.PERSON">
            <h3>Person Details</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Person Name</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.personName" 
                  name="personName"
                  placeholder="Full name"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Phone Number</label>
                <input 
                  type="tel" 
                  [(ngModel)]="formData.phoneNumber" 
                  name="phoneNumber"
                  placeholder="+91 98765 43210"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  [(ngModel)]="formData.email" 
                  name="email"
                  placeholder="email@example.com"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Address</label>
                <textarea 
                  [(ngModel)]="formData.address" 
                  name="address"
                  rows="2"
                  placeholder="Address"
                  class="form-control"></textarea>
              </div>
              <div class="form-group">
                <label>ID Proof Type</label>
                <select [(ngModel)]="formData.idProofType" name="idProofType" class="form-control">
                  <option value="">Select Type</option>
                  <option value="AADHAR">Aadhar</option>
                  <option value="PAN">PAN</option>
                  <option value="DRIVING_LICENSE">Driving License</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="VOTER_ID">Voter ID</option>
                </select>
              </div>
              <div class="form-group">
                <label>ID Proof Number</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.idProofNumber" 
                  name="idProofNumber"
                  placeholder="ID proof number"
                  class="form-control">
              </div>
            </div>
          </div>

          <!-- Vehicle Details (if type is VEHICLE) -->
          <div class="form-section" *ngIf="formData.type === BlacklistType.VEHICLE">
            <h3>Vehicle Details</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Vehicle Number *</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.vehicleNumber" 
                  name="vehicleNumber"
                  required
                  placeholder="MH-12-AB-1234"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Vehicle Type</label>
                <select [(ngModel)]="formData.vehicleType" name="vehicleType" class="form-control">
                  <option value="">Select Type</option>
                  <option value="CAR">Car</option>
                  <option value="BIKE">Bike</option>
                  <option value="AUTO">Auto Rickshaw</option>
                  <option value="TRUCK">Truck</option>
                  <option value="BUS">Bus</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Vehicle Model</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.vehicleModel" 
                  name="vehicleModel"
                  placeholder="e.g., Honda City"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Vehicle Color</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.vehicleColor" 
                  name="vehicleColor"
                  placeholder="e.g., White"
                  class="form-control">
              </div>
            </div>
          </div>

          <!-- Blacklist Details -->
          <div class="form-section">
            <h3>Blacklist Details</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Reason *</label>
                <select 
                  [(ngModel)]="formData.reason" 
                  name="reason" 
                  required
                  class="form-control">
                  <option value="">Select Reason</option>
                  <option [value]="BlacklistReason.SECURITY_THREAT">Security Threat</option>
                  <option [value]="BlacklistReason.THEFT">Theft</option>
                  <option [value]="BlacklistReason.VANDALISM">Vandalism</option>
                  <option [value]="BlacklistReason.HARASSMENT">Harassment</option>
                  <option [value]="BlacklistReason.UNAUTHORIZED_ACCESS">Unauthorized Access</option>
                  <option [value]="BlacklistReason.POLICY_VIOLATION">Policy Violation</option>
                  <option [value]="BlacklistReason.COURT_ORDER">Court Order</option>
                  <option [value]="BlacklistReason.OTHER">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Severity *</label>
                <select 
                  [(ngModel)]="formData.severity" 
                  name="severity" 
                  required
                  class="form-control">
                  <option value="">Select Severity</option>
                  <option [value]="BlacklistSeverity.CRITICAL">Critical</option>
                  <option [value]="BlacklistSeverity.HIGH">High</option>
                  <option [value]="BlacklistSeverity.MEDIUM">Medium</option>
                  <option [value]="BlacklistSeverity.LOW">Low</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Reason Description *</label>
              <textarea 
                [(ngModel)]="formData.reasonDescription" 
                name="reasonDescription"
                required
                rows="4"
                placeholder="Provide detailed description of the reason for blacklisting..."
                class="form-control"></textarea>
            </div>
          </div>

          <!-- Duration & Restrictions -->
          <div class="form-section">
            <h3>Duration & Restrictions</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>
                  <input 
                    type="checkbox" 
                    [(ngModel)]="formData.isPermanent" 
                    name="isPermanent"
                    (change)="onPermanentChange()">
                  Permanent Blacklist
                </label>
              </div>
              <div class="form-group" *ngIf="!formData.isPermanent">
                <label>Expiry Date</label>
                <input 
                  type="date" 
                  [(ngModel)]="expiryDateString" 
                  name="expiryDate"
                  [min]="minDate"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Restricted Gates</label>
                <div class="checkbox-group">
                  <label *ngFor="let gate of availableGates">
                    <input 
                      type="checkbox" 
                      [value]="gate.id"
                      [checked]="isGateSelected(gate.id)"
                      (change)="toggleGate(gate.id)">
                    {{ gate.name }}
                  </label>
                </div>
                <small class="form-hint">Leave empty to restrict at all gates</small>
              </div>
            </div>
          </div>

          <!-- Additional Information -->
          <div class="form-section">
            <h3>Additional Information</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Case Number</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.caseNumber" 
                  name="caseNumber"
                  placeholder="Police case number, court case, etc."
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Incident Report ID</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.incidentReportId" 
                  name="incidentReportId"
                  placeholder="Link to incident report"
                  class="form-control">
              </div>
            </div>
            <div class="form-group">
              <label>Notes</label>
              <textarea 
                [(ngModel)]="formData.notes" 
                name="notes"
                rows="3"
                placeholder="Additional notes..."
                class="form-control"></textarea>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="goBack()">
              <i class="material-icons">arrow_back</i>
              Cancel
            </button>
            <button type="submit" class="btn-primary" [disabled]="isSubmitting">
              <i class="material-icons">save</i>
              {{ isSubmitting ? 'Saving...' : (isEditMode ? 'Update Entry' : 'Add to Blacklist') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .blacklist-form-container {
      padding: 24px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .page-header h1 {
      font-size: 28px;
      margin: 0 0 8px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 15px;
    }

    .form-card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .form-section {
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid #f0f0f0;
    }

    .form-section:last-child {
      border-bottom: none;
    }

    .form-section h3 {
      font-size: 18px;
      color: #2c3e50;
      margin: 0 0 20px 0;
      font-weight: 600;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
    }

    .form-group label input[type="checkbox"] {
      margin-right: 8px;
    }

    .form-control {
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-control:disabled {
      background: #f5f5f5;
      cursor: not-allowed;
    }

    .form-hint {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: #7f8c8d;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      background: #f8f9fa;
    }

    .checkbox-group label {
      display: flex;
      align-items: center;
      font-weight: normal;
      cursor: pointer;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 2px solid #f0f0f0;
    }

    .btn-primary {
      padding: 12px 24px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-primary:hover:not(:disabled) {
      background: #c82333;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      padding: 12px 24px;
      background: #f5f5f5;
      color: #2c3e50;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }
  `]
})
export class BlacklistFormComponent implements OnInit, OnDestroy {
  isEditMode = false;
  entryId: string | null = null;
  isSubmitting = false;
  formData: CreateBlacklistRequest = {
    type: BlacklistType.PERSON,
    identifier: '',
    reason: BlacklistReason.OTHER,
    reasonDescription: '',
    severity: BlacklistSeverity.MEDIUM,
    blacklistedBy: '',
    isPermanent: false
  };
  expiryDateString: string = '';
  minDate: string = '';
  restrictedGates: string[] = [];

  BlacklistType = BlacklistType;
  BlacklistReason = BlacklistReason;
  BlacklistSeverity = BlacklistSeverity;

  availableGates = [
    { id: 'MAIN_GATE', name: 'Main Gate' },
    { id: 'SIDE_GATE', name: 'Side Gate' },
    { id: 'PARKING_GATE', name: 'Parking Gate' },
    { id: 'EMERGENCY_GATE', name: 'Emergency Gate' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private blacklistService: BlacklistService,
    private session: SessionContextService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Set minimum date to today
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.formData.blacklistedBy = this.session.getCurrentUserId();

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.entryId = params['id'];
        this.isEditMode = this.route.snapshot.url.some(segment => segment.path === 'edit');
        if (this.isEditMode) {
          this.loadEntry();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEntry(): void {
    if (!this.entryId) return;

    this.blacklistService.getEntryById(this.entryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (entry) => {
          if (entry) {
            this.formData = {
              type: entry.type,
              identifier: entry.identifier,
              alternateIdentifiers: entry.alternateIdentifiers,
              personName: entry.personName,
              phoneNumber: entry.phoneNumber,
              email: entry.email,
              address: entry.address,
              idProofType: entry.idProofType,
              idProofNumber: entry.idProofNumber,
              vehicleNumber: entry.vehicleNumber,
              vehicleType: entry.vehicleType,
              vehicleModel: entry.vehicleModel,
              vehicleColor: entry.vehicleColor,
              reason: entry.reason,
              reasonDescription: entry.reasonDescription,
              severity: entry.severity,
              blacklistedBy: entry.blacklistedBy,
              expiryDate: entry.expiryDate,
              isPermanent: entry.isPermanent,
              restrictedGates: entry.restrictedGates || [],
              incidentReportId: entry.incidentReportId,
              caseNumber: entry.caseNumber,
              notes: entry.notes
            };
            this.restrictedGates = entry.restrictedGates || [];
            if (entry.expiryDate) {
              this.expiryDateString = new Date(entry.expiryDate).toISOString().split('T')[0];
            }
          }
        },
        error: (error) => {
          console.error('Error loading entry:', error);
        }
      });
  }

  onTypeChange(): void {
    // Reset type-specific fields when type changes
    if (this.formData.type !== BlacklistType.PERSON) {
      this.formData.personName = undefined;
      this.formData.idProofType = undefined;
      this.formData.idProofNumber = undefined;
    }
    if (this.formData.type !== BlacklistType.VEHICLE) {
      this.formData.vehicleNumber = undefined;
      this.formData.vehicleType = undefined;
      this.formData.vehicleModel = undefined;
      this.formData.vehicleColor = undefined;
    }
  }

  onPermanentChange(): void {
    if (this.formData.isPermanent) {
      this.expiryDateString = '';
      this.formData.expiryDate = undefined;
    }
  }

  isGateSelected(gateId: string): boolean {
    return this.restrictedGates.includes(gateId);
  }

  toggleGate(gateId: string): void {
    const index = this.restrictedGates.indexOf(gateId);
    if (index > -1) {
      this.restrictedGates.splice(index, 1);
    } else {
      this.restrictedGates.push(gateId);
    }
    this.formData.restrictedGates = this.restrictedGates;
  }

  getIdentifierPlaceholder(): string {
    switch (this.formData.type) {
      case BlacklistType.PERSON:
        return 'Person name';
      case BlacklistType.VEHICLE:
        return 'Vehicle number (e.g., MH-12-AB-1234)';
      case BlacklistType.PHONE_NUMBER:
        return 'Phone number (e.g., +91 98765 43210)';
      case BlacklistType.EMAIL:
        return 'Email address';
      case BlacklistType.ID_PROOF:
        return 'ID proof number';
      default:
        return 'Identifier';
    }
  }

  getIdentifierHint(): string {
    switch (this.formData.type) {
      case BlacklistType.PERSON:
        return 'Enter the person\'s name or any unique identifier';
      case BlacklistType.VEHICLE:
        return 'Enter the vehicle registration number';
      case BlacklistType.PHONE_NUMBER:
        return 'Enter the phone number in international format';
      case BlacklistType.EMAIL:
        return 'Enter the email address';
      case BlacklistType.ID_PROOF:
        return 'Enter the ID proof number (Aadhar, PAN, etc.)';
      default:
        return '';
    }
  }

  onSubmit(): void {
    if (this.isSubmitting) return;

    // Set expiry date
    if (!this.formData.isPermanent && this.expiryDateString) {
      this.formData.expiryDate = new Date(this.expiryDateString);
    }

    // Set restricted gates
    this.formData.restrictedGates = this.restrictedGates;

    this.isSubmitting = true;

    if (this.isEditMode && this.entryId) {
      const updateRequest: UpdateBlacklistRequest = {
        reason: this.formData.reason,
        reasonDescription: this.formData.reasonDescription,
        severity: this.formData.severity,
        expiryDate: this.formData.expiryDate,
        isPermanent: this.formData.isPermanent,
        restrictedGates: this.formData.restrictedGates,
        notes: this.formData.notes
      };

      this.blacklistService.updateEntry(this.entryId, updateRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSubmitting = false;
            if (response.success) {
              this.router.navigate(['/admin/gate-security/blacklist']);
            } else {
              alert(response.message || 'Failed to update entry');
            }
          },
          error: (error) => {
            this.isSubmitting = false;
            console.error('Error updating entry:', error);
            alert('An error occurred while updating the entry');
          }
        });
    } else {
      this.blacklistService.createEntry(this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSubmitting = false;
            if (response.success) {
              this.router.navigate(['/admin/gate-security/blacklist']);
            } else {
              alert(response.message || 'Failed to create entry');
            }
          },
          error: (error) => {
            this.isSubmitting = false;
            console.error('Error creating entry:', error);
            alert('An error occurred while creating the entry');
          }
        });
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/gate-security/blacklist']);
  }
}
















































