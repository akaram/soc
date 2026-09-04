import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { VehicleRegistrationService } from '../services/vehicle-registration.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  Vehicle,
  VehicleType,
  VehicleStatus,
  ApprovalStatus,
  RFIDStatus,
  FASTagStatus
} from '../models/vehicle.model';

@Component({
  selector: 'app-vehicle-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './vehicle-list.component.html',
  styleUrls: ['./vehicle-list.component.scss']
})
export class VehicleListComponent implements OnInit, OnDestroy {
  vehicles: Vehicle[] = [];
  filteredVehicles: Vehicle[] = [];
  
  // Filter options
  searchTerm = '';
  filterVehicleType: VehicleType | 'ALL' = 'ALL';
  filterApprovalStatus: ApprovalStatus | 'ALL' = 'ALL';
  filterVehicleStatus: VehicleStatus | 'ALL' = 'ALL';
  
  // Enums for template
  vehicleTypes = Object.values(VehicleType);
  approvalStatuses = Object.values(ApprovalStatus);
  vehicleStatuses = Object.values(VehicleStatus);
  
  // View options
  viewMode: 'card' | 'table' = 'card';
  selectedVehicle: Vehicle | null = null;
  showDetailModal = false;
  
  // Loading state
  isLoading = false;
  
  // Scanning
  isScanning = false;
  scanResult: Vehicle | null = null;
  scanError = '';

  constructor(
    private vehicleService: VehicleRegistrationService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadVehicles();
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  loadVehicles(): void {
    this.isLoading = true;
    this.vehicleService.getAllVehicles().subscribe({
      next: (vehicles) => {
        this.vehicles = vehicles;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading vehicles:', error);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredVehicles = this.vehicles.filter(vehicle => {
      const matchesSearch = vehicle.registrationNumber.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                          vehicle.ownerName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                          vehicle.make.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                          vehicle.model.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesType = this.filterVehicleType === 'ALL' || vehicle.vehicleType === this.filterVehicleType;
      const matchesApproval = this.filterApprovalStatus === 'ALL' || vehicle.approvalStatus === this.filterApprovalStatus;
      const matchesStatus = this.filterVehicleStatus === 'ALL' || vehicle.status === this.filterVehicleStatus;
      
      return matchesSearch && matchesType && matchesApproval && matchesStatus;
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterVehicleType = 'ALL';
    this.filterApprovalStatus = 'ALL';
    this.filterVehicleStatus = 'ALL';
    this.applyFilters();
  }

  viewDetails(vehicle: Vehicle): void {
    this.selectedVehicle = vehicle;
    this.showDetailModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.showDetailModal = false;
    this.selectedVehicle = null;
    document.body.style.overflow = '';
  }

  approveVehicle(vehicleId: string): void {
    this.vehicleService.approveVehicle(vehicleId, 'ADMIN-001').subscribe({
      next: response => {
        if (response.success) {
          this.toast.success('Vehicle approved successfully.');
          this.loadVehicles();
          this.closeModal();
        }
      },
      error: error => {
        console.error('Error approving vehicle:', error);
        this.toast.error('Failed to approve vehicle.');
      }
    });
  }

  rejectVehicle(vehicleId: string): void {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason?.trim()) {
      if (reason !== null) {
        this.toast.warning('Rejection reason is required.');
      }
      return;
    }
    this.vehicleService.rejectVehicle(vehicleId, reason.trim()).subscribe({
        next: (response) => {
          if (response.success) {
            this.toast.success('Vehicle rejected.');
            this.loadVehicles();
            this.closeModal();
          }
        },
        error: (error) => {
          console.error('Error rejecting vehicle:', error);
          this.toast.error('Failed to reject vehicle.');
        }
      });
  }

  /** Gate-style lookup: backend only grants access for active vehicle + valid RFID (see VehicleService.findVehicleByRfidTokenForGate). */
  scanRFID(): void {
    const tagNumber = prompt('Enter RFID Tag Number:');
    if (tagNumber) {
      this.isScanning = true;
      this.scanError = '';
      this.scanResult = null;
      
      this.vehicleService.scanRFIDTag(tagNumber).subscribe({
        next: (vehicle) => {
          this.isScanning = false;
          if (vehicle) {
            this.scanResult = vehicle;
            this.toast.success(`Access granted — ${vehicle.registrationNumber} (${vehicle.ownerName}).`);
          } else {
            this.scanError = 'RFID tag not found or inactive';
            this.toast.error('Access denied: RFID tag not found.');
          }
        },
        error: (error) => {
          this.isScanning = false;
          this.scanError = 'Error scanning RFID';
          console.error('Scan error:', error);
        }
      });
    }
  }

  // Helper methods
  getStatusClass(status: VehicleStatus): string {
    const statusClasses: Record<VehicleStatus, string> = {
      [VehicleStatus.ACTIVE]: 'status-active',
      [VehicleStatus.INACTIVE]: 'status-inactive',
      [VehicleStatus.SUSPENDED]: 'status-suspended',
      [VehicleStatus.EXPIRED]: 'status-expired',
      [VehicleStatus.BLACKLISTED]: 'status-blacklisted'
    };
    return statusClasses[status];
  }

  getApprovalClass(status: ApprovalStatus): string {
    const statusClasses: Record<ApprovalStatus, string> = {
      [ApprovalStatus.APPROVED]: 'approval-approved',
      [ApprovalStatus.PENDING]: 'approval-pending',
      [ApprovalStatus.REJECTED]: 'approval-rejected',
      [ApprovalStatus.UNDER_REVIEW]: 'approval-review'
    };
    return statusClasses[status];
  }

  getRFIDStatusClass(status: RFIDStatus): string {
    const statusClasses: Record<RFIDStatus, string> = {
      [RFIDStatus.ACTIVE]: 'rfid-active',
      [RFIDStatus.INACTIVE]: 'rfid-inactive',
      [RFIDStatus.DAMAGED]: 'rfid-damaged',
      [RFIDStatus.LOST]: 'rfid-lost',
      [RFIDStatus.EXPIRED]: 'rfid-expired'
    };
    return statusClasses[status];
  }

  getFASTagStatusClass(status: FASTagStatus): string {
    const statusClasses: Record<FASTagStatus, string> = {
      [FASTagStatus.ACTIVE]: 'fastag-active',
      [FASTagStatus.INACTIVE]: 'fastag-inactive',
      [FASTagStatus.BLOCKED]: 'fastag-blocked',
      [FASTagStatus.EXPIRED]: 'fastag-expired',
      [FASTagStatus.LOW_BALANCE]: 'fastag-low'
    };
    return statusClasses[status];
  }

  formatLabel(text: string): string {
    return text.replace(/_/g, ' ');
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
