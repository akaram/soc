import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { LocaleService } from '../../core/i18n/locale.service';
import { SessionContextService } from '../../core/services/session-context.service';
import { ModuleRecordService, SocietyModuleRecordRow } from '../../core/services/module-record.service';
import { SocietySetupApiService, SocietyRow } from '../../admin/pages/society-setup/society-setup-api.service';
import { ToastService } from '../../core/services/toast.service';

const SETTINGS_MODULE_CODE = 'ADMIN_SETTINGS';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  template: `
    <div class="settings-page">
      <div class="page-header">
        <h1><i class="material-icons">settings</i> {{ 'settings.title' | t }}</h1>
        <p>{{ 'settings.subtitle' | t }}</p>
      </div>

      <div *ngIf="!societyId" class="banner warn">
        <i class="material-icons">info</i>
        <span>
          Select a society in
          <a class="inline-link" routerLink="/admin/societies">Society Setup</a>
          to manage settings.
        </span>
      </div>

      <div *ngIf="error" class="banner error">{{ error }}</div>
      <p class="loading-hint" *ngIf="loading">Loading settings…</p>

      <ng-container *ngIf="societyId && !loading">
        <div class="settings-grid">
          <div class="settings-card">
            <h3><i class="material-icons">apartment</i> {{ 'settings.societyInfo' | t }}</h3>
            <div class="setting-item">
              <label>{{ 'settings.societyName' | t }}</label>
              <input type="text" class="input-field" [(ngModel)]="settings.societyName" name="societyName" placeholder="Enter society name">
            </div>
            <div class="setting-item">
              <label>{{ 'settings.totalFlats' | t }}</label>
              <input type="number" class="input-field" [ngModel]="settings.totalFlats" name="totalFlats" disabled readonly>
              <p class="hint">Managed in <a routerLink="/admin/societies">Society Setup</a>.</p>
            </div>
            <div class="setting-item">
              <label>{{ 'settings.address' | t }}</label>
              <textarea class="input-field" rows="3" [(ngModel)]="settings.address" name="address" placeholder="Enter address"></textarea>
            </div>
            <div class="setting-item">
              <label>Phone</label>
              <input type="text" class="input-field" [(ngModel)]="settings.phone" name="phone" placeholder="Society contact number">
            </div>
            <div class="setting-item">
              <label>Email</label>
              <input type="email" class="input-field" [(ngModel)]="settings.email" name="email" placeholder="Society contact email">
            </div>
          </div>

          <div class="settings-card">
            <h3><i class="material-icons">notifications</i> {{ 'settings.notifications' | t }}</h3>
            <div class="setting-item">
              <label class="switch-label">
                <input type="checkbox" [(ngModel)]="settings.emailNotifications" name="emailNotifications">
                <span>{{ 'settings.emailNotifications' | t }}</span>
              </label>
            </div>
            <div class="setting-item">
              <label class="switch-label">
                <input type="checkbox" [(ngModel)]="settings.smsNotifications" name="smsNotifications">
                <span>{{ 'settings.smsNotifications' | t }}</span>
              </label>
            </div>
            <div class="setting-item">
              <label class="switch-label">
                <input type="checkbox" [(ngModel)]="settings.pushNotifications" name="pushNotifications">
                <span>{{ 'settings.pushNotifications' | t }}</span>
              </label>
            </div>
          </div>

          <div class="settings-card">
            <h3><i class="material-icons">payment</i> {{ 'settings.paymentGatewayTitle' | t }}</h3>
            <div class="setting-item">
              <label>{{ 'settings.merchantId' | t }}</label>
              <input type="text" placeholder="Enter Merchant ID" class="input-field" [(ngModel)]="settings.merchantId" name="merchantId">
            </div>
            <div class="setting-item">
              <label>{{ 'settings.paymentGateway' | t }}</label>
              <select class="input-field" [(ngModel)]="settings.paymentGateway" name="paymentGateway">
                <option value="SADAD">SADAD</option>
                <option value="Stripe">Stripe</option>
                <option value="Razorpay">Razorpay</option>
              </select>
            </div>
          </div>

          <div class="settings-card">
            <h3><i class="material-icons">language</i> {{ 'settings.localization' | t }}</h3>
            <div class="setting-item">
              <label>{{ 'settings.language' | t }}</label>
              <select class="input-field" [(ngModel)]="settings.language" name="language" (ngModelChange)="previewLanguage($event)">
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Arabic">Arabic</option>
                <option value="Tamil">Tamil</option>
                <option value="Telugu">Telugu</option>
                <option value="Bengali">Bengali</option>
                <option value="Marathi">Marathi</option>
                <option value="Kannada">Kannada</option>
              </select>
            </div>
            <div class="setting-item">
              <label>{{ 'settings.timezone' | t }}</label>
              <select class="input-field" [(ngModel)]="settings.timeZone" name="timeZone">
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              </select>
            </div>
          </div>
        </div>

        <div class="action-buttons">
          <button class="btn-primary" type="button" (click)="saveChanges()" [disabled]="saving">
            {{ saving ? 'Saving…' : ('settings.save' | t) }}
          </button>
          <button class="btn-secondary" type="button" (click)="resetToDefault()" [disabled]="saving">{{ 'settings.reset' | t }}</button>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .settings-page {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 32px;
      margin: 0 0 10px 0;
      color: #2c3e50;
    }

    .page-header h1 .material-icons {
      font-size: 40px;
      color: #3498db;
    }

    .page-header p {
      margin: 0 0 30px 0;
      color: #7f8c8d;
      font-size: 16px;
    }

    .banner { display: flex; gap: 10px; padding: 14px 16px; border-radius: 10px; margin: 0 0 20px; }
    .banner.warn { background: #fffbeb; color: #92400e; }
    .banner.error { background: #fdecea; color: #c0392b; }
    .inline-link { color: #667eea; font-weight: 600; }
    .loading-hint { color: #64748b; padding: 12px 0; }
    .hint { margin: 6px 0 0; font-size: 12px; color: #94a3b8; }
    .hint a { color: #3498db; }

    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
      margin-bottom: 30px;
    }

    .settings-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .settings-card h3 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 20px 0;
      color: #2c3e50;
      font-size: 18px;
    }

    .settings-card h3 .material-icons {
      color: #3498db;
    }

    .setting-item {
      margin-bottom: 20px;
    }

    .setting-item label {
      display: block;
      margin-bottom: 8px;
      color: #2c3e50;
      font-weight: 500;
      font-size: 14px;
    }

    .input-field {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }

    .input-field:focus {
      outline: none;
      border-color: #3498db;
    }

    .input-field:disabled {
      background: #f8fafc;
      color: #94a3b8;
    }

    .switch-label {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }

    .switch-label input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .action-buttons {
      display: flex;
      gap: 15px;
      justify-content: flex-end;
    }

    .btn-primary, .btn-secondary {
      padding: 12px 32px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #3498db;
      color: white;
    }

    .btn-primary:hover {
      background: #2980b9;
    }

    .btn-primary:disabled {
      background: #a5d0ea;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: white;
      color: #3498db;
      border: 2px solid #3498db;
    }

    .btn-secondary:hover {
      background: #ecf0f1;
    }
  `]
})
export class SettingsComponent implements OnInit {
  /** Local cache key — fast paint + offline fallback; backend is the source of truth. */
  private readonly storageKey = 'societySettings';
  private readonly defaultSettings: SocietySettings = {
    societyName: '',
    totalFlats: 0,
    address: '',
    phone: '',
    email: '',
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    merchantId: '',
    paymentGateway: 'SADAD',
    language: 'English',
    timeZone: 'Asia/Kolkata',
  };

