import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

/**
 * Mobile Placeholder Page
 * Used for menu destinations that are not implemented yet, so navigation
 * doesn't fall through to app-level wildcard routes (which can look like a logout).
 */
@Component({
  selector: 'app-mobile-placeholder-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <div class="header">
        <button class="icon-btn" type="button" (click)="goBack()">
          <i class="material-icons">arrow_back</i>
        </button>
        <h2>{{ title }}</h2>
        <span style="width: 40px;"></span>
      </div>

      <div class="card">
        <p class="msg">{{ message }}</p>
        <button class="btn" type="button" (click)="goHome()">Back to Dashboard</button>
      </div>
    </div>
  `,
  styles: [
    `
      .page {
        min-height: 100vh;
        background: #f5f7fa;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        background: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }
      h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: #2c3e50;
      }
      .icon-btn {
        background: none;
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #2c3e50;
      }
      .card {
        margin: 16px;
        background: white;
        border-radius: 16px;
        padding: 16px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
      }
      .msg {
        margin: 0 0 14px 0;
        color: #64748b;
        line-height: 1.5;
        font-size: 14px;
      }
      .btn {
        width: 100%;
        padding: 12px 14px;
        border: none;
        border-radius: 12px;
        font-weight: 700;
        cursor: pointer;
        background: #667eea;
        color: white;
      }
    `
  ]
})
export class PlaceholderPageComponent implements OnInit {
  title = 'Coming soon';
  message = 'This page is not implemented yet.';

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Reads from route data so we can reuse for many menu links.
    const data = this.route.snapshot.data as { title?: string; message?: string };
    this.title = data?.title || this.title;
    this.message = data?.message || this.message;
  }

  goBack(): void {
    this.router.navigate(['/mobile/profile']);
  }

  goHome(): void {
    this.router.navigate(['/mobile/dashboard']);
  }
}

