/**
 * Recurring Visitor Models
 * Specifically for daily help and recurring visitor management
 */

import { Visitor, RecurringPattern } from './visitor.model';

export interface RecurringVisitor {
  id: string;
  name: string;
  phone: string;
  email?: string;
  visitingFlat: string;
  visitingUnit?: string;
  hostName: string;
  hostPhone: string;
  hostId: string;
  purpose: string; // e.g., "Daily Help", "Maid", "Cook", "Driver"
  visitTime: string; // Daily visit time
  expectedDuration: number; // in minutes
  vehicleNumber?: string;
  vehicleType?: string;
  photo?: string;
  idProof?: string;
  idProofNumber?: string;
  recurringPattern: RecurringPattern;
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc. (for weekly pattern)
  startDate: Date;
  endDate?: Date; // Optional end date
  isActive: boolean;
  autoApprove: boolean; // Auto-approve recurring visits
  qrCode?: string;
  qrCodeData?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  lastVisitDate?: Date;
  totalVisits: number;
}

export interface CreateRecurringVisitorRequest {
  name: string;
  phone: string;
  email?: string;
  visitingFlat: string;
  visitingUnit?: string;
  purpose: string;
  visitTime: string;
  expectedDuration?: number;
  vehicleNumber?: string;
  vehicleType?: string;
  idProofNumber?: string;
  recurringPattern: RecurringPattern;
  daysOfWeek?: number[];
  startDate: Date;
  endDate?: Date;
  autoApprove?: boolean;
  notes?: string;
}

export interface RecurringVisitorResponse {
  success: boolean;
  message: string;
  recurringVisitor?: RecurringVisitor;
  errors?: string[];
}

export interface RecurringVisitorSchedule {
  recurringVisitorId: string;
  scheduledDate: Date;
  scheduledTime: string;
  status: 'pending' | 'approved' | 'checked-in' | 'checked-out' | 'cancelled';
  visitorId?: string; // Link to actual visitor record when checked in
}

export enum DailyHelpType {
  MAID = 'MAID',
  COOK = 'COOK',
  DRIVER = 'DRIVER',
  NANNY = 'NANNY',
  GARDENER = 'GARDENER',
  SECURITY = 'SECURITY',
  OTHER = 'OTHER'
}

