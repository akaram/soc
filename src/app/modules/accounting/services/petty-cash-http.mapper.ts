import {
  PettyCashCategory,
  PettyCashLedger,
  PettyCashLedgerStatus,
  PettyCashTransaction,
  PettyCashTransactionType,
  PettyCashVoucherStatus
} from '../models/petty-cash.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date();
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

/** Maps ledger JSON from API. */
export function mapPettyCashLedgerFromApi(raw: Record<string, unknown>): PettyCashLedger {
  return {
    id: String(raw['id'] ?? ''),
    name: String(raw['name'] ?? ''),
    location: String(raw['location'] ?? ''),
    custodian: String(raw['custodian'] ?? ''),
    currency: String(raw['currency'] ?? 'INR'),
    openingBalance: Number(raw['openingBalance'] ?? 0),
    currentBalance: Number(raw['currentBalance'] ?? raw['openingBalance'] ?? 0),
    creditLimit: Number(raw['creditLimit'] ?? 0),
    dailyLimit: Number(raw['dailyLimit'] ?? 0),
    status: (raw['status'] ?? 'active') as PettyCashLedgerStatus
  };
}

/** Maps voucher JSON from API. */
export function mapPettyCashTransactionFromApi(raw: Record<string, unknown>): PettyCashTransaction {
  return {
    id: String(raw['id'] ?? ''),
    ledgerId: String(raw['ledgerId'] ?? ''),
    date: parseDate(raw['date']),
    voucherNumber: String(raw['voucherNumber'] ?? ''),
    description: String(raw['description'] ?? ''),
    category: (raw['category'] ?? 'other') as PettyCashCategory,
    type: (raw['type'] ?? 'debit') as PettyCashTransactionType,
    amount: Number(raw['amount'] ?? 0),
    requestedBy: String(raw['requestedBy'] ?? ''),
    approvedBy: raw['approvedBy'] != null ? String(raw['approvedBy']) : undefined,
    status: (raw['status'] ?? 'pending') as PettyCashVoucherStatus,
    remarks: raw['remarks'] != null ? String(raw['remarks']) : undefined
  };
}
