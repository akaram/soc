import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ProfileComponent } from '../../shared/profile/profile.component';

/**
 * My Profile Component - Mobile
 * Uses the shared profile component
 */
@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ProfileComponent],
  template: `
    <app-profile></app-profile>
  `
})
export class MyProfileComponent {
  constructor(private router: Router) {}
}

