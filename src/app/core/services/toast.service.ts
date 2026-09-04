import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/** Toast severity — maps to green / yellow / red UI. */
export type ToastType = 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: number;
  type: ToastType;
  text: string;
}

/**
 * App-wide toast notifications (replaces browser alert for admin flows).
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  private readonly itemsSubject = new BehaviorSubject<ToastMessage[]>([]);
  readonly items$ = this.itemsSubject.asObservable();

  success(text: string, durationMs = 4500): void {
    this.show('success', text, durationMs);
  }

  warning(text: string, durationMs = 5000): void {
    this.show('warning', text, durationMs);
  }

  error(text: string, durationMs = 6000): void {
    this.show('error', text, durationMs);
  }

  dismiss(id: number): void {
    this.itemsSubject.next(this.itemsSubject.value.filter(t => t.id !== id));
  }

  private show(type: ToastType, text: string, durationMs: number): void {
    const id = ++this.seq;
    const toast: ToastMessage = { id, type, text };
    this.itemsSubject.next([...this.itemsSubject.value, toast]);
    window.setTimeout(() => this.dismiss(id), durationMs);
  }
}
