import { MeterReading, UtilityBill, UtilityRate } from '../models/utility-bill.model';
import {
  MeteredBill,
  MeteredMeter,
  MeteredRate,
  MeteredReading
} from '../models/metered-utility.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date(0);
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

function meterKey(flatNumber: string, utilityType: string, meterNumber: string): string {
  return `${flatNumber}|${utilityType}|${meterNumber}`.toLowerCase();
}

function readingMonthFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Map API utility rate to metered rate card shape. */
export function mapToMeteredRate(rate: UtilityRate): MeteredRate {
  const tiers = rate.slabRates?.map((s: { min: number; max: number; rate: number }) => ({
    from: s.min,
    to: s.max > 0 ? s.max : undefined,
    rate: s.rate
  }));
  return {
    id: rate.id,
    utilityType: rate.utilityType as MeteredRate['utilityType'],
    rateType: tiers && tiers.length > 0 ? 'tiered' : 'fixed',
    baseRate: rate.unitRate,
    fixedCharges: rate.baseCharge,
    tiers,
    validFrom: rate.effectiveFrom,
    validUntil: rate.effectiveTo,
    isActive: rate.isActive,
    createdAt: rate.effectiveFrom
  };
}

/** Map API bill to metered bill table shape. */
export function mapToMeteredBill(bill: UtilityBill): MeteredBill {
  const subtotal = Math.max(0, bill.totalAmount - bill.tax);
  const meterId = meterKey(bill.flatNumber, bill.utilityType, bill.meterNumber ?? '');
  let status: MeteredBill['status'] = 'pending';
  if (bill.status === 'paid') {
    status = 'paid';
  } else if (bill.status === 'overdue') {
    status = 'overdue';
  } else if (bill.status === 'cancelled') {
    status = 'cancelled';
  }

  return {
    id: bill.id,
    billNumber: bill.billNumber,
    meterId,
    meterNumber: bill.meterNumber ?? '—',
    utilityType: bill.utilityType as MeteredBill['utilityType'],
    residentId: bill.residentId,
    residentName: bill.residentName,
    flatNumber: bill.flatNumber,
    previousReading: bill.previousReading,
    currentReading: bill.currentReading,
    consumption: bill.consumption,
    rate: bill.unitRate,
    fixedCharges: bill.baseCharge,
    subtotal,
    tax: bill.tax,
    totalAmount: bill.totalAmount,
    billDate: bill.billDate,
    dueDate: bill.dueDate,
    status,
    paidDate: bill.paymentDate,
    createdAt: bill.generatedAt
  };
}

/**
 * Expand single-value API readings into metered rows with previous/consumption.
 */
export function mapToMeteredReadings(
  apiReadings: MeterReading[],
  bills: UtilityBill[]
): MeteredReading[] {
  const grouped = new Map<string, MeterReading[]>();
  for (const r of apiReadings) {
    const key = meterKey(r.flatNumber, r.utilityType, r.meterNumber);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(r);
  }

  const billedMonths = new Set(
    bills.map(b => `${b.flatNumber}|${b.utilityType}|${b.billMonth}`.toLowerCase())
  );

  const result: MeteredReading[] = [];
  for (const [key, rows] of grouped.entries()) {
    const sorted = [...rows].sort((a, b) => a.readingDate.getTime() - b.readingDate.getTime());
    let previous = 0;
    for (const row of sorted) {
      const current = row.reading;
      const consumption = Math.max(0, current - previous);
      const month = readingMonthFromDate(row.readingDate);
      const billed = billedMonths.has(`${row.flatNumber}|${row.utilityType}|${month}`.toLowerCase());
      let status: MeteredReading['status'] = 'pending';
      if (billed) {
        status = 'billed';
      } else if (row.status === 'verified') {
        status = 'verified';
      }

      result.push({
        id: row.id,
        meterId: key,
        meterNumber: row.meterNumber,
        utilityType: row.utilityType,
        flatNumber: row.flatNumber,
        previousReading: previous,
        currentReading: current,
        consumption,
        readingDate: row.readingDate,
        readingMonth: month,
        readBy: row.readBy,
        notes: row.notes,
        status,
        createdAt: row.readingDate
      });
      previous = current;
    }
  }

  return result.sort((a, b) => b.readingDate.getTime() - a.readingDate.getTime());
}

/** Build meter registry from enriched readings and bills. */
export function buildMetersFromData(
  readings: MeteredReading[],
  bills: MeteredBill[]
): MeteredMeter[] {
  const map = new Map<string, MeteredMeter>();
  for (const r of readings) {
    if (map.has(r.meterId)) {
      continue;
    }
    const bill = bills.find(
      b => b.flatNumber === r.flatNumber && b.utilityType === r.utilityType
    );
    map.set(r.meterId, {
      id: r.meterId,
      meterNumber: r.meterNumber,
      utilityType: r.utilityType,
      residentId: bill?.residentId ?? r.flatNumber,
      residentName: bill?.residentName ?? `Flat ${r.flatNumber}`,
      flatNumber: r.flatNumber,
      isActive: true,
      createdAt: r.createdAt
    });
  }
  return Array.from(map.values());
}

/** Parse optional status from raw API reading JSON fields. */
export function readingStatusFromRaw(raw: Record<string, unknown>): MeteredReading['status'] | undefined {
  const s = String(raw['status'] ?? '');
  if (s === 'verified' || s === 'billed' || s === 'pending') {
    return s;
  }
  return undefined;
}

export { parseDate, meterKey, readingMonthFromDate };
