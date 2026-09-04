import {
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentType
} from '../models/payment.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date(0);
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

/** Maps GET /payment-transactions JSON to Payment. */
export function mapPaymentFromApi(raw: Record<string, unknown>): Payment {
  return {
    id: String(raw['id'] ?? ''),
    paymentNumber: String(raw['paymentNumber'] ?? ''),
    invoiceId: raw['invoiceId'] != null ? String(raw['invoiceId']) : undefined,
    invoiceNumber: raw['invoiceNumber'] != null ? String(raw['invoiceNumber']) : undefined,
    billId: raw['billId'] != null ? String(raw['billId']) : undefined,
    billNumber: raw['billNumber'] != null ? String(raw['billNumber']) : undefined,
    residentId: raw['residentId'] != null ? String(raw['residentId']) : undefined,
    residentName: raw['residentName'] != null ? String(raw['residentName']) : undefined,
    flatNumber: raw['flatNumber'] != null ? String(raw['flatNumber']) : undefined,
    vendorId: raw['vendorId'] != null ? String(raw['vendorId']) : undefined,
    vendorName: raw['vendorName'] != null ? String(raw['vendorName']) : undefined,
    paymentType: (raw['paymentType'] ?? 'other') as PaymentType,
    amount: Number(raw['amount'] ?? 0),
    paymentMethod: (raw['paymentMethod'] ?? 'cash') as PaymentMethod,
    paymentDate: parseDate(raw['paymentDate']),
    receivedBy: String(raw['receivedBy'] ?? ''),
    transactionId: raw['transactionId'] != null ? String(raw['transactionId']) : undefined,
    chequeNumber: raw['chequeNumber'] != null ? String(raw['chequeNumber']) : undefined,
    bankName: raw['bankName'] != null ? String(raw['bankName']) : undefined,
    accountNumber: raw['accountNumber'] != null ? String(raw['accountNumber']) : undefined,
    upiId: raw['upiId'] != null ? String(raw['upiId']) : undefined,
    status: (raw['status'] ?? 'pending') as PaymentStatus,
    notes: raw['notes'] != null ? String(raw['notes']) : undefined,
    receiptGenerated: Boolean(raw['receiptGenerated']),
    receiptNumber: raw['receiptNumber'] != null ? String(raw['receiptNumber']) : undefined,
    createdAt: parseDate(raw['createdAt']),
    updatedAt: parseDate(raw['updatedAt'])
  };
}
