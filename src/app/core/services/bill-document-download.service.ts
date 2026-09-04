import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';

/** Line item row shown on a printable bill / invoice document. */
export interface BillDocumentLineItem {
  description: string;
  quantity?: number | string;
  rate?: number;
  amount: number;
  meta?: string;
}

/** Payload used to render and download a bill, invoice, or receipt document. */
export interface BillDocumentData {
  documentTitle: string;
  documentNumber: string;
  recipientName: string;
  recipientAddress?: string;
  flatNumber?: string;
  building?: string;
  issueDate?: Date | string;
  dueDate?: Date | string;
  status?: string;
  lineItems: BillDocumentLineItem[];
  /** Extra key/value rows (meter readings, GSTIN, etc.) shown above totals. */
  summaryRows?: { label: string; value: string }[];
  totalAmount: number;
  paidAmount?: number;
  balance?: number;
  notes?: string;
  footerLines?: string[];
}

/**
 * Downloads bills/invoices as real PDF via backend OpenPDF; falls back to print dialog if API is unavailable.
 */
@Injectable({ providedIn: 'root' })
export class BillDocumentDownloadService {
  private http = inject(HttpClient);

  /** Request binary PDF from API and save as .pdf in Downloads. */
  downloadBillPdf(data: BillDocumentData): void {
    const payload = this.toApiPayload(data);
    this.http
      .post('/documents/bill/pdf', payload, { responseType: 'blob' })
      .pipe(
        catchError(() => {
          this.printForPdf(data);
          return EMPTY;
        })
      )
      .subscribe(blob => {
        const baseName = this.safeFilename(data.documentNumber || data.documentTitle);
        this.triggerDownload(blob, `${baseName}.pdf`);
      });
  }

  /** Fallback: open browser print dialog → user can choose Save as PDF. */
  printForPdf(data: BillDocumentData): void {
    const html = this.buildHtml(data);
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    const doc = iframe.contentDocument ?? win?.document;
    if (!doc || !win) {
      document.body.removeChild(iframe);
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    win.focus();
    setTimeout(() => {
      win.print();
      setTimeout(() => document.body.removeChild(iframe), 500);
    }, 250);
  }

  private toApiPayload(data: BillDocumentData): Record<string, unknown> {
    return {
      documentTitle: data.documentTitle,
      documentNumber: data.documentNumber,
      recipientName: data.recipientName,
      recipientAddress: data.recipientAddress,
      flatNumber: data.flatNumber,
      building: data.building,
      issueDate: this.formatDate(data.issueDate),
      dueDate: this.formatDate(data.dueDate),
      status: data.status,
      lineItems: (data.lineItems ?? []).map(item => ({
        description: item.description,
        quantity: item.quantity != null ? String(item.quantity) : undefined,
        rate: item.rate,
        amount: item.amount,
        meta: item.meta
      })),
      summaryRows: data.summaryRows ?? [],
      totalAmount: data.totalAmount,
      paidAmount: data.paidAmount,
      balance: data.balance,
      notes: data.notes,
      footerLines: data.footerLines
    };
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  private safeFilename(value: string): string {
    const cleaned = value.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return cleaned || 'document';
  }

  private formatDate(value?: Date | string): string {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private formatMoney(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount ?? 0);
  }

  private escapeHtml(text: string | number | undefined | null): string {
    if (text === undefined || text === null) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Printable HTML used only when backend PDF export is unavailable. */
  private buildHtml(data: BillDocumentData): string {
    const lineRows = (data.lineItems ?? [])
      .map(item => {
        const meta = item.meta ? `<div class="meta">${this.escapeHtml(item.meta)}</div>` : '';
        return `<tr>
          <td>${this.escapeHtml(item.description)}${meta}</td>
          <td class="num">${item.quantity != null ? this.escapeHtml(item.quantity) : '—'}</td>
          <td class="num">${item.rate != null ? this.escapeHtml(this.formatMoney(Number(item.rate))) : '—'}</td>
          <td class="num">${this.escapeHtml(this.formatMoney(item.amount))}</td>
        </tr>`;
      })
      .join('');

    const summaryRows = (data.summaryRows ?? [])
      .map(
        row =>
          `<tr><td colspan="3">${this.escapeHtml(row.label)}</td><td class="num">${this.escapeHtml(row.value)}</td></tr>`
      )
      .join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${this.escapeHtml(data.documentTitle)}</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px}th{background:#f5f5f5}</style>
      </head><body>
      <h1>${this.escapeHtml(data.documentTitle)}</h1>
      <p>No. ${this.escapeHtml(data.documentNumber)}</p>
      <table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
      <tbody>${lineRows}${summaryRows}</tbody></table>
      <p><strong>Total:</strong> ${this.escapeHtml(this.formatMoney(data.totalAmount))}</p>
      </body></html>`;
  }
}
