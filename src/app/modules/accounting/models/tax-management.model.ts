/**
 * Models for tax management (GST + TDS).
 */

export type GstRegistrationType = 'regular' | 'composition' | 'unregistered';

export interface GSTTaxRate {
  id: string;
  hsnSac: string;
  description: string;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
}

export interface GSTConfiguration {
  gstin: string;
  businessName: string;
  registrationType: GstRegistrationType;
  compositionRate?: number;
  taxRates: GSTTaxRate[];
  placeOfSupply: string;
  stateCode: string;
}

export interface TDSRate {
  id: string;
  section: string;
  description: string;
  rate: number;
  threshold: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
}

export interface TDSConfiguration {
  pan: string;
  tan: string;
  businessName: string;
  tdsRates: TDSRate[];
}

export interface TaxSummary {
  gst: {
    totalSales: number;
    totalPurchases: number;
    outputTax: number;
    inputTax: number;
    netTaxLiability: number;
    pendingReturns: number;
  };
  tds: {
    totalDeductions: number;
    totalDeposits: number;
    pendingDeposits: number;
    pendingCertificates: number;
  };
}

export interface TaxCompliance {
  gst: {
    lastReturnFiled: Date;
    nextReturnDue: Date;
    returnsPending: number;
    penalties: number;
  };
  tds: {
    lastQuarterFiled: string;
    nextQuarterDue: string;
    certificatesPending: number;
    penalties: number;
  };
}

export interface TaxManagementResponse {
  financialYear: string;
  gstConfig: GSTConfiguration;
  tdsConfig: TDSConfiguration;
  taxSummary: TaxSummary;
  taxCompliance: TaxCompliance;
}
