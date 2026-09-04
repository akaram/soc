/**
 * Models for invoice management.
 */

export type InvoiceType = 'maintenance' | 'utility' | 'service' | 'penalty' | 'other';

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'partially_paid';

export type SupplyType = 'intra_state' | 'inter_state';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
  category?: string;
  cgst?: number;
  sgst?: number;
  igst?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  residentId?: string;
  residentName?: string;
  flatNumber?: string;
  vendorId?: string;
  vendorName?: string;
  invoiceDate: Date;
  dueDate: Date;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  supplyType?: SupplyType;
  placeOfSupply?: string;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: InvoiceStatus;
  paymentTerms: string;
  notes?: string;
  termsAndConditions?: string;
  createdBy: string;
  createdAt: Date;
  sentAt?: Date;
  paidAt?: Date;
  paymentMethod?: string;
  reminderSent: boolean;
  reminderCount: number;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  items: InvoiceItem[];
  termsAndConditions: string;
  isActive: boolean;
  createdAt: Date;
}
