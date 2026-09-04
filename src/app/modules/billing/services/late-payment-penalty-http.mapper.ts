import {
  PenaltyApplication,
  PenaltyApplicationStatus,
  PenaltyApplicableTo,
  PenaltyRule,
  PenaltyTier,
  PenaltyType,
  CalculationPeriod
} from '../models/late-payment-penalty.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date(0);
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

export function mapPenaltyRuleFromApi(raw: Record<string, unknown>): PenaltyRule {
  const tiers = Array.isArray(raw['tiers'])
    ? (raw['tiers'] as Record<string, unknown>[]).map(
        t =>
          ({
            daysFrom: Number(t['daysFrom'] ?? 0),
            daysTo: t['daysTo'] != null ? Number(t['daysTo']) : undefined,
            penaltyType: (t['penaltyType'] ?? 'fixed') as PenaltyTier['penaltyType'],
            amount: t['amount'] != null ? Number(t['amount']) : undefined,
            percentage: t['percentage'] != null ? Number(t['percentage']) : undefined
          }) satisfies PenaltyTier
      )
    : undefined;

  return {
    id: String(raw['id'] ?? ''),
    name: String(raw['name'] ?? ''),
    description: String(raw['description'] ?? ''),
    penaltyType: (raw['penaltyType'] ?? 'fixed') as PenaltyType,
    applicableTo: (raw['applicableTo'] ?? 'all') as PenaltyApplicableTo,
    gracePeriodDays: Number(raw['gracePeriodDays'] ?? 0),
    isActive: Boolean(raw['isActive'] ?? true),
    autoCalculate: Boolean(raw['autoCalculate']),
    createdAt: parseDate(raw['createdAt']),
    updatedAt: parseDate(raw['updatedAt']),
    fixedAmount: raw['fixedAmount'] != null ? Number(raw['fixedAmount']) : undefined,
    maxPenaltyAmount: raw['maxPenaltyAmount'] != null ? Number(raw['maxPenaltyAmount']) : undefined,
    percentageRate: raw['percentageRate'] != null ? Number(raw['percentageRate']) : undefined,
    calculationPeriod:
      raw['calculationPeriod'] != null
        ? (raw['calculationPeriod'] as CalculationPeriod)
        : undefined,
    maxPenaltyPercentage:
      raw['maxPenaltyPercentage'] != null ? Number(raw['maxPenaltyPercentage']) : undefined,
    tiers
  };
}

export function mapPenaltyApplicationFromApi(raw: Record<string, unknown>): PenaltyApplication {
  return {
    id: String(raw['id'] ?? ''),
    invoiceId: String(raw['invoiceId'] ?? ''),
    invoiceNumber: String(raw['invoiceNumber'] ?? ''),
    residentId: String(raw['residentId'] ?? ''),
    residentName: String(raw['residentName'] ?? ''),
    flatNumber: String(raw['flatNumber'] ?? ''),
    originalAmount: Number(raw['originalAmount'] ?? 0),
    dueDate: parseDate(raw['dueDate']),
    penaltyDate: parseDate(raw['penaltyDate']),
    daysLate: Number(raw['daysLate'] ?? 0),
    penaltyAmount: Number(raw['penaltyAmount'] ?? 0),
    penaltyRuleId: String(raw['penaltyRuleId'] ?? ''),
    penaltyRuleName: String(raw['penaltyRuleName'] ?? ''),
    status: (raw['status'] ?? 'pending') as PenaltyApplicationStatus,
    notes: raw['notes'] != null ? String(raw['notes']) : undefined,
    source: raw['source'] != null ? String(raw['source']) : undefined,
    createdAt: parseDate(raw['createdAt'])
  };
}
