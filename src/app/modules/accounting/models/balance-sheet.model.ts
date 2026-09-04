/**
 * Models for real-time balance sheet.
 */

export type BalanceSheetCategory =
  | 'current_asset'
  | 'non_current_asset'
  | 'current_liability'
  | 'non_current_liability'
  | 'equity';

export type BalanceSheetPeriod = 'monthly' | 'quarterly' | 'yearly';

export interface BalanceSheetItem {
  id: string;
  code: string;
  name: string;
  category: BalanceSheetCategory;
  subCategory?: string;
  amount: number;
  parentId?: string;
  isHeader: boolean;
  level: number;
}

export interface BalanceSheetData {
  asOfDate: Date;
  financialYear: string;
  period: BalanceSheetPeriod;
  assets: {
    current: BalanceSheetItem[];
    nonCurrent: BalanceSheetItem[];
    total: number;
  };
  liabilities: {
    current: BalanceSheetItem[];
    nonCurrent: BalanceSheetItem[];
    total: number;
  };
  equity: BalanceSheetItem[];
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
}

export interface BalanceSheetSummary {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  netWorth: number;
  currentRatio: number;
  debtToEquityRatio: number;
  isBalanced: boolean;
}

export interface BalanceSheetResponse {
  balanceSheet: BalanceSheetData;
  summary: BalanceSheetSummary;
}
