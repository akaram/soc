import {
  GstConfiguration,
  GstReturnData,
  GstSummary,
  GstValidationResult,
  Gstr1B2B,
  Gstr1B2CL,
  Gstr1B2CS,
  Gstr1Data,
  Gstr1Hsn,
  Gstr1Summary,
  Gstr3bData,
  ReconciliationStats
} from '../models/gst-return-preparation.model';

function parseDate(v: unknown): Date | string {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return String(v);
}

function mapGstr1B2B(raw: Record<string, unknown>): Gstr1B2B {
  return {
    gstin: String(raw['gstin'] ?? 'N/A'),
    name: String(raw['name'] ?? ''),
    invoiceNumber: String(raw['invoiceNumber'] ?? ''),
    invoiceDate: parseDate(raw['invoiceDate']),
    invoiceValue: Number(raw['invoiceValue'] ?? 0),
    taxableValue: Number(raw['taxableValue'] ?? 0),
    cgst: Number(raw['cgst'] ?? 0),
    sgst: Number(raw['sgst'] ?? 0),
    igst: Number(raw['igst'] ?? 0),
    cess: Number(raw['cess'] ?? 0),
    placeOfSupply: String(raw['placeOfSupply'] ?? ''),
    reverseCharge: Boolean(raw['reverseCharge'])
  };
}

function mapGstr1B2CL(raw: Record<string, unknown>): Gstr1B2CL {
  return {
    invoiceNumber: String(raw['invoiceNumber'] ?? ''),
    invoiceDate: parseDate(raw['invoiceDate']),
    invoiceValue: Number(raw['invoiceValue'] ?? 0),
    taxableValue: Number(raw['taxableValue'] ?? 0),
    igst: Number(raw['igst'] ?? 0),
    cess: Number(raw['cess'] ?? 0),
    placeOfSupply: String(raw['placeOfSupply'] ?? ''),
    stateCode: String(raw['stateCode'] ?? '')
  };
}

function mapGstr1B2CS(raw: Record<string, unknown>): Gstr1B2CS {
  return {
    invoiceNumber: String(raw['invoiceNumber'] ?? ''),
    invoiceDate: parseDate(raw['invoiceDate']),
    invoiceValue: Number(raw['invoiceValue'] ?? 0),
    taxableValue: Number(raw['taxableValue'] ?? 0),
    cgst: Number(raw['cgst'] ?? 0),
    sgst: Number(raw['sgst'] ?? 0),
    igst: Number(raw['igst'] ?? 0),
    cess: Number(raw['cess'] ?? 0),
    placeOfSupply: String(raw['placeOfSupply'] ?? ''),
    type: (raw['type'] ?? 'E') as Gstr1B2CS['type']
  };
}

function mapGstr1Hsn(raw: Record<string, unknown>): Gstr1Hsn {
  return {
    hsnSac: String(raw['hsnSac'] ?? ''),
    description: String(raw['description'] ?? ''),
    uom: String(raw['uom'] ?? 'NOS'),
    quantity: Number(raw['quantity'] ?? 0),
    rate: Number(raw['rate'] ?? 0),
    taxableValue: Number(raw['taxableValue'] ?? 0),
    cgst: Number(raw['cgst'] ?? 0),
    sgst: Number(raw['sgst'] ?? 0),
    igst: Number(raw['igst'] ?? 0),
    cess: Number(raw['cess'] ?? 0)
  };
}

function mapGstr1Summary(raw: Record<string, unknown>): Gstr1Summary {
  return {
    totalInvoices: Number(raw['totalInvoices'] ?? 0),
    totalTaxableValue: Number(raw['totalTaxableValue'] ?? 0),
    totalCgst: Number(raw['totalCgst'] ?? 0),
    totalSgst: Number(raw['totalSgst'] ?? 0),
    totalIgst: Number(raw['totalIgst'] ?? 0),
    totalCess: Number(raw['totalCess'] ?? 0),
    totalTax: Number(raw['totalTax'] ?? 0)
  };
}

function mapGstr1(raw: Record<string, unknown>): Gstr1Data {
  return {
    b2b: Array.isArray(raw['b2b'])
      ? (raw['b2b'] as Record<string, unknown>[]).map(mapGstr1B2B)
      : [],
    b2cl: Array.isArray(raw['b2cl'])
      ? (raw['b2cl'] as Record<string, unknown>[]).map(mapGstr1B2CL)
      : [],
    b2cs: Array.isArray(raw['b2cs'])
      ? (raw['b2cs'] as Record<string, unknown>[]).map(mapGstr1B2CS)
      : [],
    hsn: Array.isArray(raw['hsn'])
      ? (raw['hsn'] as Record<string, unknown>[]).map(mapGstr1Hsn)
      : [],
    summary: mapGstr1Summary((raw['summary'] ?? {}) as Record<string, unknown>)
  };
}

