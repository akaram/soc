import {
  CashFlowTrend,
  ReceiptPaymentData,
  ReceiptPaymentItem,
  ReceiptPaymentPeriod,
  ReceiptPaymentResponse,
  ReceiptPaymentSummary
} from '../models/receipt-payment.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date();
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

function mapItem(raw: Record<string, unknown>): ReceiptPaymentItem {
  return {
    id: String(raw['id'] ?? ''),
    code: String(raw['code'] ?? ''),
    name: String(raw['name'] ?? ''),
    category: (raw['category'] ?? 'receipt') as ReceiptPaymentItem['category'],
    subCategory: raw['subCategory'] != null ? String(raw['subCategory']) : undefined,
    amount: Number(raw['amount'] ?? 0),
    parentId: raw['parentId'] != null ? String(raw['parentId']) : undefined,
    isHeader: Boolean(raw['isHeader']),
    level: Number(raw['level'] ?? 0),
    transactionDate: raw['transactionDate'] != null ? parseDate(raw['transactionDate']) : undefined,
    paymentMethod: raw['paymentMethod'] != null ? String(raw['paymentMethod']) : undefined
  };
}

function mapItems(raw: unknown): ReceiptPaymentItem[] {
  return Array.isArray(raw) ? (raw as Record<string, unknown>[]).map(mapItem) : [];
}

function mapStatement(raw: Record<string, unknown>): ReceiptPaymentData {
  const receipts = (raw['receipts'] ?? {}) as Record<string, unknown>;
  const payments = (raw['payments'] ?? {}) as Record<string, unknown>;
  return {
    periodStart: parseDate(raw['periodStart']),
    periodEnd: parseDate(raw['periodEnd']),
    financialYear: String(raw['financialYear'] ?? ''),
    period: (raw['period'] ?? 'monthly') as ReceiptPaymentPeriod,
    openingBalance: Number(raw['openingBalance'] ?? 0),
    receipts: {
      operating: mapItems(receipts['operating']),
      investing: mapItems(receipts['investing']),
      financing: mapItems(receipts['financing']),
      total: Number(receipts['total'] ?? 0)
    },
    payments: {
      operating: mapItems(payments['operating']),
      investing: mapItems(payments['investing']),
      financing: mapItems(payments['financing']),
      total: Number(payments['total'] ?? 0)
    },
    netCashFlow: Number(raw['netCashFlow'] ?? 0),
    closingBalance: Number(raw['closingBalance'] ?? 0)
  };
}

function mapSummary(raw: Record<string, unknown>): ReceiptPaymentSummary {
  return {
    totalReceipts: Number(raw['totalReceipts'] ?? 0),
    totalPayments: Number(raw['totalPayments'] ?? 0),
    netCashFlow: Number(raw['netCashFlow'] ?? 0),
    openingBalance: Number(raw['openingBalance'] ?? 0),
    closingBalance: Number(raw['closingBalance'] ?? 0),
    operatingCashFlow: Number(raw['operatingCashFlow'] ?? 0),
    investingCashFlow: Number(raw['investingCashFlow'] ?? 0),
    financingCashFlow: Number(raw['financingCashFlow'] ?? 0),
    cashFlowTrend: (raw['cashFlowTrend'] ?? 'neutral') as CashFlowTrend
  };
}

/** Maps GET /receipt-payment-statements response. */
export function mapReceiptPaymentResponseFromApi(raw: Record<string, unknown>): ReceiptPaymentResponse {
  return {
    statement: mapStatement((raw['statement'] ?? {}) as Record<string, unknown>),
    summary: mapSummary((raw['summary'] ?? {}) as Record<string, unknown>)
  };
}
