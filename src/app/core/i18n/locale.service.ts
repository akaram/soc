import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  ADMIN_TRANSLATIONS,
  AdminLangCode,
  LANGUAGE_LABEL_TO_CODE
} from './admin-translations';

const SETTINGS_STORAGE_KEY = 'societySettings';

/**
 * Admin UI locale — reads language from Settings (localStorage) and applies translations.
 */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  /** Emits whenever the active language changes so shells can refresh labels. */
  readonly languageChanged$ = new BehaviorSubject<AdminLangCode>(this.readStoredLanguageCode());

  get currentCode(): AdminLangCode {
    return this.languageChanged$.value;
  }

  get direction(): 'ltr' | 'rtl' {
    return this.currentCode === 'ar' ? 'rtl' : 'ltr';
  }

  constructor() {
    this.applyToDocument(this.currentCode);
  }

  /** Translate a key; falls back to English then the key itself. */
  t(key: string): string {
    const dict = ADMIN_TRANSLATIONS[this.currentCode] ?? ADMIN_TRANSLATIONS.en;
    return dict[key] ?? ADMIN_TRANSLATIONS.en[key] ?? key;
  }

  /** Called from Settings when user picks a language label (e.g. "Hindi"). */
  applyLanguageLabel(label: string): void {
    const code = LANGUAGE_LABEL_TO_CODE[label] ?? 'en';
    this.setLanguage(code);
  }

  setLanguage(code: AdminLangCode): void {
    this.languageChanged$.next(code);
    this.applyToDocument(code);
  }

  reloadFromStorage(): void {
    this.setLanguage(this.readStoredLanguageCode());
  }

  private readStoredLanguageCode(): AdminLangCode {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) {
        return 'en';
      }
      const parsed = JSON.parse(raw) as { language?: string };
      const label = parsed?.language ?? 'English';
      return LANGUAGE_LABEL_TO_CODE[label] ?? 'en';
    } catch {
      return 'en';
    }
  }

  private applyToDocument(code: AdminLangCode): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.lang = code;
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
  }
}
