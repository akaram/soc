import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { AdminSidebarPreferenceService } from '../services/admin-sidebar-preference.service';
import { ToastContainerComponent } from '../../core/components/toast-container.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, SidebarComponent, ToastContainerComponent],
  template: `
    <div class="admin-layout">
      <app-sidebar [isOpen]="sidebarOpen" (closeRequested)="setSidebarOpen(false)"></app-sidebar>

      <div class="main-wrapper" [class.sidebar-closed]="!sidebarOpen">
        <app-header
          [sidebarOpen]="sidebarOpen"
          (toggleSidebar)="toggleSidebar()">
        </app-header>

        <main class="main-content">
          <router-outlet></router-outlet>
        </main>
      </div>

      <div
        class="sidebar-overlay"
        [class.active]="sidebarOpen && isMobileView"
        (click)="setSidebarOpen(false)"
        *ngIf="isMobileView">
      </div>

      <app-toast-container></app-toast-container>
    </div>
  `,
  styles: [`
    .admin-layout {
      display: flex;
      min-height: 100vh;
      background: #f5f6fa;
    }

    .main-wrapper {
      flex: 1;
      margin-left: 260px;
      transition: margin-left 0.3s ease;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      width: 100%;
    }

    .main-wrapper.sidebar-closed {
      margin-left: 0;
    }

    .main-content {
      flex: 1;
      margin-top: 64px;
      padding: 24px;
      overflow-y: auto;
    }

    .sidebar-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 899;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .sidebar-overlay.active {
      display: block;
      opacity: 1;
    }

    @media (max-width: 768px) {
      .main-wrapper {
        margin-left: 0;
      }

      .main-content {
        padding: 16px;
      }
    }
  `]
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  sidebarOpen = true;
  isMobileView = false;

  constructor(private sidebarPreference: AdminSidebarPreferenceService) {}

  ngOnInit(): void {
    this.isMobileView = window.innerWidth < 768;
    this.sidebarOpen = this.sidebarPreference.getInitialOpen(this.isMobileView);
  }

  ngOnDestroy(): void {
    /* HostListener cleanup is automatic */
  }

  @HostListener('window:resize')
  onResize(): void {
    const wasMobile = this.isMobileView;
    this.isMobileView = window.innerWidth < 768;

    if (this.isMobileView && !wasMobile) {
      this.setSidebarOpen(false, false);
      return;
    }

    if (!this.isMobileView && wasMobile) {
      const saved = this.sidebarPreference.getSaved();
      this.sidebarOpen = saved === null ? true : saved;
    }
  }

  toggleSidebar(): void {
    this.setSidebarOpen(!this.sidebarOpen);
  }

  /** Update sidebar visibility and optionally persist user preference. */
  setSidebarOpen(open: boolean, persist = true): void {
    this.sidebarOpen = open;
    if (persist) {
      this.sidebarPreference.save(open);
    }
  }
}
