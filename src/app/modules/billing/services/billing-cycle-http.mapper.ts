import {
  ApplicableTo,
  BillingCycle,
  BillingCycleType,
  LateFeeType
} from '../models/billing-cycle.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date(0);
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

/** Maps GET /billing-cycles JSON to BillingCycle. */
export function mapBillingCycleFromApi(raw: Record<string, unknown>): BillingCycle {
  const reminderDays = Array.isArray(raw['reminderDays'])
    ? (raw['reminderDays'] as unknown[]).map(d => Number(d))
    : [];

  return {
    id: String(raw['id'] ?? ''),
    name: String(raw['name'] ?? ''),
    description: String(raw['description'] ?? ''),
    cycleType: (raw['cycleType'] ?? 'monthly') as BillingCycleType,
    startDate: parseDate(raw['startDate']),
    endDate: raw['endDate'] != null ? parseDate(raw['endDate']) : undefined,
    billingDay: Number(raw['billingDay'] ?? 1),
    billingFrequency: Number(raw['billingFrequency'] ?? 30),
    isActive: Boolean(raw['isActive'] ?? true),
    applicableTo: (raw['applicableTo'] ?? 'all') as ApplicableTo,
    autoGenerate: Boolean(raw['autoGenerate']),
    reminderDays,
    lateFeeEnabled: Boolean(raw['lateFeeEnabled']),
    lateFeeAmount: raw['lateFeeAmount'] != null ? Number(raw['lateFeeAmount']) : undefined,
    lateFeeType: raw['lateFeeType'] != null ? (raw['lateFeeType'] as LateFeeType) : undefined,
    gracePeriodDays: Number(raw['gracePeriodDays'] ?? 0),
    createdAt: parseDate(raw['createdAt']),
    updatedAt: parseDate(raw['updatedAt'])
  };
}
