import {
  MemberStatement,
  MemberStatementFlat,
  MemberStatementResponse,
  StatementAgingAnalysis,
  StatementSummary,
  StatementTransaction,
  StatementTransactionStatus,
  StatementTransactionType
} from '../models/member-statement.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date();
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

function mapTransaction(raw: Record<string, unknown>): StatementTransaction {
  return {
    id: String(raw['id'] ?? ''),
    date: parseDate(raw['date']),
    transactionType: (raw['transactionType'] ?? 'invoice') as StatementTransactionType,
    referenceNumber: String(raw['referenceNumber'] ?? ''),
    description: String(raw['description'] ?? ''),
    debit: Number(raw['debit'] ?? 0),
    credit: Number(raw['credit'] ?? 0),
    balance: Number(raw['balance'] ?? 0),
    category: raw['category'] != null ? String(raw['category']) : undefined,
    invoiceNumber: raw['invoiceNumber'] != null ? String(raw['invoiceNumber']) : undefined,
    paymentMethod: raw['paymentMethod'] != null ? String(raw['paymentMethod']) : undefined,
    status: (raw['status'] ?? 'pending') as StatementTransactionStatus,
    dueDate: raw['dueDate'] != null ? parseDate(raw['dueDate']) : undefined,
    daysOverdue: raw['daysOverdue'] != null ? Number(raw['daysOverdue']) : undefined
  };
}

function mapSummary(raw: Record<string, unknown>): StatementSummary {
  return {
    totalInvoices: Number(raw['totalInvoices'] ?? 0),
    totalPayments: Number(raw['totalPayments'] ?? 0),
    totalAdjustments: Number(raw['totalAdjustments'] ?? 0),
    totalCredits: Number(raw['totalCredits'] ?? 0),
    totalDebits: Number(raw['totalDebits'] ?? 0),
    netAmount: Number(raw['netAmount'] ?? 0),
    overdueAmount: Number(raw['overdueAmount'] ?? 0),
    currentAmount: Number(raw['currentAmount'] ?? 0)
  };
}

function mapAging(raw: Record<string, unknown>): StatementAgingAnalysis {
  return {
    current: Number(raw['current'] ?? 0),
    '1-30': Number(raw['1-30'] ?? 0),
    '31-60': Number(raw['31-60'] ?? 0),
    '61-90': Number(raw['61-90'] ?? 0),
    '90+': Number(raw['90+'] ?? 0)
  };
}

function mapStatement(raw: Record<string, unknown>): MemberStatement {
  const period = (raw['statementPeriod'] ?? {}) as Record<string, unknown>;
  const txs = (raw['transactions'] ?? []) as Record<string, unknown>[];
  return {
    flatId: String(raw['flatId'] ?? ''),
    flatNumber: String(raw['flatNumber'] ?? ''),
    ownerName: String(raw['ownerName'] ?? ''),
    statementPeriod: {
      startDate: parseDate(period['startDate']),
      endDate: parseDate(period['endDate'])
    },
    openingBalance: Number(raw['openingBalance'] ?? 0),
    transactions: txs.map(mapTransaction),
    closingBalance: Number(raw['closingBalance'] ?? 0),
    summary: mapSummary((raw['summary'] ?? {}) as Record<string, unknown>),
    agingAnalysis: mapAging((raw['agingAnalysis'] ?? {}) as Record<string, unknown>)
  };
}

/** Maps GET /member-statements response. */
export function mapMemberStatementFromApi(raw: Record<string, unknown>): MemberStatementResponse {
  return {
    statement: mapStatement((raw['statement'] ?? {}) as Record<string, unknown>)
  };
}

/** Maps flat row from /member-statements/.../flats. */
export function mapMemberStatementFlatFromApi(raw: Record<string, unknown>): MemberStatementFlat {
  return {
    id: String(raw['id'] ?? ''),
    unitNumber: String(raw['unitNumber'] ?? ''),
    ownerName: String(raw['ownerName'] ?? ''),
    ownerEmail: raw['ownerEmail'] != null ? String(raw['ownerEmail']) : undefined,
    ownerPhone: raw['ownerPhone'] != null ? String(raw['ownerPhone']) : undefined,
    floor: raw['floor'] != null ? String(raw['floor']) : undefined,
    area: raw['area'] != null ? Number(raw['area']) : undefined,
    type: raw['type'] != null ? (raw['type'] as MemberStatementFlat['type']) : undefined
  };
}
