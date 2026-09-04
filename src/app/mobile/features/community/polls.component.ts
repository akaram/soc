import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-polls',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <button class="icon-btn" routerLink="/mobile/community"><i class="material-icons">arrow_back</i></button>
      <h2>Polls</h2>
      <p class="msg">Society polls are not available in the mobile POC yet. Check the admin portal or use Helpdesk for feedback.</p>
      <a class="btn" routerLink="/mobile/complaints">Open Helpdesk</a>
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
export class PollsComponent {}
