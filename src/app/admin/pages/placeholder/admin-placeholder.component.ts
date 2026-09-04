import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

/**
 * Placeholder for admin menu items not fully implemented yet.
 */
@Component({
  selector: 'app-admin-placeholder',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="placeholder-page">
      <h1>{{ title }}</h1>
      <p>This section is coming soon. Use the sidebar for modules that are already available.</p>
      <a routerLink="/admin/dashboard" class="back-link">← Back to dashboard</a>
    </div>
  `,
  styles: [`
    .placeholder-page {
      background: #fff;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      max-width: 640px;
    }
    h1 { margin: 0 0 12px; color: #2c3e50; }
    p { color: #666; margin: 0 0 24px; }
    .back-link { color: #667eea; font-weight: 600; text-decoration: none; }
  `]
})
export class AdminPlaceholderComponent {
  title = 'Coming soon';

  constructor(private route: ActivatedRoute) {
    this.title = this.route.snapshot.data['title'] || this.title;
  }
}
