/**
 * Models for budget vs actual variance report.
 */

export type BudgetVariancePeriod = 'monthly' | 'quarterly' | 'yearly';

export interface BudgetVarianceItem {
  id: string;
  code: string;
  name: string;
  category: 'income' | 'expense';
  subCategory?: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
  isFavorable: boolean;
  parentId?: string;
  isHeader: boolean;
  level: number;
}

export interface BudgetVarianceSection {
  items: BudgetVarianceItem[];
  totalBudget: number;
  totalActual: number;
  totalVariance: number;
}

export interface BudgetVarianceData {
  periodStart: Date;
  periodEnd: Date;
  financialYear: string;
  period: BudgetVariancePeriod;
  income: BudgetVarianceSection;
  expenses: BudgetVarianceSection;
  netIncome: {
    budget: number;
    actual: number;
    variance: number;
  };
}

export interface VarianceSummary {
  totalIncomeBudget: number;
  totalIncomeActual: number;
  totalIncomeVariance: number;
  totalExpenseBudget: number;
  totalExpenseActual: number;
  totalExpenseVariance: number;
  netIncomeBudget: number;
  netIncomeActual: number;
  netIncomeVariance: number;
  favorableVariances: number;
  unfavorableVariances: number;
  variancePercentage: number;
}

export interface BudgetVarianceResponse {
  report: BudgetVarianceData;
  summary: VarianceSummary;
}
