import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastMessage, ToastService } from '../services/toast.service';

/** Fixed toast stack (top-right) for admin and shared screens. */
@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack" aria-live="polite">
      <div
        *ngFor="let t of toasts"
        class="toast"
        [class.success]="t.type === 'success'"
        [class.warning]="t.type === 'warning'"
        [class.error]="t.type === 'error'"
        (click)="dismiss(t.id)">
        <span class="icon">{{ icon(t) }}</span>
        <span class="text">{{ t.text }}</span>
        <button type="button" class="close" aria-label="Dismiss">×</button>
      </div>
    </div>
  `,
  styles: [
    `
      .toast-stack {
        position: fixed;
        top: 76px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: min(420px, calc(100vw - 32px));
        pointer-events: none;
      }
      .toast {
        pointer-events: auto;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px 14px;
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        border-left: 4px solid transparent;
        background: #fff;
        color: #1f2937;
        cursor: pointer;
        animation: slideIn 0.25s ease;
      }
      .toast.success {
        border-left-color: #22c55e;
        background: #f0fdf4;
      }
      .toast.warning {
        border-left-color: #eab308;
        background: #fefce8;
      }
      .toast.error {
        border-left-color: #ef4444;
        background: #fef2f2;
      }
      .icon {
        font-size: 18px;
        line-height: 1.2;
      }
      .text {
        flex: 1;
        font-size: 14px;
        line-height: 1.4;
      }
      .close {
        border: none;
        background: transparent;
        font-size: 18px;
        line-height: 1;
        color: #6b7280;
        cursor: pointer;
        padding: 0;
      }
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(12px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `
  ]
})
export class ToastContainerComponent {
  toasts: ToastMessage[] = [];

  constructor(private toast: ToastService) {
    this.toast.items$.subscribe(items => (this.toasts = items));
  }

  dismiss(id: number): void {
    this.toast.dismiss(id);
  }

  icon(t: ToastMessage): string {
    if (t.type === 'success') return '✓';
    if (t.type === 'warning') return '⚠';
    return '✕';
  }
}
