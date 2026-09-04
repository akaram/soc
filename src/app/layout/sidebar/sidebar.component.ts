import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface MenuItem {
  title: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
  badge?: string;
  expanded?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar" [class.open]="isOpen">
      <div class="sidebar-content">
        <nav class="sidebar-nav">
          <div class="menu-section">
            <div class="section-title">MAIN</div>
            
            <a routerLink="/dashboard" routerLinkActive="active" class="menu-item">
              <i class="material-icons">dashboard</i>
              <span>Dashboard</span>
            </a>
          </div>
          
          <div class="menu-section" *ngFor="let section of menuSections">
            <div class="section-title">{{ section.title }}</div>
            
            <div *ngFor="let item of section.items">
              <div *ngIf="!item.children" class="menu-item-wrapper">
                <a [routerLink]="item.route" routerLinkActive="active" class="menu-item">
                  <i class="material-icons">{{ item.icon }}</i>
                  <span>{{ item.title }}</span>
                  <span *ngIf="item.badge" class="menu-badge">{{ item.badge }}</span>
                </a>
              </div>
              
              <div *ngIf="item.children" class="menu-item-wrapper">
                <div class="menu-item" (click)="item.expanded = !item.expanded">
                  <i class="material-icons">{{ item.icon }}</i>
                  <span>{{ item.title }}</span>
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
                    <span>{{ child.title }}</span>
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
      height: 100%;
      overflow-y: auto;
      transition: transform 0.3s ease;
      position: relative;
      z-index: 900;
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
      .sidebar {
        position: fixed;
        left: 0;
        top: 64px;
        bottom: 0;
        transform: translateX(-100%);
        box-shadow: 2px 0 10px rgba(0,0,0,0.1);
      }
      
      .sidebar.open {
        transform: translateX(0);
      }
    }
  `]
})
export class SidebarComponent {
  @Input() isOpen = true;
  
  menuSections: MenuSection[] = [
    {
      title: 'ACCESS & SECURITY',
      items: [
        { title: 'User Management', icon: 'people', route: '/users' },
        {
          title: 'Visitor Management',
          icon: 'group_add',
          expanded: false,
          children: [
            { title: 'Visitors', icon: 'person_add', route: '/visitors' },
            { title: 'Gate Security', icon: 'security', route: '/gate-security' }
          ]
        },
        {
          title: 'Guard Management',
          icon: 'shield',
          expanded: false,
          children: [
            { title: 'Guards & Staff', icon: 'badge', route: '/guard-management' },
            { title: 'Patrol System', icon: 'route', route: '/guard-patrol' }
          ]
        },
        { title: 'Smart Locks', icon: 'lock', route: '/smart-locks' }
      ]
    },
    {
      title: 'FINANCIAL',
      items: [
        { title: 'Billing', icon: 'receipt_long', route: '/billing', badge: 'NEW' },
        { title: 'Payments', icon: 'payment', route: '/payments' },
        { title: 'Accounting', icon: 'account_balance', route: '/accounting' },
        { title: 'Budget Management', icon: 'pie_chart', route: '/budget' }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { title: 'Asset Management', icon: 'inventory_2', route: '/assets' },
        { title: 'Vendor Management', icon: 'business', route: '/vendors' },
        { title: 'Contract Management', icon: 'description', route: '/contracts' },
        { title: 'Deliveries & Packages', icon: 'local_shipping', route: '/deliveries' }
      ]
    },
    {
      title: 'FACILITIES',
      items: [
        { title: 'Amenity Booking', icon: 'event_available', route: '/amenities' },
        { title: 'Smart Parking', icon: 'local_parking', route: '/parking' },
        { title: 'Move In/Out', icon: 'moving', route: '/move-management' }
      ]
    },
    {
      title: 'SUPPORT & COMMUNITY',
      items: [
        { title: 'Helpdesk', icon: 'support_agent', route: '/helpdesk', badge: '12' },
        { title: 'Complaints', icon: 'report_problem', route: '/complaints', badge: '3' },
        { title: 'Community Feed', icon: 'forum', route: '/community' },
        { title: 'Events', icon: 'celebration', route: '/events' },
        { title: 'AGM Management', icon: 'how_to_vote', route: '/agm' },
        { title: 'Marketplace', icon: 'storefront', route: '/marketplace' }
      ]
    },
    {
      title: 'ADVANCED',
      items: [
        { title: 'AI Assistant', icon: 'smart_toy', route: '/ai-assistant', badge: 'AI' },
        { title: 'Emergency & Safety', icon: 'emergency', route: '/emergency' },
        { title: 'Multi-Society', icon: 'apartment', route: '/multi-society' },
        { title: 'Settings', icon: 'settings', route: '/settings' }
      ]
    }
  ];
}
