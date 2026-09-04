/**
 * Multi-Tier Approval Models
 * For gate-level and tower-level approval workflow
 */

import { Visitor, VisitorStatus, ApprovalStatus } from './visitor.model';

export interface ApprovalTier {
  id: string;
  name: string;
  level: ApprovalLevel;
  order: number; // Approval order (1 = first, 2 = second, etc.)
  isRequired: boolean;
}

export interface ApprovalRequest {
  id: string;
  visitorId: string;
  visitorName: string;
  visitingFlat: string;
  visitingUnit?: string;
  currentTier: ApprovalLevel;
  status: ApprovalRequestStatus;
  requestedBy: string;
  requestedDate: Date;
  approvals: TierApproval[];
  rejections: TierRejection[];
  notes?: string;
}

export interface TierApproval {
  tierId: string;
  tierName: string;
  level: ApprovalLevel;
  approvedBy: string;
  approvedByName: string;
  approvedDate: Date;
  notes?: string;
}

export interface TierRejection {
  tierId: string;
  tierName: string;
  level: ApprovalLevel;
  rejectedBy: string;
  rejectedByName: string;
  rejectedDate: Date;
  reason: string;
}

export interface CreateApprovalRequest {
  visitorId: string;
  notes?: string;
}

export interface ProcessTierApprovalRequest {
  approvalRequestId: string;
  tierId: string;
  approved: boolean;
  notes?: string;
  reason?: string; // Required if rejected
}

export interface ApprovalRequestResponse {
  success: boolean;
  message: string;
  approvalRequest?: ApprovalRequest;
  errors?: string[];
}

export enum ApprovalLevel {
  GATE = 'GATE',
  TOWER = 'TOWER',
  SOCIETY = 'SOCIETY'
}

export enum ApprovalRequestStatus {
  PENDING_GATE = 'PENDING_GATE',
  GATE_APPROVED = 'GATE_APPROVED',
  PENDING_TOWER = 'PENDING_TOWER',
  TOWER_APPROVED = 'TOWER_APPROVED',
  FULLY_APPROVED = 'FULLY_APPROVED',
  GATE_REJECTED = 'GATE_REJECTED',
  TOWER_REJECTED = 'TOWER_REJECTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export interface ApprovalWorkflow {
  visitorId: string;
  visitorName: string;
  visitingFlat: string;
  currentStep: number;
  totalSteps: number;
  steps: ApprovalStep[];
  status: ApprovalRequestStatus;
}

export interface ApprovalStep {
  stepNumber: number;
  tierName: string;
  level: ApprovalLevel;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedDate?: Date;
  rejectedBy?: string;
  rejectedDate?: Date;
  rejectionReason?: string;
}

export interface ApprovalStatistics {
  pendingGate: number;
  pendingTower: number;
  gateApproved: number;
  towerApproved: number;
  fullyApproved: number;
  rejected: number;
}

