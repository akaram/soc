import {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  InvoiceTemplate,
  InvoiceType,
  SupplyType
} from '../models/invoice.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date(0);
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

function mapInvoiceItem(raw: Record<string, unknown>): InvoiceItem {
  return {
    id: String(raw['id'] ?? ''),
    description: String(raw['description'] ?? ''),
    quantity: Number(raw['quantity'] ?? 1),
    unitPrice: Number(raw['unitPrice'] ?? 0),
    taxRate: Number(raw['taxRate'] ?? 0),
    amount: Number(raw['amount'] ?? 0),
    category: raw['category'] != null ? String(raw['category']) : undefined,
    cgst: raw['cgst'] != null ? Number(raw['cgst']) : undefined,
    sgst: raw['sgst'] != null ? Number(raw['sgst']) : undefined,
    igst: raw['igst'] != null ? Number(raw['igst']) : undefined
  };
}

/** Maps GET /invoices JSON to Invoice. */
export function mapInvoiceFromApi(raw: Record<string, unknown>): Invoice {
  const items = Array.isArray(raw['items'])
    ? (raw['items'] as Record<string, unknown>[]).map(mapInvoiceItem)
    : [];

  return {
    id: String(raw['id'] ?? ''),
    invoiceNumber: String(raw['invoiceNumber'] ?? ''),
    invoiceType: (raw['invoiceType'] ?? 'other') as InvoiceType,
    residentId: raw['residentId'] != null ? String(raw['residentId']) : undefined,
    residentName: raw['residentName'] != null ? String(raw['residentName']) : undefined,
    flatNumber: raw['flatNumber'] != null ? String(raw['flatNumber']) : undefined,
    vendorId: raw['vendorId'] != null ? String(raw['vendorId']) : undefined,
    vendorName: raw['vendorName'] != null ? String(raw['vendorName']) : undefined,
    invoiceDate: parseDate(raw['invoiceDate']),
    dueDate: parseDate(raw['dueDate']),
    items,
    subtotal: Number(raw['subtotal'] ?? 0),
    tax: Number(raw['tax'] ?? 0),
    cgst: raw['cgst'] != null ? Number(raw['cgst']) : undefined,
    sgst: raw['sgst'] != null ? Number(raw['sgst']) : undefined,
    igst: raw['igst'] != null ? Number(raw['igst']) : undefined,
    supplyType: raw['supplyType'] != null ? (raw['supplyType'] as SupplyType) : undefined,
    placeOfSupply: raw['placeOfSupply'] != null ? String(raw['placeOfSupply']) : undefined,
    discount: Number(raw['discount'] ?? 0),
    totalAmount: Number(raw['totalAmount'] ?? 0),
    paidAmount: Number(raw['paidAmount'] ?? 0),
    balance: Number(raw['balance'] ?? 0),
    status: (raw['status'] ?? 'draft') as InvoiceStatus,
    paymentTerms: String(raw['paymentTerms'] ?? 'Net 30'),
    notes: raw['notes'] != null ? String(raw['notes']) : undefined,
    termsAndConditions:
      raw['termsAndConditions'] != null ? String(raw['termsAndConditions']) : undefined,
    createdBy: String(raw['createdBy'] ?? ''),
    createdAt: parseDate(raw['createdAt']),
    sentAt: raw['sentAt'] != null ? parseDate(raw['sentAt']) : undefined,
    paidAt: raw['paidAt'] != null ? parseDate(raw['paidAt']) : undefined,
    paymentMethod: raw['paymentMethod'] != null ? String(raw['paymentMethod']) : undefined,
    reminderSent: Boolean(raw['reminderSent']),
    reminderCount: Number(raw['reminderCount'] ?? 0)
  };
}

export function mapInvoiceTemplateFromApi(raw: Record<string, unknown>): InvoiceTemplate {
  const items = Array.isArray(raw['items'])
    ? (raw['items'] as Record<string, unknown>[]).map(mapInvoiceItem)
    : [];
  return {
    id: String(raw['id'] ?? ''),
    name: String(raw['name'] ?? ''),
    description: String(raw['description'] ?? ''),
    items,
    termsAndConditions: String(raw['termsAndConditions'] ?? ''),
    isActive: Boolean(raw['isActive'] ?? true),
    createdAt: parseDate(raw['createdAt'])
  };
}
