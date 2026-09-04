/**
 * Models for bulk invoice generation.
 */

export interface BulkInvoiceResident {
  id: string;
  name: string;
  flatNumber: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface BulkInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
}

export interface BulkInvoiceTemplate {
  id: string;
  name: string;
  description: string;
  items: BulkInvoiceItem[];
  taxRate: number;
  notes?: string;
}

export type BulkGenerationStatus = 'draft' | 'generating' | 'completed' | 'failed';

export interface BulkInvoiceGeneration {
  id: string;
  templateId: string;
  templateName: string;
  invoiceDate: Date;
  dueDate: Date;
  residents: BulkInvoiceResident[];
  selectedResidents: string[];
  items: BulkInvoiceItem[];
  taxRate: number;
  notes?: string;
  status: BulkGenerationStatus;
  generatedInvoices: number;
  totalInvoices: number;
  createdAt: Date;
  invoiceIds?: string[];
}
