/**
 * Models for petty cash management.
 */

export type PettyCashLedgerStatus = 'active' | 'inactive';

export type PettyCashCategory =
  | 'office-supplies'
  | 'maintenance'
  | 'travel'
  | 'utilities'
  | 'staff-welfare'
  | 'other';

export type PettyCashTransactionType = 'debit' | 'credit';

export type PettyCashVoucherStatus = 'pending' | 'approved' | 'rejected' | 'posted';

export interface PettyCashLedger {
  id: string;
  name: string;
  location: string;
  custodian: string;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  creditLimit: number;
  dailyLimit: number;
  status: PettyCashLedgerStatus;
}

export interface PettyCashTransaction {
  id: string;
  ledgerId: string;
  date: Date;
  voucherNumber: string;
  description: string;
  category: PettyCashCategory;
  type: PettyCashTransactionType;
  amount: number;
  requestedBy: string;
  approvedBy?: string;
  status: PettyCashVoucherStatus;
  remarks?: string;
}

export interface PettyCashSummary {
  totalDebits: number;
  totalCredits: number;
  netOutflow: number;
  remainingBalance: number;
  pendingApprovals: number;
  todaysSpend: number;
}

export interface CreatePettyCashVoucherRequest {
  ledgerId: string;
  date: string;
  voucherNumber?: string;
  description: string;
  category: PettyCashCategory;
  type: PettyCashTransactionType;
  amount: number;
  requestedBy: string;
  remarks?: string;
}
