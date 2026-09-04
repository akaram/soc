/**
 * Models for vendor payments with TDS.
 */

export type VendorPaymentMethod =
  | 'online'
  | 'cash'
  | 'cheque'
  | 'bank_transfer'
  | 'neft'
  | 'rtgs'
  | 'other';

export type VendorPaymentStatus = 'pending' | 'approved' | 'paid' | 'cancelled';

export interface VendorPayment {
  id: string;
  paymentNumber: string;
  vendorId: string;
  vendorName: string;
  vendorPAN?: string;
  vendorGSTIN?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  billId?: string;
  billNumber?: string;
  paymentDate: Date;
  grossAmount: number;
  tdsRate: number;
  tdsAmount: number;
  netAmount: number;
  tdsSection?: string;
  paymentMethod: VendorPaymentMethod;
  paymentStatus: VendorPaymentStatus;
  approvedBy?: string;
  approvedAt?: Date;
  paidAt?: Date;
  transactionId?: string;
  chequeNumber?: string;
  bankName?: string;
  accountNumber?: string;
  notes?: string;
  tdsCertificateGenerated: boolean;
  tdsCertificateNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vendor {
  id: string;
  name: string;
  pan?: string;
  gstin?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  defaultTdsRate?: number;
  tdsSection?: string;
}

export interface VendorPaymentSummary {
  totalPayments: number;
  totalGrossAmount: number;
  totalTdsAmount: number;
  totalNetAmount: number;
  pendingPayments: number;
  approvedPayments: number;
  paidPayments: number;
}
