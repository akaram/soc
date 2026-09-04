import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { petsBasePath } from './pets-portal.util';

/** Pet activity log placeholder with working back navigation. */
@Component({
  selector: 'app-pet-activities',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <div class="header">
        <button type="button" class="icon-btn" (click)="goBack()" aria-label="Back">←</button>
        <h1>Pet Activity</h1>
      </div>
      <div class="card">
        <p>Activity tracking for this pet will be available in a future release.</p>
        <button type="button" class="btn" (click)="goBack()">Back to Pet List</button>
      </div>
    </div>
  `,
  styles: [
    `
      .page { min-height: 100vh; background: #f5f5f5; }
      .header {
        display: flex; align-items: center; gap: 12px;
        padding: 14px 16px; background: #10b981; color: #fff;
      }
      .header h1 { margin: 0; font-size: 1.2rem; }
      .icon-btn {
        border: none; background: rgba(255,255,255,0.2); border-radius: 8px;
        width: 40px; height: 40px; cursor: pointer; color: #fff; font-size: 1.2rem;
      }
      .card {
        margin: 16px; padding: 20px; background: #fff; border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }
      .btn {
        margin-top: 12px; padding: 10px 16px; border: none; border-radius: 8px;
        background: #10b981; color: #fff; font-weight: 600; cursor: pointer;
      }
    `
  ]
})
export class PetActivitiesComponent implements OnInit {
  private basePath = '/admin/pets';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.basePath = petsBasePath(this.router.url);
  }

  goBack(): void {
    this.router.navigate([this.basePath]);
  }
}
