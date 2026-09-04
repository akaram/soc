import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <button class="icon-btn" routerLink="/mobile/community"><i class="material-icons">arrow_back</i></button>
      <h2>Events</h2>
      <p class="msg">Event calendar is not wired on mobile yet. Society announcements may appear on the dashboard.</p>
      <a class="btn" routerLink="/mobile/dashboard">Back to home</a>
    </div>
  `,
  styles: [
    `
      .page { padding: 16px; }
      .icon-btn { background: none; border: none; cursor: pointer; margin-bottom: 8px; }
      .msg { color: #64748b; line-height: 1.5; }
      .btn {
        display: inline-block; margin-top: 16px; padding: 12px 20px; background: #667eea;
        color: white; text-decoration: none; border-radius: 12px; font-weight: 600;
      }
    `
  ]
})
export class EventsComponent {}
