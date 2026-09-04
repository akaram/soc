import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';

/** Field work order shown on the Facility Manager / staff Tasks screen. */
export interface StaffWorkOrder {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  location: string;
  dueLabel: string;
  status: 'pending' | 'in-progress' | 'completed';
}

/**
 * Staff mobile — assigned maintenance / ops tasks only (no billing or user admin).
 */
@Component({
  selector: 'app-staff-tasks',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="tasks-page">
      <div class="page-intro">
        <h2>My Tasks</h2>
        <p>Work orders assigned to you — update status on site.</p>
      </div>

      <div class="filter-row">
        <button
          type="button"
          class="chip"
          [class.active]="filter === 'open'"
          (click)="filter = 'open'"
        >
          Open ({{ openCount }})
        </button>
        <button
          type="button"
          class="chip"
          [class.active]="filter === 'done'"
          (click)="filter = 'done'"
        >
          Done ({{ doneCount }})
        </button>
        <button
          type="button"
          class="chip"
          [class.active]="filter === 'all'"
          (click)="filter = 'all'"
        >
          All
        </button>
      </div>

      <div class="empty" *ngIf="filtered.length === 0">
        <i class="material-icons">assignment_turned_in</i>
        <p>No tasks in this view.</p>
      </div>

      <article class="task-card" *ngFor="let task of filtered" [class.urgent]="task.priority === 'urgent'">
        <div class="priority" [class]="task.priority"></div>
        <div class="body">
          <div class="head">
            <h3>{{ task.title }}</h3>
            <span class="status" [class]="task.status">{{ statusLabel(task.status) }}</span>
          </div>
          <p class="meta">
            <i class="material-icons">category</i> {{ task.category }}
          </p>
          <p class="meta">
            <i class="material-icons">location_on</i> {{ task.location }}
          </p>
          <p class="meta">
            <i class="material-icons">schedule</i> {{ task.dueLabel }}
          </p>
          <div class="actions" *ngIf="task.status !== 'completed'">
            <button
              type="button"
              class="btn-secondary"
              *ngIf="task.status === 'pending'"
              (click)="startTask(task)"
            >
              Start
            </button>
            <button type="button" class="btn-primary" (click)="completeTask(task)">
              Mark done
            </button>
          </div>
        </div>
      </article>

      <a class="link-complaints" routerLink="/mobile/complaints">
        <i class="material-icons">support_agent</i>
        Open complaints assigned to me
      </a>
    </div>
  `,
  styles: [`
    .tasks-page {
      padding: 16px 16px 100px;
      background: #f5f7fa;
      min-height: 100%;
    }
    .page-intro h2 { margin: 0 0 4px; font-size: 20px; color: #1e293b; }
    .page-intro p { margin: 0 0 16px; font-size: 13px; color: #64748b; }
    .filter-row { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .chip {
      border: 1px solid #e2e8f0;
      background: white;
      border-radius: 999px;
      padding: 8px 14px;
      font-size: 13px;
      cursor: pointer;
      color: #475569;
    }
    .chip.active { background: #0f766e; color: white; border-color: #0f766e; }
    .empty {
      text-align: center;
      padding: 40px 16px;
      color: #94a3b8;
      background: white;
      border-radius: 12px;
    }
    .empty .material-icons { font-size: 40px; display: block; margin-bottom: 8px; }
    .task-card {
      display: flex;
      gap: 0;
      background: white;
      border-radius: 14px;
      margin-bottom: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .task-card.urgent { box-shadow: 0 2px 8px rgba(220, 38, 38, 0.15); }
    .priority { width: 5px; flex-shrink: 0; }
    .priority.urgent { background: #dc2626; }
    .priority.high { background: #ea580c; }
    .priority.medium { background: #ca8a04; }
    .priority.low { background: #64748b; }
    .body { flex: 1; padding: 14px 16px; }
    .head { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
    .head h3 { margin: 0; font-size: 16px; color: #1e293b; }
    .status {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 999px;
      white-space: nowrap;
    }
    .status.pending { background: #ffedd5; color: #9a3412; }
    .status.in-progress { background: #dbeafe; color: #1d4ed8; }
    .status.completed { background: #dcfce7; color: #166534; }
    .meta {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 6px 0 0;
      font-size: 13px;
      color: #64748b;
    }
    .meta .material-icons { font-size: 16px; }
    .actions { display: flex; gap: 8px; margin-top: 12px; }
    .btn-primary, .btn-secondary {
      border: none;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primary { background: #0f766e; color: white; }
    .btn-secondary { background: #e2e8f0; color: #334155; }
    .link-complaints {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 20px;
      padding: 14px;
      background: white;
      border-radius: 12px;
      color: #0f766e;
      font-weight: 600;
      text-decoration: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
  `]
})
export class StaffTasksComponent implements OnInit {
  filter: 'open' | 'done' | 'all' = 'open';
  tasks: StaffWorkOrder[] = [];

  constructor(private toast: ToastService) {}

  ngOnInit(): void {
    this.tasks = this.loadOrSeed();
  }

  get openCount(): number {
    return this.tasks.filter(t => t.status !== 'completed').length;
  }

  get doneCount(): number {
    return this.tasks.filter(t => t.status === 'completed').length;
  }

  get filtered(): StaffWorkOrder[] {
    if (this.filter === 'open') {
      return this.tasks.filter(t => t.status !== 'completed');
    }
    if (this.filter === 'done') {
      return this.tasks.filter(t => t.status === 'completed');
    }
    return this.tasks;
  }

  statusLabel(status: StaffWorkOrder['status']): string {
    if (status === 'in-progress') return 'In progress';
    if (status === 'completed') return 'Done';
    return 'Pending';
  }

  startTask(task: StaffWorkOrder): void {
    task.status = 'in-progress';
    this.persist();
    this.toast.success(`Started: ${task.title}`);
  }

  completeTask(task: StaffWorkOrder): void {
    task.status = 'completed';
    this.persist();
    this.toast.success(`Completed: ${task.title}`);
  }

  private storageKey(): string {
    return 'poc:staffWorkOrders';
  }

  private persist(): void {
    localStorage.setItem(this.storageKey(), JSON.stringify(this.tasks));
  }

  private loadOrSeed(): StaffWorkOrder[] {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (raw) {
        const parsed = JSON.parse(raw) as StaffWorkOrder[];
        if (Array.isArray(parsed) && parsed.length) {
          return parsed;
        }
      }
    } catch {
      /* seed below */
    }
    return [
      {
        id: '1',
        title: 'Fix AC in Flat A-501',
        priority: 'urgent',
        category: 'HVAC',
        location: 'Tower A, 5th Floor',
        dueLabel: 'Due in 2h',
        status: 'in-progress'
      },
      {
        id: '2',
        title: 'Pool cleaning and chemical check',
        priority: 'high',
        category: 'Maintenance',
        location: 'Swimming Pool Area',
        dueLabel: 'Due in 4h',
        status: 'pending'
      },
      {
        id: '3',
        title: 'Generator monthly inspection',
        priority: 'medium',
        category: 'Equipment',
        location: 'Basement',
        dueLabel: 'Due today',
        status: 'pending'
      },
      {
        id: '4',
        title: 'Garden maintenance — tree pruning',
        priority: 'low',
        category: 'Landscaping',
        location: 'Garden Area',
        dueLabel: 'Due tomorrow',
        status: 'pending'
      }
    ];
  }
}
