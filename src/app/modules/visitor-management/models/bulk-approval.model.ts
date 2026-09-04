/**
 * Bulk Visitor Approval Models
 * For bulk approval of visitors for events
 */

import { Visitor, VisitorStatus, ApprovalStatus } from './visitor.model';

export interface BulkApprovalRequest {
  visitorIds: string[];
  eventName?: string;
  eventDate?: Date;
  notes?: string;
  autoGenerateQR?: boolean;
}

export interface BulkApprovalResponse {
  success: boolean;
  message: string;
  totalRequested: number;
  approved: number;
  failed: number;
  approvedVisitors?: Visitor[];
  failedVisitors?: BulkApprovalFailure[];
  errors?: string[];
}

export interface BulkApprovalFailure {
  visitorId: string;
  visitorName: string;
  reason: string;
}

export interface BulkApprovalSession {
  id: string;
  eventName?: string;
  eventDate?: Date;
  totalVisitors: number;
  approved: number;
  failed: number;
  status: BulkApprovalStatus;
  createdAt: Date;
  completedAt?: Date;
  createdBy: string;
}

export enum BulkApprovalStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',
  FAILED = 'FAILED'
}

