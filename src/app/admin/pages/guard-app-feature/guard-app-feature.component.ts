import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

/**
 * Guard App Feature Dashboard
 * Shows all available guard app features with navigation cards
 */
@Component({
  selector: 'app-guard-app-feature',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="guard-app-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>
            <i class="material-icons">phone_android</i>
            Guard App Features
          </h1>
          <p>Manage and access all guard mobile app features</p>
        </div>
      </div>

      <!-- Feature Cards Grid -->
      <div class="features-grid">
        <!-- Visitor Approvals Card -->
        <div class="feature-card visitor-approvals" (click)="navigateTo('/mobile/guard/visitor-approvals')">
          <div class="card-icon">
            <i class="material-icons">how_to_reg</i>
          </div>
          <div class="card-content">
            <h3>Visitor Approvals</h3>
            <p>One-tap approval/rejection for pending visitors</p>
            <div class="card-features">
              <span class="feature-tag">Quick Approve</span>
              <span class="feature-tag">Bulk Actions</span>
              <span class="feature-tag">QR Scan</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Patrol Screen Card -->
        <div class="feature-card patrol" (click)="navigateTo('/mobile/guard/patrol')">
          <div class="card-icon">
            <i class="material-icons">route</i>
          </div>
          <div class="card-content">
            <h3>Patrol Management</h3>
            <p>Track patrol routes and checkpoint scanning</p>
            <div class="card-features">
              <span class="feature-tag">QR Scanner</span>
              <span class="feature-tag">Route Tracking</span>
              <span class="feature-tag">Real-time</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Attendance Card -->
        <div class="feature-card attendance" (click)="navigateTo('/mobile/guard/attendance')">
          <div class="card-icon">
            <i class="material-icons">fingerprint</i>
          </div>
          <div class="card-content">
            <h3>Attendance</h3>
            <p>Mark attendance with biometric verification</p>
            <div class="card-features">
              <span class="feature-tag">Biometric</span>
              <span class="feature-tag">Check-in/out</span>
              <span class="feature-tag">GPS</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Incident Reporting Card -->
        <div class="feature-card incidents" (click)="navigateTo('/mobile/guard/incidents')">
          <div class="card-icon">
            <i class="material-icons">report_problem</i>
          </div>
          <div class="card-content">
            <h3>Incident Reporting</h3>
            <p>Report security incidents with photos and location</p>
            <div class="card-features">
              <span class="feature-tag">Photo Upload</span>
              <span class="feature-tag">GPS Location</span>
              <span class="feature-tag">Priority Levels</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Document Scanning Card -->
        <div class="feature-card document-scanning" (click)="navigateTo('/mobile/guard/document-scanning')">
          <div class="card-icon">
            <i class="material-icons">scanner</i>
          </div>
          <div class="card-content">
            <h3>Document Scanning</h3>
            <p>Scan and verify ID cards and licenses</p>
            <div class="card-features">
              <span class="feature-tag">ID Scan</span>
              <span class="feature-tag">License</span>
              <span class="feature-tag">Verification</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Resident Communication Card -->
        <div class="feature-card resident-communication" (click)="navigateTo('/mobile/guard/resident-communication')">
          <div class="card-icon">
            <i class="material-icons">chat</i>
          </div>
          <div class="card-content">
            <h3>Resident Communication</h3>
            <p>Communicate with residents without phone numbers</p>
            <div class="card-features">
              <span class="feature-tag">Messaging</span>
              <span class="feature-tag">Alerts</span>
              <span class="feature-tag">Quick Messages</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Emergency Contacts Card -->
        <div class="feature-card emergency-contacts" (click)="navigateTo('/mobile/guard/emergency-contacts')">
          <div class="card-icon">
            <i class="material-icons">phone</i>
          </div>
          <div class="card-content">
            <h3>Emergency Contacts</h3>
            <p>Quick dial emergency contacts without phone numbers</p>
            <div class="card-features">
              <span class="feature-tag">Quick Dial</span>
              <span class="feature-tag">Categories</span>
              <span class="feature-tag">Favorites</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Package Holding Card -->
        <div class="feature-card package-holding" (click)="navigateTo('/mobile/guard/package-holding')">
          <div class="card-icon">
            <i class="material-icons">inventory_2</i>
          </div>
          <div class="card-content">
            <h3>Package Holding</h3>
            <p>Manage packages and resident holding instructions</p>
            <div class="card-features">
              <span class="feature-tag">Instructions</span>
              <span class="feature-tag">Package Tracking</span>
              <span class="feature-tag">Status Updates</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>

        <!-- Guard Dashboard Card -->
        <div class="feature-card dashboard" (click)="navigateTo('/mobile/guard-dashboard')">
          <div class="card-icon">
            <i class="material-icons">dashboard</i>
          </div>
          <div class="card-content">
            <h3>Guard Dashboard</h3>
            <p>Complete guard dashboard with all features</p>
            <div class="card-features">
              <span class="feature-tag">Overview</span>
              <span class="feature-tag">Quick Actions</span>
              <span class="feature-tag">Stats</span>
            </div>
          </div>
          <div class="card-arrow">
            <i class="material-icons">arrow_forward</i>
          </div>
        </div>
      </div>

      <!-- Quick Access Section -->
      <div class="quick-access-section">
        <h2>Quick Access</h2>
        <div class="quick-links">
          <a routerLink="/mobile/guard/visitor-approvals" class="quick-link">
            <i class="material-icons">how_to_reg</i>
            <span>Visitor Approvals</span>
          </a>
          <a routerLink="/mobile/guard/patrol" class="quick-link">
            <i class="material-icons">route</i>
            <span>Start Patrol</span>
          </a>
          <a routerLink="/mobile/guard/attendance" class="quick-link">
            <i class="material-icons">fingerprint</i>
            <span>Mark Attendance</span>
          </a>
          <a routerLink="/mobile/guard/incidents" class="quick-link">
            <i class="material-icons">report_problem</i>
            <span>Report Incident</span>
          </a>
          <a routerLink="/mobile/guard/document-scanning" class="quick-link">
            <i class="material-icons">scanner</i>
            <span>Scan Document</span>
          </a>
          <a routerLink="/mobile/guard/resident-communication" class="quick-link">
            <i class="material-icons">chat</i>
            <span>Message Residents</span>
          </a>
          <a routerLink="/mobile/guard/emergency-contacts" class="quick-link">
            <i class="material-icons">phone</i>
            <span>Emergency Contacts</span>
          </a>
          <a routerLink="/mobile/guard/package-holding" class="quick-link">
            <i class="material-icons">inventory_2</i>
            <span>Package Holding</span>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .guard-app-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Header */
    .page-header {
      margin-bottom: 32px;
    }

    .header-content h1 {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 32px;
      font-weight: 700;
      color: #2c3e50;
      margin: 0 0 8px 0;
    }

    .header-content h1 .material-icons {
      font-size: 36px;
      color: #667eea;
    }

    .header-content p {
      margin: 0;
      font-size: 16px;
      color: #7f8c8d;
    }

    /* Features Grid */
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
      margin-bottom: 40px;
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

    .feature-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transform: scaleX(0);
      transition: transform 0.3s ease;
    }

    .feature-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    }

    .feature-card:hover::before {
      transform: scaleX(1);
    }

    .feature-card.visitor-approvals .card-icon {
      background: linear-gradient(135deg, #2ed573 0%, #1e9e5a 100%);
    }

    .feature-card.patrol .card-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .feature-card.attendance .card-icon {
      background: linear-gradient(135deg, #ff9f43 0%, #ff6b6b 100%);
    }

    .feature-card.incidents .card-icon {
      background: linear-gradient(135deg, #ff4757 0%, #ee3542 100%);
    }

    .feature-card.document-scanning .card-icon {
      background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
    }

    .feature-card.resident-communication .card-icon {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }

    .feature-card.emergency-contacts .card-icon {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }

    .feature-card.package-holding .card-icon {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    }

    .feature-card.dashboard .card-icon {
      background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
    }

    .card-icon {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .card-icon .material-icons {
      font-size: 32px;
    }

    .card-content {
      flex: 1;
    }

    .card-content h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .card-content p {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #7f8c8d;
      line-height: 1.5;
    }

    .card-features {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .feature-tag {
      background: #f5f7fa;
      color: #667eea;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-arrow {
      color: #bdc3c7;
      transition: all 0.3s ease;
    }

    .feature-card:hover .card-arrow {
      color: #667eea;
      transform: translateX(4px);
    }

    .card-arrow .material-icons {
      font-size: 24px;
    }

    /* Quick Access Section */
    .quick-access-section {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }

    .quick-access-section h2 {
      margin: 0 0 20px 0;
      font-size: 24px;
      font-weight: 600;
      color: #2c3e50;
    }

    .quick-links {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .quick-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: #f5f7fa;
      border-radius: 12px;
      text-decoration: none;
      color: #2c3e50;
      transition: all 0.2s ease;
    }

    .quick-link:hover {
      background: #667eea;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .quick-link .material-icons {
      font-size: 24px;
    }

    .quick-link span {
      font-size: 14px;
      font-weight: 500;
    }

    @media (max-width: 768px) {
      .guard-app-container {
        padding: 16px;
      }

      .features-grid {
        grid-template-columns: 1fr;
      }

      .quick-links {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class GuardAppFeatureComponent {
  constructor(private router: Router) {}

  /**
   * Navigate to the specified route
   */
  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}

