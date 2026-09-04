import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

/**
 * Asset Management Component
 * Manages assets with tracking, maintenance scheduling, and inventory management
 */

interface Asset {
  id: string;
  name: string;
  category: 'lift' | 'generator' | 'pump' | 'hvac' | 'fire-equipment' | 'other';
  location: string;
  building?: string;
  floor?: string;
  room?: string;
  coordinates?: { lat: number; lng: number };
  qrCode: string;
  qrCodeImage?: string; // Base64 or URL
  status: 'active' | 'maintenance' | 'retired' | 'disposed';
  purchaseDate: Date;
  purchaseCost: number;
  currentValue: number;
  vendor?: string;
  vendorContact?: string;
  warrantyExpiry?: Date;
  warrantyDetails?: string;
  assignedTo?: string;
  description?: string;
  serialNumber?: string;
  modelNumber?: string;
  manufacturer?: string;
  // Depreciation
  depreciationMethod?: 'straight-line' | 'declining-balance' | 'units-of-production';
  usefulLife?: number; // in years
  depreciationRate?: number; // percentage
  accumulatedDepreciation?: number;
  // Insurance
  insurancePolicyNumber?: string;
  insuranceProvider?: string;
  insurancePremium?: number;
  insuranceExpiry?: Date;
  insuranceCoverage?: number;
  insuranceType?: 'comprehensive' | 'third-party' | 'liability';
  // UI helper
  selectedForQR?: boolean;
}

interface MaintenanceSchedule {
  id: string;
  assetId: string;
  assetName: string;
  maintenanceType: 'preventive' | 'corrective' | 'inspection' | 'calibration';
  scheduledDate: Date;
  dueDate: Date;
  completedDate?: Date;
  status: 'scheduled' | 'in-progress' | 'completed' | 'overdue' | 'cancelled';
  assignedTo: string;
  vendorId?: string;
  vendorName?: string;
  cost?: number;
  description: string;
  frequency?: string; // e.g., "Monthly", "Quarterly", "Annually"
  nextDueDate?: Date;
  notes?: string;
  partsReplaced?: string[];
  laborHours?: number;
}

interface AMCReminder {
  id: string;
  assetId: string;
  assetName: string;
  amcProvider: string;
  amcNumber: string;
  startDate: Date;
  expiryDate: Date;
  renewalDate: Date;
  annualCost: number;
  coverageType: 'comprehensive' | 'basic' | 'parts-only' | 'labor-only';
  status: 'active' | 'expiring-soon' | 'expired' | 'renewed';
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  autoRenewal: boolean;
  lastServiceDate?: Date;
  nextServiceDate?: Date;
}

interface MaintenanceHistory {
  id: string;
  assetId: string;
  assetName: string;
  maintenanceType: 'preventive' | 'corrective' | 'inspection' | 'calibration' | 'emergency';
  performedDate: Date;
  completedDate: Date;
  performedBy: string;
  vendorId?: string;
  vendorName?: string;
  cost: number;
  description: string;
  partsReplaced?: string[];
  partsCost?: number;
  laborCost?: number;
  laborHours?: number;
  notes?: string;
  beforeCondition?: string;
  afterCondition?: string;
  nextServiceDue?: Date;
  warrantyInfo?: string;
}

interface ServiceVendor {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  specialization: string[]; // e.g., ['HVAC', 'Electrical', 'Plumbing']
  rating?: number;
  totalServices: number;
  averageCost: number;
  responseTime?: string; // e.g., "24 hours"
  status: 'active' | 'inactive';
  address?: string;
  gstNumber?: string;
}

interface DowntimeRecord {
  id: string;
  assetId: string;
  assetName: string;
  startDate: Date;
  endDate?: Date;
  duration?: number; // in hours
  reason: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved';
  reportedBy: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  costImpact?: number;
  affectedServices?: string[];
}

interface ReplacementRecommendation {
  id: string;
  assetId: string;
  assetName: string;
  category: string;
  currentAge: number; // in years
  usefulLife: number; // in years
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  recommendation: 'continue-use' | 'monitor' | 'plan-replacement' | 'urgent-replacement';
  estimatedReplacementCost: number;
  estimatedReplacementDate?: Date;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  lastMaintenanceDate?: Date;
  maintenanceFrequency?: string;
  costSavings?: number; // if replaced
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string; // e.g., "pieces", "liters", "kg"
  currentStock: number;
  minStock: number;
  maxStock: number;
  reorderLevel: number;
  unitPrice: number;
  supplier?: string;
  location?: string;
  lastRestocked?: Date;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'ordered';
  description?: string;
  sku?: string;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  orderDate: Date;
  supplier: string;
  supplierContact?: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: 'draft' | 'pending' | 'approved' | 'ordered' | 'received' | 'cancelled';
  expectedDeliveryDate?: Date;
  receivedDate?: Date;
  notes?: string;
  createdBy: string;
  approvedBy?: string;
}

interface PurchaseOrderItem {
  inventoryItemId: string;
  inventoryItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
}

