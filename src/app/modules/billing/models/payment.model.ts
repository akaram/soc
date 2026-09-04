/**
 * Models for payment tracking.
 */

export type PaymentType = 'maintenance' | 'utility' | 'service' | 'penalty' | 'other';

export type PaymentMethod =
  | 'online'
  | 'cash'
  | 'cheque'
  | 'bank_transfer'
  | 'upi'
  | 'card'
  | 'other';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export interface Payment {
  id: string;
  paymentNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  billId?: string;
  billNumber?: string;
  residentId?: string;
  residentName?: string;
  flatNumber?: string;
  vendorId?: string;
  vendorName?: string;
  paymentType: PaymentType;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: Date;
  receivedBy: string;
  transactionId?: string;
  chequeNumber?: string;
  bankName?: string;
  accountNumber?: string;
  upiId?: string;
  status: PaymentStatus;
  notes?: string;
  receiptGenerated: boolean;
  receiptNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentSummary {
  totalPayments: number;
  totalAmount: number;
  onlinePayments: number;
  offlinePayments: number;
  pendingPayments: number;
  completedPayments: number;
  failedPayments: number;
  refundedPayments: number;
  todayPayments: number;
  todayAmount: number;
  thisMonthPayments: number;
  thisMonthAmount: number;
}
