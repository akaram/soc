import {
  BulkInvoiceGeneration,
  BulkInvoiceItem,
  BulkInvoiceResident,
  BulkInvoiceTemplate,
  BulkGenerationStatus
} from '../models/bulk-invoice.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date(0);
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

function mapItem(raw: Record<string, unknown>): BulkInvoiceItem {
  const quantity = Number(raw['quantity'] ?? 1);
  const unitPrice = Number(raw['unitPrice'] ?? raw['rate'] ?? 0);
  return {
    id: String(raw['id'] ?? ''),
    description: String(raw['description'] ?? ''),
    quantity,
    unitPrice,
    amount: Number(raw['amount'] ?? quantity * unitPrice),
    taxRate: raw['taxRate'] != null ? Number(raw['taxRate']) : undefined
  };
}

/** Maps invoice template API row to bulk template shape. */
export function mapBulkTemplateFromApi(raw: Record<string, unknown>): BulkInvoiceTemplate {
  const items = Array.isArray(raw['items'])
    ? (raw['items'] as Record<string, unknown>[]).map(mapItem)
    : [];
  const taxRate =
    raw['taxRate'] != null
      ? Number(raw['taxRate'])
      : items.length > 0
        ? Number(items[0].taxRate ?? 0)
        : 0;

  return {
    id: String(raw['id'] ?? ''),
    name: String(raw['name'] ?? ''),
    description: String(raw['description'] ?? ''),
    items,
    taxRate,
    notes:
      raw['notes'] != null
        ? String(raw['notes'])
        : raw['termsAndConditions'] != null
          ? String(raw['termsAndConditions'])
          : undefined
  };
}

export function mapBulkResidentFromApi(raw: Record<string, unknown>): BulkInvoiceResident {
  return {
    id: String(raw['id'] ?? ''),
    name: String(raw['name'] ?? ''),
    flatNumber: String(raw['flatNumber'] ?? ''),
    email: raw['email'] != null ? String(raw['email']) : undefined,
    phone: raw['phone'] != null ? String(raw['phone']) : undefined,
    address: raw['address'] != null ? String(raw['address']) : undefined
  };
}

export function mapBulkGenerationFromApi(raw: Record<string, unknown>): BulkInvoiceGeneration {
  const selectedResidents = Array.isArray(raw['selectedResidents'])
    ? (raw['selectedResidents'] as unknown[]).map(id => String(id))
    : [];

  return {
    id: String(raw['id'] ?? ''),
    templateId: String(raw['templateId'] ?? ''),
    templateName: String(raw['templateName'] ?? ''),
    invoiceDate: parseDate(raw['invoiceDate']),
    dueDate: parseDate(raw['dueDate']),
    residents: [],
    selectedResidents,
    items: [],
    taxRate: Number(raw['taxRate'] ?? 0),
    notes: raw['notes'] != null ? String(raw['notes']) : undefined,
    status: (raw['status'] ?? 'draft') as BulkGenerationStatus,
    generatedInvoices: Number(raw['generatedInvoices'] ?? 0),
    totalInvoices: Number(raw['totalInvoices'] ?? selectedResidents.length),
    createdAt: parseDate(raw['createdAt']),
    invoiceIds: Array.isArray(raw['invoiceIds'])
      ? (raw['invoiceIds'] as unknown[]).map(id => String(id))
      : undefined
  };
}
