/**
 * Models for utility billing (electricity, water, gas, etc.).
 */

export type UtilityType = 'electricity' | 'water' | 'gas' | 'internet' | 'cable' | 'other';

export type UtilityBillStatus =
  | 'draft'
  | 'generated'
  | 'sent'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export interface UtilityBill {
  id: string;
  billNumber: string;
  residentId: string;
  residentName: string;
  flatNumber: string;
  building?: string;
  utilityType: UtilityType;
  billMonth: string;
  billDate: Date;
  dueDate: Date;
  previousReading: number;
  currentReading: number;
  consumption: number;
  unitRate: number;
  baseCharge: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: UtilityBillStatus;
  meterNumber?: string;
  paymentMethod?: string;
  paymentDate?: Date;
  notes?: string;
  generatedBy: string;
  generatedAt: Date;
  sentAt?: Date;
  reminderSent: boolean;
  reminderCount: number;
}

export interface MeterReading {
  id: string;
  residentId?: string;
  flatId?: string;
  flatNumber: string;
  utilityType: 'electricity' | 'water' | 'gas';
  meterNumber: string;
  reading: number;
  readingDate: Date;
  readingType: 'manual' | 'automatic';
  readBy: string;
  notes?: string;
  photo?: string;
  /** Workflow status for metered utilities UI */
  status?: 'pending' | 'verified' | 'billed';
}

export interface UtilityRate {
  id: string;
  utilityType: UtilityType;
  unitRate: number;
  baseCharge: number;
  taxRate: number;
  slabRates?: { min: number; max: number; rate: number }[];
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
}

export interface GenerateUtilityBillsRequest {
  utilityType: UtilityType;
  billMonth: string;
  useMeterReadings?: boolean;
  autoSend?: boolean;
  dueDateDay?: number;
}
