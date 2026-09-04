import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomesticStaffService } from './services/domestic-staff.service';
import { PasscodeVerificationResponse } from './models/domestic-staff.model';
import { MobileAuthService } from '../../services/mobile-auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-guard-passcode-verify',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="verify-container">
      <!-- Header -->
      <div class="header">
        <button class="back-btn" (click)="goBack()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>Verify Passcode</h1>
        <div style="width: 40px;"></div>
      </div>

      <!-- Main Content -->
      <div class="content">
        <div class="icon-container" [class.success]="verificationResult?.success" [class.error]="verificationResult && !verificationResult.success">
          <svg *ngIf="!verificationResult" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <svg *ngIf="verificationResult?.success" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <svg *ngIf="verificationResult && !verificationResult.success" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>

        <div class="instruction-text" *ngIf="!verificationResult">
          <h2>Enter 6-Digit Passcode</h2>
          <p>Ask the staff member to provide their access passcode</p>
        </div>

        <!-- Passcode Input -->
        <div class="passcode-input-container" *ngIf="!verificationResult">
          <div class="passcode-inputs">
            <input 
              *ngFor="let digit of passcodeDigits; let i = index"
              #passcodeInput
              type="text"
              maxlength="1"
              inputmode="numeric"
              pattern="[0-9]*"
              [(ngModel)]="passcodeDigits[i]"
              (input)="onDigitInput($event, i)"
              (keydown)="onKeyDown($event, i)"
              [class.filled]="passcodeDigits[i]"
            >
          </div>
          
          <button 
            class="verify-btn" 
            [disabled]="!isPasscodeComplete() || verifying"
            (click)="verifyPasscode()"
          >
            <span *ngIf="!verifying">Verify Access</span>
            <span *ngIf="verifying">Verifying...</span>
          </button>

          <button class="clear-btn" (click)="clearPasscode()">Clear</button>
        </div>

        <!-- Verification Result -->
        <div class="result-container" *ngIf="verificationResult">
          <div class="result-card" [class.success]="verificationResult.success" [class.error]="!verificationResult.success">
            <h2>{{ verificationResult.success ? 'Access Granted' : 'Access Denied' }}</h2>
            <p class="result-message">{{ verificationResult.message }}</p>

            <div class="staff-details" *ngIf="verificationResult.success && verificationResult.staff">
              <img [src]="verificationResult.staff.photoUrl || 'assets/default-avatar.png'" [alt]="verificationResult.staff.name" class="staff-photo">
              <div class="staff-info">
                <h3>{{ verificationResult.staff.name }}</h3>
                <div class="info-row">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  </svg>
                  <span>Flat {{ verificationResult.staff.flatNumber }}</span>
                </div>
                <div class="info-row">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>{{ verificationResult.staff.role }}</span>
                </div>
                <div class="info-row">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  <span>{{ verificationResult.staff.phoneNumber }}</span>
                </div>
              </div>
            </div>

            <div class="action-buttons">
              <button class="btn btn-primary" (click)="reset()">Verify Another</button>
              <button class="btn btn-secondary" (click)="goBack()">Done</button>
            </div>
          </div>
        </div>

        <!-- Number Pad -->
        <div class="number-pad" *ngIf="!verificationResult">
          <button *ngFor="let num of [1,2,3,4,5,6,7,8,9,0]" (click)="addDigit(num.toString())">
            {{ num }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .verify-container {
      min-height: 100vh;
      background: #f5f5f5;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

    .back-btn {
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

    .back-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    .content {
      padding: 2rem 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .icon-container {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2rem;
      color: #999;
      transition: all 0.3s;
    }

    .icon-container.success {
      background: #d1fae5;
      color: #065f46;
    }

    .icon-container.error {
      background: #fee2e2;
      color: #991b1b;
    }

    .instruction-text {
      text-align: center;
      margin-bottom: 2rem;
    }

    .instruction-text h2 {
      margin: 0 0 0.5rem 0;
      color: #333;
    }

    .instruction-text p {
      margin: 0;
      color: #666;
    }

    .passcode-input-container {
      width: 100%;
      max-width: 400px;
    }

    .passcode-inputs {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 0.75rem;
      margin-bottom: 2rem;
    }

    .passcode-inputs input {
      width: 100%;
      aspect-ratio: 1;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      font-size: 2rem;
      text-align: center;
      font-weight: 700;
      transition: all 0.3s;
      background: white;
    }

    .passcode-inputs input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .passcode-inputs input.filled {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }

    .verify-btn {
      width: 100%;
      padding: 1rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      margin-bottom: 1rem;
    }

    .verify-btn:hover:not(:disabled) {
      background: #5568d3;
      transform: translateY(-2px);
    }

    .verify-btn:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    .clear-btn {
      width: 100%;
      padding: 0.75rem;
      background: #e5e7eb;
      color: #374151;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }

    .clear-btn:hover {
      background: #d1d5db;
    }

    .number-pad {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      max-width: 300px;
      margin-top: 2rem;
    }

    .number-pad button {
      aspect-ratio: 1;
      border: 2px solid #e0e0e0;
      background: white;
      border-radius: 50%;
      font-size: 1.5rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
    }

    .number-pad button:hover {
      background: #f0f0f0;
      transform: scale(1.05);
    }

    .number-pad button:active {
      transform: scale(0.95);
    }

    .result-container {
      width: 100%;
      max-width: 400px;
    }

    .result-card {
      background: white;
      border-radius: 16px;
      padding: 2rem;
      text-align: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    }

    .result-card.success {
      border-top: 4px solid #10b981;
    }

    .result-card.error {
      border-top: 4px solid #ef4444;
    }

    .result-card h2 {
      margin: 0 0 1rem 0;
      color: #333;
    }

    .result-message {
      color: #666;
      margin-bottom: 2rem;
      font-size: 1.1rem;
    }

    .staff-details {
      background: #f9fafb;
      padding: 1.5rem;
      border-radius: 12px;
      margin-bottom: 2rem;
    }

    .staff-photo {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid white;
      margin-bottom: 1rem;
    }

    .staff-info h3 {
      margin: 0 0 1rem 0;
      color: #333;
    }

    .info-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      color: #666;
    }

    .info-row:last-child {
      margin-bottom: 0;
    }

    .info-row svg {
      color: #999;
    }

    .action-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .btn {
      padding: 0.75rem;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background: #5568d3;
    }

    .btn-secondary {
      background: #e5e7eb;
      color: #374151;
    }

    .btn-secondary:hover {
      background: #d1d5db;
    }
  `]
})
export class GuardPasscodeVerifyComponent {
  passcodeDigits: string[] = ['', '', '', '', '', ''];
  verificationResult: PasscodeVerificationResponse | null = null;
  verifying = false;

  constructor(
    private domesticStaffService: DomesticStaffService,
    private router: Router,
    private auth: MobileAuthService,
    private toast: ToastService
  ) {}

  onDigitInput(event: any, index: number) {
    const value = event.target.value;
    
    if (value && /^\d$/.test(value)) {
      this.passcodeDigits[index] = value;
      
      // Auto-focus next input
      if (index < 5) {
        const nextInput = event.target.parentElement.children[index + 1] as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
        }
      }

      // Auto-verify when all digits are entered
      if (this.isPasscodeComplete()) {
        setTimeout(() => this.verifyPasscode(), 300);
      }
    } else {
      event.target.value = '';
      this.passcodeDigits[index] = '';
    }
  }

  onKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && !this.passcodeDigits[index] && index > 0) {
      const prevInput = (event.target as HTMLElement).parentElement?.children[index - 1] as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
        this.passcodeDigits[index - 1] = '';
      }
    }
  }

  addDigit(digit: string) {
    const emptyIndex = this.passcodeDigits.findIndex(d => !d);
    if (emptyIndex !== -1) {
      this.passcodeDigits[emptyIndex] = digit;
      
      // Auto-verify when complete
      if (this.isPasscodeComplete()) {
        setTimeout(() => this.verifyPasscode(), 300);
      }
    }
  }

  isPasscodeComplete(): boolean {
    return this.passcodeDigits.every(d => d !== '');
  }

  clearPasscode() {
    this.passcodeDigits = ['', '', '', '', '', ''];
    this.verificationResult = null;
  }

  verifyPasscode() {
    if (!this.isPasscodeComplete()) return;

    this.verifying = true;
    const passcode = this.passcodeDigits.join('');
    const guard = this.auth.getCurrentUser();
    const societyId = this.domesticStaffService.getSocietyId();

    if (!societyId) {
      this.verifying = false;
      this.toast.error('No society on this guard session — log in again');
      return;
    }

    const request = {
      passcode,
      entryGate: 'Main Gate',
      guardId: guard?.id || 'guard'
    };

    this.domesticStaffService.verifyPasscode(request).subscribe({
      next: (result) => {
        this.verificationResult = result;
        this.verifying = false;
        if (result.success) {
          this.toast.success(result.message || 'Access granted');
          this.playSuccessSound();
        } else {
          this.toast.error(result.message || 'Access denied');
          this.playErrorSound();
        }
      },
      error: (err) => {
        console.error('Error verifying passcode:', err);
        this.verificationResult = {
          success: false,
          message: err?.error?.message || 'Verification failed. Please try again.'
        };
        this.verifying = false;
        this.toast.error(this.verificationResult.message);
        this.playErrorSound();
      }
    });
  }

  playSuccessSound() {
    // Implement success sound
    console.log('Success sound');
  }

  playErrorSound() {
    // Implement error sound
    console.log('Error sound');
  }

  reset() {
    this.clearPasscode();
    this.verificationResult = null;
  }

  goBack() {
    this.router.navigate(['/mobile/guard/domestic-staff']);
  }
}