@Component({
  selector: 'app-asset-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="asset-management-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <div class="header-content">
          <h1>
            <i class="material-icons">inventory_2</i>
            Asset Management
          </h1>
          <p>Track assets, schedule maintenance, and manage inventory</p>
        </div>
        <div class="header-actions">
          <button class="icon-btn" (click)="showSettings = true" title="Settings">
            <i class="material-icons">settings</i>
          </button>
          <button class="icon-btn" (click)="exportReport()" title="Export">
            <i class="material-icons">download</i>
            Export
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-section">
        <div class="tab-buttons">
          <button class="tab-btn" [ngClass]="{'active': activeTab === 'tracking'}" (click)="activeTab = 'tracking'">
            <i class="material-icons">track_changes</i>
            Asset Tracking
          </button>
          <button class="tab-btn" [ngClass]="{'active': activeTab === 'maintenance'}" (click)="activeTab = 'maintenance'">
            <i class="material-icons">build</i>
            Maintenance Scheduling
          </button>
          <button class="tab-btn" [ngClass]="{'active': activeTab === 'inventory'}" (click)="activeTab = 'inventory'">
            <i class="material-icons">inventory</i>
            Inventory Management
          </button>
        </div>
      </div>

      <!-- Asset Tracking Tab -->
      <div class="tab-content" *ngIf="activeTab === 'tracking'">
        <!-- Feature Cards Grid -->
        <div class="feature-cards-grid">
          <!-- QR Code-based Asset Tagging Card -->
          <div class="feature-card" (click)="openQRCodeManagement()">
            <div class="card-icon qr">
              <i class="material-icons">qr_code_2</i>
            </div>
            <div class="card-content">
              <h3>QR Code-based Asset Tagging</h3>
              <p>Generate and manage QR codes for all assets. Scan to view asset details instantly.</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">qr_code</i>
                  {{ getQRCodeCount() }} Assets Tagged
                </span>
                <span class="stat-item">
                  <i class="material-icons">print</i>
                  Print QR Codes
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Asset Registry Card -->
          <div class="feature-card" (click)="showAssetRegistry = true">
            <div class="card-icon registry">
              <i class="material-icons">list_alt</i>
            </div>
            <div class="card-content">
              <h3>Asset Registry</h3>
              <p>Comprehensive registry for lifts, generators, pumps, HVAC, and fire equipment.</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">elevator</i>
                  {{ getCategoryCount('lift') }} Lifts
                </span>
                <span class="stat-item">
                  <i class="material-icons">power</i>
                  {{ getCategoryCount('generator') }} Generators
                </span>
                <span class="stat-item">
                  <i class="material-icons">water_drop</i>
                  {{ getCategoryCount('pump') }} Pumps
                </span>
                <span class="stat-item">
                  <i class="material-icons">ac_unit</i>
                  {{ getCategoryCount('hvac') }} HVAC
                </span>
                <span class="stat-item">
                  <i class="material-icons">local_fire_department</i>
                  {{ getCategoryCount('fire-equipment') }} Fire Equipment
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Asset Location Tracking Card -->
          <div class="feature-card" (click)="showLocationTracking = true">
            <div class="card-icon location">
              <i class="material-icons">location_on</i>
            </div>
            <div class="card-content">
              <h3>Asset Location Tracking</h3>
              <p>Track asset locations across buildings, floors, and rooms with visual mapping.</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">apartment</i>
                  {{ getUniqueLocations().length }} Locations
                </span>
                <span class="stat-item">
                  <i class="material-icons">map</i>
                  View Map
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Purchase Details & Warranty Tracking Card -->
          <div class="feature-card" (click)="showPurchaseWarranty = true">
            <div class="card-icon warranty">
              <i class="material-icons">verified</i>
            </div>
            <div class="card-content">
              <h3>Purchase Details & Warranty Tracking</h3>
              <p>Track purchase information, vendor details, and warranty expiry dates.</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">shopping_cart</i>
                  {{ formatCurrency(getTotalPurchaseValue()) }} Total Purchase
                </span>
                <span class="stat-item">
                  <i class="material-icons">warning</i>
                  {{ getExpiringWarrantiesCount() }} Expiring Soon
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Depreciation Calculation Card -->
          <div class="feature-card" (click)="showDepreciation = true">
            <div class="card-icon depreciation">
              <i class="material-icons">trending_down</i>
            </div>
            <div class="card-content">
              <h3>Depreciation Calculation</h3>
              <p>Calculate asset depreciation using straight-line, declining balance, or units-of-production methods.</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">calculate</i>
                  {{ formatCurrency(getTotalDepreciation()) }} Total Depreciation
                </span>
                <span class="stat-item">
                  <i class="material-icons">assessment</i>
                  View Schedule
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Insurance Policy Tracking Card -->
          <div class="feature-card" (click)="showInsuranceTracking = true">
            <div class="card-icon insurance">
              <i class="material-icons">shield</i>
            </div>
            <div class="card-content">
              <h3>Insurance Policy Tracking</h3>
              <p>Manage insurance policies, track premiums, coverage, and renewal dates.</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">policy</i>
                  {{ getInsuredAssetsCount() }} Insured Assets
                </span>
                <span class="stat-item">
                  <i class="material-icons">warning</i>
                  {{ getExpiringInsuranceCount() }} Expiring Soon
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>
        </div>
      </div>

      <!-- Maintenance Scheduling Tab -->
      <div class="tab-content" *ngIf="activeTab === 'maintenance'">
        <!-- Feature Cards Grid -->
        <div class="feature-cards-grid">
          <!-- Preventive Maintenance Schedules Card -->
          <div class="feature-card" (click)="openPreventiveMaintenance()">
            <div class="card-icon preventive">
              <i class="material-icons">schedule</i>
            </div>
            <div class="card-content">
              <h3>Preventive Maintenance Schedules</h3>
              <p>Create and manage scheduled preventive maintenance tasks for all assets</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">schedule</i>
                  {{ getPreventiveSchedulesCount() }} Scheduled
                </span>
                <span class="stat-item">
                  <i class="material-icons">warning</i>
                  {{ getOverduePreventiveCount() }} Overdue
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Service Reminders (AMC Renewals) Card -->
          <div class="feature-card" (click)="openAMCReminders()">
            <div class="card-icon amc">
              <i class="material-icons">notifications_active</i>
            </div>
            <div class="card-content">
              <h3>Service Reminders (AMC Renewals)</h3>
              <p>Track AMC contracts, renewal dates, and service reminders</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">verified</i>
                  {{ getActiveAMCCount() }} Active AMCs
                </span>
                <span class="stat-item">
                  <i class="material-icons">warning</i>
                  {{ getExpiringAMCCount() }} Expiring Soon
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Maintenance History Logs Card -->
          <div class="feature-card" (click)="openMaintenanceHistory()">
            <div class="card-icon history">
              <i class="material-icons">history</i>
            </div>
            <div class="card-content">
              <h3>Maintenance History Logs</h3>
              <p>View complete maintenance history, costs, and service records</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">list</i>
                  {{ getMaintenanceHistoryCount() }} Records
                </span>
                <span class="stat-item">
                  <i class="material-icons">attach_money</i>
                  {{ formatCurrency(getTotalMaintenanceHistoryCost()) }} Total Spent
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Service Vendor Assignment Card -->
          <div class="feature-card" (click)="openVendorAssignment()">
            <div class="card-icon vendor">
              <i class="material-icons">business</i>
            </div>
            <div class="card-content">
              <h3>Service Vendor Assignment</h3>
              <p>Manage service vendors, assign maintenance tasks, and track performance</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">business</i>
                  {{ getVendorsCount() }} Vendors
                </span>
                <span class="stat-item">
                  <i class="material-icons">assignment</i>
                  {{ getAssignedVendorTasksCount() }} Assigned Tasks
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Downtime Tracking Card -->
          <div class="feature-card" (click)="openDowntimeTracking()">
            <div class="card-icon downtime">
              <i class="material-icons">error_outline</i>
            </div>
            <div class="card-content">
              <h3>Downtime Tracking</h3>
              <p>Track asset downtime, impact analysis, and resolution tracking</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">warning</i>
                  {{ getActiveDowntimeCount() }} Active Downtime
                </span>
                <span class="stat-item">
                  <i class="material-icons">schedule</i>
                  {{ getTotalDowntimeHours() }} Total Hours
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Replacement Recommendations Card -->
          <div class="feature-card" (click)="openReplacementRecommendations()">
            <div class="card-icon replacement">
              <i class="material-icons">swap_horiz</i>
            </div>
            <div class="card-content">
              <h3>Replacement Recommendations</h3>
              <p>Get AI-powered recommendations for asset replacement based on age, condition, and costs</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">priority_high</i>
                  {{ getUrgentReplacementsCount() }} Urgent
                </span>
                <span class="stat-item">
                  <i class="material-icons">assessment</i>
                  {{ getTotalReplacementCost() }} Estimated Cost
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>
        </div>
      </div>

      <!-- Inventory Management Tab -->
      <div class="tab-content" *ngIf="activeTab === 'inventory'">
        <!-- Feature Cards Grid -->
        <div class="feature-cards-grid">
          <!-- Stock Tracking Card -->
          <div class="feature-card" (click)="openStockTracking()">
            <div class="card-icon stock-tracking">
              <i class="material-icons">inventory_2</i>
            </div>
            <div class="card-content">
              <h3>Stock Tracking</h3>
              <p>Track cleaning supplies, spare parts, and all inventory items with real-time stock levels</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">inventory</i>
                  {{ getTotalInventoryItems() }} Total Items
                </span>
                <span class="stat-item">
                  <i class="material-icons">attach_money</i>
                  {{ formatCurrency(getTotalInventoryValue()) }} Total Value
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Low Stock Alerts Card -->
          <div class="feature-card" (click)="openLowStockAlerts()">
            <div class="card-icon low-stock-alerts">
              <i class="material-icons">notifications</i>
            </div>
            <div class="card-content">
              <h3>Low Stock Alerts</h3>
              <p>Monitor and manage items that are running low or out of stock</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">warning</i>
                  {{ getLowStockCount() }} Low Stock
                </span>
                <span class="stat-item">
                  <i class="material-icons">error</i>
                  {{ getOutOfStockCount() }} Out of Stock
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Purchase Order Creation Card -->
          <div class="feature-card" (click)="openPurchaseOrderCreation()">
            <div class="card-icon purchase-order">
              <i class="material-icons">shopping_cart</i>
            </div>
            <div class="card-content">
              <h3>Purchase Order Creation</h3>
              <p>Create and manage purchase orders for inventory restocking</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">receipt</i>
                  {{ getPurchaseOrdersCount() }} Purchase Orders
                </span>
                <span class="stat-item">
                  <i class="material-icons">schedule</i>
                  {{ getPendingPOCount() }} Pending
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>

          <!-- Inventory Valuation Card -->
          <div class="feature-card" (click)="openInventoryValuation()">
            <div class="card-icon inventory-valuation">
              <i class="material-icons">assessment</i>
            </div>
            <div class="card-content">
              <h3>Inventory Valuation</h3>
              <p>View comprehensive inventory valuation reports and financial analysis</p>
              <div class="card-stats">
                <span class="stat-item">
                  <i class="material-icons">attach_money</i>
                  {{ formatCurrency(getTotalInventoryValue()) }} Total Value
                </span>
                <span class="stat-item">
                  <i class="material-icons">category</i>
                  {{ getInventoryCategoriesCount() }} Categories
                </span>
              </div>
            </div>
            <div class="card-arrow">
              <i class="material-icons">arrow_forward</i>
            </div>
          </div>
        </div>
      </div>

      <!-- Settings Modal -->
      <div class="modal-overlay" *ngIf="showSettings" (click)="showSettings = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Asset Management Settings</h2>
            <button class="close-btn" (click)="showSettings = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Auto-generate QR Codes</label>
              <input type="checkbox" [(ngModel)]="autoGenerateQR" />
            </div>
              <div class="form-group">
              <label>Send Maintenance Reminders</label>
              <input type="checkbox" [(ngModel)]="sendMaintenanceReminders" />
            </div>
            <div class="form-group">
              <label>Low Stock Alerts</label>
              <input type="checkbox" [(ngModel)]="lowStockAlerts" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showSettings = false">Close</button>
            <button class="btn btn-primary" (click)="saveSettings()">Save Settings</button>
          </div>
        </div>
      </div>

      <!-- QR Code Management Modal -->
      <div class="modal-overlay" *ngIf="showQRCodeManagement" (click)="showQRCodeManagement = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">qr_code_2</i> QR Code-based Asset Tagging</h2>
            <button class="close-btn" (click)="showQRCodeManagement = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <!-- Summary Cards -->
            <div class="qr-summary-cards">
              <div class="summary-card">
                <div class="card-icon">
                  <i class="material-icons">qr_code</i>
                </div>
                <div class="card-content">
                  <div class="card-label">Total Assets</div>
                  <div class="card-value">{{ getAssetsForQR().length }}</div>
                </div>
              </div>
              <div class="summary-card">
                <div class="card-icon active">
                  <i class="material-icons">check_circle</i>
                </div>
                <div class="card-content">
                  <div class="card-label">QR Codes Generated</div>
                  <div class="card-value">{{ getQRCodeCount() }}</div>
                </div>
              </div>
              <div class="summary-card">
                <div class="card-icon pending">
                  <i class="material-icons">pending</i>
                </div>
                <div class="card-content">
                  <div class="card-label">Pending Generation</div>
                  <div class="card-value">{{ getAssetsForQR().length - getQRCodeCount() }}</div>
                </div>
              </div>
            </div>

            <!-- Actions Bar -->
            <div class="section-header">
              <div class="filters">
                <input type="text" class="search-input" placeholder="Search assets..." [(ngModel)]="qrSearchTerm" />
                <select class="filter-select" [(ngModel)]="qrCategoryFilter">
                  <option value="all">All Categories</option>
                  <option value="lift">Lifts</option>
                  <option value="generator">Generators</option>
                  <option value="pump">Pumps</option>
                  <option value="hvac">HVAC</option>
                  <option value="fire-equipment">Fire Equipment</option>
                </select>
                <select class="filter-select" [(ngModel)]="qrStatusFilter">
                  <option value="all">All Status</option>
                  <option value="generated">With QR Code</option>
                  <option value="pending">Without QR Code</option>
                </select>
              </div>
              <div class="action-buttons-group">
                <button class="btn btn-secondary" (click)="selectAllForQR()">
                  <i class="material-icons">select_all</i>
                  Select All
                </button>
                <button class="btn btn-secondary" (click)="deselectAllForQR()">
                  <i class="material-icons">deselect</i>
                  Deselect All
                </button>
                <button class="btn btn-primary" (click)="generateBulkQRCodes()">
                  <i class="material-icons">qr_code_2</i>
                  Generate QR for Selected ({{ getSelectedAssetsCount() }})
                </button>
                <button class="btn btn-primary" (click)="printBulkQRCodes()" *ngIf="getQRCodeCount() > 0">
                  <i class="material-icons">print</i>
                  Print All QR Codes
                </button>
              </div>
            </div>

            <!-- Assets Table -->
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th width="40">
                      <input type="checkbox" [checked]="areAllSelected()" (change)="toggleSelectAll($event)" />
                    </th>
                    <th>Asset Name</th>
                    <th>QR Code</th>
                    <th>QR Code Preview</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let asset of getFilteredAssetsForQR()">
                    <td>
                      <input type="checkbox" [(ngModel)]="asset.selectedForQR" />
                    </td>
                    <td>
                      <strong>{{ asset.name }}</strong>
                      <div class="asset-meta">
                        <span class="meta-item" *ngIf="asset.serialNumber">
                          <i class="material-icons">tag</i>
                          {{ asset.serialNumber }}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div class="qr-code-display">
                        <div class="qr-code-text" *ngIf="asset.qrCode">
                          <i class="material-icons">qr_code</i>
                          <span>{{ asset.qrCode }}</span>
                        </div>
                        <div class="qr-not-generated" *ngIf="!asset.qrCode">
                          <i class="material-icons">error_outline</i>
                          <span>Not Generated</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="qr-preview-container">
                        <div class="qr-preview" *ngIf="asset.qrCodeImage" (click)="viewQRCodeDetails(asset)">
                          <img [src]="asset.qrCodeImage" alt="QR Code" />
                          <div class="qr-overlay">
                            <i class="material-icons">zoom_in</i>
                          </div>
                        </div>
                        <div class="qr-placeholder-small" *ngIf="!asset.qrCodeImage">
                          <i class="material-icons">qr_code</i>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="category-badge" [ngClass]="asset.category">
                        {{ getCategoryLabel(asset.category) }}
                      </span>
                    </td>
                    <td>{{ asset.location }}</td>
                    <td>
                      <span class="status-badge" [ngClass]="asset.status">
                        {{ getStatusLabel(asset.status) }}
                      </span>
                    </td>
                    <td>
                      <div class="action-buttons-inline">
                        <button class="action-btn qr" (click)="generateQRCode(asset)" *ngIf="!asset.qrCode" title="Generate QR">
                          <i class="material-icons">qr_code_2</i>
                        </button>
                        <button class="action-btn view" (click)="viewQRCodeDetails(asset)" *ngIf="asset.qrCode" title="View QR">
                          <i class="material-icons">visibility</i>
                        </button>
                        <button class="action-btn print" (click)="printQRCode(asset)" *ngIf="asset.qrCode" title="Print">
                          <i class="material-icons">print</i>
                        </button>
                        <button class="action-btn download" (click)="downloadQRCode(asset)" *ngIf="asset.qrCode" title="Download">
                          <i class="material-icons">download</i>
                        </button>
                        <button class="action-btn scan" (click)="scanQRCode(asset)" *ngIf="asset.qrCode" title="Scan/View Details">
                          <i class="material-icons">qr_code_scanner</i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- QR Code Details Modal -->
      <div class="modal-overlay" *ngIf="selectedQRAsset" (click)="selectedQRAsset = null">
        <div class="modal-content qr-details-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">qr_code_2</i> QR Code Details</h2>
            <button class="close-btn" (click)="selectedQRAsset = null">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedQRAsset">
            <!-- Asset Information -->
            <div class="asset-info-section">
              <h3>{{ selectedQRAsset.name }}</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Category:</span>
                  <span class="value">{{ getCategoryLabel(selectedQRAsset.category) }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Location:</span>
                  <span class="value">{{ selectedQRAsset.location }}</span>
                </div>
                <div class="info-item" *ngIf="selectedQRAsset.serialNumber">
                  <span class="label">Serial Number:</span>
                  <span class="value">{{ selectedQRAsset.serialNumber }}</span>
                </div>
                <div class="info-item" *ngIf="selectedQRAsset.manufacturer">
                  <span class="label">Manufacturer:</span>
                  <span class="value">{{ selectedQRAsset.manufacturer }}</span>
                </div>
              </div>
            </div>

            <!-- QR Code Display -->
            <div class="qr-display-section">
              <div class="qr-code-large" *ngIf="selectedQRAsset.qrCodeImage">
                <div class="qr-code-border">
                  <img [src]="selectedQRAsset.qrCodeImage" alt="QR Code" />
                </div>
                <div class="qr-code-info">
                  <p class="qr-code-text">
                    <i class="material-icons">qr_code</i>
                    <strong>{{ selectedQRAsset.qrCode }}</strong>
                  </p>
                  <p class="qr-instructions">Scan this QR code to view asset details</p>
                </div>
              </div>
              <div class="qr-not-available" *ngIf="!selectedQRAsset.qrCodeImage">
                <i class="material-icons">error_outline</i>
                <p>QR Code not generated</p>
                <button class="btn btn-primary" (click)="generateQRCode(selectedQRAsset); selectedQRAsset = null">
                  Generate QR Code
                </button>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="qr-actions-section" *ngIf="selectedQRAsset.qrCode">
              <button class="btn btn-primary" (click)="printQRCode(selectedQRAsset)">
                <i class="material-icons">print</i>
                Print QR Code
              </button>
              <button class="btn btn-secondary" (click)="downloadQRCode(selectedQRAsset)">
                <i class="material-icons">download</i>
                Download QR Code
              </button>
              <button class="btn btn-secondary" (click)="shareQRCode(selectedQRAsset)">
                <i class="material-icons">share</i>
                Share QR Code
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Asset Registry Modal -->
      <div class="modal-overlay" *ngIf="showAssetRegistry" (click)="showAssetRegistry = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">list_alt</i> Asset Registry</h2>
            <button class="close-btn" (click)="showAssetRegistry = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="registry-tabs">
              <button class="registry-tab" [ngClass]="{'active': registryCategory === 'all'}" (click)="registryCategory = 'all'">
                All Assets ({{ assets.length }})
              </button>
              <button class="registry-tab" [ngClass]="{'active': registryCategory === 'lift'}" (click)="registryCategory = 'lift'">
                <i class="material-icons">elevator</i> Lifts ({{ getCategoryCount('lift') }})
              </button>
              <button class="registry-tab" [ngClass]="{'active': registryCategory === 'generator'}" (click)="registryCategory = 'generator'">
                <i class="material-icons">power</i> Generators ({{ getCategoryCount('generator') }})
              </button>
              <button class="registry-tab" [ngClass]="{'active': registryCategory === 'pump'}" (click)="registryCategory = 'pump'">
                <i class="material-icons">water_drop</i> Pumps ({{ getCategoryCount('pump') }})
              </button>
              <button class="registry-tab" [ngClass]="{'active': registryCategory === 'hvac'}" (click)="registryCategory = 'hvac'">
                <i class="material-icons">ac_unit</i> HVAC ({{ getCategoryCount('hvac') }})
              </button>
              <button class="registry-tab" [ngClass]="{'active': registryCategory === 'fire-equipment'}" (click)="registryCategory = 'fire-equipment'">
                <i class="material-icons">local_fire_department</i> Fire Equipment ({{ getCategoryCount('fire-equipment') }})
              </button>
            </div>
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Asset Name</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Serial Number</th>
                    <th>Manufacturer</th>
                    <th>Model</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let asset of getRegistryAssets()">
                    <td><strong>{{ asset.name }}</strong></td>
                    <td>{{ getCategoryLabel(asset.category) }}</td>
                    <td>{{ asset.location }}</td>
                    <td>{{ asset.serialNumber || '-' }}</td>
                    <td>{{ asset.manufacturer || '-' }}</td>
                    <td>{{ asset.modelNumber || '-' }}</td>
                    <td>
                      <span class="status-badge" [ngClass]="asset.status">
                        {{ getStatusLabel(asset.status) }}
                      </span>
                    </td>
                    <td>
                      <button class="action-btn view" (click)="viewAssetDetails(asset)" title="View Details">
                        <i class="material-icons">visibility</i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Location Tracking Modal -->
      <div class="modal-overlay" *ngIf="showLocationTracking" (click)="showLocationTracking = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">location_on</i> Asset Location Tracking</h2>
            <button class="close-btn" (click)="showLocationTracking = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="location-filters">
              <select class="filter-select" [(ngModel)]="locationBuildingFilter">
                <option value="all">All Buildings</option>
                <option *ngFor="let building of getUniqueBuildings()" [value]="building">{{ building }}</option>
              </select>
              <button class="btn btn-primary" (click)="showLocationMap = true">
                <i class="material-icons">map</i>
                View Map
              </button>
            </div>
            <div class="location-grid">
              <div class="location-card" *ngFor="let location of getLocationGroups()">
                <div class="location-header">
                  <i class="material-icons">location_on</i>
                  <h3>{{ location.building }} - {{ location.floor || 'Ground' }}</h3>
                  <span class="asset-count">{{ location.assets.length }} Assets</span>
                </div>
                <div class="location-assets">
                  <div class="location-asset-item" *ngFor="let asset of location.assets">
                    <span class="asset-name">{{ asset.name }}</span>
                    <span class="asset-room" *ngIf="asset.room">{{ asset.room }}</span>
                    <span class="status-badge" [ngClass]="asset.status">{{ getStatusLabel(asset.status) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Purchase & Warranty Tracking Modal -->
      <div class="modal-overlay" *ngIf="showPurchaseWarranty" (click)="showPurchaseWarranty = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">verified</i> Purchase Details & Warranty Tracking</h2>
            <button class="close-btn" (click)="showPurchaseWarranty = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="warranty-alerts" *ngIf="getExpiringWarranties().length > 0">
              <div class="alert-card warning">
                <i class="material-icons">warning</i>
                <div>
                  <strong>{{ getExpiringWarranties().length }} Warranties Expiring Soon</strong>
                  <p>Warranties expiring in next 90 days</p>
                </div>
              </div>
            </div>
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Asset Name</th>
                    <th>Purchase Date</th>
                    <th>Purchase Cost</th>
                    <th>Vendor</th>
                    <th>Warranty Expiry</th>
                    <th>Days Remaining</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let asset of assets" [ngClass]="{'expiring-soon': isWarrantyExpiringSoon(asset)}">
                    <td><strong>{{ asset.name }}</strong></td>
                    <td>{{ formatDate(asset.purchaseDate) }}</td>
                    <td>{{ formatCurrency(asset.purchaseCost) }}</td>
                    <td>{{ asset.vendor || '-' }}</td>
                    <td>{{ asset.warrantyExpiry ? formatDate(asset.warrantyExpiry) : 'No Warranty' }}</td>
                    <td>
                      <span *ngIf="asset.warrantyExpiry" [ngClass]="{'expiring': getWarrantyDaysRemaining(asset) <= 90}">
                        {{ getWarrantyDaysRemaining(asset) }} days
                      </span>
                      <span *ngIf="!asset.warrantyExpiry">-</span>
                    </td>
                    <td>
                      <button class="action-btn view" (click)="viewPurchaseDetails(asset)" title="View Details">
                        <i class="material-icons">visibility</i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Depreciation Calculation Modal -->
      <div class="modal-overlay" *ngIf="showDepreciation" (click)="showDepreciation = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">trending_down</i> Depreciation Calculation</h2>
            <button class="close-btn" (click)="showDepreciation = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="depreciation-summary">
              <div class="summary-item">
                <label>Total Purchase Value:</label>
                <span>{{ formatCurrency(getTotalPurchaseValue()) }}</span>
              </div>
              <div class="summary-item">
                <label>Total Depreciation:</label>
                <span>{{ formatCurrency(getTotalDepreciation()) }}</span>
              </div>
              <div class="summary-item">
                <label>Current Book Value:</label>
                <span>{{ formatCurrency(getTotalBookValue()) }}</span>
              </div>
            </div>
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Asset Name</th>
                    <th>Purchase Cost</th>
                    <th>Method</th>
                    <th>Useful Life</th>
                    <th>Annual Depreciation</th>
                    <th>Accumulated Depreciation</th>
                    <th>Current Book Value</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let asset of assets">
                    <td><strong>{{ asset.name }}</strong></td>
                    <td>{{ formatCurrency(asset.purchaseCost) }}</td>
                    <td>{{ getDepreciationMethodLabel(asset.depreciationMethod) }}</td>
                    <td>{{ asset.usefulLife || '-' }} years</td>
                    <td>{{ formatCurrency(calculateAnnualDepreciation(asset)) }}</td>
                    <td>{{ formatCurrency(asset.accumulatedDepreciation || 0) }}</td>
                    <td>{{ formatCurrency(calculateBookValue(asset)) }}</td>
                    <td>
                      <button class="action-btn edit" (click)="editDepreciation(asset)" title="Edit Depreciation">
                        <i class="material-icons">edit</i>
                      </button>
                      <button class="action-btn view" (click)="viewDepreciationSchedule(asset)" title="View Schedule">
                        <i class="material-icons">schedule</i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Insurance Policy Tracking Modal -->
      <div class="modal-overlay" *ngIf="showInsuranceTracking" (click)="showInsuranceTracking = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">shield</i> Insurance Policy Tracking</h2>
            <button class="close-btn" (click)="showInsuranceTracking = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="insurance-alerts" *ngIf="getExpiringInsurance().length > 0">
              <div class="alert-card warning">
                <i class="material-icons">warning</i>
                <div>
                  <strong>{{ getExpiringInsurance().length }} Insurance Policies Expiring Soon</strong>
                  <p>Policies expiring in next 90 days</p>
                </div>
              </div>
            </div>
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Asset Name</th>
                    <th>Policy Number</th>
                    <th>Insurance Provider</th>
                    <th>Coverage Amount</th>
                    <th>Premium</th>
                    <th>Expiry Date</th>
                    <th>Days Remaining</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let asset of getInsuredAssets()" [ngClass]="{'expiring-soon': isInsuranceExpiringSoon(asset)}">
                    <td><strong>{{ asset.name }}</strong></td>
                    <td>{{ asset.insurancePolicyNumber || '-' }}</td>
                    <td>{{ asset.insuranceProvider || '-' }}</td>
                    <td>{{ asset.insuranceCoverage ? formatCurrency(asset.insuranceCoverage) : '-' }}</td>
                    <td>{{ asset.insurancePremium ? formatCurrency(asset.insurancePremium) : '-' }}</td>
                    <td>{{ asset.insuranceExpiry ? formatDate(asset.insuranceExpiry) : 'Not Insured' }}</td>
                    <td>
                      <span *ngIf="asset.insuranceExpiry" [ngClass]="{'expiring': getInsuranceDaysRemaining(asset) <= 90}">
                        {{ getInsuranceDaysRemaining(asset) }} days
                      </span>
                      <span *ngIf="!asset.insuranceExpiry">-</span>
                    </td>
                    <td>
                      <button class="action-btn view" (click)="viewInsuranceDetails(asset)" title="View Details">
                        <i class="material-icons">visibility</i>
                      </button>
                      <button class="action-btn edit" (click)="editInsurance(asset)" title="Edit Insurance">
                        <i class="material-icons">edit</i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Preventive Maintenance Schedules Modal -->
      <div class="modal-overlay" *ngIf="showPreventiveMaintenance" (click)="showPreventiveMaintenance = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">schedule</i> Preventive Maintenance Schedules</h2>
            <button class="close-btn" (click)="showPreventiveMaintenance = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="section-header">
              <div class="filters">
                <select class="filter-select" [(ngModel)]="preventiveStatusFilter">
                  <option value="all">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                </select>
                <select class="filter-select" [(ngModel)]="preventiveAssetFilter">
                  <option value="all">All Assets</option>
                  <option *ngFor="let asset of assets" [value]="asset.id">{{ asset.name }}</option>
                </select>
              </div>
              <button class="btn btn-primary" (click)="showAddPreventiveSchedule = true">
                <i class="material-icons">add</i>
                Create Schedule
              </button>
            </div>

            <div class="summary-cards">
              <div class="summary-card">
                <div class="card-icon scheduled">
                  <i class="material-icons">schedule</i>
                </div>
                <div class="card-content">
                  <div class="card-label">Scheduled</div>
                  <div class="card-value">{{ getPreventiveSchedulesCount() }}</div>
                </div>
              </div>
              <div class="summary-card">
                <div class="card-icon overdue">
                  <i class="material-icons">warning</i>
                </div>
                <div class="card-content">
                  <div class="card-label">Overdue</div>
                  <div class="card-value">{{ getOverduePreventiveCount() }}</div>
                </div>
              </div>
              <div class="summary-card">
                <div class="card-icon completed">
                  <i class="material-icons">check_circle</i>
                </div>
                <div class="card-content">
                  <div class="card-label">Completed (This Month)</div>
                  <div class="card-value">{{ getCompletedPreventiveThisMonth() }}</div>
                </div>
              </div>
            </div>

            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Frequency</th>
                    <th>Last Service</th>
                    <th>Next Due</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let schedule of getFilteredPreventiveSchedules()">
                    <td><strong>{{ schedule.assetName }}</strong></td>
                    <td>{{ schedule.frequency || 'N/A' }}</td>
                    <td>{{ schedule.completedDate ? formatDate(schedule.completedDate) : 'Never' }}</td>
                    <td [ngClass]="{'overdue': isOverdue(schedule.dueDate) && schedule.status !== 'completed'}">
                      {{ formatDate(schedule.dueDate) }}
                    </td>
                    <td>
                      <span class="status-badge" [ngClass]="schedule.status">
                        {{ getMaintenanceStatusLabel(schedule.status) }}
                      </span>
                    </td>
                    <td>{{ schedule.assignedTo }}</td>
                    <td>
                      <button class="action-btn view" (click)="viewPreventiveSchedule(schedule)" title="View">
                        <i class="material-icons">visibility</i>
                      </button>
                      <button class="action-btn edit" (click)="editPreventiveSchedule(schedule)" title="Edit">
                        <i class="material-icons">edit</i>
                      </button>
                      <button class="action-btn complete" (click)="completePreventiveSchedule(schedule)" *ngIf="schedule.status !== 'completed'" title="Mark Complete">
                        <i class="material-icons">check</i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Preventive Maintenance Schedule Modal -->
      <div class="modal-overlay" *ngIf="showAddPreventiveSchedule" (click)="showAddPreventiveSchedule = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">add_circle</i> Create Preventive Maintenance Schedule</h2>
            <button class="close-btn" (click)="showAddPreventiveSchedule = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="savePreventiveSchedule()">
              <div class="form-group">
                <label for="newScheduleAsset">Asset <span class="required">*</span></label>
                <select 
                  id="newScheduleAsset" 
                  class="form-control" 
                  [(ngModel)]="newPreventiveSchedule.assetId" 
                  name="assetId"
                  required>
                  <option value="">Select Asset</option>
                  <option *ngFor="let asset of assets" [value]="asset.id">{{ asset.name }}</option>
                </select>
              </div>

              <div class="form-group">
                <label for="newScheduleFrequency">Frequency <span class="required">*</span></label>
                <select 
                  id="newScheduleFrequency" 
                  class="form-control" 
                  [(ngModel)]="newPreventiveSchedule.frequency" 
                  name="frequency"
                  required>
                  <option value="">Select Frequency</option>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Semi-Annually">Semi-Annually</option>
                  <option value="Annually">Annually</option>
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="newScheduleScheduledDate">Scheduled Date <span class="required">*</span></label>
                  <input 
                    type="date" 
                    id="newScheduleScheduledDate" 
                    class="form-control" 
                    [(ngModel)]="newScheduleScheduledDateString" 
                    name="scheduledDate"
                    required>
                </div>

                <div class="form-group">
                  <label for="newScheduleDueDate">Due Date <span class="required">*</span></label>
                  <input 
                    type="date" 
                    id="newScheduleDueDate" 
                    class="form-control" 
                    [(ngModel)]="newScheduleDueDateString" 
                    name="dueDate"
                    [min]="newScheduleScheduledDateString"
                    required>
                </div>
              </div>

              <div class="form-group">
                <label for="newScheduleAssignedTo">Assigned To <span class="required">*</span></label>
                <input 
                  type="text" 
                  id="newScheduleAssignedTo" 
                  class="form-control" 
                  [(ngModel)]="newPreventiveSchedule.assignedTo" 
                  name="assignedTo"
                  placeholder="e.g., Maintenance Team, Vendor Name"
                  required>
              </div>

              <div class="form-group">
                <label for="newScheduleVendor">Vendor (Optional)</label>
                <select 
                  id="newScheduleVendor" 
                  class="form-control" 
                  [(ngModel)]="newPreventiveSchedule.vendorId" 
                  name="vendorId">
                  <option value="">Select Vendor</option>
                  <option *ngFor="let vendor of serviceVendors" [value]="vendor.id">{{ vendor.name }}</option>
                </select>
              </div>

              <div class="form-group">
                <label for="newScheduleCost">Estimated Cost (₹)</label>
                <input 
                  type="number" 
                  id="newScheduleCost" 
                  class="form-control" 
                  [(ngModel)]="newPreventiveSchedule.cost" 
                  name="cost"
                  placeholder="0.00"
                  min="0"
                  step="0.01">
              </div>

              <div class="form-group">
                <label for="newScheduleDescription">Description <span class="required">*</span></label>
                <textarea 
                  id="newScheduleDescription" 
                  class="form-control" 
                  [(ngModel)]="newPreventiveSchedule.description" 
                  name="description"
                  rows="4"
                  placeholder="Describe the maintenance tasks to be performed..."
                  required></textarea>
              </div>

              <div class="form-group">
                <label for="newScheduleNotes">Notes</label>
                <textarea 
                  id="newScheduleNotes" 
                  class="form-control" 
                  [(ngModel)]="newPreventiveSchedule.notes" 
                  name="notes"
                  rows="3"
                  placeholder="Additional notes or instructions..."></textarea>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="cancelAddPreventiveSchedule()">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary">
                  <i class="material-icons">save</i>
                  Create Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- AMC Reminders Modal -->
      <div class="modal-overlay" *ngIf="showAMCReminders" (click)="showAMCReminders = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">notifications_active</i> Service Reminders (AMC Renewals)</h2>
            <button class="close-btn" (click)="showAMCReminders = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="amc-alerts" *ngIf="getExpiringAMCs().length > 0">
              <div class="alert-card warning">
                <i class="material-icons">warning</i>
                <div>
                  <strong>{{ getExpiringAMCs().length }} AMCs Expiring Soon</strong>
                  <p>AMCs expiring in next 90 days</p>
                </div>
              </div>
            </div>

            <div class="section-header">
              <div class="filters">
                <select class="filter-select" [(ngModel)]="amcStatusFilter">
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="expiring-soon">Expiring Soon</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <button class="btn btn-primary" (click)="showAddAMC = true">
                <i class="material-icons">add</i>
                Add AMC
              </button>
            </div>

            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>AMC Provider</th>
                    <th>AMC Number</th>
                    <th>Start Date</th>
                    <th>Expiry Date</th>
                    <th>Renewal Date</th>
                    <th>Annual Cost</th>
                    <th>Coverage</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let amc of getFilteredAMCs()" [ngClass]="{'expiring-soon': isAMCExpiringSoon(amc)}">
                    <td><strong>{{ amc.assetName }}</strong></td>
                    <td>{{ amc.amcProvider }}</td>
                    <td>{{ amc.amcNumber }}</td>
                    <td>{{ formatDate(amc.startDate) }}</td>
                    <td>{{ formatDate(amc.expiryDate) }}</td>
                    <td [ngClass]="{'overdue': isOverdue(amc.renewalDate)}">
                      {{ formatDate(amc.renewalDate) }}
                    </td>
                    <td>{{ formatCurrency(amc.annualCost) }}</td>
                    <td>
                      <span class="coverage-badge" [ngClass]="amc.coverageType">
                        {{ getCoverageTypeLabel(amc.coverageType) }}
                      </span>
                    </td>
                    <td>
                      <span class="status-badge" [ngClass]="amc.status">
                        {{ getAMCStatusLabel(amc.status) }}
                      </span>
                    </td>
                    <td>
                      <button class="action-btn view" (click)="viewAMC(amc)" title="View">
                        <i class="material-icons">visibility</i>
                      </button>
                      <button class="action-btn edit" (click)="editAMC(amc)" title="Edit">
                        <i class="material-icons">edit</i>
                      </button>
                      <button class="action-btn renew" (click)="renewAMC(amc)" *ngIf="amc.status === 'expiring-soon' || amc.status === 'expired'" title="Renew">
                        <i class="material-icons">refresh</i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Add AMC Modal -->
      <div class="modal-overlay" *ngIf="showAddAMC" (click)="showAddAMC = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">add_circle</i> Add AMC</h2>
            <button class="close-btn" (click)="showAddAMC = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="saveAMC()">
              <div class="form-group">
                <label for="newAMCAsset">Asset <span class="required">*</span></label>
                <select 
                  id="newAMCAsset" 
                  class="form-control" 
                  [(ngModel)]="newAMC.assetId" 
                  name="assetId"
                  required>
                  <option value="">Select Asset</option>
                  <option *ngFor="let asset of assets" [value]="asset.id">{{ asset.name }}</option>
                </select>
              </div>

              <div class="form-group">
                <label for="newAMCProvider">AMC Provider <span class="required">*</span></label>
                <input 
                  type="text" 
                  id="newAMCProvider" 
                  class="form-control" 
                  [(ngModel)]="newAMC.amcProvider" 
                  name="amcProvider"
                  placeholder="e.g., Otis Elevator Co, Cummins Service"
                  required>
              </div>

              <div class="form-group">
                <label for="newAMCNumber">AMC Number <span class="required">*</span></label>
                <input 
                  type="text" 
                  id="newAMCNumber" 
                  class="form-control" 
                  [(ngModel)]="newAMC.amcNumber" 
                  name="amcNumber"
                  placeholder="e.g., AMC-ELV-001"
                  required>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="newAMCStartDate">Start Date <span class="required">*</span></label>
                  <input 
                    type="date" 
                    id="newAMCStartDate" 
                    class="form-control" 
                    [(ngModel)]="newAMCStartDateString" 
                    name="startDate"
                    required>
                </div>

                <div class="form-group">
                  <label for="newAMCExpiryDate">Expiry Date <span class="required">*</span></label>
                  <input 
                    type="date" 
                    id="newAMCExpiryDate" 
                    class="form-control" 
                    [(ngModel)]="newAMCExpiryDateString" 
                    name="expiryDate"
                    [min]="newAMCStartDateString"
                    required>
                </div>
              </div>

              <div class="form-group">
                <label for="newAMCRenewalDate">Renewal Date <span class="required">*</span></label>
                <input 
                  type="date" 
                  id="newAMCRenewalDate" 
                  class="form-control" 
                  [(ngModel)]="newAMCRenewalDateString" 
                  name="renewalDate"
                  [min]="newAMCStartDateString"
                  [max]="newAMCExpiryDateString"
                  required>
                <small>Recommended date to renew the AMC (usually 5-7 days before expiry)</small>
              </div>

              <div class="form-group">
                <label for="newAMCAnnualCost">Annual Cost (₹) <span class="required">*</span></label>
                <input 
                  type="number" 
                  id="newAMCAnnualCost" 
                  class="form-control" 
                  [(ngModel)]="newAMC.annualCost" 
                  name="annualCost"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required>
              </div>

              <div class="form-group">
                <label for="newAMCCoverageType">Coverage Type <span class="required">*</span></label>
                <select 
                  id="newAMCCoverageType" 
                  class="form-control" 
                  [(ngModel)]="newAMC.coverageType" 
                  name="coverageType"
                  required>
                  <option value="">Select Coverage Type</option>
                  <option value="comprehensive">Comprehensive</option>
                  <option value="basic">Basic</option>
                  <option value="parts-only">Parts Only</option>
                  <option value="labor-only">Labor Only</option>
                </select>
              </div>

              <div class="form-group">
                <label for="newAMCContactPerson">Contact Person</label>
                <input 
                  type="text" 
                  id="newAMCContactPerson" 
                  class="form-control" 
                  [(ngModel)]="newAMC.contactPerson" 
                  name="contactPerson"
                  placeholder="Name of contact person">
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="newAMCContactPhone">Contact Phone</label>
                  <input 
                    type="tel" 
                    id="newAMCContactPhone" 
                    class="form-control" 
                    [(ngModel)]="newAMC.contactPhone" 
                    name="contactPhone"
                    placeholder="+91-9876543210">
                </div>

                <div class="form-group">
                  <label for="newAMCContactEmail">Contact Email</label>
                  <input 
                    type="email" 
                    id="newAMCContactEmail" 
                    class="form-control" 
                    [(ngModel)]="newAMC.contactEmail" 
                    name="contactEmail"
                    placeholder="contact@provider.com">
                </div>
              </div>

              <div class="form-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    id="newAMCAutoRenewal" 
                    [(ngModel)]="newAMC.autoRenewal" 
                    name="autoRenewal"
                    [checked]="newAMC.autoRenewal !== false">
                  <span>Auto Renewal</span>
                </label>
                <small>Automatically renew AMC when it expires</small>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="cancelAddAMC()">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary">
                  <i class="material-icons">save</i>
                  Add AMC
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Maintenance History Logs Modal -->
      <div class="modal-overlay" *ngIf="showMaintenanceHistory" (click)="showMaintenanceHistory = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">history</i> Maintenance History Logs</h2>
            <button class="close-btn" (click)="showMaintenanceHistory = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="section-header">
              <div class="filters">
                <input type="text" class="search-input" placeholder="Search history..." [(ngModel)]="historySearchTerm" />
                <select class="filter-select" [(ngModel)]="historyAssetFilter">
                  <option value="all">All Assets</option>
                  <option *ngFor="let asset of assets" [value]="asset.id">{{ asset.name }}</option>
                </select>
                <select class="filter-select" [(ngModel)]="historyTypeFilter">
                  <option value="all">All Types</option>
                  <option value="preventive">Preventive</option>
                  <option value="corrective">Corrective</option>
                  <option value="inspection">Inspection</option>
                  <option value="calibration">Calibration</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <button class="btn btn-primary" (click)="exportMaintenanceHistory()">
                <i class="material-icons">download</i>
                Export History
              </button>
            </div>

            <div class="history-summary">
              <div class="summary-item">
                <label>Total Records:</label>
                <span>{{ getMaintenanceHistoryCount() }}</span>
              </div>
              <div class="summary-item">
                <label>Total Cost:</label>
                <span>{{ formatCurrency(getTotalMaintenanceHistoryCost()) }}</span>
              </div>
              <div class="summary-item">
                <label>Average Cost:</label>
                <span>{{ formatCurrency(getAverageMaintenanceCost()) }}</span>
              </div>
            </div>

            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Asset</th>
                    <th>Type</th>
                    <th>Performed By</th>
                    <th>Vendor</th>
                    <th>Cost</th>
                    <th>Parts Replaced</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let history of getFilteredMaintenanceHistory()">
                    <td>{{ formatDate(history.performedDate) }}</td>
                    <td><strong>{{ history.assetName }}</strong></td>
                    <td>
                      <span class="type-badge" [ngClass]="history.maintenanceType">
                        {{ getMaintenanceTypeLabel(history.maintenanceType) }}
                      </span>
                    </td>
                    <td>{{ history.performedBy }}</td>
                    <td>{{ history.vendorName || '-' }}</td>
                    <td>{{ formatCurrency(history.cost) }}</td>
                    <td>
                      <span *ngIf="history.partsReplaced && history.partsReplaced.length > 0">
                        {{ history.partsReplaced.length }} parts
                      </span>
                      <span *ngIf="!history.partsReplaced || history.partsReplaced.length === 0">-</span>
                    </td>
                    <td>
                      <button class="action-btn view" (click)="viewMaintenanceHistory(history)" title="View Details">
                        <i class="material-icons">visibility</i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Service Vendor Assignment Modal -->
      <div class="modal-overlay" *ngIf="showVendorAssignment" (click)="showVendorAssignment = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">business</i> Service Vendor Assignment</h2>
            <button class="close-btn" (click)="showVendorAssignment = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="section-header">
              <div class="filters">
                <input type="text" class="search-input" placeholder="Search vendors..." [(ngModel)]="vendorSearchTerm" />
                <select class="filter-select" [(ngModel)]="vendorSpecializationFilter">
                  <option value="all">All Specializations</option>
                  <option value="HVAC">HVAC</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Lift">Lift</option>
                  <option value="Generator">Generator</option>
                </select>
              </div>
              <button class="btn btn-primary" (click)="showAddVendor = true">
                <i class="material-icons">add</i>
                Add Vendor
              </button>
            </div>

            <div class="vendors-grid">
              <div class="vendor-card" *ngFor="let vendor of getFilteredVendors()">
                <div class="vendor-header">
                  <div class="vendor-info">
                    <h3>{{ vendor.name }}</h3>
                    <p class="vendor-specialization">{{ vendor.specialization.join(', ') }}</p>
                  </div>
                  <div class="vendor-rating" *ngIf="vendor.rating">
                    <i class="material-icons">star</i>
                    <span>{{ vendor.rating }}/5</span>
                  </div>
                </div>
                <div class="vendor-details">
                  <div class="detail-row">
                    <i class="material-icons">person</i>
                    <span>{{ vendor.contactPerson }}</span>
                  </div>
                  <div class="detail-row">
                    <i class="material-icons">phone</i>
                    <span>{{ vendor.phone }}</span>
                  </div>
                  <div class="detail-row" *ngIf="vendor.email">
                    <i class="material-icons">email</i>
                    <span>{{ vendor.email }}</span>
                  </div>
                  <div class="detail-row">
                    <i class="material-icons">assignment</i>
                    <span>{{ vendor.totalServices }} Services</span>
                  </div>
                  <div class="detail-row">
                    <i class="material-icons">attach_money</i>
                    <span>Avg: {{ formatCurrency(vendor.averageCost) }}</span>
                  </div>
                </div>
                <div class="vendor-actions">
                  <button class="btn btn-secondary" (click)="viewVendor(vendor)">
                    <i class="material-icons">visibility</i>
                    View
                  </button>
                  <button class="btn btn-primary" (click)="assignVendorToTask(vendor)">
                    <i class="material-icons">assignment</i>
                    Assign Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Vendor Modal -->
      <div class="modal-overlay" *ngIf="showAddVendor" (click)="showAddVendor = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">add_circle</i> Add Vendor</h2>
            <button class="close-btn" (click)="showAddVendor = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="saveVendor()">
              <div class="form-group">
                <label for="newVendorName">Vendor Name <span class="required">*</span></label>
                <input 
                  type="text" 
                  id="newVendorName" 
                  class="form-control" 
                  [(ngModel)]="newVendor.name" 
                  name="name"
                  placeholder="e.g., Cummins Service, Aqua Services"
                  required>
              </div>

              <div class="form-group">
                <label for="newVendorContactPerson">Contact Person <span class="required">*</span></label>
                <input 
                  type="text" 
                  id="newVendorContactPerson" 
                  class="form-control" 
                  [(ngModel)]="newVendor.contactPerson" 
                  name="contactPerson"
                  placeholder="Name of contact person"
                  required>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="newVendorPhone">Phone <span class="required">*</span></label>
                  <input 
                    type="tel" 
                    id="newVendorPhone" 
                    class="form-control" 
                    [(ngModel)]="newVendor.phone" 
                    name="phone"
                    placeholder="+91-9876543210"
                    required>
                </div>

                <div class="form-group">
                  <label for="newVendorEmail">Email</label>
                  <input 
                    type="email" 
                    id="newVendorEmail" 
                    class="form-control" 
                    [(ngModel)]="newVendor.email" 
                    name="email"
                    placeholder="vendor@example.com">
                </div>
              </div>

              <div class="form-group">
                <label for="newVendorSpecialization">Specialization <span class="required">*</span></label>
                <div class="specialization-selector">
                  <label class="specialization-checkbox" *ngFor="let spec of availableSpecializations">
                    <input 
                      type="checkbox" 
                      [value]="spec"
                      [checked]="isSpecializationSelected(spec)"
                      (change)="toggleSpecialization(spec)">
                    <span>{{ spec }}</span>
                  </label>
                </div>
                <small>Select one or more specializations</small>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="newVendorRating">Rating (1-5)</label>
                  <input 
                    type="number" 
                    id="newVendorRating" 
                    class="form-control" 
                    [(ngModel)]="newVendor.rating" 
                    name="rating"
                    placeholder="4.5"
                    min="1"
                    max="5"
                    step="0.1">
                </div>

                <div class="form-group">
                  <label for="newVendorResponseTime">Response Time</label>
                  <input 
                    type="text" 
                    id="newVendorResponseTime" 
                    class="form-control" 
                    [(ngModel)]="newVendor.responseTime" 
                    name="responseTime"
                    placeholder="e.g., 24 hours, 4 hours">
                </div>
              </div>

              <div class="form-group">
                <label for="newVendorAddress">Address</label>
                <textarea 
                  id="newVendorAddress" 
                  class="form-control" 
                  [(ngModel)]="newVendor.address" 
                  name="address"
                  rows="2"
                  placeholder="Vendor address..."></textarea>
              </div>

              <div class="form-group">
                <label for="newVendorGST">GST Number</label>
                <input 
                  type="text" 
                  id="newVendorGST" 
                  class="form-control" 
                  [(ngModel)]="newVendor.gstNumber" 
                  name="gstNumber"
                  placeholder="GST123456789">
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="cancelAddVendor()">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary">
                  <i class="material-icons">save</i>
                  Add Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Downtime Tracking Modal -->
      <div class="modal-overlay" *ngIf="showDowntimeTracking" (click)="showDowntimeTracking = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">error_outline</i> Downtime Tracking</h2>
            <button class="close-btn" (click)="showDowntimeTracking = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="downtime-alerts" *ngIf="getActiveDowntime().length > 0">
              <div class="alert-card critical">
                <i class="material-icons">error</i>
                <div>
                  <strong>{{ getActiveDowntime().length }} Assets Currently Down</strong>
                  <p>Immediate attention required</p>
                </div>
              </div>
            </div>

            <div class="section-header">
              <div class="filters">
                <select class="filter-select" [(ngModel)]="downtimeStatusFilter">
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="resolved">Resolved</option>
                </select>
                <select class="filter-select" [(ngModel)]="downtimeImpactFilter">
                  <option value="all">All Impact Levels</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <button class="btn btn-primary" (click)="showAddDowntime = true">
                <i class="material-icons">add</i>
                Report Downtime
              </button>
            </div>

            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Duration</th>
                    <th>Reason</th>
                    <th>Impact</th>
                    <th>Status</th>
                    <th>Cost Impact</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let downtime of getFilteredDowntime()" [ngClass]="{'active-downtime': downtime.status === 'active'}">
                    <td><strong>{{ downtime.assetName }}</strong></td>
                    <td>{{ formatDate(downtime.startDate) }}</td>
                    <td>{{ downtime.endDate ? formatDate(downtime.endDate) : 'Ongoing' }}</td>
                    <td>{{ downtime.duration ? downtime.duration + ' hours' : calculateDowntimeHours(downtime) + ' hours' }}</td>
                    <td>{{ downtime.reason }}</td>
                    <td>
                      <span class="impact-badge" [ngClass]="downtime.impact">
                        {{ getImpactLabel(downtime.impact) }}
                      </span>
                    </td>
                    <td>
                      <span class="status-badge" [ngClass]="downtime.status">
                        {{ downtime.status === 'active' ? 'Active' : 'Resolved' }}
                      </span>
                    </td>
                    <td>{{ downtime.costImpact ? formatCurrency(downtime.costImpact) : '-' }}</td>
                    <td>
                      <button class="action-btn view" (click)="viewDowntime(downtime)" title="View">
                        <i class="material-icons">visibility</i>
                      </button>
                      <button class="action-btn resolve" (click)="resolveDowntime(downtime)" *ngIf="downtime.status === 'active'" title="Mark Resolved">
                        <i class="material-icons">check_circle</i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Report Downtime Modal -->
      <div class="modal-overlay" *ngIf="showAddDowntime" (click)="showAddDowntime = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">error_outline</i> Report Downtime</h2>
            <button class="close-btn" (click)="showAddDowntime = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="saveDowntime()">
              <div class="form-group">
                <label for="newDowntimeAsset">Asset <span class="required">*</span></label>
                <select 
                  id="newDowntimeAsset" 
                  class="form-control" 
                  [(ngModel)]="newDowntime.assetId" 
                  name="assetId"
                  required>
                  <option value="">Select Asset</option>
                  <option *ngFor="let asset of assets" [value]="asset.id">{{ asset.name }}</option>
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="newDowntimeStartDate">Start Date <span class="required">*</span></label>
                  <input 
                    type="datetime-local" 
                    id="newDowntimeStartDate" 
                    class="form-control" 
                    [(ngModel)]="newDowntimeStartDateString" 
                    name="startDate"
                    required>
                </div>

                <div class="form-group">
                  <label for="newDowntimeEndDate">End Date (Optional)</label>
                  <input 
                    type="datetime-local" 
                    id="newDowntimeEndDate" 
                    class="form-control" 
                    [(ngModel)]="newDowntimeEndDateString" 
                    name="endDate"
                    [min]="newDowntimeStartDateString">
                  <small>Leave empty if downtime is ongoing</small>
                </div>
              </div>

              <div class="form-group">
                <label for="newDowntimeReason">Reason <span class="required">*</span></label>
                <textarea 
                  id="newDowntimeReason" 
                  class="form-control" 
                  [(ngModel)]="newDowntime.reason" 
                  name="reason"
                  rows="3"
                  placeholder="Describe the reason for downtime..."
                  required></textarea>
              </div>

              <div class="form-group">
                <label for="newDowntimeImpact">Impact Level <span class="required">*</span></label>
                <select 
                  id="newDowntimeImpact" 
                  class="form-control" 
                  [(ngModel)]="newDowntime.impact" 
                  name="impact"
                  required>
                  <option value="">Select Impact Level</option>
                  <option value="low">Low - Minimal impact on operations</option>
                  <option value="medium">Medium - Moderate impact on operations</option>
                  <option value="high">High - Significant impact on operations</option>
                  <option value="critical">Critical - Severe impact, immediate attention required</option>
                </select>
              </div>

              <div class="form-group">
                <label for="newDowntimeReportedBy">Reported By <span class="required">*</span></label>
                <input 
                  type="text" 
                  id="newDowntimeReportedBy" 
                  class="form-control" 
                  [(ngModel)]="newDowntime.reportedBy" 
                  name="reportedBy"
                  placeholder="Name of person reporting"
                  required>
              </div>

              <div class="form-group">
                <label for="newDowntimeCostImpact">Cost Impact (₹)</label>
                <input 
                  type="number" 
                  id="newDowntimeCostImpact" 
                  class="form-control" 
                  [(ngModel)]="newDowntime.costImpact" 
                  name="costImpact"
                  placeholder="0.00"
                  min="0"
                  step="0.01">
                <small>Estimated financial impact of the downtime</small>
              </div>

              <div class="form-group">
                <label for="newDowntimeAffectedServices">Affected Services</label>
                <input 
                  type="text" 
                  id="newDowntimeAffectedServices" 
                  class="form-control" 
                  [(ngModel)]="newDowntimeAffectedServicesString" 
                  name="affectedServices"
                  placeholder="e.g., Water Supply, Building A, Elevator Service">
                <small>Comma-separated list of affected services or areas</small>
              </div>

              <div class="form-group">
                <label for="newDowntimeResolutionNotes">Resolution Notes</label>
                <textarea 
                  id="newDowntimeResolutionNotes" 
                  class="form-control" 
                  [(ngModel)]="newDowntime.resolutionNotes" 
                  name="resolutionNotes"
                  rows="3"
                  placeholder="Any notes about resolution or expected resolution..."></textarea>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="cancelAddDowntime()">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary">
                  <i class="material-icons">save</i>
                  Report Downtime
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Replacement Recommendations Modal -->
      <div class="modal-overlay" *ngIf="showReplacementRecommendations" (click)="showReplacementRecommendations = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">swap_horiz</i> Replacement Recommendations</h2>
            <button class="close-btn" (click)="showReplacementRecommendations = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="replacement-alerts" *ngIf="getUrgentReplacements().length > 0">
              <div class="alert-card critical">
                <i class="material-icons">priority_high</i>
                <div>
                  <strong>{{ getUrgentReplacements().length }} Urgent Replacements Required</strong>
                  <p>Assets requiring immediate replacement</p>
                </div>
              </div>
            </div>

            <div class="section-header">
              <div class="filters">
                <select class="filter-select" [(ngModel)]="replacementPriorityFilter">
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select class="filter-select" [(ngModel)]="replacementRecommendationFilter">
                  <option value="all">All Recommendations</option>
                  <option value="urgent-replacement">Urgent Replacement</option>
                  <option value="plan-replacement">Plan Replacement</option>
                  <option value="monitor">Monitor</option>
                  <option value="continue-use">Continue Use</option>
                </select>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-primary" (click)="generateReplacementReport()">
                  <i class="material-icons">assessment</i>
                  Generate Report
                </button>
                <button class="btn btn-secondary" (click)="exportReplacementReportToExcel()" title="Export to Excel">
                  <i class="material-icons">file_download</i>
                  Export Excel
                </button>
              </div>
            </div>

            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Age</th>
                    <th>Condition</th>
                    <th>Recommendation</th>
                    <th>Priority</th>
                    <th>Est. Replacement Cost</th>
                    <th>Est. Replacement Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let recommendation of getFilteredReplacements()" [ngClass]="{'urgent-row': recommendation.priority === 'urgent'}">
                    <td><strong>{{ recommendation.assetName }}</strong></td>
                    <td>{{ recommendation.currentAge }} years</td>
                    <td>
                      <span class="condition-badge" [ngClass]="recommendation.condition">
                        {{ getConditionLabel(recommendation.condition) }}
                      </span>
                    </td>
                    <td>
                      <span class="recommendation-badge" [ngClass]="recommendation.recommendation">
                        {{ getRecommendationLabel(recommendation.recommendation) }}
                      </span>
                    </td>
                    <td>
                      <span class="priority-badge" [ngClass]="recommendation.priority">
                        {{ getPriorityLabel(recommendation.priority) }}
                      </span>
                    </td>
                    <td>{{ formatCurrency(recommendation.estimatedReplacementCost) }}</td>
                    <td>{{ recommendation.estimatedReplacementDate ? formatDate(recommendation.estimatedReplacementDate) : 'TBD' }}</td>
                    <td>
                      <button class="action-btn view" (click)="viewReplacement(recommendation)" title="View Details">
                        <i class="material-icons">visibility</i>
                      </button>
                      <button class="action-btn plan" (click)="planReplacement(recommendation)" title="Plan Replacement">
                        <i class="material-icons">event</i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Stock Tracking Modal -->
      <div class="modal-overlay" *ngIf="showStockTracking" (click)="showStockTracking = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">inventory_2</i> Stock Tracking</h2>
            <button class="close-btn" (click)="showStockTracking = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="section-header">
              <div class="filters">
                <input type="text" class="search-input" placeholder="Search items..." [(ngModel)]="stockTrackingSearchTerm" />
                <select class="filter-select" [(ngModel)]="stockTrackingCategoryFilter">
                  <option value="all">All Categories</option>
                  <option value="Cleaning Supplies">Cleaning Supplies</option>
                  <option value="Spare Parts">Spare Parts</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Maintenance Materials">Maintenance Materials</option>
                </select>
                <select class="filter-select" [(ngModel)]="stockTrackingStatusFilter">
                  <option value="all">All Status</option>
                  <option value="in-stock">In Stock</option>
                  <option value="low-stock">Low Stock</option>
                  <option value="out-of-stock">Out of Stock</option>
                  <option value="ordered">Ordered</option>
                </select>
              </div>
              <button class="btn btn-primary" (click)="showAddInventoryItem = true">
                <i class="material-icons">add</i>
                Add Item
              </button>
            </div>

            <div class="summary-cards">
              <div class="summary-card">
                <div class="card-icon in-stock">
                  <i class="material-icons">inventory</i>
                </div>
                <div class="card-content">
                  <div class="card-label">Total Items</div>
                  <div class="card-value">{{ getFilteredStockTracking().length }}</div>
                </div>
              </div>
              <div class="summary-card">
                <div class="card-icon low-stock">
                  <i class="material-icons">warning</i>
                </div>
                <div class="card-content">
                  <div class="card-label">Low Stock</div>
                  <div class="card-value">{{ getLowStockCount() }}</div>
                </div>
              </div>
              <div class="summary-card">
                <div class="card-icon value">
                  <i class="material-icons">attach_money</i>
                </div>
                <div class="card-content">
                  <div class="card-label">Total Value</div>
                  <div class="card-value">{{ formatCurrency(getTotalInventoryValue()) }}</div>
                </div>
              </div>
            </div>

            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Min/Max Stock</th>
                    <th>Reorder Level</th>
                    <th>Unit Price</th>
                    <th>Total Value</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of getFilteredStockTracking()">
                    <td><strong>{{ item.name }}</strong></td>
                    <td>{{ item.category }}</td>
                    <td>
                      <span [ngClass]="{'low-stock-text': item.currentStock <= item.reorderLevel, 'out-of-stock-text': item.currentStock === 0}">
                        {{ item.currentStock }} {{ item.unit }}
                      </span>
                    </td>
                    <td>{{ item.minStock }} / {{ item.maxStock }} {{ item.unit }}</td>
                    <td>{{ item.reorderLevel }} {{ item.unit }}</td>
                    <td>{{ formatCurrency(item.unitPrice) }}</td>
                    <td>{{ formatCurrency(item.currentStock * item.unitPrice) }}</td>
                    <td>
                      <span class="status-badge" [ngClass]="item.status">
                        {{ getInventoryStatusLabel(item.status) }}
                      </span>
                    </td>
                    <td>{{ item.location || '-' }}</td>
                    <td>
                      <button class="action-btn view" (click)="viewInventoryItem(item)" title="View">
                        <i class="material-icons">visibility</i>
                      </button>
                      <button class="action-btn edit" (click)="editInventoryItem(item)" title="Edit">
                        <i class="material-icons">edit</i>
                      </button>
                      <button class="action-btn restock" (click)="restockInventoryItem(item)" title="Restock">
                        <i class="material-icons">add_shopping_cart</i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Inventory Item Modal -->
      <div class="modal-overlay" *ngIf="showAddInventoryItem" (click)="showAddInventoryItem = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">add_circle</i> Add Inventory Item</h2>
            <button class="close-btn" (click)="showAddInventoryItem = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="saveInventoryItem()">
              <div class="form-group">
                <label for="newItemName">Item Name <span class="required">*</span></label>
                <input 
                  type="text" 
                  id="newItemName" 
                  class="form-control" 
                  [(ngModel)]="newInventoryItem.name" 
                  name="name"
                  placeholder="e.g., Cleaning Detergent, LED Bulbs"
                  required>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="newItemCategory">Category <span class="required">*</span></label>
                  <select 
                    id="newItemCategory" 
                    class="form-control" 
                    [(ngModel)]="newInventoryItem.category" 
                    name="category"
                    required>
                    <option value="">Select Category</option>
                    <option value="Cleaning Supplies">Cleaning Supplies</option>
                    <option value="Spare Parts">Spare Parts</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Maintenance Materials">Maintenance Materials</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="newItemUnit">Unit <span class="required">*</span></label>
                  <select 
                    id="newItemUnit" 
                    class="form-control" 
                    [(ngModel)]="newInventoryItem.unit" 
                    name="unit"
                    required>
                    <option value="">Select Unit</option>
                    <option value="pieces">Pieces</option>
                    <option value="liters">Liters</option>
                    <option value="kg">Kilograms</option>
                    <option value="grams">Grams</option>
                    <option value="boxes">Boxes</option>
                    <option value="reams">Reams</option>
                    <option value="meters">Meters</option>
                    <option value="rolls">Rolls</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label for="newItemSKU">SKU (Optional)</label>
                <input 
                  type="text" 
                  id="newItemSKU" 
                  class="form-control" 
                  [(ngModel)]="newInventoryItem.sku" 
                  name="sku"
                  placeholder="Stock Keeping Unit">
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="newItemCurrentStock">Current Stock <span class="required">*</span></label>
                  <input 
                    type="number" 
                    id="newItemCurrentStock" 
                    class="form-control" 
                    [(ngModel)]="newInventoryItem.currentStock" 
                    name="currentStock"
                    placeholder="0"
                    min="0"
                    required>
                </div>

                <div class="form-group">
                  <label for="newItemUnitPrice">Unit Price (₹) <span class="required">*</span></label>
                  <input 
                    type="number" 
                    id="newItemUnitPrice" 
                    class="form-control" 
                    [(ngModel)]="newInventoryItem.unitPrice" 
                    name="unitPrice"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="newItemMinStock">Min Stock <span class="required">*</span></label>
                  <input 
                    type="number" 
                    id="newItemMinStock" 
                    class="form-control" 
                    [(ngModel)]="newInventoryItem.minStock" 
                    name="minStock"
                    placeholder="0"
                    min="0"
                    required>
                </div>

                <div class="form-group">
                  <label for="newItemMaxStock">Max Stock <span class="required">*</span></label>
                  <input 
                    type="number" 
                    id="newItemMaxStock" 
                    class="form-control" 
                    [(ngModel)]="newInventoryItem.maxStock" 
                    name="maxStock"
                    placeholder="0"
                    min="0"
                    required>
                </div>
              </div>

              <div class="form-group">
                <label for="newItemReorderLevel">Reorder Level <span class="required">*</span></label>
                <input 
                  type="number" 
                  id="newItemReorderLevel" 
                  class="form-control" 
                  [(ngModel)]="newInventoryItem.reorderLevel" 
                  name="reorderLevel"
                  placeholder="0"
                  min="0"
                  required>
                <small>Stock level at which reordering is triggered (usually between min and max stock)</small>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="newItemSupplier">Supplier</label>
                  <input 
                    type="text" 
                    id="newItemSupplier" 
                    class="form-control" 
                    [(ngModel)]="newInventoryItem.supplier" 
                    name="supplier"
                    placeholder="Supplier name">
                </div>

                <div class="form-group">
                  <label for="newItemLocation">Location</label>
                  <input 
                    type="text" 
                    id="newItemLocation" 
                    class="form-control" 
                    [(ngModel)]="newInventoryItem.location" 
                    name="location"
                    placeholder="e.g., Storage Room A, Electrical Store">
                </div>
              </div>

              <div class="form-group">
                <label for="newItemDescription">Description</label>
                <textarea 
                  id="newItemDescription" 
                  class="form-control" 
                  [(ngModel)]="newInventoryItem.description" 
                  name="description"
                  rows="3"
                  placeholder="Additional details about the item..."></textarea>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="cancelAddInventoryItem()">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary">
                  <i class="material-icons">save</i>
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Low Stock Alerts Modal -->
      <div class="modal-overlay" *ngIf="showLowStockAlerts" (click)="showLowStockAlerts = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">notifications</i> Low Stock Alerts</h2>
            <button class="close-btn" (click)="showLowStockAlerts = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="low-stock-alerts" *ngIf="getLowStockItems().length > 0 || getOutOfStockItems().length > 0">
              <div class="alert-card critical" *ngIf="getOutOfStockItems().length > 0">
                <i class="material-icons">error</i>
                <div>
                  <strong>{{ getOutOfStockItems().length }} Items Out of Stock</strong>
                  <p>Immediate restocking required</p>
                </div>
              </div>
              <div class="alert-card warning" *ngIf="getLowStockItems().length > 0">
                <i class="material-icons">warning</i>
                <div>
                  <strong>{{ getLowStockItems().length }} Items Running Low</strong>
                  <p>Consider restocking soon</p>
                </div>
              </div>
            </div>

            <div class="section-header">
              <div class="filters">
                <select class="filter-select" [(ngModel)]="lowStockAlertFilter">
                  <option value="all">All Alerts</option>
                  <option value="out-of-stock">Out of Stock</option>
                  <option value="low-stock">Low Stock</option>
                </select>
              </div>
              <button class="btn btn-primary" (click)="createPOFromAlerts()">
                <i class="material-icons">shopping_cart</i>
                Create Purchase Order
              </button>
            </div>

            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Reorder Level</th>
                    <th>Required Quantity</th>
                    <th>Unit Price</th>
                    <th>Estimated Cost</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of getFilteredLowStockAlerts()" [ngClass]="{'urgent-row': item.status === 'out-of-stock'}">
                    <td><strong>{{ item.name }}</strong></td>
                    <td>{{ item.category }}</td>
                    <td>
                      <span [ngClass]="{'low-stock-text': item.currentStock <= item.reorderLevel, 'out-of-stock-text': item.currentStock === 0}">
                        {{ item.currentStock }} {{ item.unit }}
                      </span>
                    </td>
                    <td>{{ item.reorderLevel }} {{ item.unit }}</td>
                    <td>{{ getRequiredQuantity(item) }} {{ item.unit }}</td>
                    <td>{{ formatCurrency(item.unitPrice) }}</td>
                    <td>{{ formatCurrency(getRequiredQuantity(item) * item.unitPrice) }}</td>
                    <td>
                      <span class="status-badge" [ngClass]="item.status">
                        {{ getInventoryStatusLabel(item.status) }}
                      </span>
                    </td>
                    <td>
                      <button class="action-btn view" (click)="viewInventoryItem(item)" title="View">
                        <i class="material-icons">visibility</i>
                      </button>
                      <button class="action-btn restock" (click)="restockInventoryItem(item)" title="Restock">
                        <i class="material-icons">add_shopping_cart</i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Purchase Order Modal -->
      <div class="modal-overlay" *ngIf="showCreatePurchaseOrder" (click)="showCreatePurchaseOrder = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">shopping_cart</i> Create Purchase Order</h2>
            <button class="close-btn" (click)="showCreatePurchaseOrder = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="savePurchaseOrder()">
              <div class="form-row">
                <div class="form-group">
                  <label for="newPOSupplier">Supplier <span class="required">*</span></label>
                  <input 
                    type="text" 
                    id="newPOSupplier" 
                    class="form-control" 
                    [(ngModel)]="newPurchaseOrder.supplier" 
                    name="supplier"
                    placeholder="Supplier name"
                    required>
                </div>

                <div class="form-group">
                  <label for="newPOSupplierContact">Supplier Contact</label>
                  <input 
                    type="tel" 
                    id="newPOSupplierContact" 
                    class="form-control" 
                    [(ngModel)]="newPurchaseOrder.supplierContact" 
                    name="supplierContact"
                    placeholder="+91-9876543210">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="newPOOrderDate">Order Date <span class="required">*</span></label>
                  <input 
                    type="date" 
                    id="newPOOrderDate" 
                    class="form-control" 
                    [(ngModel)]="newPOOrderDateString" 
                    name="orderDate"
                    required>
                </div>

                <div class="form-group">
                  <label for="newPOExpectedDelivery">Expected Delivery Date</label>
                  <input 
                    type="date" 
                    id="newPOExpectedDelivery" 
                    class="form-control" 
                    [(ngModel)]="newPOExpectedDeliveryDateString" 
                    name="expectedDelivery"
                    [min]="newPOOrderDateString">
                </div>
              </div>

              <div class="form-group">
                <label>Items <span class="required">*</span></label>
                <div class="po-items-section">
                  <div class="po-item" *ngFor="let item of newPurchaseOrderItems; let i = index">
                    <div class="po-item-header">
                      <strong>{{ item.inventoryItemName || 'Select Item' }}</strong>
                      <button type="button" class="btn-icon" (click)="removePOItem(i)" *ngIf="newPurchaseOrderItems.length > 1">
                        <i class="material-icons">delete</i>
                      </button>
                    </div>
                    <div class="po-item-details">
                      <div class="form-group">
                        <label>Item</label>
                        <select 
                          class="form-control" 
                          [(ngModel)]="item.inventoryItemId" 
                          [name]="'itemId_' + i"
                          (change)="onPOItemSelected(i)">
                          <option value="">Select Item</option>
                          <option *ngFor="let invItem of inventoryItems" [value]="invItem.id">
                            {{ invItem.name }} ({{ invItem.category }})
                          </option>
                        </select>
                      </div>
                      <div class="form-row">
                        <div class="form-group">
                          <label>Quantity</label>
                          <input 
                            type="number" 
                            class="form-control" 
                            [(ngModel)]="item.quantity" 
                            [name]="'quantity_' + i"
                            min="1"
                            (change)="calculatePOItemTotal(i)"
                            required>
                        </div>
                        <div class="form-group">
                          <label>Unit Price (₹)</label>
                          <input 
                            type="number" 
                            class="form-control" 
                            [(ngModel)]="item.unitPrice" 
                            [name]="'unitPrice_' + i"
                            min="0"
                            step="0.01"
                            (change)="calculatePOItemTotal(i)"
                            required>
                        </div>
                        <div class="form-group">
                          <label>Total Price</label>
                          <input 
                            type="text" 
                            class="form-control" 
                            [value]="formatCurrency(item.totalPrice)"
                            readonly
                            style="background: #f8f9fa;">
                        </div>
                      </div>
                    </div>
                  </div>
                  <button type="button" class="btn btn-secondary" (click)="addPOItem()">
                    <i class="material-icons">add</i>
                    Add Item
                  </button>
                </div>
              </div>

              <div class="po-summary">
                <div class="summary-row">
                  <label>Total Items:</label>
                  <span>{{ newPurchaseOrderItems.length }}</span>
                </div>
                <div class="summary-row">
                  <label>Total Amount:</label>
                  <span class="total-amount">{{ formatCurrency(calculatePOTotal()) }}</span>
                </div>
              </div>

              <div class="form-group">
                <label for="newPONotes">Notes</label>
                <textarea 
                  id="newPONotes" 
                  class="form-control" 
                  [(ngModel)]="newPurchaseOrder.notes" 
                  name="notes"
                  rows="3"
                  placeholder="Additional notes or instructions..."></textarea>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="cancelCreatePurchaseOrder()">
                  Cancel
                </button>
                <button type="button" class="btn btn-secondary" (click)="savePurchaseOrderAsDraft()">
                  <i class="material-icons">save</i>
                  Save as Draft
                </button>
                <button type="submit" class="btn btn-primary">
                  <i class="material-icons">check_circle</i>
                  Create Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Create Purchase Order Modal -->
      <div class="modal-overlay" *ngIf="showCreatePurchaseOrder" (click)="showCreatePurchaseOrder = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">shopping_cart</i> Create Purchase Order</h2>
            <button class="close-btn" (click)="showCreatePurchaseOrder = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="savePurchaseOrder()">
              <div class="form-row">
                <div class="form-group">
                  <label for="newPOSupplier">Supplier <span class="required">*</span></label>
                  <input 
                    type="text" 
                    id="newPOSupplier" 
                    class="form-control" 
                    [(ngModel)]="newPurchaseOrder.supplier" 
                    name="supplier"
                    placeholder="Supplier name"
                    required>
                </div>

                <div class="form-group">
                  <label for="newPOSupplierContact">Supplier Contact</label>
                  <input 
                    type="tel" 
                    id="newPOSupplierContact" 
                    class="form-control" 
                    [(ngModel)]="newPurchaseOrder.supplierContact" 
                    name="supplierContact"
                    placeholder="+91-9876543210">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="newPOOrderDate">Order Date <span class="required">*</span></label>
                  <input 
                    type="date" 
                    id="newPOOrderDate" 
                    class="form-control" 
                    [(ngModel)]="newPOOrderDateString" 
                    name="orderDate"
                    required>
                </div>

                <div class="form-group">
                  <label for="newPOExpectedDelivery">Expected Delivery Date</label>
                  <input 
                    type="date" 
                    id="newPOExpectedDelivery" 
                    class="form-control" 
                    [(ngModel)]="newPOExpectedDeliveryDateString" 
                    name="expectedDelivery"
                    [min]="newPOOrderDateString">
                </div>
              </div>

              <div class="form-group">
                <label>Items <span class="required">*</span></label>
                <div class="po-items-section">
                  <div class="po-item" *ngFor="let item of newPurchaseOrderItems; let i = index">
                    <div class="po-item-header">
                      <strong>{{ item.inventoryItemName || 'Select Item' }}</strong>
                      <button type="button" class="btn-icon" (click)="removePOItem(i)" *ngIf="newPurchaseOrderItems.length > 1">
                        <i class="material-icons">delete</i>
                      </button>
                    </div>
                    <div class="po-item-details">
                      <div class="form-group">
                        <label>Item</label>
                        <select 
                          class="form-control" 
                          [(ngModel)]="item.inventoryItemId" 
                          [name]="'itemId_' + i"
                          (change)="onPOItemSelected(i)">
                          <option value="">Select Item</option>
                          <option *ngFor="let invItem of inventoryItems" [value]="invItem.id">
                            {{ invItem.name }} ({{ invItem.category }})
                          </option>
                        </select>
                      </div>
                      <div class="form-row">
                        <div class="form-group">
                          <label>Quantity</label>
                          <input 
                            type="number" 
                            class="form-control" 
                            [(ngModel)]="item.quantity" 
                            [name]="'quantity_' + i"
                            min="1"
                            (change)="calculatePOItemTotal(i)"
                            required>
                        </div>
                        <div class="form-group">
                          <label>Unit Price (₹)</label>
                          <input 
                            type="number" 
                            class="form-control" 
                            [(ngModel)]="item.unitPrice" 
                            [name]="'unitPrice_' + i"
                            min="0"
                            step="0.01"
                            (change)="calculatePOItemTotal(i)"
                            required>
                        </div>
                        <div class="form-group">
                          <label>Total Price</label>
                          <input 
                            type="text" 
                            class="form-control" 
                            [value]="formatCurrency(item.totalPrice)"
                            readonly
                            style="background: #f8f9fa;">
                        </div>
                      </div>
                    </div>
                  </div>
                  <button type="button" class="btn btn-secondary" (click)="addPOItem()">
                    <i class="material-icons">add</i>
                    Add Item
                  </button>
                </div>
              </div>

              <div class="po-summary">
                <div class="summary-row">
                  <label>Total Items:</label>
                  <span>{{ newPurchaseOrderItems.length }}</span>
                </div>
                <div class="summary-row">
                  <label>Total Amount:</label>
                  <span class="total-amount">{{ formatCurrency(calculatePOTotal()) }}</span>
                </div>
              </div>

              <div class="form-group">
                <label for="newPONotes">Notes</label>
                <textarea 
                  id="newPONotes" 
                  class="form-control" 
                  [(ngModel)]="newPurchaseOrder.notes" 
                  name="notes"
                  rows="3"
                  placeholder="Additional notes or instructions..."></textarea>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="cancelCreatePurchaseOrder()">
                  Cancel
                </button>
                <button type="button" class="btn btn-secondary" (click)="savePurchaseOrderAsDraft()">
                  <i class="material-icons">save</i>
                  Save as Draft
                </button>
                <button type="submit" class="btn btn-primary">
                  <i class="material-icons">check_circle</i>
                  Create Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Purchase Order Creation Modal -->
      <div class="modal-overlay" *ngIf="showPurchaseOrderCreation" (click)="showPurchaseOrderCreation = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">shopping_cart</i> Purchase Order Creation</h2>
            <button class="close-btn" (click)="showPurchaseOrderCreation = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="section-header">
              <div class="filters">
                <select class="filter-select" [(ngModel)]="purchaseOrderStatusFilter">
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="ordered">Ordered</option>
                  <option value="received">Received</option>
                </select>
              </div>
              <button class="btn btn-primary" (click)="showCreatePurchaseOrder = true">
                <i class="material-icons">add</i>
                Create Purchase Order
              </button>
            </div>

            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Order Number</th>
                    <th>Supplier</th>
                    <th>Order Date</th>
                    <th>Items</th>
                    <th>Total Amount</th>
                    <th>Expected Delivery</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let po of getFilteredPurchaseOrders()">
                    <td><strong>{{ po.orderNumber }}</strong></td>
                    <td>{{ po.supplier }}</td>
                    <td>{{ formatDate(po.orderDate) }}</td>
                    <td>{{ po.items.length }} items</td>
                    <td>{{ formatCurrency(po.totalAmount) }}</td>
                    <td>{{ po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '-' }}</td>
                    <td>
                      <span class="status-badge" [ngClass]="po.status">
                        {{ getPOStatusLabel(po.status) }}
                      </span>
                    </td>
                    <td>
                      <button class="action-btn view" (click)="viewPurchaseOrder(po)" title="View">
                        <i class="material-icons">visibility</i>
                      </button>
                      <button class="action-btn edit" (click)="editPurchaseOrder(po)" *ngIf="po.status === 'draft'" title="Edit">
                        <i class="material-icons">edit</i>
                      </button>
                      <button class="action-btn approve" (click)="approvePurchaseOrder(po)" *ngIf="po.status === 'pending'" title="Approve">
                        <i class="material-icons">check_circle</i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Inventory Valuation Modal -->
      <div class="modal-overlay" *ngIf="showInventoryValuation" (click)="showInventoryValuation = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2><i class="material-icons">assessment</i> Inventory Valuation</h2>
            <button class="close-btn" (click)="showInventoryValuation = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="modal-body">
            <div class="valuation-summary">
              <div class="summary-item">
                <label>Total Inventory Value:</label>
                <span class="large-value">{{ formatCurrency(getTotalInventoryValue()) }}</span>
              </div>
              <div class="summary-item">
                <label>Total Items:</label>
                <span>{{ inventoryItems.length }}</span>
              </div>
              <div class="summary-item">
                <label>Average Item Value:</label>
                <span>{{ formatCurrency(getAverageItemValue()) }}</span>
              </div>
            </div>

            <div class="section-header">
              <div class="filters">
                <select class="filter-select" [(ngModel)]="valuationCategoryFilter">
                  <option value="all">All Categories</option>
                  <option *ngFor="let category of getInventoryCategories()" [value]="category">{{ category }}</option>
                </select>
              </div>
              <button class="btn btn-primary" (click)="exportValuationReport()">
                <i class="material-icons">download</i>
                Export Report
              </button>
            </div>

            <div class="valuation-by-category">
              <h3>Valuation by Category</h3>
              <div class="category-valuation-grid">
                <div class="category-card" *ngFor="let category of getCategoryValuations()">
                  <div class="category-name">{{ category.name }}</div>
                  <div class="category-value">{{ formatCurrency(category.value) }}</div>
                  <div class="category-count">{{ category.count }} items</div>
                </div>
              </div>
            </div>

            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Unit Price</th>
                    <th>Total Value</th>
                    <th>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of getFilteredValuationItems()">
                    <td><strong>{{ item.name }}</strong></td>
                    <td>{{ item.category }}</td>
                    <td>{{ item.currentStock }} {{ item.unit }}</td>
                    <td>{{ formatCurrency(item.unitPrice) }}</td>
                    <td><strong>{{ formatCurrency(item.currentStock * item.unitPrice) }}</strong></td>
                    <td>{{ getItemValuePercentage(item) }}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .asset-management-container {
      min-height: 100vh;
      background: #f5f7fa;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      color: white;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .back-btn,
    .icon-btn {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s;
    }

    .icon-btn {
      padding: 8px 16px;
      width: auto;
      border-radius: 20px;
      gap: 6px;
    }

    .back-btn:hover,
    .icon-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    .header-content {
      flex: 1;
    }

    .header-content h1 {
      margin: 0 0 4px 0;
      font-size: 24px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-content p {
      margin: 0;
      font-size: 14px;
      opacity: 0.9;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    /* Tabs */
    .tabs-section {
      background: white;
      padding: 0 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .tab-buttons {
      display: flex;
      gap: 8px;
      border-bottom: 2px solid #e9ecef;
    }

    .tab-btn {
      padding: 16px 24px;
      border: none;
      background: transparent;
      color: #7f8c8d;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 3px solid transparent;
      transition: all 0.2s;
    }

    .tab-btn:hover {
      color: #34495e;
      background: #f8f9fa;
    }

    .tab-btn.active {
      color: #3498db;
      border-bottom-color: #3498db;
      font-weight: 600;
    }

    /* Tab Content */
    .tab-content {
      padding: 24px;
    }

    /* Feature Cards Grid */
    .feature-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
    }

    .feature-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      display: flex;
      align-items: flex-start;
      gap: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .feature-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    }

    .feature-card .card-icon {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 32px;
      flex-shrink: 0;
    }

    .feature-card .card-icon.qr {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
    }

    .feature-card .card-icon.registry {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .feature-card .card-icon.location {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .feature-card .card-icon.warranty {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
    }

    .feature-card .card-icon.depreciation {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    .feature-card .card-icon.insurance {
      background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
    }

    .feature-card .card-icon.preventive {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .feature-card .card-icon.amc {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    .feature-card .card-icon.history {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
    }

    .feature-card .card-icon.vendor {
      background: linear-gradient(135deg, #1abc9c 0%, #16a085 100%);
    }

    .feature-card .card-icon.downtime {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .feature-card .card-icon.replacement {
      background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
    }

    .feature-card .card-icon.stock-tracking {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .feature-card .card-icon.low-stock-alerts {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    .feature-card .card-icon.purchase-order {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
    }

    .feature-card .card-icon.inventory-valuation {
      background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
    }

    .feature-card .card-content {
      flex: 1;
    }

    .feature-card .card-content h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .feature-card .card-content p {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #7f8c8d;
      line-height: 1.5;
    }

    .card-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 12px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #7f8c8d;
    }

    .stat-item .material-icons {
      font-size: 16px;
    }

    .card-arrow {
      color: #bdc3c7;
      transition: all 0.3s ease;
    }

    .feature-card:hover .card-arrow {
      color: #3498db;
      transform: translateX(4px);
    }

    /* Modal Large */
    .modal-content.large {
      max-width: 1200px;
      width: 95%;
    }

    /* QR Code Display */
    .qr-code-display {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .qr-placeholder {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #7f8c8d;
      font-size: 12px;
    }

    .qr-image img {
      width: 60px;
      height: 60px;
      border: 1px solid #e9ecef;
      border-radius: 4px;
    }

    /* Registry Tabs */
    .registry-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      border-bottom: 2px solid #e9ecef;
      overflow-x: auto;
    }

    .registry-tab {
      padding: 12px 20px;
      border: none;
      background: transparent;
      color: #7f8c8d;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border-bottom: 3px solid transparent;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }

    .registry-tab:hover {
      color: #34495e;
      background: #f8f9fa;
    }

    .registry-tab.active {
      color: #3498db;
      border-bottom-color: #3498db;
      font-weight: 600;
    }

    /* Location Grid */
    .location-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }

    .location-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 16px;
      border: 1px solid #e9ecef;
    }

    .location-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e9ecef;
    }

    .location-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
      flex: 1;
    }

    .asset-count {
      background: #3498db;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .location-assets {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .location-asset-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: white;
      border-radius: 8px;
      font-size: 14px;
    }

    .asset-name {
      flex: 1;
      font-weight: 500;
      color: #2c3e50;
    }

    .asset-room {
      font-size: 12px;
      color: #7f8c8d;
    }

    /* Alert Cards */
    .alert-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 20px;
    }

    .alert-card.warning {
      background: #fff3e0;
      border: 1px solid #ffb74d;
      color: #e67e22;
    }

    .alert-card.warning .material-icons {
      color: #e67e22;
    }

    /* Depreciation Summary */
    .depreciation-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 12px;
    }

    .summary-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .summary-item label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    .summary-item span {
      font-size: 20px;
      font-weight: 700;
      color: #2c3e50;
    }

    /* Expiring Soon Styles */
    .expiring-soon {
      background: #fff3e0 !important;
    }

    .expiring {
      color: #e74c3c;
      font-weight: 600;
    }

    /* Action Buttons */
    .action-btn.print {
      background: #e7f3ff;
      color: #2980b9;
    }

    .action-btn.download {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .action-btn.scan {
      background: #f3e5f5;
      color: #9b59b6;
    }

    .action-buttons-inline {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    /* QR Code Summary Cards */
    .qr-summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .qr-summary-cards .card-icon.pending {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    /* QR Code Display */
    .qr-code-display {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .qr-code-text {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #3498db;
      font-weight: 500;
      font-size: 13px;
    }

    .qr-not-generated {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #e74c3c;
      font-size: 12px;
    }

    /* QR Preview */
    .qr-preview-container {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .qr-preview {
      position: relative;
      width: 60px;
      height: 60px;
      cursor: pointer;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      overflow: hidden;
    }

    .qr-preview img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .qr-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .qr-preview:hover .qr-overlay {
      opacity: 1;
    }

    .qr-overlay .material-icons {
      color: white;
      font-size: 24px;
    }

    .qr-placeholder-small {
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f7fa;
      border-radius: 4px;
      color: #bdc3c7;
    }

    /* Category Badge */
    .category-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      display: inline-block;
    }

    .category-badge.lift {
      background: #e7f3ff;
      color: #2980b9;
    }

    .category-badge.generator {
      background: #fff3e0;
      color: #e67e22;
    }

    .category-badge.pump {
      background: #e0f2f1;
      color: #00695c;
    }

    .category-badge.hvac {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .category-badge.fire-equipment {
      background: #ffebee;
      color: #c62828;
    }

    /* Asset Meta */
    .asset-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #7f8c8d;
    }

    .meta-item .material-icons {
      font-size: 14px;
    }

    /* Action Buttons Group */
    .action-buttons-group {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    /* QR Details Modal */
    .qr-details-modal {
      max-width: 600px;
    }

    .asset-info-section {
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid #e9ecef;
    }

    .asset-info-section h3 {
      margin: 0 0 16px 0;
      font-size: 20px;
      color: #2c3e50;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-item .label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
    }

    .info-item .value {
      font-size: 14px;
      color: #2c3e50;
      font-weight: 500;
    }

    .qr-display-section {
      text-align: center;
      margin: 24px 0;
      padding: 24px;
      background: #f8f9fa;
      border-radius: 12px;
    }

    .qr-code-large {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .qr-code-border {
      padding: 20px;
      background: white;
      border: 4px solid #3498db;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(52, 152, 219, 0.2);
    }

    .qr-code-border img {
      width: 250px;
      height: 250px;
      display: block;
    }

    .qr-code-info {
      margin-top: 12px;
    }

    .qr-code-info .qr-code-text {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 16px;
      color: #2c3e50;
      margin-bottom: 8px;
    }

    .qr-instructions {
      font-size: 14px;
      color: #7f8c8d;
      margin: 0;
    }

    .qr-not-available {
      text-align: center;
      padding: 40px;
      color: #7f8c8d;
    }

    .qr-not-available .material-icons {
      font-size: 64px;
      margin-bottom: 16px;
      color: #bdc3c7;
    }

    .qr-actions-section {
      display: flex;
      gap: 12px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e9ecef;
    }

    .qr-actions-section .btn {
      flex: 1;
    }

    /* Section Header */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      gap: 16px;
      flex-wrap: wrap;
    }

    .filters {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      flex: 1;
    }

    .search-input,
    .filter-select {
      padding: 10px 16px;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      min-width: 200px;
    }

    .search-input:focus,
    .filter-select:focus {
      outline: none;
      border-color: #3498db;
    }

    /* Summary Cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .summary-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .card-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 28px;
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .card-icon.active {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
    }

    .card-icon.maintenance {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    .card-icon.value {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
    }

    .card-icon.scheduled {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .card-icon.overdue {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .card-icon.completed {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
    }

    .card-icon.cost {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
    }

    .card-icon.in-stock {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
    }

    .card-icon.low-stock {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    .card-icon.out-of-stock {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .card-content {
      flex: 1;
    }

    .card-label {
      font-size: 12px;
      color: #7f8c8d;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 24px;
      font-weight: 700;
      color: #2c3e50;
    }

    /* Table */
    .table-wrapper {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table thead {
      background: #f8f9fa;
    }

    .data-table th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #7f8c8d;
      text-transform: uppercase;
    }

    .data-table td {
      padding: 12px 16px;
      border-top: 1px solid #f0f0f0;
      font-size: 14px;
      color: #2c3e50;
    }

    .data-table tbody tr:hover {
      background: #f8f9fa;
    }

    .qr-code {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #3498db;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.active {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .status-badge.maintenance {
      background: #fff3e0;
      color: #e67e22;
    }

    .status-badge.retired {
      background: #f5f7fa;
      color: #7f8c8d;
    }

    .status-badge.disposed {
      background: #ffeaea;
      color: #e74c3c;
    }

    .status-badge.scheduled {
      background: #e7f3ff;
      color: #2980b9;
    }

    .status-badge.in-progress {
      background: #fff3e0;
      color: #e67e22;
    }

    .status-badge.completed {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .status-badge.overdue {
      background: #ffeaea;
      color: #e74c3c;
    }

    .status-badge.cancelled {
      background: #f5f7fa;
      color: #7f8c8d;
    }

    .status-badge.in-stock {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .status-badge.low-stock {
      background: #fff3e0;
      color: #e67e22;
    }

    .status-badge.out-of-stock {
      background: #ffeaea;
      color: #e74c3c;
    }

    .status-badge.ordered {
      background: #e7f3ff;
      color: #2980b9;
    }

    .type-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .type-badge.preventive {
      background: #e7f3ff;
      color: #2980b9;
    }

    .type-badge.corrective {
      background: #ffeaea;
      color: #e74c3c;
    }

    .type-badge.inspection {
      background: #fff3e0;
      color: #e67e22;
    }

    .type-badge.calibration {
      background: #f3e5f5;
      color: #9b59b6;
    }

    .action-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-right: 4px;
      transition: all 0.2s;
    }

    .action-btn.view {
      background: #e7f3ff;
      color: #2980b9;
    }

    .action-btn.edit {
      background: #fff3e0;
      color: #e67e22;
    }

    .action-btn.qr {
      background: #f3e5f5;
      color: #9b59b6;
    }

    .action-btn.complete {
      background: #e8f8f0;
      color: #1e9e5a;
    }

    .action-btn.restock {
      background: #e7f3ff;
      color: #2980b9;
    }

    .action-btn:hover {
      transform: scale(1.1);
    }

    .low-stock-text {
      color: #e67e22;
      font-weight: 600;
    }

    .out-of-stock-text {
      color: #e74c3c;
      font-weight: 600;
    }

    .overdue {
      color: #e74c3c;
      font-weight: 600;
    }

    /* Buttons */
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #3498db;
      color: white;
    }

    .btn-primary:hover {
      background: #2980b9;
    }

    .btn-secondary {
      background: #95a5a6;
      color: white;
    }

    .btn-secondary:hover {
      background: #7f8c8d;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e9ecef;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .close-btn {
      background: none;
      border: none;
      color: #95a5a6;
      cursor: pointer;
      padding: 4px;
    }

    .modal-body {
      padding: 20px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #2c3e50;
    }

    .form-group label .required {
      color: #e74c3c;
      margin-left: 4px;
    }

    .form-group input[type="checkbox"] {
      width: 20px;
      height: 20px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-weight: normal;
    }

    .checkbox-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .form-group small {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: #7f8c8d;
    }

    .specialization-selector {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .specialization-checkbox {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      padding: 8px 12px;
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      transition: all 0.2s;
      font-size: 14px;
    }

    .specialization-checkbox:hover {
      border-color: #3498db;
    }

    .specialization-checkbox input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .specialization-checkbox:has(input[type="checkbox"]:checked) {
      border-color: #3498db;
      background: rgba(52, 152, 219, 0.1);
    }

    .specialization-checkbox input[type="checkbox"]:checked + span {
      font-weight: 600;
      color: #3498db;
    }

    .form-control {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      transition: all 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #3498db;
      box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
    }

    .form-control:invalid {
      border-color: #e74c3c;
    }

    .form-control textarea {
      resize: vertical;
      min-height: 80px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #e9ecef;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px;
      border-top: 1px solid #e9ecef;
    }

    @media (max-width: 768px) {
      .summary-cards {
        grid-template-columns: 1fr;
      }

      .tab-buttons {
        overflow-x: auto;
      }

      .tab-btn {
        white-space: nowrap;
      }

      .section-header {
        flex-direction: column;
        align-items: stretch;
      }

      .filters {
        flex-direction: column;
      }

      .search-input,
      .filter-select {
        width: 100%;
      }

      .form-row {
        grid-template-columns: 1fr;
      }
    }
    /* AMC Alerts */
    .amc-alerts {
      margin-bottom: 20px;
    }

    .alert-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .alert-card.warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      color: #856404;
    }

    .alert-card.critical {
      background: #f8d7da;
      border-left: 4px solid #dc3545;
      color: #721c24;
    }

    .alert-card i {
      font-size: 24px;
    }

    .alert-card strong {
      display: block;
      margin-bottom: 4px;
    }

    .alert-card p {
      margin: 0;
      font-size: 14px;
    }

    /* History Summary */
    .history-summary {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .summary-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .summary-item label {
      font-size: 12px;
      color: #7f8c8d;
      font-weight: 500;
    }

    .summary-item span {
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    /* Vendors Grid */
    .vendors-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .vendor-card {
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s;
    }

    .vendor-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }

    .vendor-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .vendor-info h3 {
      margin: 0 0 4px 0;
      font-size: 18px;
      color: #2c3e50;
    }

    .vendor-specialization {
      font-size: 14px;
      color: #7f8c8d;
    }

    .vendor-rating {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #f39c12;
      font-weight: 600;
    }

    .vendor-details {
      margin-bottom: 16px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 14px;
      color: #2c3e50;
    }

    .detail-row i {
      font-size: 18px;
      color: #7f8c8d;
    }

    .vendor-actions {
      display: flex;
      gap: 8px;
    }

    .vendor-actions .btn {
      flex: 1;
      justify-content: center;
    }

    /* Coverage Badge */
    .coverage-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .coverage-badge.comprehensive {
      background: #d4edda;
      color: #155724;
    }

    .coverage-badge.basic {
      background: #fff3cd;
      color: #856404;
    }

    .coverage-badge.parts-only {
      background: #d1ecf1;
      color: #0c5460;
    }

    .coverage-badge.labor-only {
      background: #f8d7da;
      color: #721c24;
    }

    /* Downtime Alerts */
    .downtime-alerts {
      margin-bottom: 20px;
    }

    /* Impact Badge */
    .impact-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .impact-badge.low {
      background: #d4edda;
      color: #155724;
    }

    .impact-badge.medium {
      background: #fff3cd;
      color: #856404;
    }

    .impact-badge.high {
      background: #f8d7da;
      color: #721c24;
    }

    .impact-badge.critical {
      background: #dc3545;
      color: white;
    }

    .active-downtime {
      background: #fff3cd !important;
    }

    /* Replacement Alerts */
    .replacement-alerts {
      margin-bottom: 20px;
    }

    /* Condition Badge */
    .condition-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .condition-badge.excellent {
      background: #d4edda;
      color: #155724;
    }

    .condition-badge.good {
      background: #cfe2ff;
      color: #084298;
    }

    .condition-badge.fair {
      background: #fff3cd;
      color: #856404;
    }

    .condition-badge.poor {
      background: #f8d7da;
      color: #721c24;
    }

    .condition-badge.critical {
      background: #dc3545;
      color: white;
    }

    /* Recommendation Badge */
    .recommendation-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .recommendation-badge.continue-use {
      background: #d4edda;
      color: #155724;
    }

    .recommendation-badge.monitor {
      background: #cfe2ff;
      color: #084298;
    }

    .recommendation-badge.plan-replacement {
      background: #fff3cd;
      color: #856404;
    }

    .recommendation-badge.urgent-replacement {
      background: #dc3545;
      color: white;
    }

    /* Priority Badge */
    .priority-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .priority-badge.low {
      background: #d4edda;
      color: #155724;
    }

    .priority-badge.medium {
      background: #fff3cd;
      color: #856404;
    }

    .priority-badge.high {
      background: #f8d7da;
      color: #721c24;
    }

    .priority-badge.urgent {
      background: #dc3545;
      color: white;
    }

    .urgent-row {
      background: #fff3cd !important;
    }

    .expiring-soon {
      background: #fff3cd !important;
    }

    /* Action Buttons */
    .action-btn.renew {
      background: #28a745;
      color: white;
    }

    .action-btn.renew:hover {
      background: #218838;
    }

    .action-btn.resolve {
      background: #28a745;
      color: white;
    }

    .action-btn.resolve:hover {
      background: #218838;
    }

    .action-btn.plan {
      background: #17a2b8;
      color: white;
    }

    .action-btn.plan:hover {
      background: #138496;
    }

    /* Valuation Summary */
    .valuation-summary {
      display: flex;
      gap: 30px;
      margin-bottom: 30px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .valuation-summary .summary-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .valuation-summary .summary-item label {
      font-size: 14px;
      color: #7f8c8d;
      font-weight: 500;
    }

    .valuation-summary .summary-item span {
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .valuation-summary .summary-item .large-value {
      font-size: 28px;
      color: #27ae60;
    }

    /* Category Valuation Grid */
    .valuation-by-category {
      margin-bottom: 30px;
    }

    .valuation-by-category h3 {
      margin: 0 0 20px 0;
      font-size: 18px;
      color: #2c3e50;
    }

    .category-valuation-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .category-card {
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      transition: all 0.2s;
    }

    .category-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }

    .category-name {
      font-size: 14px;
      color: #7f8c8d;
      margin-bottom: 8px;
    }

    .category-value {
      font-size: 20px;
      font-weight: 600;
      color: #27ae60;
      margin-bottom: 4px;
    }

    .category-count {
      font-size: 12px;
      color: #95a5a6;
    }

    /* Low Stock Alerts */
    .low-stock-alerts {
      margin-bottom: 20px;
    }

    /* Action Buttons */
    .action-btn.approve {
      background: #28a745;
      color: white;
    }

    .action-btn.approve:hover {
      background: #218838;
    }

    .action-btn.restock {
      background: #17a2b8;
      color: white;
    }

    .action-btn.restock:hover {
      background: #138496;
    }

    .low-stock-text {
      color: #f39c12;
      font-weight: 600;
    }

    .out-of-stock-text {
      color: #e74c3c;
      font-weight: 600;
    }

    /* Purchase Order Items Section */
    .po-items-section {
      margin-top: 12px;
    }

    .po-item {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .po-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e9ecef;
    }

    .po-item-header strong {
      color: #2c3e50;
      font-size: 16px;
    }

    .btn-icon {
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 6px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-icon:hover {
      background: #c0392b;
    }

    .po-item-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .po-summary {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .summary-row:last-child {
      margin-bottom: 0;
      padding-top: 8px;
      border-top: 1px solid #e9ecef;
    }

    .summary-row label {
      font-size: 14px;
      color: #7f8c8d;
      font-weight: 500;
    }

    .summary-row span {
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .summary-row .total-amount {
      font-size: 20px;
      color: #27ae60;
    }
  `]
})
export class AssetManagementComponent implements OnInit {
  // Expose Math for use in templates
  Math = Math;

  activeTab: 'tracking' | 'maintenance' | 'inventory' = 'tracking';
  
  // Asset Tracking
  assets: Asset[] = [];
  assetSearchTerm: string = '';
  assetCategoryFilter: string = 'all';
  assetStatusFilter: string = 'all';
  showAddAsset: boolean = false;

  // Maintenance Scheduling
  maintenanceSchedules: MaintenanceSchedule[] = [];
  maintenanceStatusFilter: string = 'all';
  maintenanceTypeFilter: string = 'all';
  showScheduleMaintenance: boolean = false;

  // Inventory Management
  inventoryItems: InventoryItem[] = [];
  inventorySearchTerm: string = '';
  inventoryCategoryFilter: string = 'all';
  inventoryStatusFilter: string = 'all';
  showAddInventory: boolean = false;
  
  // Inventory Feature Modals
  showStockTracking: boolean = false;
  showLowStockAlerts: boolean = false;
  showPurchaseOrderCreation: boolean = false;
  showInventoryValuation: boolean = false;
  showAddInventoryItem: boolean = false;
  showCreatePurchaseOrder: boolean = false;

  // New Purchase Order Form Data
  newPurchaseOrder: Partial<PurchaseOrder> = {
    supplier: '',
    supplierContact: '',
    items: [],
    totalAmount: 0,
    status: 'pending',
    notes: '',
    createdBy: 'Current User'
  };

  newPurchaseOrderItems: PurchaseOrderItem[] = [{
    inventoryItemId: '',
    inventoryItemName: '',
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
    unit: ''
  }];
  newPOOrderDateString: string = '';
  newPOExpectedDeliveryDateString: string = '';

  // New Inventory Item Form Data
  newInventoryItem: Partial<InventoryItem> = {
    name: '',
    category: '',
    unit: '',
    currentStock: 0,
    minStock: 0,
    maxStock: 0,
    reorderLevel: 0,
    unitPrice: 0,
    supplier: '',
    location: '',
    description: '',
    sku: '',
    status: 'in-stock'
  };

  // Stock Tracking Filters
  stockTrackingSearchTerm: string = '';
  stockTrackingCategoryFilter: string = 'all';
  stockTrackingStatusFilter: string = 'all';
  
  // Low Stock Alerts Filter
  lowStockAlertFilter: string = 'all';
  
  // Purchase Order Filter
  purchaseOrderStatusFilter: string = 'all';
  
  // Valuation Filter
  valuationCategoryFilter: string = 'all';
  
  // Purchase Orders Data
  purchaseOrders: PurchaseOrder[] = [];

  // Settings
  showSettings: boolean = false;
  autoGenerateQR: boolean = true;
  sendMaintenanceReminders: boolean = true;
  lowStockAlerts: boolean = true;

  // Feature Modals
  showQRCodeManagement: boolean = false;
  showAssetRegistry: boolean = false;
  showLocationTracking: boolean = false;
  showPurchaseWarranty: boolean = false;
  showDepreciation: boolean = false;
  showInsuranceTracking: boolean = false;
  showLocationMap: boolean = false;
  
  // Maintenance Scheduling Modals
  showPreventiveMaintenance: boolean = false;
  showAMCReminders: boolean = false;
  showMaintenanceHistory: boolean = false;
  showVendorAssignment: boolean = false;
  showDowntimeTracking: boolean = false;
  showReplacementRecommendations: boolean = false;
  showAddPreventiveSchedule: boolean = false;
  showAddAMC: boolean = false;
  showAddVendor: boolean = false;
  showAddDowntime: boolean = false;

  // New Downtime Form Data
  newDowntime: Partial<DowntimeRecord> = {
    assetId: '',
    assetName: '',
    startDate: undefined,
    endDate: undefined,
    duration: undefined,
    reason: '',
    impact: 'medium',
    status: 'active',
    reportedBy: '',
    resolvedBy: undefined,
    resolutionNotes: '',
    costImpact: undefined,
    affectedServices: []
  };

  // Date strings for downtime form inputs (datetime-local requires YYYY-MM-DDTHH:mm format)
  newDowntimeStartDateString: string = '';
  newDowntimeEndDateString: string = '';
  newDowntimeAffectedServicesString: string = '';

  // New Vendor Form Data
  newVendor: Partial<ServiceVendor> = {
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    specialization: [],
    rating: undefined,
    totalServices: 0,
    averageCost: 0,
    responseTime: '',
    status: 'active',
    address: '',
    gstNumber: ''
  };

  // Available specializations
  availableSpecializations: string[] = ['HVAC', 'Electrical', 'Plumbing', 'Lift', 'Elevator', 'Generator', 'Water Pump', 'Fire Equipment', 'Security', 'Other'];

  // New AMC Form Data
  newAMC: Partial<AMCReminder> = {
    assetId: '',
    assetName: '',
    amcProvider: '',
    amcNumber: '',
    startDate: undefined,
    expiryDate: undefined,
    renewalDate: undefined,
    annualCost: 0,
    coverageType: 'comprehensive',
    status: 'active',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    autoRenewal: true
  };
  
  // Date strings for AMC form inputs
  newAMCStartDateString: string = '';
  newAMCExpiryDateString: string = '';
  newAMCRenewalDateString: string = '';

  // New Preventive Schedule Form Data
  newPreventiveSchedule: Partial<MaintenanceSchedule> = {
    assetId: '',
    assetName: '',
    maintenanceType: 'preventive',
    scheduledDate: undefined,
    dueDate: undefined,
    status: 'scheduled',
    assignedTo: '',
    vendorId: '',
    vendorName: '',
    cost: undefined,
    description: '',
    frequency: '',
    notes: ''
  };
  
  // Date strings for form inputs (HTML date inputs require YYYY-MM-DD format)
  newScheduleScheduledDateString: string = '';
  newScheduleDueDateString: string = '';

  // Filters for features
  qrSearchTerm: string = '';
  qrCategoryFilter: string = 'all';
  qrStatusFilter: string = 'all';
  registryCategory: string = 'all';
  locationBuildingFilter: string = 'all';
  selectedQRAsset: Asset | null = null;
  
  // Maintenance Scheduling Filters
  preventiveStatusFilter: string = 'all';
  preventiveAssetFilter: string = 'all';
  amcStatusFilter: string = 'all';
  historySearchTerm: string = '';
  historyAssetFilter: string = 'all';
  historyTypeFilter: string = 'all';
  vendorSearchTerm: string = '';
  vendorSpecializationFilter: string = 'all';
  downtimeStatusFilter: string = 'all';
  downtimeImpactFilter: string = 'all';
  replacementPriorityFilter: string = 'all';
  replacementRecommendationFilter: string = 'all';
  
  // Data arrays
  amcReminders: AMCReminder[] = [];
  maintenanceHistory: MaintenanceHistory[] = [];
  serviceVendors: ServiceVendor[] = [];
  downtimeRecords: DowntimeRecord[] = [];
  replacementRecommendations: ReplacementRecommendation[] = [];

  ngOnInit(): void {
    this.loadSampleData();
    // Initialize selectedForQR for all assets
    this.assets.forEach(a => {
      if (a.selectedForQR === undefined) {
        a.selectedForQR = false;
      }
    });
  }

  /**
   * Load sample data for demonstration
   */
  loadSampleData(): void {
    // Sample Assets with enhanced data
    this.assets = [
      {
        id: '1',
        name: 'Elevator - Building A',
        category: 'lift',
        location: 'Building A - Lobby',
        building: 'Building A',
        floor: 'Ground',
        room: 'Lobby',
        qrCode: 'AST-001',
        status: 'active',
        purchaseDate: new Date('2022-01-15'),
        purchaseCost: 1500000,
        currentValue: 1200000,
        vendor: 'Otis Elevator Co',
        vendorContact: '+91-9876543210',
        warrantyExpiry: new Date('2025-01-15'),
        warrantyDetails: '5 years comprehensive warranty',
        assignedTo: 'Maintenance Team',
        serialNumber: 'ELV-A-001',
        modelNumber: 'OTIS-3000',
        manufacturer: 'Otis',
        depreciationMethod: 'straight-line',
        usefulLife: 20,
        depreciationRate: 5,
        accumulatedDepreciation: 300000,
        insurancePolicyNumber: 'INS-ELV-001',
        insuranceProvider: 'HDFC Ergo',
        insurancePremium: 15000,
        insuranceExpiry: new Date('2024-12-31'),
        insuranceCoverage: 2000000,
        insuranceType: 'comprehensive'
      },
      {
        id: '2',
        name: 'Generator - Backup Power',
        category: 'generator',
        location: 'Building A - Basement',
        building: 'Building A',
        floor: 'Basement',
        room: 'Generator Room',
        qrCode: 'AST-002',
        status: 'active',
        purchaseDate: new Date('2021-06-10'),
        purchaseCost: 800000,
        currentValue: 600000,
        vendor: 'Cummins India',
        vendorContact: '+91-9876543211',
        warrantyExpiry: new Date('2024-06-10'),
        warrantyDetails: '3 years warranty on engine',
        assignedTo: 'Maintenance Team',
        serialNumber: 'GEN-A-001',
        modelNumber: 'CUM-500KVA',
        manufacturer: 'Cummins',
        depreciationMethod: 'straight-line',
        usefulLife: 15,
        depreciationRate: 6.67,
        accumulatedDepreciation: 200000,
        insurancePolicyNumber: 'INS-GEN-001',
        insuranceProvider: 'ICICI Lombard',
        insurancePremium: 12000,
        insuranceExpiry: new Date('2024-11-30'),
        insuranceCoverage: 1000000,
        insuranceType: 'comprehensive'
      },
      {
        id: '3',
        name: 'Water Pump - Main Supply',
        category: 'pump',
        location: 'Building A - Water Tank',
        building: 'Building A',
        floor: 'Ground',
        room: 'Pump Room',
        qrCode: 'AST-003',
        status: 'maintenance',
        purchaseDate: new Date('2022-11-12'),
        purchaseCost: 350000,
        currentValue: 280000,
        vendor: 'Kirloskar Brothers',
        vendorContact: '+91-9876543212',
        warrantyExpiry: new Date('2025-11-12'),
        warrantyDetails: '2 years warranty',
        assignedTo: 'Plumbing Team',
        serialNumber: 'WP-A-001',
        modelNumber: 'KB-50HP',
        manufacturer: 'Kirloskar',
        depreciationMethod: 'straight-line',
        usefulLife: 10,
        depreciationRate: 10,
        accumulatedDepreciation: 70000,
        insurancePolicyNumber: 'INS-PMP-001',
        insuranceProvider: 'Bajaj Allianz',
        insurancePremium: 5000,
        insuranceExpiry: new Date('2024-10-15'),
        insuranceCoverage: 400000,
        insuranceType: 'comprehensive'
      },
      {
        id: '4',
        name: 'HVAC System - Building A',
        category: 'hvac',
        location: 'Building A - Rooftop',
        building: 'Building A',
        floor: 'Rooftop',
        room: 'HVAC Room',
        qrCode: 'AST-004',
        status: 'active',
        purchaseDate: new Date('2023-03-20'),
        purchaseCost: 1200000,
        currentValue: 1000000,
        vendor: 'Carrier Aircon',
        vendorContact: '+91-9876543213',
        warrantyExpiry: new Date('2026-03-20'),
        warrantyDetails: '5 years warranty on compressor',
        assignedTo: 'HVAC Team',
        serialNumber: 'HVAC-A-001',
        modelNumber: 'CAR-30TR',
        manufacturer: 'Carrier',
        depreciationMethod: 'straight-line',
        usefulLife: 15,
        depreciationRate: 6.67,
        accumulatedDepreciation: 200000,
        insurancePolicyNumber: 'INS-HVAC-001',
        insuranceProvider: 'New India Assurance',
        insurancePremium: 18000,
        insuranceExpiry: new Date('2024-12-31'),
        insuranceCoverage: 1500000,
        insuranceType: 'comprehensive'
      },
      {
        id: '5',
        name: 'Fire Extinguisher System',
        category: 'fire-equipment',
        location: 'Building A - All Floors',
        building: 'Building A',
        floor: 'All',
        qrCode: 'AST-005',
        status: 'active',
        purchaseDate: new Date('2023-01-10'),
        purchaseCost: 250000,
        currentValue: 220000,
        vendor: 'Fire Safety Systems',
        vendorContact: '+91-9876543214',
        warrantyExpiry: new Date('2026-01-10'),
        warrantyDetails: '3 years warranty',
        assignedTo: 'Safety Team',
        serialNumber: 'FE-A-001',
        modelNumber: 'FSS-AUTO',
        manufacturer: 'Fire Safety Systems',
        depreciationMethod: 'straight-line',
        usefulLife: 10,
        depreciationRate: 10,
        accumulatedDepreciation: 30000,
        insurancePolicyNumber: 'INS-FE-001',
        insuranceProvider: 'HDFC Ergo',
        insurancePremium: 4000,
        insuranceExpiry: new Date('2024-09-30'),
        insuranceCoverage: 300000,
        insuranceType: 'liability'
      },
      {
        id: '6',
        name: 'Elevator - Building B',
        category: 'lift',
        location: 'Building B - Lobby',
        building: 'Building B',
        floor: 'Ground',
        room: 'Lobby',
        qrCode: 'AST-006',
        status: 'active',
        purchaseDate: new Date('2023-05-20'),
        purchaseCost: 1600000,
        currentValue: 1500000,
        vendor: 'Schindler India',
        vendorContact: '+91-9876543215',
        warrantyExpiry: new Date('2026-05-20'),
        warrantyDetails: '5 years comprehensive warranty',
        assignedTo: 'Maintenance Team',
        serialNumber: 'ELV-B-001',
        modelNumber: 'SCH-3500',
        manufacturer: 'Schindler',
        depreciationMethod: 'straight-line',
        usefulLife: 20,
        depreciationRate: 5,
        accumulatedDepreciation: 100000
      }
    ];

    // Sample Maintenance Schedules
    this.maintenanceSchedules = [
      {
        id: '1',
        assetId: '3',
        assetName: 'Generator Set',
        maintenanceType: 'preventive',
        scheduledDate: new Date('2024-01-15'),
        dueDate: new Date('2024-01-20'),
        status: 'scheduled',
        assignedTo: 'Maintenance Team',
        cost: 5000,
        description: 'Monthly preventive maintenance - oil change, filter replacement',
        frequency: 'Monthly',
        nextDueDate: new Date('2024-02-20')
      },
      {
        id: '2',
        assetId: '4',
        assetName: 'Security Camera System',
        maintenanceType: 'inspection',
        scheduledDate: new Date('2024-01-10'),
        dueDate: new Date('2024-01-12'),
        completedDate: new Date('2024-01-11'),
        status: 'completed',
        assignedTo: 'Security Team',
        cost: 2000,
        description: 'Quarterly inspection of all cameras and recording system',
        frequency: 'Quarterly'
      },
      {
        id: '3',
        assetId: '5',
        assetName: 'Water Pump',
        maintenanceType: 'corrective',
        scheduledDate: new Date('2024-01-05'),
        dueDate: new Date('2024-01-08'),
        status: 'overdue',
        assignedTo: 'Plumbing Team',
        cost: 8000,
        description: 'Repair leaking pump seal'
      },
      {
        id: '4',
        assetId: '2',
        assetName: 'Projector - Main Hall',
        maintenanceType: 'calibration',
        scheduledDate: new Date('2024-01-25'),
        dueDate: new Date('2024-01-30'),
        status: 'scheduled',
        assignedTo: 'Tech Support',
        description: 'Color calibration and lens cleaning',
        frequency: 'Annually'
      }
    ];

    // Sample Inventory Items
    this.inventoryItems = [
      {
        id: '1',
        name: 'Cleaning Detergent',
        category: 'Cleaning Supplies',
        unit: 'liters',
        currentStock: 45,
        minStock: 20,
        maxStock: 100,
        reorderLevel: 30,
        unitPrice: 250,
        supplier: 'CleanPro Supplies',
        location: 'Storage Room A',
        lastRestocked: new Date('2023-12-15'),
        status: 'in-stock'
      },
      {
        id: '2',
        name: 'LED Bulbs',
        category: 'Electrical',
        unit: 'pieces',
        currentStock: 12,
        minStock: 25,
        maxStock: 100,
        reorderLevel: 30,
        unitPrice: 150,
        supplier: 'Lighting Solutions',
        location: 'Electrical Store',
        lastRestocked: new Date('2023-11-20'),
        status: 'low-stock'
      },
      {
        id: '3',
        name: 'Pipe Fittings',
        category: 'Plumbing',
        unit: 'pieces',
        currentStock: 0,
        minStock: 50,
        maxStock: 200,
        reorderLevel: 75,
        unitPrice: 80,
        supplier: 'Plumbing Mart',
        location: 'Plumbing Store',
        lastRestocked: new Date('2023-10-10'),
        status: 'out-of-stock'
      },
      {
        id: '4',
        name: 'Printer Paper',
        category: 'Office Supplies',
        unit: 'reams',
        currentStock: 35,
        minStock: 20,
        maxStock: 80,
        reorderLevel: 30,
        unitPrice: 300,
        supplier: 'Office Depot',
        location: 'Office Store',
        lastRestocked: new Date('2024-01-05'),
        status: 'in-stock'
      },
      {
        id: '5',
        name: 'Paint - White',
        category: 'Maintenance Materials',
        unit: 'liters',
        currentStock: 8,
        minStock: 15,
        maxStock: 50,
        reorderLevel: 20,
        unitPrice: 450,
        supplier: 'Paint House',
        location: 'Maintenance Store',
        lastRestocked: new Date('2023-12-01'),
        status: 'low-stock'
      }
    ];

    // Sample AMC Reminders
    this.amcReminders = [
      {
        id: '1',
        assetId: '1',
        assetName: 'Elevator - Building A',
        amcProvider: 'Otis Elevator Co',
        amcNumber: 'AMC-ELV-001',
        startDate: new Date('2023-01-15'),
        expiryDate: new Date('2024-01-15'),
        renewalDate: new Date('2024-01-10'),
        annualCost: 120000,
        coverageType: 'comprehensive',
        status: 'expiring-soon',
        contactPerson: 'Rajesh Kumar',
        contactPhone: '+91-9876543210',
        contactEmail: 'rajesh@otis.com',
        autoRenewal: true,
        lastServiceDate: new Date('2023-12-15'),
        nextServiceDate: new Date('2024-02-15')
      },
      {
        id: '2',
        assetId: '2',
        assetName: 'Generator - Backup Power',
        amcProvider: 'Cummins Service',
        amcNumber: 'AMC-GEN-001',
        startDate: new Date('2023-06-10'),
        expiryDate: new Date('2024-06-10'),
        renewalDate: new Date('2024-06-05'),
        annualCost: 80000,
        coverageType: 'comprehensive',
        status: 'active',
        contactPerson: 'Vikram Singh',
        contactPhone: '+91-9876543211',
        autoRenewal: true,
        lastServiceDate: new Date('2023-12-20'),
        nextServiceDate: new Date('2024-01-20')
      },
      {
        id: '3',
        assetId: '3',
        assetName: 'HVAC System - Building A',
        amcProvider: 'Voltas Service',
        amcNumber: 'AMC-HVAC-001',
        startDate: new Date('2022-03-01'),
        expiryDate: new Date('2023-03-01'),
        renewalDate: new Date('2023-02-25'),
        annualCost: 150000,
        coverageType: 'comprehensive',
        status: 'expired',
        contactPerson: 'Amit Sharma',
        contactPhone: '+91-9876543212',
        autoRenewal: false
      }
    ];

    // Sample Maintenance History
    this.maintenanceHistory = [
      {
        id: '1',
        assetId: '2',
        assetName: 'Generator - Backup Power',
        maintenanceType: 'preventive',
        performedDate: new Date('2023-12-20'),
        completedDate: new Date('2023-12-20'),
        performedBy: 'Cummins Service Team',
        vendorId: 'vendor-1',
        vendorName: 'Cummins Service',
        cost: 15000,
        description: 'Monthly preventive maintenance - oil change, filter replacement, battery check',
        partsReplaced: ['Oil Filter', 'Air Filter'],
        partsCost: 5000,
        laborCost: 10000,
        laborHours: 4,
        notes: 'All systems functioning normally',
        beforeCondition: 'Good',
        afterCondition: 'Excellent',
        nextServiceDue: new Date('2024-01-20')
      },
      {
        id: '2',
        assetId: '4',
        assetName: 'Security Camera System',
        maintenanceType: 'inspection',
        performedDate: new Date('2024-01-11'),
        completedDate: new Date('2024-01-11'),
        performedBy: 'Security Team',
        cost: 2000,
        description: 'Quarterly inspection of all cameras and recording system',
        notes: 'All 24 cameras operational, storage at 60% capacity'
      },
      {
        id: '3',
        assetId: '5',
        assetName: 'Water Pump',
        maintenanceType: 'corrective',
        performedDate: new Date('2024-01-08'),
        completedDate: new Date('2024-01-08'),
        performedBy: 'Plumbing Team',
        vendorId: 'vendor-2',
        vendorName: 'Aqua Services',
        cost: 8000,
        description: 'Repair leaking pump seal',
        partsReplaced: ['Pump Seal', 'Gasket'],
        partsCost: 3000,
        laborCost: 5000,
        laborHours: 3,
        notes: 'Seal replaced, leak resolved'
      },
      {
        id: '4',
        assetId: '1',
        assetName: 'Elevator - Building A',
        maintenanceType: 'emergency',
        performedDate: new Date('2023-11-15'),
        completedDate: new Date('2023-11-15'),
        performedBy: 'Otis Service Team',
        vendorId: 'vendor-3',
        vendorName: 'Otis Elevator Co',
        cost: 25000,
        description: 'Emergency repair - door mechanism malfunction',
        partsReplaced: ['Door Motor', 'Control Board'],
        partsCost: 15000,
        laborCost: 10000,
        laborHours: 6,
        notes: 'Emergency resolved within 2 hours'
      }
    ];

    // Sample Service Vendors
    this.serviceVendors = [
      {
        id: 'vendor-1',
        name: 'Cummins Service',
        contactPerson: 'Vikram Singh',
        phone: '+91-9876543211',
        email: 'vikram@cummins.com',
        specialization: ['Generator', 'Electrical'],
        rating: 4.5,
        totalServices: 45,
        averageCost: 12000,
        responseTime: '24 hours',
        status: 'active',
        address: '123 Industrial Area, Mumbai',
        gstNumber: 'GST123456789'
      },
      {
        id: 'vendor-2',
        name: 'Aqua Services',
        contactPerson: 'Ramesh Patel',
        phone: '+91-9876543213',
        email: 'ramesh@aqua.com',
        specialization: ['Plumbing', 'Water Pump'],
        rating: 4.2,
        totalServices: 32,
        averageCost: 6000,
        responseTime: '12 hours',
        status: 'active',
        address: '456 Service Road, Mumbai',
        gstNumber: 'GST987654321'
      },
      {
        id: 'vendor-3',
        name: 'Otis Elevator Co',
        contactPerson: 'Rajesh Kumar',
        phone: '+91-9876543210',
        email: 'rajesh@otis.com',
        specialization: ['Lift', 'Elevator'],
        rating: 4.8,
        totalServices: 78,
        averageCost: 20000,
        responseTime: '4 hours',
        status: 'active',
        address: '789 Corporate Tower, Mumbai',
        gstNumber: 'GST456789123'
      },
      {
        id: 'vendor-4',
        name: 'Voltas Service',
        contactPerson: 'Amit Sharma',
        phone: '+91-9876543212',
        email: 'amit@voltas.com',
        specialization: ['HVAC', 'Air Conditioning'],
        rating: 4.3,
        totalServices: 56,
        averageCost: 15000,
        responseTime: '18 hours',
        status: 'active',
        address: '321 Tech Park, Mumbai',
        gstNumber: 'GST789123456'
      }
    ];

    // Sample Downtime Records
    this.downtimeRecords = [
      {
        id: '1',
        assetId: '5',
        assetName: 'Water Pump',
        startDate: new Date('2024-01-05'),
        endDate: new Date('2024-01-08'),
        duration: 72,
        reason: 'Pump seal failure causing water leak',
        impact: 'high',
        status: 'resolved',
        reportedBy: 'Maintenance Team',
        resolvedBy: 'Aqua Services',
        resolutionNotes: 'Seal replaced, system operational',
        costImpact: 15000,
        affectedServices: ['Water Supply', 'Building A']
      },
      {
        id: '2',
        assetId: '1',
        assetName: 'Elevator - Building A',
        startDate: new Date('2023-11-15'),
        endDate: new Date('2023-11-15'),
        duration: 2,
        reason: 'Door mechanism malfunction',
        impact: 'critical',
        status: 'resolved',
        reportedBy: 'Resident Complaint',
        resolvedBy: 'Otis Service Team',
        resolutionNotes: 'Emergency repair completed',
        costImpact: 25000,
        affectedServices: ['Building A Elevator']
      },
      {
        id: '3',
        assetId: '2',
        assetName: 'Generator - Backup Power',
        startDate: new Date('2024-01-20'),
        reason: 'Battery failure during power outage',
        impact: 'critical',
        status: 'active',
        reportedBy: 'Security Team',
        costImpact: 50000,
        affectedServices: ['Backup Power', 'Emergency Systems']
      }
    ];

    // Sample Replacement Recommendations
    this.replacementRecommendations = [
      {
        id: '1',
        assetId: '3',
        assetName: 'HVAC System - Building A',
        category: 'hvac',
        currentAge: 12,
        usefulLife: 15,
        condition: 'poor',
        recommendation: 'urgent-replacement',
        estimatedReplacementCost: 800000,
        estimatedReplacementDate: new Date('2024-06-01'),
        reason: 'Frequent breakdowns, high maintenance costs, energy inefficient',
        priority: 'urgent',
        lastMaintenanceDate: new Date('2023-12-01'),
        maintenanceFrequency: 'Monthly',
        costSavings: 120000
      },
      {
        id: '2',
        assetId: '4',
        assetName: 'Security Camera System',
        category: 'security',
        currentAge: 8,
        usefulLife: 10,
        condition: 'fair',
        recommendation: 'plan-replacement',
        estimatedReplacementCost: 300000,
        estimatedReplacementDate: new Date('2025-01-01'),
        reason: 'Outdated technology, limited storage capacity',
        priority: 'medium',
        lastMaintenanceDate: new Date('2024-01-11'),
        maintenanceFrequency: 'Quarterly'
      },
      {
        id: '3',
        assetId: '5',
        assetName: 'Water Pump',
        category: 'pump',
        currentAge: 6,
        usefulLife: 10,
        condition: 'good',
        recommendation: 'monitor',
        estimatedReplacementCost: 150000,
        reason: 'Recent repairs completed, monitor performance',
        priority: 'low',
        lastMaintenanceDate: new Date('2024-01-08'),
        maintenanceFrequency: 'As needed'
      },
      {
        id: '4',
        assetId: '2',
        assetName: 'Generator - Backup Power',
        category: 'generator',
        currentAge: 3,
        usefulLife: 15,
        condition: 'excellent',
        recommendation: 'continue-use',
        estimatedReplacementCost: 800000,
        reason: 'Well maintained, performing optimally',
        priority: 'low',
        lastMaintenanceDate: new Date('2023-12-20'),
        maintenanceFrequency: 'Monthly'
      }
    ];

    // Sample Purchase Orders
    this.purchaseOrders = [
      {
        id: 'po-1',
        orderNumber: 'PO-2024-001',
        orderDate: new Date('2024-01-10'),
        supplier: 'CleanPro Supplies',
        supplierContact: '+91-9876543216',
        items: [
          {
            inventoryItemId: '1',
            inventoryItemName: 'Cleaning Detergent',
            quantity: 50,
            unitPrice: 250,
            totalPrice: 12500,
            unit: 'liters'
          }
        ],
        totalAmount: 12500,
        status: 'ordered',
        expectedDeliveryDate: new Date('2024-01-20'),
        createdBy: 'Admin User',
        notes: 'Monthly restocking order'
      },
      {
        id: 'po-2',
        orderNumber: 'PO-2024-002',
        orderDate: new Date('2024-01-15'),
        supplier: 'Plumbing Mart',
        supplierContact: '+91-9876543217',
        items: [
          {
            inventoryItemId: '3',
            inventoryItemName: 'Pipe Fittings',
            quantity: 100,
            unitPrice: 80,
            totalPrice: 8000,
            unit: 'pieces'
          }
        ],
        totalAmount: 8000,
        status: 'pending',
        createdBy: 'Admin User'
      },
      {
        id: 'po-3',
        orderNumber: 'PO-2024-003',
        orderDate: new Date('2024-01-05'),
        supplier: 'Paint House',
        supplierContact: '+91-9876543218',
        items: [
          {
            inventoryItemId: '5',
            inventoryItemName: 'Paint - White',
            quantity: 20,
            unitPrice: 450,
            totalPrice: 9000,
            unit: 'liters'
          }
        ],
        totalAmount: 9000,
        status: 'approved',
        expectedDeliveryDate: new Date('2024-01-25'),
        createdBy: 'Admin User',
        approvedBy: 'Manager'
      }
    ];
  }

  /**
   * Get filtered assets based on search and filters (for backward compatibility)
   */
  get filteredAssets(): Asset[] {
    return this.assets;
  }

  /**
   * Get filtered maintenance schedules
   */
  get filteredMaintenance(): MaintenanceSchedule[] {
    return this.maintenanceSchedules.filter(m => {
      const matchesStatus = this.maintenanceStatusFilter === 'all' || m.status === this.maintenanceStatusFilter;
      const matchesType = this.maintenanceTypeFilter === 'all' || m.maintenanceType === this.maintenanceTypeFilter;
      return matchesStatus && matchesType;
    });
  }

  /**
   * Get filtered inventory items
   */
  get filteredInventory(): InventoryItem[] {
    return this.inventoryItems.filter(item => {
      const matchesSearch = !this.inventorySearchTerm || 
        item.name.toLowerCase().includes(this.inventorySearchTerm.toLowerCase());
      const matchesCategory = this.inventoryCategoryFilter === 'all' || item.category.toLowerCase() === this.inventoryCategoryFilter;
      const matchesStatus = this.inventoryStatusFilter === 'all' || item.status === this.inventoryStatusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }

  /**
   * Get count of active assets
   */
  getActiveAssetsCount(): number {
    return this.assets.filter(a => a.status === 'active').length;
  }

  /**
   * Get count of assets under maintenance
   */
  getMaintenanceAssetsCount(): number {
    return this.assets.filter(a => a.status === 'maintenance').length;
  }

  /**
   * Get total asset value
   */
  getTotalAssetValue(): number {
    return this.assets.reduce((sum, asset) => sum + asset.currentValue, 0);
  }

  /**
   * Get count of scheduled maintenance
   */
  getScheduledMaintenanceCount(): number {
    return this.maintenanceSchedules.filter(m => m.status === 'scheduled').length;
  }

  /**
   * Get count of overdue maintenance
   */
  getOverdueMaintenanceCount(): number {
    return this.maintenanceSchedules.filter(m => m.status === 'overdue').length;
  }

  /**
   * Get count of completed maintenance this month
   */
  getCompletedThisMonthCount(): number {
    const now = new Date();
    return this.maintenanceSchedules.filter(m => {
      if (m.status !== 'completed' || !m.completedDate) return false;
      const completed = new Date(m.completedDate);
      return completed.getMonth() === now.getMonth() && completed.getFullYear() === now.getFullYear();
    }).length;
  }

  /**
   * Get total maintenance cost
   */
  getTotalMaintenanceCost(): number {
    return this.maintenanceSchedules
      .filter(m => m.cost)
      .reduce((sum, m) => sum + (m.cost || 0), 0);
  }

  /**
   * Get count of low stock items
   */
  getLowStockCount(): number {
    return this.inventoryItems.filter(item => item.status === 'low-stock').length;
  }

  /**
   * Get count of out of stock items
   */
  getOutOfStockCount(): number {
    return this.inventoryItems.filter(item => item.status === 'out-of-stock').length;
  }

  /**
   * Get total inventory value
   */
  getTotalInventoryValue(): number {
    return this.inventoryItems.reduce((sum, item) => sum + (item.currentStock * item.unitPrice), 0);
  }

  // ========== Inventory Management Methods ==========

  /**
   * Open Stock Tracking modal
   */
  openStockTracking(): void {
    this.showStockTracking = true;
  }

  /**
   * Get filtered stock tracking items
   */
  getFilteredStockTracking(): InventoryItem[] {
    return this.inventoryItems.filter(item => {
      const matchesSearch = !this.stockTrackingSearchTerm || 
        item.name.toLowerCase().includes(this.stockTrackingSearchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(this.stockTrackingSearchTerm.toLowerCase()));
      const matchesCategory = this.stockTrackingCategoryFilter === 'all' || item.category === this.stockTrackingCategoryFilter;
      const matchesStatus = this.stockTrackingStatusFilter === 'all' || item.status === this.stockTrackingStatusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }

  /**
   * Get total inventory items count
   */
  getTotalInventoryItems(): number {
    return this.inventoryItems.length;
  }

  /**
   * View inventory item
   */
  viewInventoryItem(item: InventoryItem): void {
    alert(`Inventory Item Details:\nName: ${item.name}\nCategory: ${item.category}\nCurrent Stock: ${item.currentStock} ${item.unit}\nMin Stock: ${item.minStock} ${item.unit}\nMax Stock: ${item.maxStock} ${item.unit}\nReorder Level: ${item.reorderLevel} ${item.unit}\nUnit Price: ${this.formatCurrency(item.unitPrice)}\nTotal Value: ${this.formatCurrency(item.currentStock * item.unitPrice)}\nStatus: ${this.getInventoryStatusLabel(item.status)}\nLocation: ${item.location || 'N/A'}\nSupplier: ${item.supplier || 'N/A'}`);
  }

  /**
   * Edit inventory item
   */
  editInventoryItem(item: InventoryItem): void {
    alert(`Editing inventory item: ${item.name}`);
  }

  /**
   * Restock inventory item
   */
  restockInventoryItem(item: InventoryItem): void {
    alert(`Restocking inventory item: ${item.name}`);
  }

  /**
   * Save new inventory item
   */
  saveInventoryItem(): void {
    // Validate required fields
    if (!this.newInventoryItem.name || 
        !this.newInventoryItem.category || 
        !this.newInventoryItem.unit || 
        this.newInventoryItem.currentStock === undefined || 
        this.newInventoryItem.minStock === undefined || 
        this.newInventoryItem.maxStock === undefined || 
        this.newInventoryItem.reorderLevel === undefined || 
        !this.newInventoryItem.unitPrice) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate stock levels
    if (this.newInventoryItem.minStock! >= this.newInventoryItem.maxStock!) {
      alert('Min stock must be less than max stock');
      return;
    }

    if (this.newInventoryItem.reorderLevel! < this.newInventoryItem.minStock! || 
        this.newInventoryItem.reorderLevel! > this.newInventoryItem.maxStock!) {
      alert('Reorder level should be between min stock and max stock');
      return;
    }

    if (this.newInventoryItem.currentStock! < 0) {
      alert('Current stock cannot be negative');
      return;
    }

    // Determine status based on stock levels
    let status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'ordered' = 'in-stock';
    if (this.newInventoryItem.currentStock === 0) {
      status = 'out-of-stock';
    } else if (this.newInventoryItem.currentStock! <= this.newInventoryItem.reorderLevel!) {
      status = 'low-stock';
    }

    // Create new inventory item
    const newItem: InventoryItem = {
      id: 'INV-' + Date.now().toString(),
      name: this.newInventoryItem.name!,
      category: this.newInventoryItem.category!,
      unit: this.newInventoryItem.unit!,
      currentStock: this.newInventoryItem.currentStock!,
      minStock: this.newInventoryItem.minStock!,
      maxStock: this.newInventoryItem.maxStock!,
      reorderLevel: this.newInventoryItem.reorderLevel!,
      unitPrice: this.newInventoryItem.unitPrice!,
      supplier: this.newInventoryItem.supplier || undefined,
      location: this.newInventoryItem.location || undefined,
      description: this.newInventoryItem.description || undefined,
      sku: this.newInventoryItem.sku || undefined,
      status: status,
      lastRestocked: this.newInventoryItem.currentStock! > 0 ? new Date() : undefined
    };

    // Add to inventory items array
    this.inventoryItems.push(newItem);

    // Reset form
    this.resetInventoryItemForm();

    // Close modal
    this.showAddInventoryItem = false;

    // Show success message
    alert(`Inventory item "${newItem.name}" added successfully`);
  }

  /**
   * Cancel adding new inventory item
   */
  cancelAddInventoryItem(): void {
    this.resetInventoryItemForm();
    this.showAddInventoryItem = false;
  }

  /**
   * Reset inventory item form
   */
  resetInventoryItemForm(): void {
    this.newInventoryItem = {
      name: '',
      category: '',
      unit: '',
      currentStock: 0,
      minStock: 0,
      maxStock: 0,
      reorderLevel: 0,
      unitPrice: 0,
      supplier: '',
      location: '',
      description: '',
      sku: '',
      status: 'in-stock'
    };
  }

  /**
   * Open Low Stock Alerts modal
   */
  openLowStockAlerts(): void {
    this.showLowStockAlerts = true;
  }

  /**
   * Get low stock items
   */
  getLowStockItems(): InventoryItem[] {
    return this.inventoryItems.filter(item => item.status === 'low-stock');
  }

  /**
   * Get out of stock items
   */
  getOutOfStockItems(): InventoryItem[] {
    return this.inventoryItems.filter(item => item.status === 'out-of-stock');
  }

  /**
   * Get filtered low stock alerts
   */
  getFilteredLowStockAlerts(): InventoryItem[] {
    const items = this.inventoryItems.filter(item => 
      item.status === 'low-stock' || item.status === 'out-of-stock'
    );
    
    if (this.lowStockAlertFilter === 'all') {
      return items;
    } else if (this.lowStockAlertFilter === 'out-of-stock') {
      return items.filter(item => item.status === 'out-of-stock');
    } else {
      return items.filter(item => item.status === 'low-stock');
    }
  }

  /**
   * Get required quantity for restocking
   */
  getRequiredQuantity(item: InventoryItem): number {
    if (item.status === 'out-of-stock') {
      return item.reorderLevel;
    } else {
      return Math.max(0, item.reorderLevel - item.currentStock);
    }
  }

  /**
   * Create purchase order from alerts
   */
  createPOFromAlerts(): void {
    const items = this.getFilteredLowStockAlerts();
    if (items.length === 0) {
      alert('No items selected for purchase order');
      return;
    }
    
    // Pre-fill purchase order items from low stock alerts
    this.newPurchaseOrderItems = items.map(item => {
      const requiredQty = this.getRequiredQuantity(item);
      return {
        inventoryItemId: item.id,
        inventoryItemName: item.name,
        quantity: requiredQty,
        unitPrice: item.unitPrice,
        totalPrice: requiredQty * item.unitPrice,
        unit: item.unit
      };
    });
    
    // Set default order date to today
    const today = new Date();
    this.newPOOrderDateString = today.toISOString().split('T')[0];
    
    // Open the create purchase order modal
    this.showCreatePurchaseOrder = true;
  }

  /**
   * Add new item to purchase order
   */
  addPOItem(): void {
    this.newPurchaseOrderItems.push({
      inventoryItemId: '',
      inventoryItemName: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      unit: ''
    });
  }

  /**
   * Remove item from purchase order
   */
  removePOItem(index: number): void {
    this.newPurchaseOrderItems.splice(index, 1);
  }

  /**
   * Handle item selection in purchase order
   */
  onPOItemSelected(index: number): void {
    const item = this.newPurchaseOrderItems[index];
    if (item.inventoryItemId) {
      const inventoryItem = this.inventoryItems.find(inv => inv.id === item.inventoryItemId);
      if (inventoryItem) {
        item.inventoryItemName = inventoryItem.name;
        item.unit = inventoryItem.unit;
        // Pre-fill with current unit price, user can modify
        if (item.unitPrice === 0) {
          item.unitPrice = inventoryItem.unitPrice;
        }
        // Pre-fill with required quantity if from low stock
        if (item.quantity === 0 || item.quantity === 1) {
          const requiredQty = this.getRequiredQuantity(inventoryItem);
          if (requiredQty > 0) {
            item.quantity = requiredQty;
          }
        }
        this.calculatePOItemTotal(index);
      }
    }
  }

  /**
   * Calculate total for a purchase order item
   */
  calculatePOItemTotal(index: number): void {
    const item = this.newPurchaseOrderItems[index];
    item.totalPrice = item.quantity * item.unitPrice;
  }

  /**
   * Calculate total amount for purchase order
   */
  calculatePOTotal(): number {
    return this.newPurchaseOrderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  /**
   * Save purchase order
   */
  savePurchaseOrder(): void {
    // Validate required fields
    if (!this.newPurchaseOrder.supplier || 
        !this.newPOOrderDateString || 
        !this.newPurchaseOrderItems || 
        this.newPurchaseOrderItems.length === 0) {
      alert('Please fill in all required fields and add at least one item');
      return;
    }

    // Validate items
    for (let i = 0; i < this.newPurchaseOrderItems.length; i++) {
      const item = this.newPurchaseOrderItems[i];
      if (!item.inventoryItemId || !item.quantity || !item.unitPrice) {
        alert(`Please complete all fields for item ${i + 1}`);
        return;
      }
      if (item.quantity <= 0) {
        alert(`Quantity must be greater than 0 for item ${i + 1}`);
        return;
      }
      if (item.unitPrice <= 0) {
        alert(`Unit price must be greater than 0 for item ${i + 1}`);
        return;
      }
    }

    // Generate order number
    const orderNumber = 'PO-' + new Date().getFullYear() + '-' + 
      String(this.purchaseOrders.length + 1).padStart(3, '0');

    // Create purchase order
    const newPO: PurchaseOrder = {
      id: 'po-' + Date.now().toString(),
      orderNumber: orderNumber,
      orderDate: new Date(this.newPOOrderDateString),
      supplier: this.newPurchaseOrder.supplier!,
      supplierContact: this.newPurchaseOrder.supplierContact || undefined,
      items: this.newPurchaseOrderItems.map(item => ({
        ...item,
        inventoryItemName: item.inventoryItemName || this.inventoryItems.find(inv => inv.id === item.inventoryItemId)?.name || 'Unknown'
      })),
      totalAmount: this.calculatePOTotal(),
      status: 'pending',
      expectedDeliveryDate: this.newPOExpectedDeliveryDateString ? new Date(this.newPOExpectedDeliveryDateString) : undefined,
      notes: this.newPurchaseOrder.notes || undefined,
      createdBy: 'Current User' // In real app, get from auth service
    };

    // Add to purchase orders array
    this.purchaseOrders.push(newPO);

    // Reset form
    this.resetPurchaseOrderForm();

    // Close modal
    this.showCreatePurchaseOrder = false;

    // Show success message
    alert(`Purchase order ${orderNumber} created successfully`);
  }

  /**
   * Save purchase order as draft
   */
  savePurchaseOrderAsDraft(): void {
    // Validate at least supplier is provided
    if (!this.newPurchaseOrder.supplier) {
      alert('Please enter supplier name');
      return;
    }

    // Generate order number
    const orderNumber = 'PO-' + new Date().getFullYear() + '-' + 
      String(this.purchaseOrders.length + 1).padStart(3, '0');

    // Create draft purchase order
    const newPO: PurchaseOrder = {
      id: 'po-' + Date.now().toString(),
      orderNumber: orderNumber,
      orderDate: this.newPOOrderDateString ? new Date(this.newPOOrderDateString) : new Date(),
      supplier: this.newPurchaseOrder.supplier!,
      supplierContact: this.newPurchaseOrder.supplierContact || undefined,
      items: this.newPurchaseOrderItems.filter(item => item.inventoryItemId).map(item => ({
        ...item,
        inventoryItemName: item.inventoryItemName || this.inventoryItems.find(inv => inv.id === item.inventoryItemId)?.name || 'Unknown'
      })),
      totalAmount: this.calculatePOTotal(),
      status: 'draft',
      expectedDeliveryDate: this.newPOExpectedDeliveryDateString ? new Date(this.newPOExpectedDeliveryDateString) : undefined,
      notes: this.newPurchaseOrder.notes || undefined,
      createdBy: 'Current User'
    };

    // Add to purchase orders array
    this.purchaseOrders.push(newPO);

    // Reset form
    this.resetPurchaseOrderForm();

    // Close modal
    this.showCreatePurchaseOrder = false;

    // Show success message
    alert(`Purchase order ${orderNumber} saved as draft`);
  }

  /**
   * Cancel creating purchase order
   */
  cancelCreatePurchaseOrder(): void {
    this.resetPurchaseOrderForm();
    this.showCreatePurchaseOrder = false;
  }

  /**
   * Reset purchase order form
   */
  resetPurchaseOrderForm(): void {
    this.newPurchaseOrder = {
      supplier: '',
      supplierContact: '',
      items: [],
      totalAmount: 0,
      status: 'pending',
      notes: '',
      createdBy: 'Current User'
    };
    this.newPurchaseOrderItems = [{
      inventoryItemId: '',
      inventoryItemName: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      unit: ''
    }];
    this.newPOOrderDateString = '';
    this.newPOExpectedDeliveryDateString = '';
  }

  /**
   * Open Purchase Order Creation modal
   */
  openPurchaseOrderCreation(): void {
    this.showPurchaseOrderCreation = true;
  }

  /**
   * Get purchase orders count
   */
  getPurchaseOrdersCount(): number {
    return this.purchaseOrders.length;
  }

  /**
   * Get pending purchase orders count
   */
  getPendingPOCount(): number {
    return this.purchaseOrders.filter(po => po.status === 'pending' || po.status === 'draft').length;
  }

  /**
   * Get filtered purchase orders
   */
  getFilteredPurchaseOrders(): PurchaseOrder[] {
    if (this.purchaseOrderStatusFilter === 'all') {
      return this.purchaseOrders;
    }
    return this.purchaseOrders.filter(po => po.status === this.purchaseOrderStatusFilter);
  }

  /**
   * Get PO status label
   */
  getPOStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'draft': 'Draft',
      'pending': 'Pending',
      'approved': 'Approved',
      'ordered': 'Ordered',
      'received': 'Received',
      'cancelled': 'Cancelled'
    };
    return labels[status] || status;
  }

  /**
   * View purchase order
   */
  viewPurchaseOrder(po: PurchaseOrder): void {
    alert(`Purchase Order Details:\nOrder Number: ${po.orderNumber}\nSupplier: ${po.supplier}\nOrder Date: ${this.formatDate(po.orderDate)}\nItems: ${po.items.length}\nTotal Amount: ${this.formatCurrency(po.totalAmount)}\nStatus: ${this.getPOStatusLabel(po.status)}\nExpected Delivery: ${po.expectedDeliveryDate ? this.formatDate(po.expectedDeliveryDate) : 'N/A'}`);
  }

  /**
   * Edit purchase order
   */
  editPurchaseOrder(po: PurchaseOrder): void {
    alert(`Editing purchase order: ${po.orderNumber}`);
  }

  /**
   * Approve purchase order
   */
  approvePurchaseOrder(po: PurchaseOrder): void {
    po.status = 'approved';
    po.approvedBy = 'Current User'; // In real app, get from auth service
    alert(`Purchase order ${po.orderNumber} approved successfully`);
  }

  /**
   * Open Inventory Valuation modal
   */
  openInventoryValuation(): void {
    this.showInventoryValuation = true;
  }

  /**
   * Get average item value
   */
  getAverageItemValue(): number {
    if (this.inventoryItems.length === 0) return 0;
    return this.getTotalInventoryValue() / this.inventoryItems.length;
  }

  /**
   * Get inventory categories
   */
  getInventoryCategories(): string[] {
    const categories = this.inventoryItems.map(item => item.category);
    return [...new Set(categories)];
  }

  /**
   * Get inventory categories count
   */
  getInventoryCategoriesCount(): number {
    return this.getInventoryCategories().length;
  }

  /**
   * Get category valuations
   */
  getCategoryValuations(): any[] {
    const categories = this.getInventoryCategories();
    return categories.map(category => {
      const items = this.inventoryItems.filter(item => item.category === category);
      const value = items.reduce((sum, item) => sum + (item.currentStock * item.unitPrice), 0);
      return {
        name: category,
        value: value,
        count: items.length
      };
    }).sort((a, b) => b.value - a.value);
  }

  /**
   * Get filtered valuation items
   */
  getFilteredValuationItems(): InventoryItem[] {
    if (this.valuationCategoryFilter === 'all') {
      return this.inventoryItems;
    }
    return this.inventoryItems.filter(item => item.category === this.valuationCategoryFilter);
  }

  /**
   * Get item value percentage of total
   */
  getItemValuePercentage(item: InventoryItem): string {
    const totalValue = this.getTotalInventoryValue();
    if (totalValue === 0) return '0.00';
    const itemValue = item.currentStock * item.unitPrice;
    return ((itemValue / totalValue) * 100).toFixed(2);
  }

  /**
   * Export valuation report
   */
  exportValuationReport(): void {
    alert('Exporting inventory valuation report...');
  }

  /**
   * Check if maintenance is overdue
   */
  isOverdue(dueDate: Date): boolean {
    return new Date(dueDate) < new Date();
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'active': 'Active',
      'maintenance': 'Maintenance',
      'retired': 'Retired',
      'disposed': 'Disposed',
      'scheduled': 'Scheduled',
      'in-progress': 'In Progress',
      'completed': 'Completed',
      'overdue': 'Overdue',
      'cancelled': 'Cancelled',
      'in-stock': 'In Stock',
      'low-stock': 'Low Stock',
      'out-of-stock': 'Out of Stock',
      'ordered': 'Ordered'
    };
    return labels[status] || status;
  }

  /**
   * Get maintenance type label
   */
  getMaintenanceTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'preventive': 'Preventive',
      'corrective': 'Corrective',
      'inspection': 'Inspection',
      'calibration': 'Calibration'
    };
    return labels[type] || type;
  }

  /**
   * Get maintenance status label
   */
  getMaintenanceStatusLabel(status: string): string {
    return this.getStatusLabel(status);
  }

  /**
   * Get inventory status label
   */
  getInventoryStatusLabel(status: string): string {
    return this.getStatusLabel(status);
  }

  /**
   * Navigate back to previous page
   */
  goBack(): void {
    window.history.back();
  }

  /**
   * View asset details
   */
  viewAsset(asset: Asset): void {
    alert(`Viewing asset: ${asset.name}\nQR Code: ${asset.qrCode}\nStatus: ${this.getStatusLabel(asset.status)}`);
  }

  /**
   * Edit asset
   */
  editAsset(asset: Asset): void {
    alert(`Editing asset: ${asset.name}`);
  }

  /**
   * View maintenance details
   */
  viewMaintenance(maintenance: MaintenanceSchedule): void {
    alert(`Viewing maintenance: ${maintenance.assetName}\nType: ${this.getMaintenanceTypeLabel(maintenance.maintenanceType)}\nStatus: ${this.getMaintenanceStatusLabel(maintenance.status)}`);
  }

  /**
   * Edit maintenance schedule
   */
  editMaintenance(maintenance: MaintenanceSchedule): void {
    alert(`Editing maintenance schedule for: ${maintenance.assetName}`);
  }

  /**
   * Mark maintenance as complete
   */
  completeMaintenance(maintenance: MaintenanceSchedule): void {
    maintenance.status = 'completed';
    maintenance.completedDate = new Date();
    alert(`Maintenance marked as completed: ${maintenance.assetName}`);
  }

  /**
   * View inventory item
   */
  viewInventory(item: InventoryItem): void {
    alert(`Viewing inventory: ${item.name}\nStock: ${item.currentStock} ${item.unit}\nStatus: ${this.getInventoryStatusLabel(item.status)}`);
  }

  /**
   * Edit inventory item
   */
  editInventory(item: InventoryItem): void {
    alert(`Editing inventory item: ${item.name}`);
  }

  /**
   * Restock inventory item
   */
  restockInventory(item: InventoryItem): void {
    alert(`Restocking: ${item.name}\nCurrent Stock: ${item.currentStock} ${item.unit}\nReorder Level: ${item.reorderLevel} ${item.unit}`);
  }

  /**
   * Export report
   */
  exportReport(): void {
    alert('Export functionality will be implemented soon');
  }

  /**
   * Save settings
   */
  saveSettings(): void {
    // Save settings to localStorage or backend
    localStorage.setItem('assetManagementSettings', JSON.stringify({
      autoGenerateQR: this.autoGenerateQR,
      sendMaintenanceReminders: this.sendMaintenanceReminders,
      lowStockAlerts: this.lowStockAlerts
    }));
    this.showSettings = false;
    alert('Settings saved successfully');
  }

  /**
   * Open QR code management modal safely
   */
  openQRCodeManagement(): void {
    try {
      // Ensure assets are loaded
      if (!this.assets || this.assets.length === 0) {
        this.loadSampleData();
      }
      
      // Initialize selectedForQR for all assets
      this.assets.forEach(a => {
        if (a && a.selectedForQR === undefined) {
          a.selectedForQR = false;
        }
      });
      
      // Open the modal
      this.showQRCodeManagement = true;
    } catch (error) {
      console.error('Error opening QR code management:', error);
      alert('Error opening QR code management. Please try again.');
    }
  }

  /**
   * Get count of assets with QR codes
   */
  getQRCodeCount(): number {
    try {
      return this.assets ? this.assets.filter(a => a && a.qrCode).length : 0;
    } catch (error) {
      console.error('Error getting QR code count:', error);
      return 0;
    }
  }

  /**
   * Get assets for QR code management
   */
  getAssetsForQR(): Asset[] {
    try {
      if (!this.assets || this.assets.length === 0) {
        return [];
      }
      // Ensure selectedForQR is initialized for all assets
      this.assets.forEach(a => {
        if (a && a.selectedForQR === undefined) {
          a.selectedForQR = false;
        }
      });
      return this.assets;
    } catch (error) {
      console.error('Error getting assets for QR:', error);
      return [];
    }
  }

  /**
   * Get filtered assets for QR code management
   */
  getFilteredAssetsForQR(): Asset[] {
    try {
      if (!this.assets || this.assets.length === 0) {
        return [];
      }
      
      let filtered = [...this.assets]; // Create a shallow copy to avoid mutation issues
      
      // Search filter
      if (this.qrSearchTerm) {
        const searchTerm = this.qrSearchTerm.toLowerCase();
        filtered = filtered.filter(a => 
          a && (
            (a.name && a.name.toLowerCase().includes(searchTerm)) ||
            (a.qrCode && a.qrCode.toLowerCase().includes(searchTerm)) ||
            (a.serialNumber && a.serialNumber.toLowerCase().includes(searchTerm))
          )
        );
      }
      
      // Category filter
      if (this.qrCategoryFilter && this.qrCategoryFilter !== 'all') {
        filtered = filtered.filter(a => a && a.category === this.qrCategoryFilter);
      }
      
      // Status filter
      if (this.qrStatusFilter === 'generated') {
        filtered = filtered.filter(a => a && a.qrCode && a.qrCodeImage);
      } else if (this.qrStatusFilter === 'pending') {
        filtered = filtered.filter(a => a && (!a.qrCode || !a.qrCodeImage));
      }
      
      // Ensure selectedForQR is initialized
      filtered.forEach(a => {
        if (a && a.selectedForQR === undefined) {
          a.selectedForQR = false;
        }
      });
      
      return filtered;
    } catch (error) {
      console.error('Error filtering assets for QR:', error);
      return [];
    }
  }

  /**
   * Select all assets for QR generation
   */
  selectAllForQR(): void {
    const filteredIds = this.getFilteredAssetsForQR().map(a => a.id);
    this.assets.forEach(asset => {
      if (filteredIds.includes(asset.id)) {
        asset.selectedForQR = true;
      }
    });
  }

  /**
   * Deselect all assets
   */
  deselectAllForQR(): void {
    this.assets.forEach(asset => {
      asset.selectedForQR = false;
    });
  }

  /**
   * Check if all assets are selected
   */
  areAllSelected(): boolean {
    const filtered = this.getFilteredAssetsForQR();
    if (filtered.length === 0) return false;
    return filtered.every(a => a.selectedForQR === true);
  }

  /**
   * Toggle select all
   */
  toggleSelectAll(event: any): void {
    if (event.target.checked) {
      this.selectAllForQR();
    } else {
      this.deselectAllForQR();
    }
  }

  /**
   * Get count of selected assets
   */
  getSelectedAssetsCount(): number {
    try {
      return this.getFilteredAssetsForQR().filter(a => a && a.selectedForQR === true).length;
    } catch (error) {
      console.error('Error getting selected assets count:', error);
      return 0;
    }
  }

  /**
   * Generate QR code for asset
   */
  generateQRCode(asset: Asset): void {
    try {
      // Find the asset in the array
      const index = this.assets.findIndex(a => a.id === asset.id);
      if (index === -1) {
        console.error('Asset not found:', asset.id);
        return;
      }
      
      // Generate unique QR code if not exists
      if (!this.assets[index].qrCode) {
        const idStr = String(this.assets[index].id);
        const paddedId = idStr.length < 4 ? '0'.repeat(4 - idStr.length) + idStr : idStr;
        this.assets[index].qrCode = `AST-${paddedId}`;
      }
      
      // Generate QR code image using SVG
      this.assets[index].qrCodeImage = this.generateQRCodeSVG(this.assets[index]);
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Error generating QR code. Please try again.');
    }
  }

  /**
   * Generate QR code SVG image
   */
  generateQRCodeSVG(asset: Asset): string {
    try {
      // Create QR code data string with asset information
      const qrData = JSON.stringify({
        id: asset.id || '',
        code: asset.qrCode || '',
        name: asset.name || '',
        category: asset.category || '',
        location: asset.location || '',
        serialNumber: asset.serialNumber || '',
        timestamp: new Date().toISOString()
      });
      
      // Generate a simple pattern-based QR code representation
      // In production, use a library like 'qrcode' or 'angularx-qrcode'
      const size = 200;
      const cellSize = 10;
      const cells = Math.floor(size / cellSize);
      
      // Create a deterministic pattern based on the data
      let pattern = '';
      for (let i = 0; i < qrData.length; i++) {
        const charCode = qrData.charCodeAt(i);
        pattern += (charCode % 2 === 0 ? '1' : '0');
      }
      
      // Ensure pattern has enough length
      while (pattern.length < cells * cells) {
        pattern += pattern;
      }
      
      // Create SVG QR code
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
      svg += `<rect width="${size}" height="${size}" fill="white"/>`;
      
      // Draw QR pattern
      for (let row = 0; row < cells; row++) {
        for (let col = 0; col < cells; col++) {
          const index = (row * cells + col) % pattern.length;
          const isBlack = pattern[index] === '1';
          
          // Add finder patterns (corners)
          if ((row < 7 && col < 7) || (row < 7 && col >= cells - 7) || (row >= cells - 7 && col < 7)) {
            svg += `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
          } else if (isBlack) {
            svg += `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
          }
        }
      }
      
      svg += `</svg>`;
      
      // Convert to data URL
      return `data:image/svg+xml;base64,${btoa(svg)}`;
    } catch (error) {
      console.error('Error generating QR code:', error);
      // Return a simple placeholder SVG
      return `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><text x="100" y="100" text-anchor="middle" font-size="12">QR Code</text></svg>')}`;
    }
  }

  /**
   * Generate bulk QR codes
   */
  generateBulkQRCodes(): void {
    const selected = this.getFilteredAssetsForQR().filter(a => a.selectedForQR);
    if (selected.length === 0) {
      alert('Please select assets to generate QR codes');
      return;
    }
    
    let generated = 0;
    selected.forEach(asset => {
      if (!asset.qrCode || !asset.qrCodeImage) {
        this.generateQRCode(asset);
        generated++;
      }
    });
    
    if (generated > 0) {
      alert(`QR codes generated for ${generated} asset(s)`);
    } else {
      alert('Selected assets already have QR codes generated');
    }
    
    // Deselect all after generation
    this.deselectAllForQR();
  }

  /**
   * View QR code details
   */
  viewQRCodeDetails(asset: Asset): void {
    this.selectedQRAsset = asset;
  }

  /**
   * Scan QR code (view asset details from QR)
   */
  scanQRCode(asset: Asset): void {
    this.viewQRCodeDetails(asset);
  }

  /**
   * Print QR code
   */
  printQRCode(asset: Asset): void {
    if (!asset.qrCodeImage) {
      alert('QR code not generated. Please generate QR code first.');
      return;
    }
    
    // Create print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${asset.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 40px;
              margin: 0;
            }
            .qr-container {
              text-align: center;
              border: 2px solid #000;
              padding: 20px;
              border-radius: 8px;
            }
            .qr-code {
              margin: 20px 0;
            }
            .qr-code img {
              width: 300px;
              height: 300px;
            }
            .asset-info {
              margin-top: 20px;
            }
            .asset-info h2 {
              margin: 10px 0;
              font-size: 24px;
            }
            .asset-info p {
              margin: 5px 0;
              font-size: 14px;
            }
            .qr-code-text {
              font-family: monospace;
              font-size: 16px;
              font-weight: bold;
              margin-top: 10px;
            }
            @media print {
              body { margin: 0; padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="asset-info">
              <h2>${asset.name}</h2>
              <p><strong>Category:</strong> ${this.getCategoryLabel(asset.category)}</p>
              <p><strong>Location:</strong> ${asset.location}</p>
              ${asset.serialNumber ? `<p><strong>Serial Number:</strong> ${asset.serialNumber}</p>` : ''}
            </div>
            <div class="qr-code">
              <img src="${asset.qrCodeImage}" alt="QR Code" />
            </div>
            <div class="qr-code-text">${asset.qrCode}</div>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              Scan this QR code to view asset details
            </p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  /**
   * Download QR code
   */
  downloadQRCode(asset: Asset): void {
    if (!asset.qrCodeImage) {
      alert('QR code not generated. Please generate QR code first.');
      return;
    }
    
    // Create download link
    const link = document.createElement('a');
    link.href = asset.qrCodeImage;
    link.download = `QR_${asset.qrCode}_${asset.name.replace(/\s+/g, '_')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Share QR code
   */
  shareQRCode(asset: Asset): void {
    if (!asset.qrCodeImage) {
      alert('QR code not generated. Please generate QR code first.');
      return;
    }
    
    // Convert SVG to blob for sharing
    const svgData = asset.qrCodeImage.split(',')[1];
    const blob = new Blob([atob(svgData)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    if (navigator.share) {
      // Use Web Share API if available
      fetch(url)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `QR_${asset.qrCode}.svg`, { type: 'image/svg+xml' });
          navigator.share({
            title: `QR Code - ${asset.name}`,
            text: `QR Code for ${asset.name}`,
            files: [file]
          });
        });
    } else {
      // Fallback: copy to clipboard or download
      this.downloadQRCode(asset);
      alert('QR code downloaded. Share the downloaded file.');
    }
  }

  /**
   * Print bulk QR codes
   */
  printBulkQRCodes(): void {
    const assetsWithQR = this.assets.filter(a => a.qrCode && a.qrCodeImage);
    if (assetsWithQR.length === 0) {
      alert('No QR codes generated yet.');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    let html = `
      <html>
        <head>
          <title>Bulk QR Codes</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              margin: 0;
            }
            .qr-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 30px;
              page-break-inside: avoid;
            }
            .qr-item {
              border: 2px solid #000;
              padding: 20px;
              text-align: center;
              page-break-inside: avoid;
            }
            .qr-code img {
              width: 200px;
              height: 200px;
              margin: 10px 0;
            }
            .asset-name {
              font-size: 18px;
              font-weight: bold;
              margin: 10px 0;
            }
            .qr-code-text {
              font-family: monospace;
              font-size: 14px;
              margin-top: 10px;
            }
            @media print {
              .qr-grid {
                grid-template-columns: repeat(2, 1fr);
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-grid">
    `;
    
    assetsWithQR.forEach(asset => {
      html += `
        <div class="qr-item">
          <div class="asset-name">${asset.name}</div>
          <div class="qr-code">
            <img src="${asset.qrCodeImage}" alt="QR Code" />
          </div>
          <div class="qr-code-text">${asset.qrCode}</div>
        </div>
      `;
    });
    
    html += `
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  /**
   * Get category count
   */
  getCategoryCount(category: string): number {
    return this.assets.filter(a => a.category === category).length;
  }

  /**
   * Get category label
   */
  getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      'lift': 'Lift',
      'generator': 'Generator',
      'pump': 'Pump',
      'hvac': 'HVAC',
      'fire-equipment': 'Fire Equipment',
      'other': 'Other'
    };
    return labels[category] || category;
  }

  /**
   * Get registry assets filtered by category
   */
  getRegistryAssets(): Asset[] {
    if (this.registryCategory === 'all') {
      return this.assets;
    }
    return this.assets.filter(a => a.category === this.registryCategory);
  }

  /**
   * View asset details
   */
  viewAssetDetails(asset: Asset): void {
    alert(`Asset Details:\nName: ${asset.name}\nCategory: ${this.getCategoryLabel(asset.category)}\nLocation: ${asset.location}\nSerial: ${asset.serialNumber || 'N/A'}`);
  }

  /**
   * Get unique buildings
   */
  getUniqueBuildings(): string[] {
    const buildings = this.assets.map(a => a.building).filter((b, i, arr) => b && arr.indexOf(b) === i);
    return buildings as string[];
  }

  /**
   * Get location groups
   */
  getLocationGroups(): any[] {
    const groups: any = {};
    this.assets.forEach(asset => {
      const key = `${asset.building || 'Unknown'}-${asset.floor || 'Ground'}`;
      if (!groups[key]) {
        groups[key] = {
          building: asset.building || 'Unknown',
          floor: asset.floor || 'Ground',
          assets: []
        };
      }
      if (this.locationBuildingFilter === 'all' || asset.building === this.locationBuildingFilter) {
        groups[key].assets.push(asset);
      }
    });
    return Object.values(groups);
  }

  /**
   * Get unique locations
   */
  getUniqueLocations(): string[] {
    const locations = this.assets.map(a => a.location).filter((l, i, arr) => arr.indexOf(l) === i);
    return locations;
  }

  /**
   * Get expiring warranties
   */
  getExpiringWarranties(): Asset[] {
    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    return this.assets.filter(a => 
      a.warrantyExpiry && 
      new Date(a.warrantyExpiry) <= ninetyDaysFromNow &&
      new Date(a.warrantyExpiry) >= now
    );
  }

  /**
   * Get expiring warranties count
   */
  getExpiringWarrantiesCount(): number {
    return this.getExpiringWarranties().length;
  }

  /**
   * Check if warranty is expiring soon
   */
  isWarrantyExpiringSoon(asset: Asset): boolean {
    if (!asset.warrantyExpiry) return false;
    const daysRemaining = this.getWarrantyDaysRemaining(asset);
    return daysRemaining <= 90 && daysRemaining > 0;
  }

  /**
   * Get warranty days remaining
   */
  getWarrantyDaysRemaining(asset: Asset): number {
    if (!asset.warrantyExpiry) return -1;
    const now = new Date();
    const expiry = new Date(asset.warrantyExpiry);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * View purchase details
   */
  viewPurchaseDetails(asset: Asset): void {
    alert(`Purchase Details:\nAsset: ${asset.name}\nPurchase Date: ${this.formatDate(asset.purchaseDate)}\nCost: ${this.formatCurrency(asset.purchaseCost)}\nVendor: ${asset.vendor || 'N/A'}\nWarranty: ${asset.warrantyExpiry ? this.formatDate(asset.warrantyExpiry) : 'No Warranty'}`);
  }

  /**
   * Get total purchase value
   */
  getTotalPurchaseValue(): number {
    return this.assets.reduce((sum, a) => sum + a.purchaseCost, 0);
  }

  /**
   * Calculate annual depreciation
   */
  calculateAnnualDepreciation(asset: Asset): number {
    if (!asset.depreciationMethod || !asset.usefulLife) return 0;
    if (asset.depreciationMethod === 'straight-line') {
      return asset.purchaseCost / asset.usefulLife;
    }
    return 0; // Add other methods as needed
  }

  /**
   * Calculate book value
   */
  calculateBookValue(asset: Asset): number {
    return asset.purchaseCost - (asset.accumulatedDepreciation || 0);
  }

  /**
   * Get total depreciation
   */
  getTotalDepreciation(): number {
    return this.assets.reduce((sum, a) => sum + (a.accumulatedDepreciation || 0), 0);
  }

  /**
   * Get total book value
   */
  getTotalBookValue(): number {
    return this.assets.reduce((sum, a) => sum + this.calculateBookValue(a), 0);
  }

  /**
   * Get depreciation method label
   */
  getDepreciationMethodLabel(method?: string): string {
    if (!method) return 'Not Set';
    const labels: { [key: string]: string } = {
      'straight-line': 'Straight Line',
      'declining-balance': 'Declining Balance',
      'units-of-production': 'Units of Production'
    };
    return labels[method] || method;
  }

  /**
   * Edit depreciation
   */
  editDepreciation(asset: Asset): void {
    alert(`Editing depreciation for: ${asset.name}\nCurrent Method: ${this.getDepreciationMethodLabel(asset.depreciationMethod)}\nUseful Life: ${asset.usefulLife || 'Not Set'} years`);
  }

  /**
   * View depreciation schedule
   */
  viewDepreciationSchedule(asset: Asset): void {
    alert(`Depreciation Schedule for: ${asset.name}\nPurchase Cost: ${this.formatCurrency(asset.purchaseCost)}\nAnnual Depreciation: ${this.formatCurrency(this.calculateAnnualDepreciation(asset))}\nAccumulated: ${this.formatCurrency(asset.accumulatedDepreciation || 0)}\nBook Value: ${this.formatCurrency(this.calculateBookValue(asset))}`);
  }

  /**
   * Get insured assets
   */
  getInsuredAssets(): Asset[] {
    return this.assets.filter(a => a.insurancePolicyNumber);
  }

  /**
   * Get insured assets count
   */
  getInsuredAssetsCount(): number {
    return this.getInsuredAssets().length;
  }

  /**
   * Get expiring insurance
   */
  getExpiringInsurance(): Asset[] {
    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    return this.assets.filter(a => 
      a.insuranceExpiry && 
      new Date(a.insuranceExpiry) <= ninetyDaysFromNow &&
      new Date(a.insuranceExpiry) >= now
    );
  }

  /**
   * Get expiring insurance count
   */
  getExpiringInsuranceCount(): number {
    return this.getExpiringInsurance().length;
  }

  /**
   * Check if insurance is expiring soon
   */
  isInsuranceExpiringSoon(asset: Asset): boolean {
    if (!asset.insuranceExpiry) return false;
    const daysRemaining = this.getInsuranceDaysRemaining(asset);
    return daysRemaining <= 90 && daysRemaining > 0;
  }

  /**
   * Get insurance days remaining
   */
  getInsuranceDaysRemaining(asset: Asset): number {
    if (!asset.insuranceExpiry) return -1;
    const now = new Date();
    const expiry = new Date(asset.insuranceExpiry);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * View insurance details
   */
  viewInsuranceDetails(asset: Asset): void {
    alert(`Insurance Details:\nAsset: ${asset.name}\nPolicy Number: ${asset.insurancePolicyNumber}\nProvider: ${asset.insuranceProvider}\nCoverage: ${asset.insuranceCoverage ? this.formatCurrency(asset.insuranceCoverage) : 'N/A'}\nPremium: ${asset.insurancePremium ? this.formatCurrency(asset.insurancePremium) : 'N/A'}\nExpiry: ${asset.insuranceExpiry ? this.formatDate(asset.insuranceExpiry) : 'N/A'}`);
  }

  /**
   * Edit insurance
   */
  editInsurance(asset: Asset): void {
    alert(`Editing insurance for: ${asset.name}`);
  }

  // ========== Maintenance Scheduling Methods ==========

  /**
   * Open Preventive Maintenance modal
   */
  openPreventiveMaintenance(): void {
    this.showPreventiveMaintenance = true;
  }

  /**
   * Get preventive maintenance schedules count
   */
  getPreventiveSchedulesCount(): number {
    return this.maintenanceSchedules.filter(m => m.maintenanceType === 'preventive').length;
  }

  /**
   * Get overdue preventive maintenance count
   */
  getOverduePreventiveCount(): number {
    const now = new Date();
    return this.maintenanceSchedules.filter(m => 
      m.maintenanceType === 'preventive' && 
      m.status !== 'completed' && 
      new Date(m.dueDate) < now
    ).length;
  }

  /**
   * Get completed preventive maintenance this month
   */
  getCompletedPreventiveThisMonth(): number {
    const now = new Date();
    return this.maintenanceSchedules.filter(m => {
      if (m.maintenanceType !== 'preventive' || m.status !== 'completed' || !m.completedDate) return false;
      const completed = new Date(m.completedDate);
      return completed.getMonth() === now.getMonth() && completed.getFullYear() === now.getFullYear();
    }).length;
  }

  /**
   * Get filtered preventive schedules
   */
  getFilteredPreventiveSchedules(): MaintenanceSchedule[] {
    return this.maintenanceSchedules.filter(m => {
      if (m.maintenanceType !== 'preventive') return false;
      const matchesStatus = this.preventiveStatusFilter === 'all' || m.status === this.preventiveStatusFilter;
      const matchesAsset = this.preventiveAssetFilter === 'all' || m.assetId === this.preventiveAssetFilter;
      return matchesStatus && matchesAsset;
    });
  }

  /**
   * View preventive schedule
   */
  viewPreventiveSchedule(schedule: MaintenanceSchedule): void {
    alert(`Preventive Maintenance Schedule:\nAsset: ${schedule.assetName}\nFrequency: ${schedule.frequency}\nDue Date: ${this.formatDate(schedule.dueDate)}\nStatus: ${this.getMaintenanceStatusLabel(schedule.status)}\nAssigned To: ${schedule.assignedTo}`);
  }

  /**
   * Edit preventive schedule
   */
  editPreventiveSchedule(schedule: MaintenanceSchedule): void {
    alert(`Editing preventive schedule for: ${schedule.assetName}`);
  }

  /**
   * Complete preventive schedule
   */
  completePreventiveSchedule(schedule: MaintenanceSchedule): void {
    schedule.status = 'completed';
    schedule.completedDate = new Date();
    alert(`Preventive maintenance marked as completed for: ${schedule.assetName}`);
  }

  /**
   * Save new preventive maintenance schedule
   */
  savePreventiveSchedule(): void {
    // Validate required fields
    if (!this.newPreventiveSchedule.assetId || 
        !this.newPreventiveSchedule.frequency || 
        !this.newScheduleScheduledDateString || 
        !this.newScheduleDueDateString || 
        !this.newPreventiveSchedule.assignedTo || 
        !this.newPreventiveSchedule.description) {
      alert('Please fill in all required fields');
      return;
    }

    // Find the selected asset
    const selectedAsset = this.assets.find(a => a.id === this.newPreventiveSchedule.assetId);
    if (!selectedAsset) {
      alert('Selected asset not found');
      return;
    }

    // Convert date strings to Date objects
    const scheduledDate = new Date(this.newScheduleScheduledDateString);
    const dueDate = new Date(this.newScheduleDueDateString);
    
    // Calculate next due date based on frequency
    let nextDueDate: Date | undefined;
    
    if (this.newPreventiveSchedule.frequency === 'Daily') {
      nextDueDate = new Date(dueDate.getTime() + 24 * 60 * 60 * 1000);
    } else if (this.newPreventiveSchedule.frequency === 'Weekly') {
      nextDueDate = new Date(dueDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (this.newPreventiveSchedule.frequency === 'Monthly') {
      nextDueDate = new Date(dueDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (this.newPreventiveSchedule.frequency === 'Quarterly') {
      nextDueDate = new Date(dueDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    } else if (this.newPreventiveSchedule.frequency === 'Semi-Annually') {
      nextDueDate = new Date(dueDate.getTime() + 180 * 24 * 60 * 60 * 1000);
    } else if (this.newPreventiveSchedule.frequency === 'Annually') {
      nextDueDate = new Date(dueDate.getTime() + 365 * 24 * 60 * 60 * 1000);
    }

    // Get vendor name if vendor is selected
    let vendorName: string | undefined;
    if (this.newPreventiveSchedule.vendorId) {
      const selectedVendor = this.serviceVendors.find(v => v.id === this.newPreventiveSchedule.vendorId);
      vendorName = selectedVendor?.name;
    }

    // Create new maintenance schedule
    const newSchedule: MaintenanceSchedule = {
      id: 'PM-' + Date.now().toString(),
      assetId: this.newPreventiveSchedule.assetId!,
      assetName: selectedAsset.name,
      maintenanceType: 'preventive',
      scheduledDate: scheduledDate,
      dueDate: dueDate,
      status: 'scheduled',
      assignedTo: this.newPreventiveSchedule.assignedTo!,
      vendorId: this.newPreventiveSchedule.vendorId || undefined,
      vendorName: vendorName,
      cost: this.newPreventiveSchedule.cost || undefined,
      description: this.newPreventiveSchedule.description!,
      frequency: this.newPreventiveSchedule.frequency!,
      nextDueDate: nextDueDate,
      notes: this.newPreventiveSchedule.notes || undefined
    };

    // Add to maintenance schedules array
    this.maintenanceSchedules.push(newSchedule);

    // Reset form
    this.resetPreventiveScheduleForm();

    // Close modal
    this.showAddPreventiveSchedule = false;

    // Show success message
    alert(`Preventive maintenance schedule created successfully for ${selectedAsset.name}`);
  }

  /**
   * Cancel adding new preventive schedule
   */
  cancelAddPreventiveSchedule(): void {
    this.resetPreventiveScheduleForm();
    this.showAddPreventiveSchedule = false;
  }

  /**
   * Reset preventive schedule form
   */
  resetPreventiveScheduleForm(): void {
    this.newPreventiveSchedule = {
      assetId: '',
      assetName: '',
      maintenanceType: 'preventive',
      scheduledDate: undefined,
      dueDate: undefined,
      status: 'scheduled',
      assignedTo: '',
      vendorId: '',
      vendorName: '',
      cost: undefined,
      description: '',
      frequency: '',
      notes: ''
    };
    this.newScheduleScheduledDateString = '';
    this.newScheduleDueDateString = '';
  }

  /**
   * Open AMC Reminders modal
   */
  openAMCReminders(): void {
    this.showAMCReminders = true;
  }

  /**
   * Get active AMC count
   */
  getActiveAMCCount(): number {
    return this.amcReminders.filter(a => a.status === 'active').length;
  }

  /**
   * Get expiring AMC count
   */
  getExpiringAMCCount(): number {
    return this.getExpiringAMCs().length;
  }

  /**
   * Get expiring AMCs
   */
  getExpiringAMCs(): AMCReminder[] {
    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    return this.amcReminders.filter(a => 
      new Date(a.renewalDate) <= ninetyDaysFromNow &&
      new Date(a.renewalDate) >= now
    );
  }

  /**
   * Check if AMC is expiring soon
   */
  isAMCExpiringSoon(amc: AMCReminder): boolean {
    const now = new Date();
    const renewal = new Date(amc.renewalDate);
    const diff = renewal.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return daysRemaining <= 90 && daysRemaining > 0;
  }

  /**
   * Get filtered AMCs
   */
  getFilteredAMCs(): AMCReminder[] {
    return this.amcReminders.filter(a => {
      if (this.amcStatusFilter === 'all') return true;
      if (this.amcStatusFilter === 'expiring-soon') return this.isAMCExpiringSoon(a);
      return a.status === this.amcStatusFilter;
    });
  }

  /**
   * Get coverage type label
   */
  getCoverageTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'comprehensive': 'Comprehensive',
      'basic': 'Basic',
      'parts-only': 'Parts Only',
      'labor-only': 'Labor Only'
    };
    return labels[type] || type;
  }

  /**
   * Get AMC status label
   */
  getAMCStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'active': 'Active',
      'expiring-soon': 'Expiring Soon',
      'expired': 'Expired',
      'renewed': 'Renewed'
    };
    return labels[status] || status;
  }

  /**
   * View AMC
   */
  viewAMC(amc: AMCReminder): void {
    alert(`AMC Details:\nAsset: ${amc.assetName}\nProvider: ${amc.amcProvider}\nAMC Number: ${amc.amcNumber}\nStart Date: ${this.formatDate(amc.startDate)}\nExpiry Date: ${this.formatDate(amc.expiryDate)}\nRenewal Date: ${this.formatDate(amc.renewalDate)}\nAnnual Cost: ${this.formatCurrency(amc.annualCost)}\nCoverage: ${this.getCoverageTypeLabel(amc.coverageType)}\nStatus: ${this.getAMCStatusLabel(amc.status)}`);
  }

  /**
   * Edit AMC
   */
  editAMC(amc: AMCReminder): void {
    alert(`Editing AMC for: ${amc.assetName}`);
  }

  /**
   * Renew AMC
   */
  renewAMC(amc: AMCReminder): void {
    alert(`Renewing AMC for: ${amc.assetName}`);
  }

  /**
   * Save new AMC
   */
  saveAMC(): void {
    // Validate required fields
    if (!this.newAMC.assetId || 
        !this.newAMC.amcProvider || 
        !this.newAMC.amcNumber || 
        !this.newAMCStartDateString || 
        !this.newAMCExpiryDateString || 
        !this.newAMCRenewalDateString || 
        !this.newAMC.annualCost || 
        !this.newAMC.coverageType) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate dates
    const startDate = new Date(this.newAMCStartDateString);
    const expiryDate = new Date(this.newAMCExpiryDateString);
    const renewalDate = new Date(this.newAMCRenewalDateString);

    if (expiryDate <= startDate) {
      alert('Expiry date must be after start date');
      return;
    }

    if (renewalDate < startDate || renewalDate > expiryDate) {
      alert('Renewal date must be between start date and expiry date');
      return;
    }

    // Find the selected asset
    const selectedAsset = this.assets.find(a => a.id === this.newAMC.assetId);
    if (!selectedAsset) {
      alert('Selected asset not found');
      return;
    }

    // Determine status based on dates
    const now = new Date();
    let status: 'active' | 'expiring-soon' | 'expired' | 'renewed' = 'active';
    
    if (expiryDate < now) {
      status = 'expired';
    } else {
      const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilRenewal <= 90 && daysUntilRenewal > 0) {
        status = 'expiring-soon';
      }
    }

    // Create new AMC reminder
    const newAMCReminder: AMCReminder = {
      id: 'AMC-' + Date.now().toString(),
      assetId: this.newAMC.assetId!,
      assetName: selectedAsset.name,
      amcProvider: this.newAMC.amcProvider!,
      amcNumber: this.newAMC.amcNumber!,
      startDate: startDate,
      expiryDate: expiryDate,
      renewalDate: renewalDate,
      annualCost: this.newAMC.annualCost!,
      coverageType: this.newAMC.coverageType as 'comprehensive' | 'basic' | 'parts-only' | 'labor-only',
      status: status,
      contactPerson: this.newAMC.contactPerson || undefined,
      contactPhone: this.newAMC.contactPhone || undefined,
      contactEmail: this.newAMC.contactEmail || undefined,
      autoRenewal: this.newAMC.autoRenewal !== false
    };

    // Add to AMC reminders array
    this.amcReminders.push(newAMCReminder);

    // Reset form
    this.resetAMCForm();

    // Close modal
    this.showAddAMC = false;

    // Show success message
    alert(`AMC added successfully for ${selectedAsset.name}`);
  }

  /**
   * Cancel adding new AMC
   */
  cancelAddAMC(): void {
    this.resetAMCForm();
    this.showAddAMC = false;
  }

  /**
   * Reset AMC form
   */
  resetAMCForm(): void {
    this.newAMC = {
      assetId: '',
      assetName: '',
      amcProvider: '',
      amcNumber: '',
      startDate: undefined,
      expiryDate: undefined,
      renewalDate: undefined,
      annualCost: 0,
      coverageType: 'comprehensive',
      status: 'active',
      contactPerson: '',
      contactPhone: '',
      contactEmail: '',
      autoRenewal: true
    };
    this.newAMCStartDateString = '';
    this.newAMCExpiryDateString = '';
    this.newAMCRenewalDateString = '';
  }

  /**
   * Open Maintenance History modal
   */
  openMaintenanceHistory(): void {
    this.showMaintenanceHistory = true;
  }

  /**
   * Get maintenance history count
   */
  getMaintenanceHistoryCount(): number {
    return this.maintenanceHistory.length;
  }

  /**
   * Get total maintenance history cost
   */
  getTotalMaintenanceHistoryCost(): number {
    return this.maintenanceHistory.reduce((sum, h) => sum + h.cost, 0);
  }

  /**
   * Get average maintenance cost
   */
  getAverageMaintenanceCost(): number {
    if (this.maintenanceHistory.length === 0) return 0;
    return this.getTotalMaintenanceHistoryCost() / this.maintenanceHistory.length;
  }

  /**
   * Get filtered maintenance history
   */
  getFilteredMaintenanceHistory(): MaintenanceHistory[] {
    return this.maintenanceHistory.filter(h => {
      const matchesSearch = !this.historySearchTerm || 
        h.assetName.toLowerCase().includes(this.historySearchTerm.toLowerCase()) ||
        h.description.toLowerCase().includes(this.historySearchTerm.toLowerCase()) ||
        h.performedBy.toLowerCase().includes(this.historySearchTerm.toLowerCase());
      const matchesAsset = this.historyAssetFilter === 'all' || h.assetId === this.historyAssetFilter;
      const matchesType = this.historyTypeFilter === 'all' || h.maintenanceType === this.historyTypeFilter;
      return matchesSearch && matchesAsset && matchesType;
    });
  }

  /**
   * View maintenance history
   */
  viewMaintenanceHistory(history: MaintenanceHistory): void {
    alert(`Maintenance History:\nAsset: ${history.assetName}\nType: ${this.getMaintenanceTypeLabel(history.maintenanceType)}\nDate: ${this.formatDate(history.performedDate)}\nPerformed By: ${history.performedBy}\nVendor: ${history.vendorName || 'Internal'}\nCost: ${this.formatCurrency(history.cost)}\nDescription: ${history.description}\nParts Replaced: ${history.partsReplaced ? history.partsReplaced.join(', ') : 'None'}\nNotes: ${history.notes || 'N/A'}`);
  }

  /**
   * Export maintenance history
   */
  exportMaintenanceHistory(): void {
    alert('Exporting maintenance history to Excel...');
  }

  /**
   * Open Vendor Assignment modal
   */
  openVendorAssignment(): void {
    this.showVendorAssignment = true;
  }

  /**
   * Get vendors count
   */
  getVendorsCount(): number {
    return this.serviceVendors.filter(v => v.status === 'active').length;
  }

  /**
   * Get assigned vendor tasks count
   */
  getAssignedVendorTasksCount(): number {
    return this.maintenanceSchedules.filter(m => m.vendorId).length;
  }

  /**
   * Get filtered vendors
   */
  getFilteredVendors(): ServiceVendor[] {
    return this.serviceVendors.filter(v => {
      const matchesSearch = !this.vendorSearchTerm || 
        v.name.toLowerCase().includes(this.vendorSearchTerm.toLowerCase()) ||
        v.contactPerson.toLowerCase().includes(this.vendorSearchTerm.toLowerCase());
      const matchesSpecialization = this.vendorSpecializationFilter === 'all' ||
        v.specialization.includes(this.vendorSpecializationFilter);
      return matchesSearch && matchesSpecialization && v.status === 'active';
    });
  }

  /**
   * View vendor
   */
  viewVendor(vendor: ServiceVendor): void {
    alert(`Vendor Details:\nName: ${vendor.name}\nContact: ${vendor.contactPerson}\nPhone: ${vendor.phone}\nEmail: ${vendor.email || 'N/A'}\nSpecialization: ${vendor.specialization.join(', ')}\nRating: ${vendor.rating || 'N/A'}/5\nTotal Services: ${vendor.totalServices}\nAverage Cost: ${this.formatCurrency(vendor.averageCost)}\nResponse Time: ${vendor.responseTime || 'N/A'}`);
  }

  /**
   * Assign vendor to task
   */
  assignVendorToTask(vendor: ServiceVendor): void {
    alert(`Assigning vendor ${vendor.name} to maintenance task...`);
  }

  /**
   * Check if specialization is selected
   */
  isSpecializationSelected(spec: string): boolean {
    return this.newVendor.specialization?.includes(spec) || false;
  }

  /**
   * Toggle specialization selection
   */
  toggleSpecialization(spec: string): void {
    if (!this.newVendor.specialization) {
      this.newVendor.specialization = [];
    }
    const index = this.newVendor.specialization.indexOf(spec);
    if (index > -1) {
      this.newVendor.specialization.splice(index, 1);
    } else {
      this.newVendor.specialization.push(spec);
    }
  }

  /**
   * Save new vendor
   */
  saveVendor(): void {
    // Validate required fields
    if (!this.newVendor.name || 
        !this.newVendor.contactPerson || 
        !this.newVendor.phone || 
        !this.newVendor.specialization || 
        this.newVendor.specialization.length === 0) {
      alert('Please fill in all required fields and select at least one specialization');
      return;
    }

    // Validate rating if provided
    if (this.newVendor.rating !== undefined) {
      if (this.newVendor.rating < 1 || this.newVendor.rating > 5) {
        alert('Rating must be between 1 and 5');
        return;
      }
    }

    // Create new vendor
    const newVendorRecord: ServiceVendor = {
      id: 'vendor-' + Date.now().toString(),
      name: this.newVendor.name!,
      contactPerson: this.newVendor.contactPerson!,
      phone: this.newVendor.phone!,
      email: this.newVendor.email || undefined,
      specialization: this.newVendor.specialization!,
      rating: this.newVendor.rating || undefined,
      totalServices: 0,
      averageCost: 0,
      responseTime: this.newVendor.responseTime || undefined,
      status: 'active',
      address: this.newVendor.address || undefined,
      gstNumber: this.newVendor.gstNumber || undefined
    };

    // Add to service vendors array
    this.serviceVendors.push(newVendorRecord);

    // Reset form
    this.resetVendorForm();

    // Close modal
    this.showAddVendor = false;

    // Show success message
    alert(`Vendor "${newVendorRecord.name}" added successfully`);
  }

  /**
   * Cancel adding new vendor
   */
  cancelAddVendor(): void {
    this.resetVendorForm();
    this.showAddVendor = false;
  }

  /**
   * Reset vendor form
   */
  resetVendorForm(): void {
    this.newVendor = {
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      specialization: [],
      rating: undefined,
      totalServices: 0,
      averageCost: 0,
      responseTime: '',
      status: 'active',
      address: '',
      gstNumber: ''
    };
  }

  /**
   * Open Downtime Tracking modal
   */
  openDowntimeTracking(): void {
    this.showDowntimeTracking = true;
  }

  /**
   * Get active downtime count
   */
  getActiveDowntimeCount(): number {
    return this.downtimeRecords.filter(d => d.status === 'active').length;
  }

  /**
   * Get total downtime hours
   */
  getTotalDowntimeHours(): number {
    return this.downtimeRecords
      .filter(d => d.duration)
      .reduce((sum, d) => sum + (d.duration || 0), 0);
  }

  /**
   * Get active downtime
   */
  getActiveDowntime(): DowntimeRecord[] {
    return this.downtimeRecords.filter(d => d.status === 'active');
  }

  /**
   * Get filtered downtime
   */
  getFilteredDowntime(): DowntimeRecord[] {
    return this.downtimeRecords.filter(d => {
      const matchesStatus = this.downtimeStatusFilter === 'all' || d.status === this.downtimeStatusFilter;
      const matchesImpact = this.downtimeImpactFilter === 'all' || d.impact === this.downtimeImpactFilter;
      return matchesStatus && matchesImpact;
    });
  }

  /**
   * Calculate downtime hours
   */
  calculateDowntimeHours(downtime: DowntimeRecord): number {
    if (downtime.duration) return downtime.duration;
    if (!downtime.endDate) {
      const now = new Date();
      const start = new Date(downtime.startDate);
      return Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60));
    }
    const start = new Date(downtime.startDate);
    const end = new Date(downtime.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
  }

  /**
   * Get impact label
   */
  getImpactLabel(impact: string): string {
    const labels: { [key: string]: string } = {
      'low': 'Low',
      'medium': 'Medium',
      'high': 'High',
      'critical': 'Critical'
    };
    return labels[impact] || impact;
  }

  /**
   * View downtime
   */
  viewDowntime(downtime: DowntimeRecord): void {
    alert(`Downtime Details:\nAsset: ${downtime.assetName}\nStart Date: ${this.formatDate(downtime.startDate)}\nEnd Date: ${downtime.endDate ? this.formatDate(downtime.endDate) : 'Ongoing'}\nDuration: ${this.calculateDowntimeHours(downtime)} hours\nReason: ${downtime.reason}\nImpact: ${this.getImpactLabel(downtime.impact)}\nStatus: ${downtime.status === 'active' ? 'Active' : 'Resolved'}\nReported By: ${downtime.reportedBy}\nCost Impact: ${downtime.costImpact ? this.formatCurrency(downtime.costImpact) : 'N/A'}\nResolution Notes: ${downtime.resolutionNotes || 'N/A'}`);
  }

  /**
   * Resolve downtime
   */
  resolveDowntime(downtime: DowntimeRecord): void {
    downtime.status = 'resolved';
    downtime.endDate = new Date();
    downtime.duration = this.calculateDowntimeHours(downtime);
    alert(`Downtime marked as resolved for: ${downtime.assetName}`);
  }

  /**
   * Save new downtime record
   */
  saveDowntime(): void {
    // Validate required fields
    if (!this.newDowntime.assetId || 
        !this.newDowntimeStartDateString || 
        !this.newDowntime.reason || 
        !this.newDowntime.impact || 
        !this.newDowntime.reportedBy) {
      alert('Please fill in all required fields');
      return;
    }

    // Find the selected asset
    const selectedAsset = this.assets.find(a => a.id === this.newDowntime.assetId);
    if (!selectedAsset) {
      alert('Selected asset not found');
      return;
    }

    // Convert date strings to Date objects
    const startDate = new Date(this.newDowntimeStartDateString);
    let endDate: Date | undefined;
    let duration: number | undefined;
    let status: 'active' | 'resolved' = 'active';

    if (this.newDowntimeEndDateString) {
      endDate = new Date(this.newDowntimeEndDateString);
      
      // Validate end date is after start date
      if (endDate <= startDate) {
        alert('End date must be after start date');
        return;
      }

      // Calculate duration in hours
      duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
      status = 'resolved';
    } else {
      // Ongoing downtime - calculate duration from start to now
      const now = new Date();
      duration = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60));
      status = 'active';
    }

    // Parse affected services
    let affectedServices: string[] | undefined;
    if (this.newDowntimeAffectedServicesString && this.newDowntimeAffectedServicesString.trim()) {
      affectedServices = this.newDowntimeAffectedServicesString
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }

    // Create new downtime record
    const newDowntimeRecord: DowntimeRecord = {
      id: 'DT-' + Date.now().toString(),
      assetId: this.newDowntime.assetId!,
      assetName: selectedAsset.name,
      startDate: startDate,
      endDate: endDate,
      duration: duration,
      reason: this.newDowntime.reason!,
      impact: this.newDowntime.impact as 'low' | 'medium' | 'high' | 'critical',
      status: status,
      reportedBy: this.newDowntime.reportedBy!,
      resolvedBy: endDate ? this.newDowntime.reportedBy : undefined,
      resolutionNotes: this.newDowntime.resolutionNotes || undefined,
      costImpact: this.newDowntime.costImpact || undefined,
      affectedServices: affectedServices
    };

    // Add to downtime records array
    this.downtimeRecords.push(newDowntimeRecord);

    // Reset form
    this.resetDowntimeForm();

    // Close modal
    this.showAddDowntime = false;

    // Show success message
    alert(`Downtime reported successfully for ${selectedAsset.name}`);
  }

  /**
   * Cancel adding new downtime
   */
  cancelAddDowntime(): void {
    this.resetDowntimeForm();
    this.showAddDowntime = false;
  }

  /**
   * Reset downtime form
   */
  resetDowntimeForm(): void {
    this.newDowntime = {
      assetId: '',
      assetName: '',
      startDate: undefined,
      endDate: undefined,
      duration: undefined,
      reason: '',
      impact: 'medium',
      status: 'active',
      reportedBy: '',
      resolvedBy: undefined,
      resolutionNotes: '',
      costImpact: undefined,
      affectedServices: []
    };
    this.newDowntimeStartDateString = '';
    this.newDowntimeEndDateString = '';
    this.newDowntimeAffectedServicesString = '';
  }

  /**
   * Open Replacement Recommendations modal
   */
  openReplacementRecommendations(): void {
    this.showReplacementRecommendations = true;
  }

  /**
   * Get urgent replacements count
   */
  getUrgentReplacementsCount(): number {
    return this.replacementRecommendations.filter(r => r.priority === 'urgent').length;
  }

  /**
   * Get total replacement cost
   */
  getTotalReplacementCost(): number {
    return this.replacementRecommendations
      .filter(r => r.priority === 'urgent' || r.priority === 'high')
      .reduce((sum, r) => sum + r.estimatedReplacementCost, 0);
  }

  /**
   * Get urgent replacements
   */
  getUrgentReplacements(): ReplacementRecommendation[] {
    return this.replacementRecommendations.filter(r => r.priority === 'urgent');
  }

  /**
   * Get filtered replacements
   */
  getFilteredReplacements(): ReplacementRecommendation[] {
    return this.replacementRecommendations.filter(r => {
      const matchesPriority = this.replacementPriorityFilter === 'all' || r.priority === this.replacementPriorityFilter;
      const matchesRecommendation = this.replacementRecommendationFilter === 'all' || r.recommendation === this.replacementRecommendationFilter;
      return matchesPriority && matchesRecommendation;
    });
  }

  /**
   * Get condition label
   */
  getConditionLabel(condition: string): string {
    const labels: { [key: string]: string } = {
      'excellent': 'Excellent',
      'good': 'Good',
      'fair': 'Fair',
      'poor': 'Poor',
      'critical': 'Critical'
    };
    return labels[condition] || condition;
  }

  /**
   * Get recommendation label
   */
  getRecommendationLabel(recommendation: string): string {
    const labels: { [key: string]: string } = {
      'continue-use': 'Continue Use',
      'monitor': 'Monitor',
      'plan-replacement': 'Plan Replacement',
      'urgent-replacement': 'Urgent Replacement'
    };
    return labels[recommendation] || recommendation;
  }

  /**
   * Get priority label
   */
  getPriorityLabel(priority: string): string {
    const labels: { [key: string]: string } = {
      'low': 'Low',
      'medium': 'Medium',
      'high': 'High',
      'urgent': 'Urgent'
    };
    return labels[priority] || priority;
  }

  /**
   * View replacement recommendation
   */
  viewReplacement(recommendation: ReplacementRecommendation): void {
    alert(`Replacement Recommendation:\nAsset: ${recommendation.assetName}\nAge: ${recommendation.currentAge} years\nUseful Life: ${recommendation.usefulLife} years\nCondition: ${this.getConditionLabel(recommendation.condition)}\nRecommendation: ${this.getRecommendationLabel(recommendation.recommendation)}\nPriority: ${this.getPriorityLabel(recommendation.priority)}\nEstimated Cost: ${this.formatCurrency(recommendation.estimatedReplacementCost)}\nReason: ${recommendation.reason}\nCost Savings: ${recommendation.costSavings ? this.formatCurrency(recommendation.costSavings) : 'N/A'}`);
  }

  /**
   * Plan replacement
   */
  planReplacement(recommendation: ReplacementRecommendation): void {
    alert(`Planning replacement for: ${recommendation.assetName}\nEstimated Cost: ${this.formatCurrency(recommendation.estimatedReplacementCost)}\nEstimated Date: ${recommendation.estimatedReplacementDate ? this.formatDate(recommendation.estimatedReplacementDate) : 'TBD'}`);
  }

  /**
   * Generate replacement report
   */
  generateReplacementReport(): void {
    const recommendations = this.getFilteredReplacements();
    
    if (recommendations.length === 0) {
      alert('No replacement recommendations found to generate report.');
      return;
    }

    // Calculate summary statistics
    const totalAssets = recommendations.length;
    const urgentCount = recommendations.filter(r => r.priority === 'urgent').length;
    const highCount = recommendations.filter(r => r.priority === 'high').length;
    const mediumCount = recommendations.filter(r => r.priority === 'medium').length;
    const lowCount = recommendations.filter(r => r.priority === 'low').length;
    
    const totalEstimatedCost = recommendations
      .filter(r => r.priority === 'urgent' || r.priority === 'high')
      .reduce((sum, r) => sum + r.estimatedReplacementCost, 0);
    
    const urgentCost = recommendations
      .filter(r => r.priority === 'urgent')
      .reduce((sum, r) => sum + r.estimatedReplacementCost, 0);

    // Generate report content
    const reportDate = new Date();
    const reportContent = this.generateReportHTML(recommendations, {
      totalAssets,
      urgentCount,
      highCount,
      mediumCount,
      lowCount,
      totalEstimatedCost,
      urgentCost,
      reportDate
    });

    // Open report in new window for printing/downloading
    this.openReportWindow(reportContent, reportDate);
  }

  /**
   * Generate HTML content for the report
   */
  private generateReportHTML(recommendations: ReplacementRecommendation[], summary: any): string {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Replacement Recommendations Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          .report-header {
            border-bottom: 3px solid #3498db;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .report-header h1 {
            color: #2c3e50;
            margin: 0 0 10px 0;
          }
          .report-meta {
            color: #7f8c8d;
            font-size: 14px;
          }
          .summary-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
          }
          .summary-card {
            background: white;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #3498db;
          }
          .summary-card.urgent {
            border-left-color: #e74c3c;
          }
          .summary-card.high {
            border-left-color: #e67e22;
          }
          .summary-label {
            font-size: 12px;
            color: #7f8c8d;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .summary-value {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
          }
          .summary-value.urgent {
            color: #e74c3c;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background: #3498db;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #e9ecef;
          }
          tr:nth-child(even) {
            background: #f8f9fa;
          }
          tr.urgent-row {
            background: #fff3cd !important;
          }
          .badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            display: inline-block;
          }
          .badge.urgent, .badge.critical, .badge.urgent-replacement {
            background: #dc3545;
            color: white;
          }
          .badge.high, .badge.poor {
            background: #f8d7da;
            color: #721c24;
          }
          .badge.medium, .badge.fair, .badge.plan-replacement {
            background: #fff3cd;
            color: #856404;
          }
          .badge.low, .badge.good, .badge.monitor, .badge.continue-use {
            background: #d4edda;
            color: #155724;
          }
          .badge.excellent {
            background: #cfe2ff;
            color: #084298;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            text-align: center;
            color: #7f8c8d;
            font-size: 12px;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1>Asset Replacement Recommendations Report</h1>
          <div class="report-meta">
            Generated on: ${this.formatDate(summary.reportDate)}<br>
            Total Assets Analyzed: ${summary.totalAssets}
          </div>
        </div>

        <div class="summary-section">
          <h2>Executive Summary</h2>
          <div class="summary-grid">
            <div class="summary-card urgent">
              <div class="summary-label">Urgent Replacements</div>
              <div class="summary-value urgent">${summary.urgentCount}</div>
            </div>
            <div class="summary-card high">
              <div class="summary-label">High Priority</div>
              <div class="summary-value">${summary.highCount}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Medium Priority</div>
              <div class="summary-value">${summary.mediumCount}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Low Priority</div>
              <div class="summary-value">${summary.lowCount}</div>
            </div>
            <div class="summary-card urgent">
              <div class="summary-label">Urgent Replacement Cost</div>
              <div class="summary-value urgent">${this.formatCurrency(summary.urgentCost)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Estimated Cost</div>
              <div class="summary-value">${this.formatCurrency(summary.totalEstimatedCost)}</div>
            </div>
          </div>
        </div>

        <h2>Detailed Recommendations</h2>
        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Age</th>
              <th>Condition</th>
              <th>Recommendation</th>
              <th>Priority</th>
              <th>Est. Cost</th>
              <th>Est. Date</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
    `;

    recommendations.forEach(rec => {
      const conditionClass = rec.condition === 'critical' ? 'urgent' : rec.condition;
      const recommendationClass = rec.recommendation === 'urgent-replacement' ? 'urgent-replacement' : rec.recommendation;
      const priorityClass = rec.priority;
      const rowClass = rec.priority === 'urgent' ? 'urgent-row' : '';
      
      html += `
            <tr class="${rowClass}">
              <td><strong>${rec.assetName}</strong></td>
              <td>${rec.currentAge} years</td>
              <td><span class="badge ${conditionClass}">${this.getConditionLabel(rec.condition)}</span></td>
              <td><span class="badge ${recommendationClass}">${this.getRecommendationLabel(rec.recommendation)}</span></td>
              <td><span class="badge ${priorityClass}">${this.getPriorityLabel(rec.priority)}</span></td>
              <td>${this.formatCurrency(rec.estimatedReplacementCost)}</td>
              <td>${rec.estimatedReplacementDate ? this.formatDate(rec.estimatedReplacementDate) : 'TBD'}</td>
              <td>${rec.reason}</td>
            </tr>
      `;
    });

    html += `
          </tbody>
        </table>

        <div class="footer">
          <p>This report was generated automatically by the Asset Management System.</p>
          <p>For questions or clarifications, please contact the maintenance department.</p>
        </div>

        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; margin-right: 10px;">
            Print Report
          </button>
          <button onclick="downloadReport()" style="padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
            Download as PDF
          </button>
        </div>

        <script>
          function downloadReport() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Open report in new window
   */
  private openReportWindow(content: string, reportDate: Date): void {
    const reportWindow = window.open('', '_blank', 'width=1200,height=800');
    if (reportWindow) {
      reportWindow.document.write(content);
      reportWindow.document.close();
      
      // Focus the window
      reportWindow.focus();
    } else {
      alert('Please allow pop-ups to view the report. Alternatively, the report content will be displayed in the console.');
      console.log('Replacement Recommendations Report:', content);
    }
  }

  /**
   * Export replacement report to Excel/CSV
   */
  exportReplacementReportToExcel(): void {
    const recommendations = this.getFilteredReplacements();
    
    if (recommendations.length === 0) {
      alert('No replacement recommendations found to export.');
      return;
    }

    // Create CSV content
    let csvContent = 'Asset Replacement Recommendations Report\n';
    csvContent += `Generated on: ${this.formatDate(new Date())}\n\n`;
    
    // Summary
    const urgentCount = recommendations.filter(r => r.priority === 'urgent').length;
    const highCount = recommendations.filter(r => r.priority === 'high').length;
    const totalCost = recommendations
      .filter(r => r.priority === 'urgent' || r.priority === 'high')
      .reduce((sum, r) => sum + r.estimatedReplacementCost, 0);
    
    csvContent += 'Summary\n';
    csvContent += `Total Assets,${recommendations.length}\n`;
    csvContent += `Urgent Replacements,${urgentCount}\n`;
    csvContent += `High Priority,${highCount}\n`;
    csvContent += `Total Estimated Cost,${this.formatCurrency(totalCost)}\n\n`;
    
    // Headers
    csvContent += 'Asset,Age (years),Condition,Recommendation,Priority,Estimated Cost,Estimated Date,Reason\n';
    
    // Data rows
    recommendations.forEach(rec => {
      const row = [
        `"${rec.assetName}"`,
        rec.currentAge,
        this.getConditionLabel(rec.condition),
        this.getRecommendationLabel(rec.recommendation),
        this.getPriorityLabel(rec.priority),
        rec.estimatedReplacementCost,
        rec.estimatedReplacementDate ? this.formatDate(rec.estimatedReplacementDate) : 'TBD',
        `"${rec.reason}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `replacement-recommendations-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('Replacement recommendations report exported to Excel/CSV successfully!');
  }
}
