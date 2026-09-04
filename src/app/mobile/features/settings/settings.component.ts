import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/**
 * Mobile Settings Component
 * Settings page optimized for mobile devices
 */
@Component({
  selector: 'app-mobile-settings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="settings-container">
      <!-- Profile Settings -->
      <div class="settings-section">
        <h2 class="section-title">Profile</h2>
        <div class="settings-list">
          <a routerLink="/mobile/profile" class="setting-item">
            <i class="material-icons">person</i>
            <div class="setting-content">
              <span class="setting-label">My Profile</span>
              <span class="setting-desc">View and edit your profile</span>
            </div>
            <i class="material-icons chevron">chevron_right</i>
          </a>
          <a routerLink="/mobile/profile/family" class="setting-item">
            <i class="material-icons">family_restroom</i>
            <div class="setting-content">
              <span class="setting-label">Family Members</span>
              <span class="setting-desc">Manage family members</span>
            </div>
            <i class="material-icons chevron">chevron_right</i>
          </a>
        </div>
      </div>

      <!-- Account Settings -->
      <div class="settings-section">
        <h2 class="section-title">Account</h2>
        <div class="settings-list">
          <div class="setting-item" (click)="toggleNotifications()">
            <i class="material-icons">notifications</i>
            <div class="setting-content">
              <span class="setting-label">Push Notifications</span>
              <span class="setting-desc">Receive app notifications</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" [checked]="notificationsEnabled" (change)="notificationsEnabled = $any($event.target).checked">
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item" (click)="toggleBiometric()">
            <i class="material-icons">fingerprint</i>
            <div class="setting-content">
              <span class="setting-label">Biometric Login</span>
              <span class="setting-desc">Use fingerprint or face ID</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" [checked]="biometricEnabled" (change)="biometricEnabled = $any($event.target).checked">
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item" (click)="toggleLocation()">
            <i class="material-icons">location_on</i>
            <div class="setting-content">
              <span class="setting-label">Location Services</span>
              <span class="setting-desc">Allow location tracking</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" [checked]="locationEnabled" (change)="locationEnabled = $any($event.target).checked">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Privacy & Security -->
      <div class="settings-section">
        <h2 class="section-title">Privacy & Security</h2>
        <div class="settings-list">
          <a class="setting-item" (click)="changePassword()">
            <i class="material-icons">lock</i>
            <div class="setting-content">
              <span class="setting-label">Change Password</span>
              <span class="setting-desc">Update your account password</span>
            </div>
            <i class="material-icons chevron">chevron_right</i>
          </a>
          <a class="setting-item" (click)="viewPrivacyPolicy()">
            <i class="material-icons">privacy_tip</i>
            <div class="setting-content">
              <span class="setting-label">Privacy Policy</span>
              <span class="setting-desc">Read our privacy policy</span>
            </div>
            <i class="material-icons chevron">chevron_right</i>
          </a>
          <a class="setting-item" (click)="viewTerms()">
            <i class="material-icons">description</i>
            <div class="setting-content">
              <span class="setting-label">Terms of Service</span>
              <span class="setting-desc">View terms and conditions</span>
            </div>
            <i class="material-icons chevron">chevron_right</i>
          </a>
        </div>
      </div>

      <!-- App Settings -->
      <div class="settings-section">
        <h2 class="section-title">App</h2>
        <div class="settings-list">
          <div class="setting-item">
            <i class="material-icons">info</i>
            <div class="setting-content">
              <span class="setting-label">App Version</span>
              <span class="setting-desc">Version {{ appVersion }}</span>
            </div>
          </div>
          <a class="setting-item" (click)="clearCache()">
            <i class="material-icons">delete_outline</i>
            <div class="setting-content">
              <span class="setting-label">Clear Cache</span>
              <span class="setting-desc">Free up storage space</span>
            </div>
            <i class="material-icons chevron">chevron_right</i>
          </a>
          <a routerLink="/mobile/support" class="setting-item">
            <i class="material-icons">support_agent</i>
            <div class="setting-content">
              <span class="setting-label">Contact Support</span>
              <span class="setting-desc">Get help from our team</span>
            </div>
            <i class="material-icons chevron">chevron_right</i>
          </a>
        </div>
      </div>

      <!-- Logout -->
      <div class="settings-section">
        <button class="logout-button" (click)="logout()">
          <i class="material-icons">logout</i>
          <span>Logout</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .settings-container {
      padding: 16px;
      padding-bottom: 80px;
    }

    .settings-section {
      margin-bottom: 32px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 12px 0;
      padding: 0 4px;
    }

    .settings-list {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .setting-item {
      display: flex;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #f0f0f0;
      text-decoration: none;
      color: #333;
      cursor: pointer;
      transition: background 0.2s;
    }

    .setting-item:last-child {
      border-bottom: none;
    }

    .setting-item:active {
      background: #f5f5f5;
    }

    .setting-item i.material-icons:first-child {
      color: #667eea;
      font-size: 24px;
      margin-right: 16px;
      width: 24px;
    }

    .setting-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .setting-label {
      font-size: 16px;
      font-weight: 500;
      color: #333;
    }

    .setting-desc {
      font-size: 13px;
      color: #999;
    }

    .chevron {
      color: #ccc !important;
      font-size: 20px !important;
      margin-right: 0 !important;
      width: auto !important;
    }

    /* Toggle Switch */
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 28px;
      margin: 0;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: 0.3s;
      border-radius: 28px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: #667eea;
    }

    input:checked + .slider:before {
      transform: translateX(22px);
    }

    .logout-button {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 16px;
      background: #ff4444;
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
      box-shadow: 0 2px 8px rgba(255, 68, 68, 0.2);
    }

    .logout-button:active {
      background: #cc0000;
    }

    .logout-button i {
      font-size: 20px;
    }
  `]
})
export class SettingsComponent implements OnInit {
  appVersion = '1.0.0';
  notificationsEnabled = true;
  biometricEnabled = false;
  locationEnabled = true;

  ngOnInit() {
    // Load settings from storage or service
    this.loadSettings();
  }

  loadSettings() {
    // Load saved settings
    const savedNotifications = localStorage.getItem('notificationsEnabled');
    const savedBiometric = localStorage.getItem('biometricEnabled');
    const savedLocation = localStorage.getItem('locationEnabled');

    if (savedNotifications !== null) {
      this.notificationsEnabled = savedNotifications === 'true';
    }
    if (savedBiometric !== null) {
      this.biometricEnabled = savedBiometric === 'true';
    }
    if (savedLocation !== null) {
      this.locationEnabled = savedLocation === 'true';
    }
  }

  toggleNotifications() {
    localStorage.setItem('notificationsEnabled', this.notificationsEnabled.toString());
  }

  toggleBiometric() {
    localStorage.setItem('biometricEnabled', this.biometricEnabled.toString());
  }

  toggleLocation() {
    localStorage.setItem('locationEnabled', this.locationEnabled.toString());
  }

  changePassword() {
    // Navigate to change password page
    console.log('Change password');
  }

  viewPrivacyPolicy() {
    // Open privacy policy
    console.log('View privacy policy');
  }

  viewTerms() {
    // Open terms of service
    console.log('View terms of service');
  }

  clearCache() {
    if (confirm('Are you sure you want to clear the cache?')) {
      console.log('Cache cleared');
      alert('Cache cleared successfully');
    }
  }

  logout() {
    if (confirm('Are you sure you want to logout?')) {
      // Logout logic
      localStorage.removeItem('authToken');
      window.location.href = '/mobile/auth/login';
    }
  }
}

