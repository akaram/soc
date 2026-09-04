import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AiAssistantService, AssistantReply, AI_KB_MODULE_CODE } from '../../core/services/ai-assistant.service';
import { ModuleRecordService, SocietyModuleRecordRow } from '../../core/services/module-record.service';
import { SessionContextService } from '../../core/services/session-context.service';
import { ToastService } from '../../core/services/toast.service';

interface ChatMessage {
  from: 'user' | 'assistant';
  text: string;
  actions?: { label: string; route: string }[];
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="module-page">
      <div class="page-header">
        <h1><i class="material-icons">smart_toy</i> AI Virtual Assistant</h1>
        <p>Instant answers pulled live from your society's data — 24/7, no waiting</p>
      </div>

      <div *ngIf="!societyId" class="banner warn">
        <i class="material-icons">info</i>
        <span>
          Select a society in
          <a class="inline-link" routerLink="/admin/societies">Society Setup</a>
          to chat with the assistant.
        </span>
      </div>

      <ng-container *ngIf="societyId">
        <div class="chat-card">
          <div class="chat-log">
            <div class="msg" [class.user]="m.from === 'user'" *ngFor="let m of messages">
              <div class="bubble">
                <p *ngFor="let line of m.text.split('\\n')">{{ line }}</p>
                <div class="actions" *ngIf="m.actions?.length">
                  <a *ngFor="let a of m.actions" [routerLink]="a.route" class="action-link">{{ a.label }}</a>
                </div>
              </div>
            </div>
            <div class="msg" *ngIf="thinking">
              <div class="bubble thinking">Thinking…</div>
            </div>
          </div>

          <div class="quick-actions">
            <button type="button" *ngFor="let q of quickActions" class="chip" (click)="send(q)">{{ q }}</button>
          </div>

          <form class="chat-input" (ngSubmit)="send(draft)">
            <input
              type="text"
              [(ngModel)]="draft"
              name="draft"
              placeholder="Ask about complaints, dues, SOS, visitors…"
              autocomplete="off"
            />
            <button type="submit" class="btn-primary" [disabled]="!draft.trim() || thinking">
              <i class="material-icons">send</i>
            </button>
          </form>
        </div>

        <div class="card kb-card">
          <div class="kb-header" (click)="showKb = !showKb">
            <h3><i class="material-icons">menu_book</i> Manage knowledge base</h3>
            <i class="material-icons">{{ showKb ? 'expand_less' : 'expand_more' }}</i>
          </div>

          <div class="kb-body" *ngIf="showKb">
            <p class="hint">Add FAQ entries the assistant should answer directly (e.g. "visiting hours" → "9 AM to 9 PM").</p>

            <div class="kb-form">
              <input type="text" [(ngModel)]="draftQuestion" name="draftQuestion" placeholder="Keyword / question" />
              <textarea rows="2" [(ngModel)]="draftAnswer" name="draftAnswer" placeholder="Answer"></textarea>
              <button type="button" class="btn-primary" [disabled]="!draftQuestion.trim() || !draftAnswer.trim()" (click)="addKbEntry()">
                {{ editingId ? 'Update' : 'Add' }}
              </button>
            </div>

