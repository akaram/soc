import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-left">
          <span>&copy; 2024 Society Management App v2.0</span>
          <span class="separator">|</span>
          <span>300+ Features</span>
          <span class="separator">|</span>
          <span>18 Modules</span>
        </div>
        
        <div class="footer-center">
          <span class="status">
            <i class="material-icons">cloud_done</i>
            All Systems Operational
          </span>
        </div>
        
        <div class="footer-right">
          <a href="#" class="footer-link">Privacy</a>
          <span class="separator">|</span>
          <a href="#" class="footer-link">Terms</a>
          <span class="separator">|</span>
          <a href="#" class="footer-link">Support</a>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      height: 50px;
      background: #34495e;
      color: rgba(255,255,255,0.8);
      display: flex;
      align-items: center;
      padding: 0 20px;
      box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
      font-size: 13px;
    }
    
    .footer-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }
    
    .footer-left,
    .footer-center,
    .footer-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .separator {
      color: rgba(255,255,255,0.3);
    }
    
    .status {
      display: flex;
      align-items: center;
      gap: 5px;
      color: #2ecc71;
    }
    
    .status .material-icons {
      font-size: 18px;
    }
    
    .footer-link {
      color: rgba(255,255,255,0.8);
      text-decoration: none;
      transition: color 0.2s;
    }
    
    .footer-link:hover {
      color: white;
    }
    
    @media (max-width: 768px) {
      .footer {
        font-size: 11px;
        padding: 0 10px;
      }
      
      .footer-center,
      .separator {
        display: none;
      }
      
      .footer-left,
      .footer-right {
        gap: 5px;
        font-size: 10px;
      }
    }
  `]
})
export class FooterComponent {}
