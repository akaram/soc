import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-hardware-integration-wrapper',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet],
  template: `
    <div class="module-page">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .module-page {
      min-height: 100vh;
      background: #f5f7fa;
    }
  `]
})
export class HardwareIntegrationWrapperComponent {}
















































