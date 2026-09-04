import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartDatum } from './chart-types';

const DEFAULT_COLORS = ['#667eea', '#4facfe', '#43e97b', '#f5576c', '#f39c12', '#38f9d7'];

/** Lightweight inline-SVG bar chart — no charting library dependency. */
@Component({
  selector: 'app-svg-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bar-chart" *ngIf="data.length; else empty">
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" preserveAspectRatio="xMidYMid meet">
        <line
          *ngFor="let g of gridLines"
          [attr.x1]="padding.left"
          [attr.x2]="width - padding.right"
          [attr.y1]="g.y"
          [attr.y2]="g.y"
          class="grid-line"
        />
        <text *ngFor="let g of gridLines" [attr.x]="padding.left - 6" [attr.y]="g.y + 4" class="axis-label" text-anchor="end">
          {{ g.label }}
        </text>
        <g *ngFor="let bar of bars">
          <rect
            [attr.x]="bar.x"
            [attr.y]="bar.y"
            [attr.width]="bar.width"
            [attr.height]="bar.height"
            [attr.fill]="bar.color"
            rx="4"
          />
          <text [attr.x]="bar.x + bar.width / 2" [attr.y]="bar.y - 6" text-anchor="middle" class="value-label">
            {{ bar.displayValue }}
          </text>
          <text [attr.x]="bar.x + bar.width / 2" [attr.y]="height - padding.bottom + 16" text-anchor="middle" class="axis-label">
            {{ bar.label }}
          </text>
        </g>
      </svg>
    </div>
    <ng-template #empty>
      <p class="empty-hint">No data yet.</p>
    </ng-template>
  `,
  styles: [
    `
      .bar-chart { width: 100%; }
      svg { width: 100%; height: 220px; display: block; }
      .grid-line { stroke: #eef2f7; stroke-width: 1; }
      .axis-label { font-size: 10px; fill: #94a3b8; }
      .value-label { font-size: 11px; fill: #334155; font-weight: 600; }
      .empty-hint { color: #94a3b8; padding: 24px; text-align: center; }
    `
  ]
})
export class SvgBarChartComponent {
  @Input() data: ChartDatum[] = [];
  @Input() formatValue: (v: number) => string = v => String(v);

  readonly width = 480;
  readonly height = 220;
  readonly padding = { top: 24, right: 16, bottom: 28, left: 40 };

  get maxValue(): number {
    const max = Math.max(1, ...this.data.map(d => d.value));
    return max;
  }

  get gridLines(): { y: number; label: string }[] {
    const steps = 4;
    const lines: { y: number; label: string }[] = [];
    const usableHeight = this.height - this.padding.top - this.padding.bottom;
    for (let i = 0; i <= steps; i++) {
      const value = (this.maxValue / steps) * i;
      const y = this.height - this.padding.bottom - (usableHeight / steps) * i;
      lines.push({ y, label: this.formatValue(Math.round(value)) });
    }
    return lines;
  }

  get bars(): Array<{ x: number; y: number; width: number; height: number; color: string; label: string; displayValue: string }> {
    const usableWidth = this.width - this.padding.left - this.padding.right;
    const usableHeight = this.height - this.padding.top - this.padding.bottom;
    const gap = 10;
    const barWidth = this.data.length ? (usableWidth - gap * (this.data.length - 1)) / this.data.length : 0;
    return this.data.map((d, i) => {
      const h = this.maxValue ? (d.value / this.maxValue) * usableHeight : 0;
      return {
        x: this.padding.left + i * (barWidth + gap),
        y: this.height - this.padding.bottom - h,
        width: Math.max(barWidth, 1),
        height: Math.max(h, 1),
        color: d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        label: d.label,
        displayValue: this.formatValue(d.value)
      };
    });
  }
}