function mapSupplies(raw: Record<string, unknown>) {
  return {
    taxableValue: Number(raw['taxableValue'] ?? 0),
    cgst: Number(raw['cgst'] ?? 0),
    sgst: Number(raw['sgst'] ?? 0),
    igst: Number(raw['igst'] ?? 0),
    cess: Number(raw['cess'] ?? 0)
  };
}

function mapGstr3b(raw: Record<string, unknown>): Gstr3bData {
  return {
    period: String(raw['period'] ?? ''),
    outwardSupplies: mapSupplies((raw['outwardSupplies'] ?? {}) as Record<string, unknown>),
    inwardSupplies: mapSupplies((raw['inwardSupplies'] ?? {}) as Record<string, unknown>),
    itc: {
      eligible: Number((raw['itc'] as Record<string, unknown>)?.['eligible'] ?? 0),
      ineligible: Number((raw['itc'] as Record<string, unknown>)?.['ineligible'] ?? 0),
      total: Number((raw['itc'] as Record<string, unknown>)?.['total'] ?? 0)
    },
    liability: {
      cgst: Number((raw['liability'] as Record<string, unknown>)?.['cgst'] ?? 0),
      sgst: Number((raw['liability'] as Record<string, unknown>)?.['sgst'] ?? 0),
      igst: Number((raw['liability'] as Record<string, unknown>)?.['igst'] ?? 0),
      cess: Number((raw['liability'] as Record<string, unknown>)?.['cess'] ?? 0),
      total: Number((raw['liability'] as Record<string, unknown>)?.['total'] ?? 0)
    },
    payment: {
      cash: Number((raw['payment'] as Record<string, unknown>)?.['cash'] ?? 0),
      itc: Number((raw['payment'] as Record<string, unknown>)?.['itc'] ?? 0),
      total: Number((raw['payment'] as Record<string, unknown>)?.['total'] ?? 0)
    }
  };
}

function mapGstSummary(raw: Record<string, unknown>): GstSummary {
  return {
    period: String(raw['period'] ?? ''),
    totalInvoices: Number(raw['totalInvoices'] ?? 0),
    totalTaxableValue: Number(raw['totalTaxableValue'] ?? 0),
    totalCgst: Number(raw['totalCgst'] ?? 0),
    totalSgst: Number(raw['totalSgst'] ?? 0),
    totalIgst: Number(raw['totalIgst'] ?? 0),
    totalCess: Number(raw['totalCess'] ?? 0),
    totalTax: Number(raw['totalTax'] ?? 0),
    paidInvoices: Number(raw['paidInvoices'] ?? 0),
    pendingInvoices: Number(raw['pendingInvoices'] ?? 0)
  };
}

function mapReconciliation(raw: Record<string, unknown>): ReconciliationStats {
  return {
    matched: Number(raw['matched'] ?? 0),
    mismatched: Number(raw['mismatched'] ?? 0),
    pending: Number(raw['pending'] ?? 0)
  };
}

/** Maps GET /gst-returns/config JSON to GstConfiguration. */
export function mapGstConfigFromApi(raw: Record<string, unknown>): GstConfiguration {
  return {
    id: raw['id'] != null ? String(raw['id']) : undefined,
    societyId: raw['societyId'] != null ? String(raw['societyId']) : undefined,
    gstin: String(raw['gstin'] ?? ''),
    businessName: String(raw['businessName'] ?? ''),
    businessAddress: String(raw['businessAddress'] ?? ''),
    businessState: String(raw['businessState'] ?? ''),
    businessStateCode: String(raw['businessStateCode'] ?? ''),
    pan: String(raw['pan'] ?? ''),
    placeOfBusiness: String(raw['placeOfBusiness'] ?? '')
  };
}

/** Maps GET /gst-returns/data JSON to GstReturnData. */
export function mapGstReturnDataFromApi(raw: Record<string, unknown>): GstReturnData {
  return {
    periodMonth: Number(raw['periodMonth'] ?? 1),
    periodYear: Number(raw['periodYear'] ?? new Date().getFullYear()),
    periodLabel: String(raw['periodLabel'] ?? ''),
    gstSummary: mapGstSummary((raw['gstSummary'] ?? {}) as Record<string, unknown>),
    gstr1: mapGstr1((raw['gstr1'] ?? {}) as Record<string, unknown>),
    gstr3b: mapGstr3b((raw['gstr3b'] ?? {}) as Record<string, unknown>),
    reconciliation: mapReconciliation((raw['reconciliation'] ?? {}) as Record<string, unknown>),
    invoiceCount: Number(raw['invoiceCount'] ?? 0)
  };
}

/** Maps POST /gst-returns/validate response. */
export function mapGstValidationFromApi(raw: Record<string, unknown>): GstValidationResult {
  return {
    valid: Boolean(raw['valid']),
    errors: Array.isArray(raw['errors']) ? (raw['errors'] as string[]) : []
  };
}