            <ul class="kb-list" *ngIf="kbEntries.length">
              <li *ngFor="let e of kbEntries">
                <div>
                  <strong>{{ e.title }}</strong>
                  <p>{{ e.body }}</p>
                </div>
                <div class="kb-actions">
                  <button type="button" class="link" (click)="editKbEntry(e)">Edit</button>
                  <button type="button" class="link danger" (click)="deleteKbEntry(e)">Delete</button>
                </div>
              </li>
            </ul>
            <p class="muted" *ngIf="!kbEntries.length">No FAQ entries yet.</p>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [
    `
      .module-page { padding: 24px; max-width: 900px; }
      .page-header h1 { display: flex; align-items: center; gap: 10px; margin: 0 0 8px; font-size: 26px; color: #2c3e50; }
      .page-header p { margin: 0; color: #64748b; }
      .banner { display: flex; gap: 10px; padding: 14px 16px; border-radius: 10px; margin: 16px 0; }
      .banner.warn { background: #fffbeb; color: #92400e; }
      .inline-link { color: #667eea; font-weight: 600; }

      .chat-card { background: white; border-radius: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); margin: 20px 0; overflow: hidden; }
      .chat-log { max-height: 420px; min-height: 200px; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
      .msg { display: flex; }
      .msg.user { justify-content: flex-end; }
      .bubble { background: #f1f5f9; border-radius: 14px; padding: 12px 16px; max-width: 75%; }
      .msg.user .bubble { background: #667eea; color: white; }
      .bubble p { margin: 0 0 4px; white-space: pre-wrap; }
      .bubble p:last-child { margin-bottom: 0; }
      .bubble.thinking { color: #94a3b8; font-style: italic; }
      .actions { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
      .action-link {
        background: white; color: #667eea; border-radius: 8px; padding: 6px 10px; font-size: 12px;
        text-decoration: none; font-weight: 600; border: 1px solid #e2e8f0;
      }

      .quick-actions { display: flex; gap: 8px; flex-wrap: wrap; padding: 0 20px 14px; }
      .chip {
        background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 999px; padding: 6px 14px;
        font-size: 12px; cursor: pointer; color: #475569;
      }
      .chip:hover { background: #eef2ff; border-color: #667eea; color: #4338ca; }

      .chat-input { display: flex; gap: 10px; padding: 14px 20px; border-top: 1px solid #f1f5f9; }
      .chat-input input {
        flex: 1; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 14px;
      }
      .btn-primary {
        background: #667eea; color: white; border: none; border-radius: 10px; width: 44px; height: 44px;
        display: flex; align-items: center; justify-content: center; cursor: pointer;
      }
      .btn-primary:disabled { background: #c7d2fe; cursor: not-allowed; }

      .card { background: white; border-radius: 14px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); overflow: hidden; }
      .kb-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; cursor: pointer; }
      .kb-header h3 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 16px; color: #1e293b; }
      .kb-body { padding: 0 20px 20px; }
      .hint { color: #64748b; font-size: 13px; margin: 0 0 14px; }
      .kb-form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
      .kb-form input, .kb-form textarea {
        padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; box-sizing: border-box;
      }
      .kb-form .btn-primary { width: auto; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; }
      .kb-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
      .kb-list li { display: flex; justify-content: space-between; gap: 10px; padding: 10px; background: #f8fafc; border-radius: 8px; }
      .kb-list strong { font-size: 13px; color: #1e293b; }
      .kb-list p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
      .kb-actions { display: flex; flex-direction: column; gap: 4px; }
      .link { background: none; border: none; color: #667eea; cursor: pointer; font-size: 12px; padding: 0; }
      .link.danger { color: #e74c3c; }
      .muted { color: #94a3b8; font-size: 13px; }
    `
  ]
})
export class AiAssistantComponent implements OnInit {
  societyId = '';
  draft = '';
  thinking = false;
  messages: ChatMessage[] = [
    {
      from: 'assistant',
      text: "Hi! I'm your society assistant. Ask me about complaints, dues, SOS alerts, visitors, or approvals."
    }
  ];
  quickActions: string[] = [];

  showKb = false;
  kbEntries: SocietyModuleRecordRow[] = [];
  draftQuestion = '';
  draftAnswer = '';
  editingId: string | null = null;

  constructor(
    private assistant: AiAssistantService,
    private moduleRecords: ModuleRecordService,
    private session: SessionContextService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.societyId = this.session.getSocietyId() ?? '';
    this.quickActions = this.assistant.quickActions;
    if (this.societyId) {
      this.loadKb();
    }
  }

  send(text: string): void {
    const question = text.trim();
    if (!question) return;
    this.messages.push({ from: 'user', text: question });
    this.draft = '';
    this.thinking = true;
    this.assistant.ask(question).subscribe({
      next: (reply: AssistantReply) => {
        this.messages.push({ from: 'assistant', text: reply.text, actions: reply.actions });
        this.thinking = false;
      },
      error: () => {
        this.messages.push({ from: 'assistant', text: 'Something went wrong — please try again.' });
        this.thinking = false;
      }
    });
  }

  loadKb(): void {
    this.moduleRecords.list(this.societyId, AI_KB_MODULE_CODE).subscribe(rows => (this.kbEntries = rows ?? []));
  }

  addKbEntry(): void {
    if (!this.societyId || !this.draftQuestion.trim() || !this.draftAnswer.trim()) return;
    const save$ = this.editingId
      ? this.moduleRecords.update(this.editingId, { title: this.draftQuestion.trim(), body: this.draftAnswer.trim() })
      : this.moduleRecords.create({
          societyId: this.societyId,
          moduleCode: AI_KB_MODULE_CODE,
          title: this.draftQuestion.trim(),
          body: this.draftAnswer.trim(),
          status: 'ACTIVE'
        });
    save$.subscribe(() => {
      this.draftQuestion = '';
      this.draftAnswer = '';
      this.editingId = null;
      this.loadKb();
    });
  }

  editKbEntry(e: SocietyModuleRecordRow): void {
    this.editingId = e.id;
    this.draftQuestion = e.title;
    this.draftAnswer = e.body ?? '';
  }

  deleteKbEntry(e: SocietyModuleRecordRow): void {
    this.moduleRecords.delete(e.id).subscribe({
      next: () => {
        this.toast.warning('FAQ entry deleted.');
        this.loadKb();
      },
      error: () => this.toast.error('Could not delete FAQ entry.')
    });
  }
}
