/**
 * Models for customizable billing cycles.
 */

export type BillingCycleType = 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'custom';

export type ApplicableTo = 'all' | 'residents' | 'commercial' | 'mixed';

export type LateFeeType = 'fixed' | 'percentage';

export interface BillingCycle {
  id: string;
  name: string;
  description: string;
  cycleType: BillingCycleType;
  startDate: Date;
  endDate?: Date;
  billingDay: number;
  billingFrequency: number;
  isActive: boolean;
  applicableTo: ApplicableTo;
  autoGenerate: boolean;
  reminderDays: number[];
  lateFeeEnabled: boolean;
  lateFeeAmount?: number;
  lateFeeType?: LateFeeType;
  gracePeriodDays: number;
  createdAt: Date;
  updatedAt: Date;
}
