/**
 * Multi-Tier Approval Models
 * For gate level and tower level approval workflow
 */

import { Visitor, VisitorStatus, ApprovalStatus } from './visitor.model';

export enum ApprovalTier {
  GATE = 'GATE',
  TOWER = 'TOWER',
  COMPLETE = 'COMPLETE'
}

export enum ApprovalLevel {
  GATE_LEVEL = 'GATE_LEVEL',
  TOWER_LEVEL = 'TOWER_LEVEL',
  BOTH = 'BOTH',
  NONE = 'NONE'
}

export interface ApprovalWorkflow {
  visitorId: string;
  gateApprovalRequired: boolean;
  towerApprovalRequired: boolean;
  gateApproved: boolean;
  towerApproved: boolean;
  gateApprovedBy?: string;
  gateApprovedAt?: Date;
  towerApprovedBy?: string;
  towerApprovedAt?: Date;
  gateRejected: boolean;
  towerRejected: boolean;
  gateRejectedBy?: string;
  gateRejectedAt?: Date;
  gateRejectionReason?: string;
  towerRejectedBy?: string;
  towerRejectedAt?: Date;
  towerRejectionReason?: string;
  currentTier: ApprovalTier;
  isComplete: boolean;
}

export interface TierApprovalRequest {
  visitorId: string;
  approvedBy: string;
  notes?: string;
}

export interface TierRejectionRequest {
  visitorId: string;
  rejectedBy: string;
  reason: string;
}

export interface TierApprovalResponse {
  success: boolean;
  message: string;
  visitor?: Visitor;
  workflow?: ApprovalWorkflow;
  errors?: string[];
}

export interface ApprovalWorkflowStatistics {
  pendingGate: number;
  pendingTower: number;
  gateApproved: number;
  towerApproved: number;
  fullyApproved: number;
  rejected: number;
}

