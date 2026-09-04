import {
  BudgetVarianceData,
  BudgetVarianceItem,
  BudgetVariancePeriod,
  BudgetVarianceResponse,
  BudgetVarianceSection,
  VarianceSummary
} from '../models/budget-variance.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date();
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

function mapItem(raw: Record<string, unknown>): BudgetVarianceItem {
  return {
    id: String(raw['id'] ?? ''),
    code: String(raw['code'] ?? ''),
    name: String(raw['name'] ?? ''),
    category: (raw['category'] ?? 'income') as BudgetVarianceItem['category'],
    subCategory: raw['subCategory'] != null ? String(raw['subCategory']) : undefined,
    budgetAmount: Number(raw['budgetAmount'] ?? 0),
    actualAmount: Number(raw['actualAmount'] ?? 0),
    variance: Number(raw['variance'] ?? 0),
    variancePercentage: Number(raw['variancePercentage'] ?? 0),
    isFavorable: Boolean(raw['isFavorable']),
    parentId: raw['parentId'] != null ? String(raw['parentId']) : undefined,
    isHeader: Boolean(raw['isHeader']),
    level: Number(raw['level'] ?? 0)
  };
}

function mapItems(raw: unknown): BudgetVarianceItem[] {
  return Array.isArray(raw) ? (raw as Record<string, unknown>[]).map(mapItem) : [];
}

function mapSection(raw: Record<string, unknown>): BudgetVarianceSection {
  return {
    items: mapItems(raw['items']),
    totalBudget: Number(raw['totalBudget'] ?? 0),
    totalActual: Number(raw['totalActual'] ?? 0),
    totalVariance: Number(raw['totalVariance'] ?? 0)
  };
}

function mapReport(raw: Record<string, unknown>): BudgetVarianceData {
  const netIncome = (raw['netIncome'] ?? {}) as Record<string, unknown>;
  return {
    periodStart: parseDate(raw['periodStart']),
    periodEnd: parseDate(raw['periodEnd']),
    financialYear: String(raw['financialYear'] ?? ''),
    period: (raw['period'] ?? 'monthly') as BudgetVariancePeriod,
    income: mapSection((raw['income'] ?? {}) as Record<string, unknown>),
    expenses: mapSection((raw['expenses'] ?? {}) as Record<string, unknown>),
    netIncome: {
      budget: Number(netIncome['budget'] ?? 0),
      actual: Number(netIncome['actual'] ?? 0),
      variance: Number(netIncome['variance'] ?? 0)
    }
  };
}

function mapSummary(raw: Record<string, unknown>): VarianceSummary {
  return {
    totalIncomeBudget: Number(raw['totalIncomeBudget'] ?? 0),
    totalIncomeActual: Number(raw['totalIncomeActual'] ?? 0),
    totalIncomeVariance: Number(raw['totalIncomeVariance'] ?? 0),
    totalExpenseBudget: Number(raw['totalExpenseBudget'] ?? 0),
    totalExpenseActual: Number(raw['totalExpenseActual'] ?? 0),
    totalExpenseVariance: Number(raw['totalExpenseVariance'] ?? 0),
    netIncomeBudget: Number(raw['netIncomeBudget'] ?? 0),
    netIncomeActual: Number(raw['netIncomeActual'] ?? 0),
    netIncomeVariance: Number(raw['netIncomeVariance'] ?? 0),
    favorableVariances: Number(raw['favorableVariances'] ?? 0),
    unfavorableVariances: Number(raw['unfavorableVariances'] ?? 0),
    variancePercentage: Number(raw['variancePercentage'] ?? 0)
  };
}

/** Maps GET /budget-variance-reports response. */
export function mapBudgetVarianceResponseFromApi(raw: Record<string, unknown>): BudgetVarianceResponse {
  return {
    report: mapReport((raw['report'] ?? {}) as Record<string, unknown>),
    summary: mapSummary((raw['summary'] ?? {}) as Record<string, unknown>)
  };
}
