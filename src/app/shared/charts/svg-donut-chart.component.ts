import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartDatum } from './chart-types';

const DEFAULT_COLORS = ['#667eea', '#f5576c', '#43e97b', '#f39c12', '#4facfe', '#a78bfa'];
const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Segment {
  color: string;
  dashArray: string;
  dashOffset: number;
  label: string;
  value: number;
  percent: number;
}

/** Lightweight inline-SVG donut chart (stroke-dasharray technique) — no charting library dependency. */
@Component({
  selector: 'app-svg-donut-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="donut-chart" *ngIf="total > 0; else empty">
      <svg viewBox="0 0 160 160">
        <circle cx="80" cy="80" [attr.r]="radius" class="track" />
        <circle
          *ngFor="let seg of segments"
          cx="80"
          cy="80"
          [attr.r]="radius"
          fill="none"
          [attr.stroke]="seg.color"
          stroke-width="20"
          [attr.stroke-dasharray]="seg.dashArray"
          [attr.stroke-dashoffset]="seg.dashOffset"
          transform="rotate(-90 80 80)"
        />
        <text x="80" y="76" text-anchor="middle" class="total-value">{{ total }}</text>
        <text x="80" y="94" text-anchor="middle" class="total-label">Total</text>
      </svg>
      <ul class="legend">
        <li *ngFor="let seg of segments">
          <span class="swatch" [style.background]="seg.color"></span>
          {{ seg.label }} — {{ seg.value }} ({{ seg.percent }}%)
        </li>
      </ul>
    </div>
    <ng-template #empty>
      <p class="empty-hint">No data yet.</p>
    </ng-template>
  `,
  styles: [
    `
      .donut-chart { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
      svg { width: 160px; height: 160px; flex-shrink: 0; }
      .track { fill: none; stroke: #f1f5f9; stroke-width: 20; }
      .total-value { font-size: 24px; font-weight: 700; fill: #1e293b; }
      .total-label { font-size: 10px; fill: #94a3b8; }
      .legend { list-style: none; margin: 0; padding: 0; font-size: 13px; color: #475569; display: flex; flex-direction: column; gap: 8px; }
      .swatch { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 8px; }
      .empty-hint { color: #94a3b8; padding: 24px; text-align: center; }
    `
  ]
})
export class SvgDonutChartComponent {
  @Input() data: ChartDatum[] = [];
  readonly radius = RADIUS;

  get total(): number {
    return this.data.reduce((s, d) => s + d.value, 0);
  }

  get segments(): Segment[] {
    const total = this.total;
    if (!total) return [];
    let cumulative = 0;
    return this.data
      .filter(d => d.value > 0)
      .map((d, i) => {
        const fraction = d.value / total;
        const length = fraction * CIRCUMFERENCE;
        const seg: Segment = {
          color: d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
          dashArray: `${length} ${CIRCUMFERENCE - length}`,
          dashOffset: -cumulative,
          label: d.label,
          value: d.value,
          percent: Math.round(fraction * 100)
        };
        cumulative += length;
        return seg;
      });
  }
}
