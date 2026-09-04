/**
 * Models for receipt & payment (cash flow) statement.
 */

export type ReceiptPaymentPeriod = 'monthly' | 'quarterly' | 'yearly';

export type CashFlowTrend = 'positive' | 'negative' | 'neutral';

export interface ReceiptPaymentItem {
  id: string;
  code: string;
  name: string;
  category: 'receipt' | 'payment';
  subCategory?: string;
  amount: number;
  parentId?: string;
  isHeader: boolean;
  level: number;
  transactionDate?: Date;
  paymentMethod?: string;
}

export interface ReceiptPaymentData {
  periodStart: Date;
  periodEnd: Date;
  financialYear: string;
  period: ReceiptPaymentPeriod;
  openingBalance: number;
  receipts: {
    operating: ReceiptPaymentItem[];
    investing: ReceiptPaymentItem[];
    financing: ReceiptPaymentItem[];
    total: number;
  };
  payments: {
    operating: ReceiptPaymentItem[];
    investing: ReceiptPaymentItem[];
    financing: ReceiptPaymentItem[];
    total: number;
  };
  netCashFlow: number;
  closingBalance: number;
}

export interface ReceiptPaymentSummary {
  totalReceipts: number;
  totalPayments: number;
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  cashFlowTrend: CashFlowTrend;
}

export interface ReceiptPaymentResponse {
  statement: ReceiptPaymentData;
  summary: ReceiptPaymentSummary;
}
