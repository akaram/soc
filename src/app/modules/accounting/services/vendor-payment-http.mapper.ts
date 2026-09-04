import {
  Vendor,
  VendorPayment,
  VendorPaymentSummary
} from '../models/vendor-payment.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date(0);
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

/** Maps vendor JSON from API. */
export function mapVendorFromApi(raw: Record<string, unknown>): Vendor {
  return {
    id: String(raw['id'] ?? ''),
    name: String(raw['name'] ?? ''),
    pan: raw['pan'] != null ? String(raw['pan']) : undefined,
    gstin: raw['gstin'] != null ? String(raw['gstin']) : undefined,
    contactPerson: raw['contactPerson'] != null ? String(raw['contactPerson']) : undefined,
    email: raw['email'] != null ? String(raw['email']) : undefined,
    phone: raw['phone'] != null ? String(raw['phone']) : undefined,
    address: raw['address'] != null ? String(raw['address']) : undefined,
    defaultTdsRate: raw['defaultTdsRate'] != null ? Number(raw['defaultTdsRate']) : undefined,
    tdsSection: raw['tdsSection'] != null ? String(raw['tdsSection']) : undefined
  };
}

/** Maps vendor payment JSON from API. */
export function mapVendorPaymentFromApi(raw: Record<string, unknown>): VendorPayment {
  return {
    id: String(raw['id'] ?? ''),
    paymentNumber: String(raw['paymentNumber'] ?? ''),
    vendorId: String(raw['vendorId'] ?? ''),
    vendorName: String(raw['vendorName'] ?? ''),
    vendorPAN: raw['vendorPAN'] != null ? String(raw['vendorPAN']) : undefined,
    vendorGSTIN: raw['vendorGSTIN'] != null ? String(raw['vendorGSTIN']) : undefined,
    invoiceId: raw['invoiceId'] != null ? String(raw['invoiceId']) : undefined,
    invoiceNumber: raw['invoiceNumber'] != null ? String(raw['invoiceNumber']) : undefined,
    billId: raw['billId'] != null ? String(raw['billId']) : undefined,
    billNumber: raw['billNumber'] != null ? String(raw['billNumber']) : undefined,
    paymentDate: parseDate(raw['paymentDate']),
    grossAmount: Number(raw['grossAmount'] ?? 0),
    tdsRate: Number(raw['tdsRate'] ?? 0),
    tdsAmount: Number(raw['tdsAmount'] ?? 0),
    netAmount: Number(raw['netAmount'] ?? 0),
    tdsSection: raw['tdsSection'] != null ? String(raw['tdsSection']) : undefined,
    paymentMethod: (raw['paymentMethod'] ?? 'cheque') as VendorPayment['paymentMethod'],
    paymentStatus: (raw['paymentStatus'] ?? 'pending') as VendorPayment['paymentStatus'],
    approvedBy: raw['approvedBy'] != null ? String(raw['approvedBy']) : undefined,
    approvedAt: raw['approvedAt'] != null ? parseDate(raw['approvedAt']) : undefined,
    paidAt: raw['paidAt'] != null ? parseDate(raw['paidAt']) : undefined,
    transactionId: raw['transactionId'] != null ? String(raw['transactionId']) : undefined,
    chequeNumber: raw['chequeNumber'] != null ? String(raw['chequeNumber']) : undefined,
    bankName: raw['bankName'] != null ? String(raw['bankName']) : undefined,
    accountNumber: raw['accountNumber'] != null ? String(raw['accountNumber']) : undefined,
    notes: raw['notes'] != null ? String(raw['notes']) : undefined,
    tdsCertificateGenerated: Boolean(raw['tdsCertificateGenerated']),
    tdsCertificateNumber:
      raw['tdsCertificateNumber'] != null ? String(raw['tdsCertificateNumber']) : undefined,
    createdAt: parseDate(raw['createdAt']),
    updatedAt: parseDate(raw['updatedAt'])
  };
}

/** Maps summary JSON from API. */
export function mapVendorPaymentSummaryFromApi(raw: Record<string, unknown>): VendorPaymentSummary {
  return {
    totalPayments: Number(raw['totalPayments'] ?? 0),
    totalGrossAmount: Number(raw['totalGrossAmount'] ?? 0),
    totalTdsAmount: Number(raw['totalTdsAmount'] ?? 0),
    totalNetAmount: Number(raw['totalNetAmount'] ?? 0),
    pendingPayments: Number(raw['pendingPayments'] ?? 0),
    approvedPayments: Number(raw['approvedPayments'] ?? 0),
    paidPayments: Number(raw['paidPayments'] ?? 0)
  };
}
