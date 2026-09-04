import {
  GSTConfiguration,
  GSTTaxRate,
  TaxCompliance,
  TaxManagementResponse,
  TaxSummary,
  TDSConfiguration,
  TDSRate
} from '../models/tax-management.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date();
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

function mapGstRate(raw: Record<string, unknown>): GSTTaxRate {
  return {
    id: String(raw['id'] ?? ''),
    hsnSac: String(raw['hsnSac'] ?? ''),
    description: String(raw['description'] ?? ''),
    cgstRate: Number(raw['cgstRate'] ?? 0),
    sgstRate: Number(raw['sgstRate'] ?? 0),
    igstRate: Number(raw['igstRate'] ?? 0),
    cessRate: Number(raw['cessRate'] ?? 0),
    effectiveFrom: parseDate(raw['effectiveFrom']),
    effectiveTo: raw['effectiveTo'] != null ? parseDate(raw['effectiveTo']) : undefined,
    isActive: raw['isActive'] !== false
  };
}

function mapTdsRate(raw: Record<string, unknown>): TDSRate {
  return {
    id: String(raw['id'] ?? ''),
    section: String(raw['section'] ?? ''),
    description: String(raw['description'] ?? ''),
    rate: Number(raw['rate'] ?? 0),
    threshold: Number(raw['threshold'] ?? 0),
    effectiveFrom: parseDate(raw['effectiveFrom']),
    effectiveTo: raw['effectiveTo'] != null ? parseDate(raw['effectiveTo']) : undefined,
    isActive: raw['isActive'] !== false
  };
}

function mapGstConfig(raw: Record<string, unknown>): GSTConfiguration {
  const rates = Array.isArray(raw['taxRates'])
    ? (raw['taxRates'] as Record<string, unknown>[]).map(mapGstRate)
    : [];
  return {
    gstin: String(raw['gstin'] ?? ''),
    businessName: String(raw['businessName'] ?? ''),
    registrationType: (raw['registrationType'] ?? 'regular') as GSTConfiguration['registrationType'],
    compositionRate: raw['compositionRate'] != null ? Number(raw['compositionRate']) : undefined,
    taxRates: rates,
    placeOfSupply: String(raw['placeOfSupply'] ?? ''),
    stateCode: String(raw['stateCode'] ?? '')
  };
}

function mapTdsConfig(raw: Record<string, unknown>): TDSConfiguration {
  const rates = Array.isArray(raw['tdsRates'])
    ? (raw['tdsRates'] as Record<string, unknown>[]).map(mapTdsRate)
    : [];
  return {
    pan: String(raw['pan'] ?? ''),
    tan: String(raw['tan'] ?? ''),
    businessName: String(raw['businessName'] ?? ''),
    tdsRates: rates
  };
}

function mapSummary(raw: Record<string, unknown>): TaxSummary {
  const gst = (raw['gst'] ?? {}) as Record<string, unknown>;
  const tds = (raw['tds'] ?? {}) as Record<string, unknown>;
  return {
    gst: {
      totalSales: Number(gst['totalSales'] ?? 0),
      totalPurchases: Number(gst['totalPurchases'] ?? 0),
      outputTax: Number(gst['outputTax'] ?? 0),
      inputTax: Number(gst['inputTax'] ?? 0),
      netTaxLiability: Number(gst['netTaxLiability'] ?? 0),
      pendingReturns: Number(gst['pendingReturns'] ?? 0)
    },
    tds: {
      totalDeductions: Number(tds['totalDeductions'] ?? 0),
      totalDeposits: Number(tds['totalDeposits'] ?? 0),
      pendingDeposits: Number(tds['pendingDeposits'] ?? 0),
      pendingCertificates: Number(tds['pendingCertificates'] ?? 0)
    }
  };
}

function mapCompliance(raw: Record<string, unknown>): TaxCompliance {
  const gst = (raw['gst'] ?? {}) as Record<string, unknown>;
  const tds = (raw['tds'] ?? {}) as Record<string, unknown>;
  return {
    gst: {
      lastReturnFiled: parseDate(gst['lastReturnFiled']),
      nextReturnDue: parseDate(gst['nextReturnDue']),
      returnsPending: Number(gst['returnsPending'] ?? 0),
      penalties: Number(gst['penalties'] ?? 0)
    },
    tds: {
      lastQuarterFiled: String(tds['lastQuarterFiled'] ?? ''),
      nextQuarterDue: String(tds['nextQuarterDue'] ?? ''),
      certificatesPending: Number(tds['certificatesPending'] ?? 0),
      penalties: Number(tds['penalties'] ?? 0)
    }
  };
}

/** Maps GET /tax-management response. */
export function mapTaxManagementFromApi(raw: Record<string, unknown>): TaxManagementResponse {
  return {
    financialYear: String(raw['financialYear'] ?? ''),
    gstConfig: mapGstConfig((raw['gstConfig'] ?? {}) as Record<string, unknown>),
    tdsConfig: mapTdsConfig((raw['tdsConfig'] ?? {}) as Record<string, unknown>),
    taxSummary: mapSummary((raw['taxSummary'] ?? {}) as Record<string, unknown>),
    taxCompliance: mapCompliance((raw['taxCompliance'] ?? {}) as Record<string, unknown>)
  };
}
