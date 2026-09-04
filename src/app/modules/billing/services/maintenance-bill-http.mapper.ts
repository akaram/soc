import {
  AutomationSettings,
  BillItem,
  BillTemplate,
  MaintenanceBill,
  MaintenanceBillStatus
} from '../models/maintenance-bill.model';

function parseDate(v: unknown): Date {
  if (v == null) return new Date(0);
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date(String(v));
}

function mapBillItem(raw: Record<string, unknown>): BillItem {
  return {
    id: String(raw['id'] ?? ''),
    category: String(raw['category'] ?? ''),
    description: String(raw['description'] ?? ''),
    quantity: Number(raw['quantity'] ?? 1),
    rate: Number(raw['rate'] ?? 0),
    amount: Number(raw['amount'] ?? 0),
    isVariable: Boolean(raw['isVariable'])
  };
}

/** Maps GET /maintenance-bills JSON to MaintenanceBill. */
export function mapMaintenanceBillFromApi(raw: Record<string, unknown>): MaintenanceBill {
  const items = Array.isArray(raw['items'])
    ? (raw['items'] as Record<string, unknown>[]).map(mapBillItem)
    : [];

  return {
    id: String(raw['id'] ?? ''),
    billNumber: String(raw['billNumber'] ?? ''),
    residentId: String(raw['residentId'] ?? ''),
    residentName: String(raw['residentName'] ?? ''),
    flatNumber: String(raw['flatNumber'] ?? ''),
    building: raw['building'] != null ? String(raw['building']) : undefined,
    billMonth: String(raw['billMonth'] ?? ''),
    billDate: parseDate(raw['billDate']),
    dueDate: parseDate(raw['dueDate']),
    amount: Number(raw['amount'] ?? 0),
    previousBalance: Number(raw['previousBalance'] ?? 0),
    adjustments: Number(raw['adjustments'] ?? 0),
    totalAmount: Number(raw['totalAmount'] ?? 0),
    paidAmount: Number(raw['paidAmount'] ?? 0),
    balance: Number(raw['balance'] ?? 0),
    status: (raw['status'] ?? 'draft') as MaintenanceBillStatus,
    items,
    paymentMethod: raw['paymentMethod'] != null ? String(raw['paymentMethod']) : undefined,
    paymentDate: raw['paymentDate'] != null ? parseDate(raw['paymentDate']) : undefined,
    notes: raw['notes'] != null ? String(raw['notes']) : undefined,
    generatedBy: String(raw['generatedBy'] ?? ''),
    generatedAt: parseDate(raw['generatedAt']),
    sentAt: raw['sentAt'] != null ? parseDate(raw['sentAt']) : undefined,
    reminderSent: Boolean(raw['reminderSent']),
    reminderCount: Number(raw['reminderCount'] ?? 0)
  };
}

export function mapBillTemplateFromApi(raw: Record<string, unknown>): BillTemplate {
  const items = Array.isArray(raw['items'])
    ? (raw['items'] as Record<string, unknown>[]).map(mapBillItem)
    : [];
  return {
    id: String(raw['id'] ?? ''),
    name: String(raw['name'] ?? ''),
    description: String(raw['description'] ?? ''),
    items,
    isActive: Boolean(raw['isActive'] ?? true),
    createdAt: parseDate(raw['createdAt'])
  };
}

export function mapAutomationSettingsFromApi(raw: Record<string, unknown>): AutomationSettings {
  return {
    autoGenerate: Boolean(raw['autoGenerate'] ?? true),
    generationDay: Number(raw['generationDay'] ?? 1),
    dueDateDay: Number(raw['dueDateDay'] ?? 10),
    sendNotifications: Boolean(raw['sendNotifications'] ?? true),
    sendReminders: Boolean(raw['sendReminders'] ?? true),
    reminderDays: Array.isArray(raw['reminderDays'])
      ? (raw['reminderDays'] as number[]).map(Number)
      : [7, 3, 1],
    emailTemplate: raw['emailTemplate'] != null ? String(raw['emailTemplate']) : undefined,
    smsTemplate: raw['smsTemplate'] != null ? String(raw['smsTemplate']) : undefined
  };
}
