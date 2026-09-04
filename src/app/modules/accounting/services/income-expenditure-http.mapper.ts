import {
  IncomeExpenditureData,
  IncomeExpenditureItem,
  IncomeExpenditurePeriod,
  IncomeExpenditureResponse,
  IncomeExpenditureSummary
} from '../models/income-expenditure.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date();
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

function mapItem(raw: Record<string, unknown>): IncomeExpenditureItem {
  return {
    id: String(raw['id'] ?? ''),
    code: String(raw['code'] ?? ''),
    name: String(raw['name'] ?? ''),
    category: (raw['category'] ?? 'income') as IncomeExpenditureItem['category'],
    subCategory: raw['subCategory'] != null ? String(raw['subCategory']) : undefined,
    amount: Number(raw['amount'] ?? 0),
    parentId: raw['parentId'] != null ? String(raw['parentId']) : undefined,
    isHeader: Boolean(raw['isHeader']),
    level: Number(raw['level'] ?? 0),
    budget: raw['budget'] != null ? Number(raw['budget']) : undefined,
    variance: raw['variance'] != null ? Number(raw['variance']) : undefined
  };
}

function mapItems(raw: unknown): IncomeExpenditureItem[] {
  return Array.isArray(raw) ? (raw as Record<string, unknown>[]).map(mapItem) : [];
}

function mapStatement(raw: Record<string, unknown>): IncomeExpenditureData {
  const income = (raw['income'] ?? {}) as Record<string, unknown>;
  const expenses = (raw['expenses'] ?? {}) as Record<string, unknown>;
  return {
    periodStart: parseDate(raw['periodStart']),
    periodEnd: parseDate(raw['periodEnd']),
    financialYear: String(raw['financialYear'] ?? ''),
    period: (raw['period'] ?? 'monthly') as IncomeExpenditurePeriod,
    income: {
      operating: mapItems(income['operating']),
      nonOperating: mapItems(income['nonOperating']),
      total: Number(income['total'] ?? 0)
    },
    expenses: {
      operating: mapItems(expenses['operating']),
      nonOperating: mapItems(expenses['nonOperating']),
      total: Number(expenses['total'] ?? 0)
    },
    netIncome: Number(raw['netIncome'] ?? 0),
    grossProfit: Number(raw['grossProfit'] ?? 0),
    operatingProfit: Number(raw['operatingProfit'] ?? 0)
  };
}

function mapSummary(raw: Record<string, unknown>): IncomeExpenditureSummary {
  return {
    totalIncome: Number(raw['totalIncome'] ?? 0),
    totalExpenses: Number(raw['totalExpenses'] ?? 0),
    grossProfit: Number(raw['grossProfit'] ?? 0),
    operatingProfit: Number(raw['operatingProfit'] ?? 0),
    netIncome: Number(raw['netIncome'] ?? 0),
    profitMargin: Number(raw['profitMargin'] ?? 0),
    expenseRatio: Number(raw['expenseRatio'] ?? 0),
    growthRate: Number(raw['growthRate'] ?? 0)
  };
}

/** Maps GET /income-expenditure-statements response. */
export function mapIncomeExpenditureResponseFromApi(raw: Record<string, unknown>): IncomeExpenditureResponse {
  return {
    statement: mapStatement((raw['statement'] ?? {}) as Record<string, unknown>),
    summary: mapSummary((raw['summary'] ?? {}) as Record<string, unknown>)
  };
}
