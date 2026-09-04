import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BRANDING } from '../constants/branding.constants';

/** Reusable SGC Technology logo with consistent sizing across admin, mobile, and landing. */
@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <img
      [src]="logoSrc"
      [alt]="logoAlt"
      class="app-logo"
      [class.size-sm]="size === 'sm'"
      [class.size-md]="size === 'md'"
      [class.size-lg]="size === 'lg'"
      [class.size-xl]="size === 'xl'"
      [class.on-dark]="onDark"
      decoding="async"
    />
  `,
  styles: [`
    .app-logo {
      display: block;
      width: auto;
      object-fit: contain;
    }

    .size-sm {
      max-height: 32px;
      max-width: 150px;
    }

    .size-md {
      max-height: 40px;
      max-width: 190px;
    }

    .size-lg {
      max-height: 56px;
      max-width: 260px;
    }

    .size-xl {
      max-height: 80px;
      max-width: 340px;
    }

    /* Logo asset includes a dark backdrop; soften edges on colored panels. */
    .on-dark {
      border-radius: 10px;
    }
  `],
})
export class AppLogoComponent {
  /** Preset height/width caps for common layout slots. */
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

  /** Use on gradient or dark backgrounds (login screens, footer). */
  @Input() onDark = false;

  readonly logoSrc = BRANDING.logoPath;
  readonly logoAlt = BRANDING.logoAlt;
}
