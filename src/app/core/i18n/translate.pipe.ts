import { Pipe, PipeTransform, inject } from '@angular/core';
import { LocaleService } from './locale.service';

/**
 * Template pipe: {{ 'nav.dashboard' | t }}
 * Impure so labels refresh when language changes in Settings.
 */
@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private locale = inject(LocaleService);

  transform(key: string): string {
    this.locale.languageChanged$.value;
    return this.locale.t(key);
  }
}
