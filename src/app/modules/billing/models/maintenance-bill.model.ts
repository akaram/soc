/**
 * Models for automated monthly maintenance billing.
 */

export type MaintenanceBillStatus =
  | 'draft'
  | 'generated'
  | 'sent'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export interface BillItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  isVariable: boolean;
}

export interface MaintenanceBill {
  id: string;
  billNumber: string;
  residentId: string;
  residentName: string;
  flatNumber: string;
  building?: string;
  billMonth: string;
  billDate: Date;
  dueDate: Date;
  amount: number;
  previousBalance: number;
  adjustments: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: MaintenanceBillStatus;
  items: BillItem[];
  paymentMethod?: string;
  paymentDate?: Date;
  notes?: string;
  generatedBy: string;
  generatedAt: Date;
  sentAt?: Date;
  reminderSent: boolean;
  reminderCount: number;
}

export interface BillTemplate {
  id: string;
  name: string;
  description: string;
  items: BillItem[];
  isActive: boolean;
  createdAt: Date;
}

export interface AutomationSettings {
  autoGenerate: boolean;
  generationDay: number;
  dueDateDay: number;
  sendNotifications: boolean;
  sendReminders: boolean;
  reminderDays: number[];
  emailTemplate?: string;
  smsTemplate?: string;
}

export interface GenerateMaintenanceBillsRequest {
  billMonth: string;
  templateId?: string;
  autoSend?: boolean;
  dueDateDay?: number;
}
