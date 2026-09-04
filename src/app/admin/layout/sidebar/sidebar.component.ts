import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminHeaderCountsService } from '../../services/admin-header-counts.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LocaleService } from '../../../core/i18n/locale.service';
import { ADMIN_NAV_SECTIONS } from '../../../core/config/admin-navigation.config';
import { AppLogoComponent } from '../../../core/components/app-logo.component';

interface MenuItem {
  titleKey: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
  badge?: string;
  badgeKey?: string;
  expanded?: boolean;
}

interface MenuSection {
  titleKey: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe, AppLogoComponent],
  template: `
    <aside class="sidebar" [class.open]="isOpen">
      <div class="sidebar-top">
        <div class="sidebar-brand">
          <app-logo size="sm"></app-logo>
        </div>
        <button
          type="button"
          class="sidebar-hide-btn"
          (click)="closeRequested.emit()"
          [title]="'nav.hideMenu' | t"
          [attr.aria-label]="'nav.hideMenu' | t">
          <i class="material-icons">chevron_left</i>
        </button>
      </div>
      <div class="sidebar-content">
        <nav class="sidebar-nav">
          <div class="menu-section">
            <div class="section-title">{{ 'section.main' | t }}</div>
            
            <a routerLink="/admin/dashboard" routerLinkActive="active" class="menu-item">
              <i class="material-icons">dashboard</i>
              <span>{{ 'nav.dashboard' | t }}</span>
            </a>
          </div>
          
          <div class="menu-section" *ngFor="let section of menuSections">
            <div class="section-title">{{ section.titleKey | t }}</div>
            
            <div *ngFor="let item of section.items">
              <div *ngIf="!item.children" class="menu-item-wrapper">
                <a [routerLink]="item.route"
                   routerLinkActive="active"
                   [routerLinkActiveOptions]="{ exact: item.route === '/admin/users' }"
                   class="menu-item">
                  <i class="material-icons">{{ item.icon }}</i>
                  <span>{{ item.titleKey | t }}</span>
                  <span *ngIf="item.badgeKey" class="menu-badge">{{ item.badgeKey | t }}</span>
                  <span *ngIf="item.badge && !item.badgeKey" class="menu-badge">{{ item.badge }}</span>
                  <span *ngIf="!item.badge && item.route === '/admin/complaints' && openComplaintsCount > 0" class="menu-badge">
                    {{ openComplaintsCount > 99 ? '99+' : openComplaintsCount }}
                  </span>
                </a>
              </div>
              
              <div *ngIf="item.children" class="menu-item-wrapper">
                <div class="menu-item" (click)="item.expanded = !item.expanded">
                  <i class="material-icons">{{ item.icon }}</i>
                  <span>{{ item.titleKey | t }}</span>
                  <i class="material-icons expand-icon">
                    {{ item.expanded ? 'expand_less' : 'expand_more' }}
                  </i>
                </div>
                
                <div class="submenu" [class.expanded]="item.expanded">
                  <a *ngFor="let child of item.children" 
                     [routerLink]="child.route" 
                     routerLinkActive="active" 
                     class="submenu-item">
                    <i class="material-icons">{{ child.icon }}</i>
                    <span>{{ child.titleKey | t }}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 260px;
      background: #2c3e50;
      color: white;
      height: 100vh;
      overflow-y: auto;
      transition: transform 0.3s ease;
      position: fixed;
      left: 0;
      top: 0;
      z-index: 900;
      transform: translateX(-100%);
    }

    .sidebar.open {
      transform: translateX(0);
    }

    .sidebar-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 12px 14px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      position: sticky;
      top: 0;
      background: #2c3e50;
      z-index: 2;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
    }

    .sidebar-hide-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.85);
      cursor: pointer;
      transition: background 0.2s;
    }

    .sidebar-hide-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      color: white;
    }

    .sidebar-hide-btn .material-icons {
      font-size: 20px;
    }
    
    .sidebar::-webkit-scrollbar {
      width: 6px;
    }
    
    .sidebar::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.2);
      border-radius: 3px;
    }
    
    .sidebar-content {
      padding: 0;
    }
    
    .sidebar-nav {
      padding: 10px 0;
    }
    
    .menu-section {
      margin-bottom: 20px;
    }
    
    .section-title {
      font-size: 11px;
      font-weight: 600;
      color: rgba(255,255,255,0.5);
      padding: 10px 20px;
      letter-spacing: 1px;
    }
    
    .menu-item-wrapper {
      position: relative;
    }
    
    .menu-item {
      display: flex;
      align-items: center;
      padding: 12px 20px;
      color: rgba(255,255,255,0.8);
      text-decoration: none;
      transition: all 0.2s;
      cursor: pointer;
      position: relative;
    }
    
    .menu-item:hover {
      background: rgba(255,255,255,0.05);
      color: white;
    }
    
    .menu-item.active {
      background: rgba(255,255,255,0.1);
      color: white;
      border-left: 3px solid #3498db;
    }
    
    .menu-item .material-icons {
      margin-right: 15px;
      font-size: 20px;
    }
    
    .menu-item span {
      flex: 1;
      font-size: 14px;
    }
    
    .expand-icon {
      margin-right: 0 !important;
      font-size: 18px !important;
    }
    
    .menu-badge {
      background: #e74c3c;
      color: white;
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: bold;
      margin-left: auto;
    }
    
    .submenu {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }
    
    .submenu.expanded {
      max-height: 500px;
    }
    
    .submenu-item {
      display: flex;
      align-items: center;
      padding: 10px 20px 10px 55px;
      color: rgba(255,255,255,0.7);
      text-decoration: none;
      transition: all 0.2s;
      font-size: 13px;
    }
    
    .submenu-item:hover {
      background: rgba(255,255,255,0.05);
      color: white;
    }
    
    .submenu-item.active {
      background: rgba(255,255,255,0.1);
      color: white;
    }
    
    .submenu-item .material-icons {
      margin-right: 12px;
      font-size: 18px;
    }
    
    @media (max-width: 768px) {
      .sidebar.open {
        box-shadow: 2px 0 10px rgba(0, 0, 0, 0.2);
      }
    }
  `]
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() isOpen = true;
  @Output() closeRequested = new EventEmitter<void>();
  openComplaintsCount = 0;
  private countsSub?: Subscription;
  private localeSub?: Subscription;

  constructor(
    private headerCounts: AdminHeaderCountsService,
    private locale: LocaleService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.headerCounts.refresh();
    this.countsSub = this.headerCounts.openComplaintsCount$.subscribe(n => {
      this.openComplaintsCount = n;
    });
    this.localeSub = this.locale.languageChanged$.subscribe(() => this.cdr.markForCheck());
  }

  ngOnDestroy(): void {
    this.countsSub?.unsubscribe();
    this.localeSub?.unsubscribe();
  }

  menuSections: MenuSection[] = ADMIN_NAV_SECTIONS;
}
