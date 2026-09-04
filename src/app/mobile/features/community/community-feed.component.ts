import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-community-feed',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <h2>Community</h2>
      <p class="hint">Announcements and social features. Use the links below for now.</p>

      <a class="card" routerLink="/mobile/complaints">
        <i class="material-icons">forum</i>
        <div><strong>Helpdesk / complaints</strong><span>Discuss issues with management</span></div>
        <i class="material-icons chev">chevron_right</i>
      </a>
      <a class="card" routerLink="/mobile/visitors">
        <i class="material-icons">group_add</i>
        <div><strong>Visitors</strong><span>Guest passes and approvals</span></div>
        <i class="material-icons chev">chevron_right</i>
      </a>
      <a class="card" routerLink="/mobile/community/polls">
        <i class="material-icons">how_to_vote</i>
        <div><strong>Polls</strong><span>Society voting (preview)</span></div>
        <i class="material-icons chev">chevron_right</i>
      </a>
      <a class="card" routerLink="/mobile/community/events">
        <i class="material-icons">event</i>
        <div><strong>Events</strong><span>Upcoming society events (preview)</span></div>
        <i class="material-icons chev">chevron_right</i>
      </a>
    </div>
  `,
  styles: [
    `
      .page { padding: 16px; }
      h2 { margin: 0 0 6px; }
      .hint { color: #64748b; margin-bottom: 16px; }
      .card {
        display: flex; align-items: center; gap: 12px; background: white;
        border-radius: 14px; padding: 14px; margin-bottom: 10px; text-decoration: none; color: inherit;
      }
      .card div { flex: 1; display: flex; flex-direction: column; }
      .card span { font-size: 13px; color: #64748b; }
      .card .material-icons { color: #667eea; }
      .chev { color: #cbd5e1 !important; }
    `
  ]
})
export class CommunityFeedComponent {}
