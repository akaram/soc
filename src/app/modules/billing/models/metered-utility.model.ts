/**
 * View models for the metered utilities billing page.
 * Mapped from /utility-bills, /utility-meter-readings, and /utility-rates APIs.
 */

export interface MeteredMeter {
  id: string;
  meterNumber: string;
  utilityType: 'water' | 'electricity' | 'gas';
  residentId: string;
  residentName: string;
  flatNumber: string;
  meterLocation?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface MeteredReading {
  id: string;
  meterId: string;
  meterNumber: string;
  utilityType: 'water' | 'electricity' | 'gas';
  flatNumber: string;
  previousReading: number;
  currentReading: number;
  consumption: number;
  readingDate: Date;
  readingMonth: string;
  readBy: string;
  notes?: string;
  status: 'pending' | 'verified' | 'billed';
  createdAt: Date;
}

export interface MeteredRate {
  id: string;
  utilityType: 'water' | 'electricity' | 'gas';
  rateType: 'fixed' | 'tiered' | 'slab';
  baseRate: number;
  fixedCharges?: number;
  tiers?: { from: number; to?: number; rate: number }[];
  validFrom: Date;
  validUntil?: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface MeteredBill {
  id: string;
  billNumber: string;
  meterId: string;
  meterNumber: string;
  utilityType: 'water' | 'electricity' | 'gas';
  residentId: string;
  residentName: string;
  flatNumber: string;
  readingId?: string;
  previousReading: number;
  currentReading: number;
  consumption: number;
  rate: number;
  fixedCharges: number;
  subtotal: number;
  tax: number;
  totalAmount: number;
  billDate: Date;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paidDate?: Date;
  createdAt: Date;
}
