import {
  AgingBucket,
  DefaulterInvoiceType,
  DefaulterRecord,
  DefaulterSummary,
  DefaultersReportResponse
} from '../models/defaulters-report.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date();
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

function mapDefaulter(raw: Record<string, unknown>): DefaulterRecord {
  return {
    id: String(raw['id'] ?? ''),
    unitNumber: String(raw['unitNumber'] ?? ''),
    ownerName: String(raw['ownerName'] ?? ''),
    ownerEmail: raw['ownerEmail'] != null ? String(raw['ownerEmail']) : undefined,
    ownerPhone: raw['ownerPhone'] != null ? String(raw['ownerPhone']) : undefined,
    invoiceNumber: String(raw['invoiceNumber'] ?? ''),
    invoiceDate: parseDate(raw['invoiceDate']),
    dueDate: parseDate(raw['dueDate']),
    invoiceAmount: Number(raw['invoiceAmount'] ?? 0),
    paidAmount: Number(raw['paidAmount'] ?? 0),
    outstandingAmount: Number(raw['outstandingAmount'] ?? 0),
    daysOverdue: Number(raw['daysOverdue'] ?? 0),
    agingBucket: (raw['agingBucket'] ?? 'current') as AgingBucket,
    invoiceType: (raw['invoiceType'] ?? 'other') as DefaulterInvoiceType,
    lastPaymentDate: raw['lastPaymentDate'] != null ? parseDate(raw['lastPaymentDate']) : undefined,
    lastPaymentAmount: raw['lastPaymentAmount'] != null ? Number(raw['lastPaymentAmount']) : undefined,
    notes: raw['notes'] != null ? String(raw['notes']) : undefined
  };
}

function mapSummary(raw: Record<string, unknown>): DefaulterSummary {
  const aging = (raw['agingSummary'] ?? {}) as Record<string, unknown>;
  const byType = (raw['defaultersByType'] ?? {}) as Record<string, unknown>;
  return {
    totalDefaulters: Number(raw['totalDefaulters'] ?? 0),
    totalOutstanding: Number(raw['totalOutstanding'] ?? 0),
    averageOutstanding: Number(raw['averageOutstanding'] ?? 0),
    oldestOverdue: Number(raw['oldestOverdue'] ?? 0),
    agingSummary: {
      current: Number(aging['current'] ?? 0),
      '1-30': Number(aging['1-30'] ?? 0),
      '31-60': Number(aging['31-60'] ?? 0),
      '61-90': Number(aging['61-90'] ?? 0),
      '90+': Number(aging['90+'] ?? 0),
      total: Number(aging['total'] ?? 0)
    },
    defaultersByType: {
      maintenance: Number(byType['maintenance'] ?? 0),
      utility: Number(byType['utility'] ?? 0),
      parking: Number(byType['parking'] ?? 0),
      amenity: Number(byType['amenity'] ?? 0),
      other: Number(byType['other'] ?? 0)
    },
    asOfDate: raw['asOfDate'] != null ? parseDate(raw['asOfDate']) : undefined,
    recordCount: raw['recordCount'] != null ? Number(raw['recordCount']) : undefined
  };
}

/** Maps GET /defaulters-reports response. */
export function mapDefaultersReportFromApi(raw: Record<string, unknown>): DefaultersReportResponse {
  const defaulters = Array.isArray(raw['defaulters'])
    ? (raw['defaulters'] as Record<string, unknown>[]).map(mapDefaulter)
    : [];
  return {
    asOfDate: parseDate(raw['asOfDate']),
    defaulters,
    summary: mapSummary((raw['summary'] ?? {}) as Record<string, unknown>)
  };
}
