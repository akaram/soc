import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { RFIDReaderService } from '../services/rfid-reader.service';
import {
  ReaderType,
  ReaderProtocol,
  ReaderStatus,
  CreateRFIDReaderRequest,
  UpdateRFIDReaderRequest
} from '../models/rfid-reader.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-rfid-reader-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="rfid-reader-form-container">
      <div class="page-header">
        <h1>
          <i class="material-icons">{{ isEditMode ? 'edit' : 'add_circle' }}</i>
          {{ isEditMode ? 'Edit RFID/Smart Card Reader' : 'Add RFID/Smart Card Reader' }}
        </h1>
        <p>{{ isEditMode ? 'Update reader configuration' : 'Add a new RFID or Smart Card reader device' }}</p>
      </div>

      <div class="form-card">
        <form (ngSubmit)="onSubmit()">
          <!-- Basic Information -->
          <div class="form-section">
            <h3>Basic Information</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Reader Name *</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.name" 
                  name="name" 
                  required
                  placeholder="e.g., RFID Reader - Main Gate Entry"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Reader Type *</label>
                <select 
                  [(ngModel)]="formData.type" 
                  name="type" 
                  required
                  class="form-control">
                  <option value="">Select Type</option>
                  <option [value]="ReaderType.RFID_READER">RFID Reader</option>
                  <option [value]="ReaderType.SMART_CARD_READER">Smart Card Reader</option>
                  <option [value]="ReaderType.NFC_READER">NFC Reader</option>
                  <option [value]="ReaderType.FASTAG_READER">FASTag Reader</option>
                  <option [value]="ReaderType.COMBO_READER">Combo Reader</option>
                </select>
              </div>
              <div class="form-group">
                <label>Model</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.model" 
                  name="model"
                  placeholder="e.g., RFID-Pro-5000"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Manufacturer</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.manufacturer" 
                  name="manufacturer"
                  placeholder="e.g., TechSecure"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Serial Number</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.serialNumber" 
                  name="serialNumber"
                  placeholder="Serial number"
                  class="form-control">
              </div>
            </div>
          </div>

          <!-- Location Information -->
          <div class="form-section">
            <h3>Location</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Gate</label>
                <select [(ngModel)]="formData.gateId" name="gateId" class="form-control">
                  <option value="">Select Gate</option>
                  <option value="MAIN_GATE">Main Gate</option>
                  <option value="SIDE_GATE">Side Gate</option>
                  <option value="PARKING_GATE">Parking Gate</option>
                  <option value="EMERGENCY_GATE">Emergency Gate</option>
                </select>
              </div>
              <div class="form-group">
                <label>Location</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.location" 
                  name="location"
                  placeholder="e.g., Entry Lane, Exit Lane"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Building Name</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.buildingName" 
                  name="buildingName"
                  placeholder="Building name"
                  class="form-control">
              </div>
              <div class="form-group">
                <label>Floor Number</label>
                <input 
                  type="number" 
                  [(ngModel)]="formData.floorNumber" 
                  name="floorNumber"
                  placeholder="Floor number"
                  class="form-control">
              </div>
            </div>
          </div>

          <!-- Connection Settings -->
          <div class="form-section">
            <h3>Connection Settings</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Connection Type *</label>
                <select 
                  [(ngModel)]="formData.connectionType" 
                  name="connectionType" 
                  required
                  class="form-control">
                  <option value="">Select Connection</option>
                  <option value="WIRED">Wired</option>
                  <option value="WIRELESS">Wireless</option>
                  <option value="ETHERNET">Ethernet</option>
                  <option value="WIFI">WiFi</option>
                  <option value="USB">USB</option>
                  <option value="SERIAL">Serial</option>
                </select>
              </div>
              <div class="form-group" *ngIf="formData.connectionType === 'ETHERNET' || formData.connectionType === 'WIFI'">
                <label>IP Address</label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.ipAddress" 
                  name="ipAddress"
                  placeholder="192.168.1.100"
                  class="form-control">
              </div>
              <div class="form-group" *ngIf="formData.connectionType === 'ETHERNET' || formData.connectionType === 'WIFI'">
                <label>Port</label>
                <input 
                  type="number" 
                  [(ngModel)]="formData.port" 
                  name="port"
                  placeholder="8080"
                  class="form-control">
              </div>
              <div class="form-group" *ngIf="formData.connectionType === 'SERIAL'">
                <label>Baud Rate</label>
                <input 
                  type="number" 
                  [(ngModel)]="formData.baudRate" 
                  name="baudRate"
                  placeholder="9600"
                  class="form-control">
              </div>
            </div>
          </div>

          <!-- Protocol & Settings -->
          <div class="form-section">
            <h3>Protocol & Settings</h3>
            <div class="form-group">
              <label>Supported Protocols *</label>
              <div class="checkbox-group">
                <label *ngFor="let protocol of availableProtocols" class="checkbox-label">
                  <input 
                    type="checkbox" 
                    [value]="protocol"
                    [checked]="formData.supportedProtocols.includes(protocol)"
                    (change)="toggleProtocol(protocol)">
                  {{ getProtocolLabel(protocol) }}
                </label>
              </div>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label>Read Range (meters)</label>
                <input 
                  type="number" 
                  [(ngModel)]="formData.readRange" 
                  name="readRange"
                  step="0.1"
                  placeholder="3.5"
                  class="form-control">
              </div>
            </div>
            <div class="form-group">
              <label>
                <input 
                  type="checkbox" 
                  [(ngModel)]="formData.autoOpenGate" 
                  name="autoOpenGate">
                Auto Open Gate
              </label>
            </div>
            <div class="form-group">
              <label>
                <input 
                  type="checkbox" 
                  [(ngModel)]="formData.requiresApproval" 
                  name="requiresApproval">
                Requires Approval
              </label>
            </div>
          </div>

          <!-- Additional Information -->
          <div class="form-section">
            <h3>Additional Information</h3>
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
              {{ isSubmitting ? 'Saving...' : (isEditMode ? 'Update Reader' : 'Add Reader') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .rfid-reader-form-container {
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

    .form-section:last-of-type {
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

    .checkbox-group {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
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
      background: #667eea;
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
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
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
export class RFIDReaderFormComponent implements OnInit, OnDestroy {
  isEditMode = false;
  readerId: string | null = null;
  isSubmitting = false;
  formData: CreateRFIDReaderRequest = {
    name: '',
    type: ReaderType.RFID_READER,
    connectionType: 'ETHERNET',
    supportedProtocols: [ReaderProtocol.ISO14443],
    autoOpenGate: true,
    requiresApproval: false
  };

  ReaderType = ReaderType;
  ReaderProtocol = ReaderProtocol;
  availableProtocols = Object.values(ReaderProtocol);

  private destroy$ = new Subject<void>();

  constructor(
    private readerService: RFIDReaderService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.readerId = params['id'];
        this.isEditMode = this.route.snapshot.url.some(segment => segment.path === 'edit');
        if (this.isEditMode) {
          this.loadReader();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReader(): void {
    if (!this.readerId) return;

    this.readerService.getReaderById(this.readerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reader) => {
          if (reader) {
            this.formData = {
              name: reader.name,
              type: reader.type,
              model: reader.model,
              manufacturer: reader.manufacturer,
              serialNumber: reader.serialNumber,
              gateId: reader.gateId,
              location: reader.location,
              buildingName: reader.buildingName,
              floorNumber: reader.floorNumber,
              connectionType: reader.connectionType,
              ipAddress: reader.ipAddress,
              macAddress: reader.macAddress,
              port: reader.port,
              baudRate: reader.baudRate,
              supportedProtocols: reader.supportedProtocols,
              readRange: reader.readRange,
              autoOpenGate: reader.autoOpenGate,
              requiresApproval: reader.requiresApproval,
              settings: reader.settings,
              notes: reader.notes,
              tags: reader.tags
            };
          }
        },
        error: (error) => {
          console.error('Error loading reader:', error);
        }
      });
  }

  toggleProtocol(protocol: ReaderProtocol): void {
    const index = this.formData.supportedProtocols.indexOf(protocol);
    if (index > -1) {
      this.formData.supportedProtocols.splice(index, 1);
    } else {
      this.formData.supportedProtocols.push(protocol);
    }
  }

  getProtocolLabel(protocol: ReaderProtocol): string {
    return protocol.replace(/_/g, ' ');
  }

  onSubmit(): void {
    if (this.isSubmitting) return;

    this.isSubmitting = true;

    if (this.isEditMode && this.readerId) {
      const updateRequest: UpdateRFIDReaderRequest = {
        name: this.formData.name,
        location: this.formData.location,
        gateId: this.formData.gateId,
        ipAddress: this.formData.ipAddress,
        port: this.formData.port,
        autoOpenGate: this.formData.autoOpenGate,
        requiresApproval: this.formData.requiresApproval,
        notes: this.formData.notes
      };

      this.readerService.updateReader(this.readerId, updateRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSubmitting = false;
            if (response.success) {
              this.router.navigate(['/admin/hardware-integration/rfid-readers']);
            } else {
              alert(response.message || 'Failed to update reader');
            }
          },
          error: (error) => {
            this.isSubmitting = false;
            console.error('Error updating reader:', error);
            alert('An error occurred while updating the reader');
          }
        });
    } else {
      this.readerService.createReader(this.formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSubmitting = false;
            if (response.success) {
              this.router.navigate(['/admin/hardware-integration/rfid-readers']);
            } else {
              alert(response.message || 'Failed to create reader');
            }
          },
          error: (error) => {
            this.isSubmitting = false;
            console.error('Error creating reader:', error);
            alert('An error occurred while creating the reader');
          }
        });
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/hardware-integration/rfid-readers']);
  }
}
















































