import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ComplaintsApiService, ComplaintRow } from '../../../core/services/complaints-api.service';

@Component({
  selector: 'app-complaint-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './complaint-detail.component.html',
  styleUrls: ['./complaint-detail.component.css']
})
export class ComplaintDetailComponent implements OnInit {
  row: ComplaintRow | null = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private api: ComplaintsApiService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading = false;
      return;
    }
    this.api.getById(id).subscribe({
      next: r => {
        this.row = r;
        this.loading = false;
      },
      error: () => {
        this.row = null;
        this.loading = false;
      }
    });
  }
}
