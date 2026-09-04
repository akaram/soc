import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-guard-management',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet],
  template: `
    <router-outlet></router-outlet>
  `,
  styles: []
})
export class GuardManagementComponent {}
