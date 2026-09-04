/**
 * Monthly Gatepass Models
 * For frequent visitors who need monthly access passes
 */

import { VisitorStatus, ApprovalStatus } from './visitor.model';

export interface MonthlyGatepass {
  id: string;
  visitorName: string;
  phone: string;
  email?: string;
  visitingFlat: string;
  visitingUnit?: string;
  hostName: string;
  hostPhone: string;
  hostId: string;
  purpose: string;
  photo?: string;
  idProof?: string;
  idProofNumber?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  qrCode?: string;
  qrCodeData?: string;
  startDate: Date;
  endDate: Date;
  validityDays: number; // Days remaining
  status: GatepassStatus;
  approvalStatus: ApprovalStatus;
  isActive: boolean;
  autoApprove: boolean;
  maxVisitsPerMonth?: number;
  currentMonthVisits: number;
  totalVisits: number;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string;
  approvedDate?: Date;
}

export interface CreateMonthlyGatepassRequest {
  visitorName: string;
  phone: string;
  email?: string;
  visitingFlat: string;
  visitingUnit?: string;
  purpose: string;
  vehicleNumber?: string;
  vehicleType?: string;
  idProofNumber?: string;
  startDate: Date;
  endDate: Date;
  autoApprove?: boolean;
  maxVisitsPerMonth?: number;
  notes?: string;
}

export interface MonthlyGatepassResponse {
  success: boolean;
  message: string;
  gatepass?: MonthlyGatepass;
  errors?: string[];
}

export enum GatepassStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED'
}

export interface GatepassStatistics {
  totalActive: number;
  totalExpired: number;
  totalPending: number;
  totalThisMonth: number;
  totalVisitsThisMonth: number;
}

