/**
 * Models for defaulters report with aging analysis.
 */

export type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+';

export type DefaulterInvoiceType = 'maintenance' | 'utility' | 'parking' | 'amenity' | 'other';

export interface DefaulterRecord {
  id: string;
  unitNumber: string;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  invoiceAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  daysOverdue: number;
  agingBucket: AgingBucket;
  invoiceType: DefaulterInvoiceType;
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  notes?: string;
}

export interface AgingSummary {
  current: number;
  '1-30': number;
  '31-60': number;
  '61-90': number;
  '90+': number;
  total: number;
}

export interface DefaulterSummary {
  totalDefaulters: number;
  totalOutstanding: number;
  averageOutstanding: number;
  oldestOverdue: number;
  agingSummary: AgingSummary;
  defaultersByType: Record<DefaulterInvoiceType, number>;
  asOfDate?: Date;
  recordCount?: number;
}

export interface DefaultersReportResponse {
  asOfDate: Date;
  defaulters: DefaulterRecord[];
  summary: DefaulterSummary;
}
