/**
 * Models for income & expenditure statement.
 */

export type IncomeExpenditurePeriod = 'monthly' | 'quarterly' | 'yearly';

export interface IncomeExpenditureItem {
  id: string;
  code: string;
  name: string;
  category: 'income' | 'expense';
  subCategory?: string;
  amount: number;
  parentId?: string;
  isHeader: boolean;
  level: number;
  budget?: number;
  variance?: number;
}

export interface IncomeExpenditureData {
  periodStart: Date;
  periodEnd: Date;
  financialYear: string;
  period: IncomeExpenditurePeriod;
  income: {
    operating: IncomeExpenditureItem[];
    nonOperating: IncomeExpenditureItem[];
    total: number;
  };
  expenses: {
    operating: IncomeExpenditureItem[];
    nonOperating: IncomeExpenditureItem[];
    total: number;
  };
  netIncome: number;
  grossProfit: number;
  operatingProfit: number;
}

export interface IncomeExpenditureSummary {
  totalIncome: number;
  totalExpenses: number;
  grossProfit: number;
  operatingProfit: number;
  netIncome: number;
  profitMargin: number;
  expenseRatio: number;
  growthRate: number;
}

export interface IncomeExpenditureResponse {
  statement: IncomeExpenditureData;
  summary: IncomeExpenditureSummary;
}