  settings: SocietySettings = { ...this.defaultSettings };
  societyId = '';
  loading = false;
  saving = false;
  error = '';
  private preferencesRecordId: string | null = null;

  constructor(
    private locale: LocaleService,
    private session: SessionContextService,
    private moduleRecords: ModuleRecordService,
    private societyApi: SocietySetupApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.settings = this.loadCachedSettings();
    this.locale.applyLanguageLabel(this.settings.language);
    this.societyId = this.session.getSocietyId() ?? '';
    if (this.societyId) {
      this.load();
    }
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.societyApi.getSocietyById(this.societyId).subscribe({
      next: (society: SocietyRow) => {
        this.settings.societyName = society.name ?? '';
        this.settings.address = society.address ?? '';
        this.settings.phone = society.phone ?? '';
        this.settings.email = society.email ?? '';
        // GET /societies/{id} returns the stale totalFlats counter, not a live count —
        // fetch the real flat count the same way Society Setup does.
        this.societyApi.countFlats(this.societyId).subscribe(count => (this.settings.totalFlats = count));
        this.loadPreferences();
      },
      error: err => {
        this.loading = false;
        this.error = (typeof err === 'string' && err) || 'Could not load society info.';
      }
    });
  }

  private loadPreferences(): void {
    this.moduleRecords.list(this.societyId, SETTINGS_MODULE_CODE).subscribe({
      next: (rows: SocietyModuleRecordRow[]) => {
        const record = rows?.[0];
        if (record?.body) {
          this.preferencesRecordId = record.id;
          try {
            const prefs = JSON.parse(record.body) as Partial<SocietySettings>;
            Object.assign(this.settings, prefs);
          } catch {
            /* ignore malformed preferences blob */
          }
        }
        this.locale.applyLanguageLabel(this.settings.language);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  previewLanguage(label: string): void {
    this.locale.applyLanguageLabel(label);
  }

  saveChanges(): void {
    if (!this.societyId) return;
    this.saving = true;
    this.error = '';

    this.societyApi
      .updateSociety(this.societyId, {
        name: this.settings.societyName.trim() || 'Society',
        address: this.settings.address,
        phone: this.settings.phone,
        email: this.settings.email
      })
      .subscribe({
        next: () => this.savePreferences(),
        error: err => {
          this.saving = false;
          this.error = (typeof err === 'string' && err) || 'Could not save society info.';
        }
      });
  }

  private savePreferences(): void {
    const prefs = {
      emailNotifications: this.settings.emailNotifications,
      smsNotifications: this.settings.smsNotifications,
      pushNotifications: this.settings.pushNotifications,
      merchantId: this.settings.merchantId,
      paymentGateway: this.settings.paymentGateway,
      language: this.settings.language,
      timeZone: this.settings.timeZone
    };
    const body = JSON.stringify(prefs);
    const save$ = this.preferencesRecordId
      ? this.moduleRecords.update(this.preferencesRecordId, { title: 'preferences', body })
      : this.moduleRecords.create({
          societyId: this.societyId,
          moduleCode: SETTINGS_MODULE_CODE,
          title: 'preferences',
          body,
          status: 'ACTIVE'
        });

    save$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: row => {
        this.preferencesRecordId = row.id;
        this.persistCache();
        this.locale.applyLanguageLabel(this.settings.language);
        this.toast.success(`${this.locale.t('settings.saved')} ${this.locale.t('settings.languageApplied')}`);
      },
      error: err => {
        const msg = err?.error?.message || err?.message || 'Could not save preferences.';
        this.error = msg;
        this.toast.error(msg);
      }
    });
  }

  resetToDefault(): void {
    const societyName = this.settings.societyName;
    const totalFlats = this.settings.totalFlats;
    this.settings = { ...this.defaultSettings, societyName, totalFlats };
    this.locale.applyLanguageLabel(this.settings.language);
    this.saveChanges();
  }

  private persistCache(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to cache settings locally', error);
    }
  }

  private loadCachedSettings(): SocietySettings {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return { ...this.defaultSettings };
      const parsed = JSON.parse(raw) as Partial<SocietySettings> | null;
      if (!parsed || typeof parsed !== 'object') return { ...this.defaultSettings };
      return { ...this.defaultSettings, ...parsed };
    } catch (error) {
      console.warn('Failed to load cached settings, using defaults', error);
      return { ...this.defaultSettings };
    }
  }
}

/** Strongly-typed settings model for the web settings page. */
type SocietySettings = {
  societyName: string;
  totalFlats: number;
  address: string;
  phone: string;
  email: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  merchantId: string;
  paymentGateway: 'SADAD' | 'Stripe' | 'Razorpay';
  language: string;
  timeZone: string;
};
