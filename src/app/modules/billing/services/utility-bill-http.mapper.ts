import {
  MeterReading,
  UtilityBill,
  UtilityBillStatus,
  UtilityRate,
  UtilityType
} from '../models/utility-bill.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date(0);
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

/** Maps GET /utility-bills JSON to UtilityBill. */
export function mapUtilityBillFromApi(raw: Record<string, unknown>): UtilityBill {
  return {
    id: String(raw['id'] ?? ''),
    billNumber: String(raw['billNumber'] ?? ''),
    residentId: String(raw['residentId'] ?? ''),
    residentName: String(raw['residentName'] ?? ''),
    flatNumber: String(raw['flatNumber'] ?? ''),
    building: raw['building'] != null ? String(raw['building']) : undefined,
    utilityType: (raw['utilityType'] ?? 'other') as UtilityType,
    billMonth: String(raw['billMonth'] ?? ''),
    billDate: parseDate(raw['billDate']),
    dueDate: parseDate(raw['dueDate']),
    previousReading: Number(raw['previousReading'] ?? 0),
    currentReading: Number(raw['currentReading'] ?? 0),
    consumption: Number(raw['consumption'] ?? 0),
    unitRate: Number(raw['unitRate'] ?? 0),
    baseCharge: Number(raw['baseCharge'] ?? 0),
    tax: Number(raw['tax'] ?? 0),
    totalAmount: Number(raw['totalAmount'] ?? 0),
    paidAmount: Number(raw['paidAmount'] ?? 0),
    balance: Number(raw['balance'] ?? 0),
    status: (raw['status'] ?? 'draft') as UtilityBillStatus,
    meterNumber: raw['meterNumber'] != null ? String(raw['meterNumber']) : undefined,
    paymentMethod: raw['paymentMethod'] != null ? String(raw['paymentMethod']) : undefined,
    paymentDate: raw['paymentDate'] != null ? parseDate(raw['paymentDate']) : undefined,
    notes: raw['notes'] != null ? String(raw['notes']) : undefined,
    generatedBy: String(raw['generatedBy'] ?? ''),
    generatedAt: parseDate(raw['generatedAt']),
    sentAt: raw['sentAt'] != null ? parseDate(raw['sentAt']) : undefined,
    reminderSent: Boolean(raw['reminderSent']),
    reminderCount: Number(raw['reminderCount'] ?? 0)
  };
}

export function mapMeterReadingFromApi(raw: Record<string, unknown>): MeterReading {
  return {
    id: String(raw['id'] ?? ''),
    residentId: raw['residentId'] != null ? String(raw['residentId']) : undefined,
    flatId: raw['flatId'] != null ? String(raw['flatId']) : undefined,
    flatNumber: String(raw['flatNumber'] ?? ''),
    utilityType: (raw['utilityType'] ?? 'electricity') as MeterReading['utilityType'],
    meterNumber: String(raw['meterNumber'] ?? ''),
    reading: Number(raw['reading'] ?? 0),
    readingDate: parseDate(raw['readingDate']),
    readingType: (raw['readingType'] ?? 'manual') as MeterReading['readingType'],
    readBy: String(raw['readBy'] ?? ''),
    notes: raw['notes'] != null ? String(raw['notes']) : undefined,
    photo: raw['photo'] != null ? String(raw['photo']) : undefined,
    status:
      raw['status'] === 'verified' || raw['status'] === 'billed' || raw['status'] === 'pending'
        ? (raw['status'] as MeterReading['status'])
        : undefined
  };
}

export function mapUtilityRateFromApi(raw: Record<string, unknown>): UtilityRate {
  return {
    id: String(raw['id'] ?? ''),
    utilityType: (raw['utilityType'] ?? 'electricity') as UtilityType,
    unitRate: Number(raw['unitRate'] ?? 0),
    baseCharge: Number(raw['baseCharge'] ?? 0),
    taxRate: Number(raw['taxRate'] ?? 0),
    slabRates: Array.isArray(raw['slabRates'])
      ? (raw['slabRates'] as { min: number; max: number; rate: number }[])
      : undefined,
    effectiveFrom: parseDate(raw['effectiveFrom']),
    effectiveTo: raw['effectiveTo'] != null ? parseDate(raw['effectiveTo']) : undefined,
    isActive: Boolean(raw['isActive'] ?? true)
  };
}
