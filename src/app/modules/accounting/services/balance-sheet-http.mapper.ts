import {
  BalanceSheetCategory,
  BalanceSheetData,
  BalanceSheetItem,
  BalanceSheetPeriod,
  BalanceSheetResponse,
  BalanceSheetSummary
} from '../models/balance-sheet.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date();
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

function mapItem(raw: Record<string, unknown>): BalanceSheetItem {
  return {
    id: String(raw['id'] ?? ''),
    code: String(raw['code'] ?? ''),
    name: String(raw['name'] ?? ''),
    category: (raw['category'] ?? 'current_asset') as BalanceSheetCategory,
    subCategory: raw['subCategory'] != null ? String(raw['subCategory']) : undefined,
    amount: Number(raw['amount'] ?? 0),
    parentId: raw['parentId'] != null ? String(raw['parentId']) : undefined,
    isHeader: Boolean(raw['isHeader']),
    level: Number(raw['level'] ?? 0)
  };
}

function mapItems(raw: unknown): BalanceSheetItem[] {
  return Array.isArray(raw) ? (raw as Record<string, unknown>[]).map(mapItem) : [];
}

function mapBalanceSheet(raw: Record<string, unknown>): BalanceSheetData {
  const assets = (raw['assets'] ?? {}) as Record<string, unknown>;
  const liabilities = (raw['liabilities'] ?? {}) as Record<string, unknown>;
  return {
    asOfDate: parseDate(raw['asOfDate']),
    financialYear: String(raw['financialYear'] ?? ''),
    period: (raw['period'] ?? 'yearly') as BalanceSheetPeriod,
    assets: {
      current: mapItems(assets['current']),
      nonCurrent: mapItems(assets['nonCurrent']),
      total: Number(assets['total'] ?? 0)
    },
    liabilities: {
      current: mapItems(liabilities['current']),
      nonCurrent: mapItems(liabilities['nonCurrent']),
      total: Number(liabilities['total'] ?? 0)
    },
    equity: mapItems(raw['equity']),
    totalEquity: Number(raw['totalEquity'] ?? 0),
    totalLiabilitiesAndEquity: Number(raw['totalLiabilitiesAndEquity'] ?? 0)
  };
}

function mapSummary(raw: Record<string, unknown>): BalanceSheetSummary {
  return {
    totalAssets: Number(raw['totalAssets'] ?? 0),
    totalLiabilities: Number(raw['totalLiabilities'] ?? 0),
    totalEquity: Number(raw['totalEquity'] ?? 0),
    totalLiabilitiesAndEquity: Number(raw['totalLiabilitiesAndEquity'] ?? 0),
    netWorth: Number(raw['netWorth'] ?? 0),
    currentRatio: Number(raw['currentRatio'] ?? 0),
    debtToEquityRatio: Number(raw['debtToEquityRatio'] ?? 0),
    isBalanced: Boolean(raw['isBalanced'])
  };
}

/** Maps GET /balance-sheets response. */
export function mapBalanceSheetResponseFromApi(raw: Record<string, unknown>): BalanceSheetResponse {
  return {
    balanceSheet: mapBalanceSheet((raw['balanceSheet'] ?? {}) as Record<string, unknown>),
    summary: mapSummary((raw['summary'] ?? {}) as Record<string, unknown>)
  };
}
