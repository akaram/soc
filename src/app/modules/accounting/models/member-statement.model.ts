/**
 * Models for per-flat member financial statements.
 */

export type StatementTransactionType =
  | 'invoice'
  | 'payment'
  | 'adjustment'
  | 'credit'
  | 'refund'
  | 'penalty'
  | 'discount';

export type StatementTransactionStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export type FlatUnitType = 'apartment' | 'villa' | 'shop' | 'office';

export interface MemberStatementFlat {
  id: string;
  unitNumber: string;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  floor?: string;
  area?: number;
  type?: FlatUnitType;
}

export interface StatementTransaction {
  id: string;
  date: Date;
  transactionType: StatementTransactionType;
  referenceNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  category?: string;
  invoiceNumber?: string;
  paymentMethod?: string;
  status: StatementTransactionStatus;
  dueDate?: Date;
  daysOverdue?: number;
}

export interface StatementAgingAnalysis {
  current: number;
  '1-30': number;
  '31-60': number;
  '61-90': number;
  '90+': number;
}

export interface StatementSummary {
  totalInvoices: number;
  totalPayments: number;
  totalAdjustments: number;
  totalCredits: number;
  totalDebits: number;
  netAmount: number;
  overdueAmount: number;
  currentAmount: number;
}

export interface MemberStatement {
  flatId: string;
  flatNumber: string;
  ownerName: string;
  statementPeriod: {
    startDate: Date;
    endDate: Date;
  };
  openingBalance: number;
  transactions: StatementTransaction[];
  closingBalance: number;
  summary: StatementSummary;
  agingAnalysis: StatementAgingAnalysis;
}

export interface MemberStatementResponse {
  statement: MemberStatement;
}
