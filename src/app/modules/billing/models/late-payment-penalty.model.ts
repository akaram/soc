/**
 * Models for late payment penalties.
 */

export type PenaltyType = 'fixed' | 'percentage' | 'progressive';

export type PenaltyApplicableTo = 'all' | 'maintenance' | 'utility' | 'service' | 'custom';

export type CalculationPeriod = 'daily' | 'weekly' | 'monthly';

export type PenaltyApplicationStatus = 'pending' | 'applied' | 'waived' | 'disputed';

export interface PenaltyTier {
  daysFrom: number;
  daysTo?: number;
  penaltyType: 'fixed' | 'percentage';
  amount?: number;
  percentage?: number;
}

export interface PenaltyRule {
  id: string;
  name: string;
  description: string;
  penaltyType: PenaltyType;
  applicableTo: PenaltyApplicableTo;
  gracePeriodDays: number;
  isActive: boolean;
  autoCalculate: boolean;
  createdAt: Date;
  updatedAt: Date;
  fixedAmount?: number;
  maxPenaltyAmount?: number;
  percentageRate?: number;
  calculationPeriod?: CalculationPeriod;
  maxPenaltyPercentage?: number;
  tiers?: PenaltyTier[];
}

export interface PenaltyApplication {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  residentId: string;
  residentName: string;
  flatNumber: string;
  originalAmount: number;
  dueDate: Date;
  penaltyDate: Date;
  daysLate: number;
  penaltyAmount: number;
  penaltyRuleId: string;
  penaltyRuleName: string;
  status: PenaltyApplicationStatus;
  notes?: string;
  source?: string;
  createdAt: Date;
}
