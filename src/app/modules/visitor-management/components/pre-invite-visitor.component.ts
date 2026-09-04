import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { VisitorManagementService } from '../services/visitor-management.service';
import {
  PreInviteVisitorRequest,
  VisitorInvitationResponse,
  VehicleType,
  RecurringPattern
} from '../models/visitor.model';

@Component({
  selector: 'app-pre-invite-visitor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="pre-invite-container">
      <div class="page-header">
        <button class="btn-back" routerLink="/admin/visitors">
          <i class="material-icons">arrow_back</i>
        </button>
        <h1>Pre-Invite Visitor</h1>
        <p>Invite visitors in advance and generate QR codes for seamless entry</p>
      </div>

      <div class="form-container">
        <form (ngSubmit)="onSubmit()" #visitorForm="ngForm">
          <!-- Basic Information -->
          <div class="form-section">
            <h3><i class="material-icons">person</i> Visitor Information</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="name">Visitor Name <span class="required">*</span></label>
                <input 
                  type="text" 
                  id="name" 
                  name="name"
                  [(ngModel)]="formData.name"
                  required
                  placeholder="Enter visitor's full name">
              </div>

              <div class="form-group">
                <label for="phone">Phone Number <span class="required">*</span></label>
                <input 
                  type="tel" 
                  id="phone" 
                  name="phone"
                  [(ngModel)]="formData.phone"
                  required
                  placeholder="+91 98765 43210">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="email">Email (Optional)</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email"
                  [(ngModel)]="formData.email"
                  placeholder="visitor@example.com">
              </div>

              <div class="form-group">
                <label for="numberOfVisitors">Number of Visitors</label>
                <input 
                  type="number" 
                  id="numberOfVisitors" 
                  name="numberOfVisitors"
                  [(ngModel)]="formData.numberOfVisitors"
                  min="1"
                  value="1"
                  placeholder="1">
              </div>
            </div>
          </div>

          <!-- Visit Details -->
          <div class="form-section">
            <h3><i class="material-icons">event</i> Visit Details</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="visitingFlat">Visiting Flat/Unit <span class="required">*</span></label>
                <input 
                  type="text" 
                  id="visitingFlat" 
                  name="visitingFlat"
                  [(ngModel)]="formData.visitingFlat"
                  required
                  placeholder="A-101">
              </div>

              <div class="form-group">
                <label for="visitingUnit">Tower/Block (Optional)</label>
                <input 
                  type="text" 
                  id="visitingUnit" 
                  name="visitingUnit"
                  [(ngModel)]="formData.visitingUnit"
                  placeholder="Tower A">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="purpose">Purpose of Visit <span class="required">*</span></label>
                <select 
                  id="purpose" 
                  name="purpose"
                  [(ngModel)]="formData.purpose"
                  required>
                  <option value="">Select purpose</option>
                  <option value="Personal Visit">Personal Visit</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Service">Service</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Guest">Guest</option>
                  <option value="Event">Event</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div class="form-group">
                <label for="expectedDuration">Expected Duration (minutes)</label>
                <input 
                  type="number" 
                  id="expectedDuration" 
                  name="expectedDuration"
                  [(ngModel)]="formData.expectedDuration"
                  min="15"
                  value="60"
                  placeholder="60">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="visitDate">Visit Date <span class="required">*</span></label>
                <input 
                  type="date" 
                  id="visitDate" 
                  name="visitDate"
                  [(ngModel)]="visitDateString"
                  required
                  [min]="minDate">
              </div>

              <div class="form-group">
                <label for="visitTime">Visit Time <span class="required">*</span></label>
                <input 
                  type="time" 
                  id="visitTime" 
                  name="visitTime"
                  [(ngModel)]="formData.visitTime"
                  required>
              </div>
            </div>
          </div>

          <!-- Vehicle Information -->
          <div class="form-section">
            <h3><i class="material-icons">directions_car</i> Vehicle Information (Optional)</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="vehicleNumber">Vehicle Number</label>
                <input 
                  type="text" 
                  id="vehicleNumber" 
                  name="vehicleNumber"
                  [(ngModel)]="formData.vehicleNumber"
                  placeholder="DL 01 AB 1234">
              </div>

              <div class="form-group">
                <label for="vehicleType">Vehicle Type</label>
                <select 
                  id="vehicleType" 
                  name="vehicleType"
                  [(ngModel)]="formData.vehicleType">
                  <option [value]="null">None</option>
                  <option [value]="vehicleTypes.TWO_WHEELER">Two Wheeler</option>
                  <option [value]="vehicleTypes.FOUR_WHEELER">Four Wheeler</option>
                  <option [value]="vehicleTypes.COMMERCIAL">Commercial</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Recurring Visit -->
          <div class="form-section">
            <h3><i class="material-icons">repeat</i> Recurring Visit (Optional)</h3>
            
            <div class="form-row">
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    id="isRecurring"
                    name="isRecurring"
                    [(ngModel)]="formData.isRecurring">
                  <span>Set as recurring visit</span>
                </label>
              </div>

              <div class="form-group" *ngIf="formData.isRecurring">
                <label for="recurringPattern">Recurring Pattern</label>
                <select 
                  id="recurringPattern" 
                  name="recurringPattern"
                  [(ngModel)]="formData.recurringPattern">
                  <option [value]="recurringPatterns.DAILY">Daily</option>
                  <option [value]="recurringPatterns.WEEKLY">Weekly</option>
                  <option [value]="recurringPatterns.MONTHLY">Monthly</option>
                </select>
              </div>
            </div>
          </div>

          <!-- ID Proof (Optional) -->
          <div class="form-section">
            <h3><i class="material-icons">badge</i> ID Proof (Optional)</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="idProofNumber">ID Proof Number</label>
                <input 
                  type="text" 
                  id="idProofNumber" 
                  name="idProofNumber"
                  [(ngModel)]="formData.idProofNumber"
                  placeholder="Aadhaar/PAN/DL Number">
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="form-section">
            <div class="form-group">
              <label for="notes">Additional Notes (Optional)</label>
              <textarea 
                id="notes" 
                name="notes"
                [(ngModel)]="formData.notes"
                rows="3"
                placeholder="Any additional information about the visitor..."></textarea>
            </div>
          </div>

          <!-- Validation summary: tells the user exactly why they can't submit -->
          <div class="form-error" *ngIf="validationError">
            <i class="material-icons">error_outline</i>
            <span>{{ validationError }}</span>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button 
              type="button" 
              class="btn-secondary"
              routerLink="/admin/visitors">
              Cancel
            </button>
            <button 
              type="submit" 
              class="btn-primary"
              [disabled]="isSubmitting">
              <i class="material-icons" *ngIf="!isSubmitting">qr_code</i>
              <span *ngIf="isSubmitting">Generating QR Code...</span>
              <span *ngIf="!isSubmitting">Generate QR Code & Invite</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Success Modal -->
      <div class="modal-overlay" *ngIf="showSuccessModal" (click)="closeSuccessModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header success">
            <i class="material-icons">check_circle</i>
            <h2>Visitor Invited Successfully!</h2>
          </div>
          <div class="modal-body">
            <p>QR code has been generated for <strong>{{ invitedVisitor?.name }}</strong></p>
            <div class="qr-preview" *ngIf="invitedVisitor?.qrCode">
              <img [src]="invitedVisitor.qrCode" alt="QR Code">
              <p class="qr-info">Share this QR code with the visitor</p>
            </div>
            <div class="share-options" *ngIf="shareableLink">
              <button class="btn-share" (click)="shareViaWhatsApp()">
                <i class="material-icons">whatsapp</i>
                Share via WhatsApp
              </button>
              <button class="btn-share" (click)="shareViaSMS()">
                <i class="material-icons">sms</i>
                Share via SMS
              </button>
              <button class="btn-share" (click)="copyLink()">
                <i class="material-icons">link</i>
                Copy Link
              </button>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" (click)="closeSuccessModal()">Close</button>
            <button class="btn-primary" (click)="viewQRCode()">View QR Code</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pre-invite-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 24px;
    }

    .page-header {
      margin-bottom: 32px;
    }

    .btn-back {
      background: none;
      border: none;
      color: #667eea;
      cursor: pointer;
      padding: 8px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .btn-back:hover {
      background: #f5f5f5;
      border-radius: 8px;
    }

    .page-header h1 {
      font-size: 32px;
      margin: 0 0 8px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .page-header p {
      margin: 0;
      color: #7f8c8d;
      font-size: 16px;
    }

    .form-container {
      background: white;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .form-section {
      margin-bottom: 32px;
      padding-bottom: 32px;
      border-bottom: 1px solid #e0e0e0;
    }

    .form-section:last-child {
      border-bottom: none;
    }

    .form-section h3 {
      font-size: 20px;
      margin: 0 0 24px 0;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-section h3 .material-icons {
      color: #667eea;
      font-size: 24px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      margin-bottom: 8px;
      font-weight: 500;
      color: #2c3e50;
      font-size: 14px;
    }

    .required {
      color: #e74c3c;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 15px;
      transition: all 0.2s;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .checkbox-group {
      display: flex;
      align-items: center;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .checkbox-label input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .form-error {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 24px;
      padding: 12px 14px;
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
      border-radius: 10px;
      font-size: 14px;
    }
    .form-error .material-icons { font-size: 20px; }

    .form-actions {
      display: flex;
      gap: 16px;
      justify-content: flex-end;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e0e0e0;
    }

    .btn-primary,
    .btn-secondary {
      padding: 14px 28px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #2c3e50;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      animation: modalAppear 0.3s ease;
    }

    @keyframes modalAppear {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .modal-header {
      padding: 24px;
      text-align: center;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-header.success {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-bottom: none;
      border-radius: 16px 16px 0 0;
    }

    .modal-header .material-icons {
      font-size: 64px;
      margin-bottom: 16px;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 24px;
    }

    .modal-body {
      padding: 24px;
    }

    .modal-body p {
      margin: 0 0 20px 0;
      color: #2c3e50;
      text-align: center;
    }

    .qr-preview {
      text-align: center;
      margin: 24px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 12px;
    }

    .qr-preview img {
      width: 200px;
      height: 200px;
      border: 4px solid white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .qr-info {
      margin-top: 16px;
      font-size: 14px;
      color: #7f8c8d;
    }

    .share-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 24px;
    }

    .btn-share {
      padding: 12px 20px;
      background: #f5f5f5;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-share:hover {
      background: #e8e8e8;
      border-color: #667eea;
      color: #667eea;
    }

    .modal-actions {
      padding: 16px 24px 24px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }

      .pre-invite-container {
        padding: 16px;
      }

      .form-container {
        padding: 20px;
      }
    }
  `]
})
export class PreInviteVisitorComponent implements OnInit {
  formData: PreInviteVisitorRequest = {
    name: '',
    phone: '',
    email: '',
    purpose: '',
    visitingFlat: '',
    visitingUnit: '',
    visitDate: new Date(),
    visitTime: '',
    expectedDuration: 60,
    numberOfVisitors: 1,
    vehicleNumber: '',
    vehicleType: VehicleType.NONE,
    isRecurring: false
  };

  visitDateString: string = '';
  minDate: string = '';
  isSubmitting = false;
  /** Human-readable reason the form can't be submitted (shown above the button). */
  validationError = '';
  showSuccessModal = false;
  invitedVisitor: any = null;
  shareableLink: string = '';

  vehicleTypes = VehicleType;
  recurringPatterns = RecurringPattern;

  constructor(
    private visitorService: VisitorManagementService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Set minimum date to today
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
    this.visitDateString = this.minDate;
    this.formData.visitDate = today;
    
    // Set default time to next hour
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    this.formData.visitTime = `${String(nextHour.getHours()).padStart(2, '0')}:${String(nextHour.getMinutes()).padStart(2, '0')}`;
  }

  /**
   * Returns a user-facing message for the first missing/invalid required field,
   * or an empty string when the form is ready to submit.
   */
  private getValidationError(): string {
    const f = this.formData;
    if (!f.name || f.name.trim().length < 2) {
      return 'Please enter the visitor name (at least 2 characters).';
    }
    // Accept 10-15 digits, ignoring spaces, +, and dashes.
    const digits = (f.phone || '').replace(/[^0-9]/g, '');
    if (digits.length < 10 || digits.length > 15) {
      return 'Please enter a valid phone number (10–15 digits).';
    }
    if (!f.purpose) {
      return 'Please select the purpose of visit.';
    }
    if (!f.visitingFlat || !f.visitingFlat.trim()) {
      return 'Please enter the visiting flat/unit.';
    }
    if (!this.visitDateString) {
      return 'Please select the visit date.';
    }
    if (!f.visitTime) {
      return 'Please select the visit time.';
    }
    return '';
  }

  onSubmit(): void {
    if (this.isSubmitting) return;

    // Validate required fields explicitly so the user gets a clear reason on failure.
    this.validationError = this.getValidationError();
    if (this.validationError) {
      return;
    }

    // Convert date string to Date object
    this.formData.visitDate = new Date(this.visitDateString);

    this.isSubmitting = true;

    this.visitorService.preInviteVisitor(this.formData).subscribe({
      next: (response: VisitorInvitationResponse) => {
        this.isSubmitting = false;
        
        if (response.success && response.visitor) {
          this.invitedVisitor = response.visitor;
          this.shareableLink = response.shareableLink || '';
          this.showSuccessModal = true;
        } else {
          alert(response.message || 'Failed to invite visitor');
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error inviting visitor:', error);
        alert('An error occurred while inviting the visitor. Please try again.');
      }
    });
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.router.navigate(['/admin/visitors']);
  }

  viewQRCode(): void {
    if (!this.invitedVisitor?.id) {
      alert('Visitor was not saved correctly. Please try again.');
      return;
    }
    this.showSuccessModal = false;
    this.router.navigate(['/admin/visitors', this.invitedVisitor.id, 'qr'], {
      state: { visitor: this.invitedVisitor }
    });
  }

  shareViaWhatsApp(): void {
    const message = `You have been invited to visit ${this.invitedVisitor?.visitingFlat}. Please use this QR code for entry: ${this.shareableLink}`;
    const whatsappUrl = `https://wa.me/${this.invitedVisitor?.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

  shareViaSMS(): void {
    const message = `You have been invited to visit ${this.invitedVisitor?.visitingFlat}. QR Code: ${this.shareableLink}`;
    const smsUrl = `sms:${this.invitedVisitor?.phone}?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
  }

  copyLink(): void {
    if (this.shareableLink) {
      navigator.clipboard.writeText(this.shareableLink).then(() => {
        alert('Link copied to clipboard!');
      });
    }
  }
}

