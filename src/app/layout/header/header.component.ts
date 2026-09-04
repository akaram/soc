import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="header">
      <div class="header-left">
        <button class="menu-btn" (click)="onToggleSidebar()">
          <i class="material-icons">menu</i>
        </button>
        <div class="logo">
          <i class="material-icons logo-icon">apartment</i>
          <span class="logo-text">Society Manager</span>
        </div>
      </div>
      
      <div class="header-center">
        <div class="search-box">
          <i class="material-icons">search</i>
          <input type="text" placeholder="Search residents, visitors, bills...">
        </div>
      </div>
      
      <div class="header-right">
        <button class="icon-btn" title="AI Assistant">
          <i class="material-icons">smart_toy</i>
        </button>
        
        <button class="icon-btn" title="Notifications">
          <i class="material-icons">notifications</i>
          <span class="badge">5</span>
        </button>
        
        <button class="icon-btn" title="Emergency SOS">
          <i class="material-icons emergency">emergency</i>
        </button>
        
        <div class="user-menu">
          <div class="user-avatar">
            <i class="material-icons">account_circle</i>
          </div>
          <div class="user-info">
            <div class="user-name">Admin User</div>
            <div class="user-role">Super Admin</div>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .header {
      height: 64px;
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      position: relative;
      z-index: 1000;
    }
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .menu-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      transition: background 0.2s;
    }
    
    .menu-btn:hover {
      background: rgba(255,255,255,0.1);
    }
    
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 20px;
      font-weight: 500;
    }
    
    .logo-icon {
      font-size: 28px;
    }
    
    .header-center {
      flex: 1;
      max-width: 500px;
      margin: 0 20px;
    }
    
    .search-box {
      display: flex;
      align-items: center;
      background: rgba(255,255,255,0.15);
      border-radius: 24px;
      padding: 8px 16px;
      gap: 10px;
    }
    
    .search-box input {
      background: none;
      border: none;
      color: white;
      outline: none;
      flex: 1;
      font-size: 14px;
    }
    
    .search-box input::placeholder {
      color: rgba(255,255,255,0.7);
    }
    
    .header-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .icon-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      position: relative;
      transition: background 0.2s;
    }
    
    .icon-btn:hover {
      background: rgba(255,255,255,0.1);
    }
    
    .icon-btn .material-icons.emergency {
      color: #ff4444;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    
    .badge {
      position: absolute;
      top: 4px;
      right: 4px;
      background: #ff4081;
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      font-weight: bold;
    }
    
    .user-menu {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 12px 4px 4px;
      border-radius: 24px;
      background: rgba(255,255,255,0.1);
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .user-menu:hover {
      background: rgba(255,255,255,0.2);
    }
    
    .user-avatar .material-icons {
      font-size: 40px;
    }
    
    .user-info {
      display: flex;
      flex-direction: column;
      text-align: left;
    }
    
    .user-name {
      font-size: 14px;
      font-weight: 500;
    }
    
    .user-role {
      font-size: 11px;
      opacity: 0.8;
    }
    
    @media (max-width: 768px) {
      .header-center {
        display: none;
      }
      
      .logo-text {
        display: none;
      }
      
      .user-info {
        display: none;
      }
    }
  `]
})
export class HeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  
  onToggleSidebar() {
    this.toggleSidebar.emit();
  }
}
