/**
 * Models for GST return preparation (GSTR-1, GSTR-3B).
 */

export interface GstConfiguration {
  id?: string;
  societyId?: string;
  gstin: string;
  businessName: string;
  businessAddress: string;
  businessState: string;
  businessStateCode: string;
  pan: string;
  placeOfBusiness: string;
}

export interface Gstr1B2B {
  gstin: string;
  name: string;
  invoiceNumber: string;
  invoiceDate: Date | string;
  invoiceValue: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  placeOfSupply: string;
  reverseCharge: boolean;
}

export interface Gstr1B2CL {
  invoiceNumber: string;
  invoiceDate: Date | string;
  invoiceValue: number;
  taxableValue: number;
  igst: number;
  cess: number;
  placeOfSupply: string;
  stateCode: string;
}

export interface Gstr1B2CS {
  invoiceNumber: string;
  invoiceDate: Date | string;
  invoiceValue: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  placeOfSupply: string;
  type: 'E' | 'SEZ' | 'DE';
}

export interface Gstr1Hsn {
  hsnSac: string;
  description: string;
  uom: string;
  quantity: number;
  rate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
}

export interface Gstr1Summary {
  totalInvoices: number;
  totalTaxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  totalTax: number;
}

export interface Gstr1Data {
  b2b: Gstr1B2B[];
  b2cl: Gstr1B2CL[];
  b2cs: Gstr1B2CS[];
  hsn: Gstr1Hsn[];
  summary: Gstr1Summary;
}

export interface Gstr3bSupplies {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
}

export interface Gstr3bItc {
  eligible: number;
  ineligible: number;
  total: number;
}

export interface Gstr3bLiability {
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  total: number;
}

export interface Gstr3bPayment {
  cash: number;
  itc: number;
  total: number;
}

export interface Gstr3bData {
  period: string;
  outwardSupplies: Gstr3bSupplies;
  inwardSupplies: Gstr3bSupplies;
  itc: Gstr3bItc;
  liability: Gstr3bLiability;
  payment: Gstr3bPayment;
}

export interface GstSummary {
  period: string;
  totalInvoices: number;
  totalTaxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  totalTax: number;
  paidInvoices: number;
  pendingInvoices: number;
}

export interface ReconciliationStats {
  matched: number;
  mismatched: number;
  pending: number;
}

export interface GstReturnData {
  periodMonth: number;
  periodYear: number;
  periodLabel: string;
  gstSummary: GstSummary;
  gstr1: Gstr1Data;
  gstr3b: Gstr3bData;
  reconciliation: ReconciliationStats;
  invoiceCount: number;
}

export interface GstValidationResult {
  valid: boolean;
  errors: string[];
}
