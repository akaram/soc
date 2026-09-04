/**
 * Delivery Tracking Models
 * For tracking deliveries from Amazon, Zomato, Swiggy, and other services
 */

import { Visitor, VisitorStatus, ApprovalStatus } from './visitor.model';

export enum DeliveryService {
  AMAZON = 'AMAZON',
  ZOMATO = 'ZOMATO',
  SWIGGY = 'SWIGGY',
  FLIPKART = 'FLIPKART',
  OTHER = 'OTHER'
}

export enum DeliveryStatus {
  ORDERED = 'ORDERED',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  ARRIVED = 'ARRIVED',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum DeliveryType {
  FOOD = 'FOOD',
  GROCERY = 'GROCERY',
  PACKAGE = 'PACKAGE',
  ELECTRONICS = 'ELECTRONICS',
  CLOTHING = 'CLOTHING',
  OTHER = 'OTHER'
}

export interface DeliveryTracking {
  id: string;
  orderId: string; // External order ID from service
  service: DeliveryService;
  deliveryType: DeliveryType;
  status: DeliveryStatus;
  
  // Customer/Recipient Info
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  flatNumber: string;
  unitNumber?: string;
  hostId: string;
  hostName: string;
  hostPhone: string;
  
  // Delivery Details
  estimatedArrival?: Date;
  actualArrival?: Date;
  deliveredAt?: Date;
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
  vehicleNumber?: string;
  
  // Order Details
  items?: DeliveryItem[];
  totalAmount?: number;
  paymentMethod?: string;
  specialInstructions?: string;
  
  // Tracking
  trackingUrl?: string;
  currentLocation?: string;
  lastUpdated?: Date;
  
  // Visitor Integration
  visitorId?: string; // Linked visitor entry if created
  qrCode?: string;
  qrCodeData?: string;
  
  // Status
  isActive: boolean;
  requiresApproval: boolean;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  notes?: string;
}

export interface DeliveryItem {
  name: string;
  quantity: number;
  price?: number;
  description?: string;
}

export interface CreateDeliveryTrackingRequest {
  orderId: string;
  service: DeliveryService;
  deliveryType: DeliveryType;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  flatNumber: string;
  unitNumber?: string;
  hostId: string;
  estimatedArrival?: Date;
  items?: DeliveryItem[];
  totalAmount?: number;
  paymentMethod?: string;
  specialInstructions?: string;
  trackingUrl?: string;
  requiresApproval?: boolean;
  notes?: string;
}

export interface UpdateDeliveryStatusRequest {
  deliveryId: string;
  status: DeliveryStatus;
  currentLocation?: string;
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
  vehicleNumber?: string;
  notes?: string;
}

export interface DeliveryTrackingResponse {
  success: boolean;
  message: string;
  delivery?: DeliveryTracking;
  errors?: string[];
}

export interface DeliveryStatistics {
  totalToday: number;
  pending: number;
  outForDelivery: number;
  delivered: number;
  failed: number;
  byService: {
    amazon: number;
    zomato: number;
    swiggy: number;
    flipkart: number;
    other: number;
  };
  byType: {
    food: number;
    grocery: number;
    package: number;
    electronics: number;
    clothing: number;
    other: number;
  };
}

export interface DeliveryFilter {
  service?: DeliveryService;
  deliveryType?: DeliveryType;
  status?: DeliveryStatus;
  flatNumber?: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
}

