import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/**
 * Pre-invite Visitor Component - Mobile
 */
@Component({
  selector: 'app-pre-invite',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="pre-invite-container">
      <div class="page-header">
        <button class="btn-back" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <h2>Pre-invite Visitor</h2>
      </div>
      <div class="content">
        <p>Pre-invite visitor form coming soon...</p>
      </div>
    </div>
  `,
  styles: [`
    .pre-invite-container { padding: 16px; }
    .page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .btn-back { background: none; border: none; cursor: pointer; }
    .content { text-align: center; padding: 40px 20px; color: #999; }
  `]
})
export class PreInviteComponent {
  goBack() {
    window.history.back();
  }
}

