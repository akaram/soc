export interface Visitor {
  id: string;
  name: string;
  phone: string;
  purpose: string;
  visitingFlat: string;
  entryTime?: Date;
  exitTime?: Date;
  photo?: string;
  vehicleNumber?: string;
  qrCode?: string;
  status: 'pending' | 'approved' | 'rejected' | 'checked-in' | 'checked-out';
  approvedBy?: string;
  guardNotes?: string;
}

export interface PatrolCheckpoint {
  id: string;
  name: string;
  location: string;
  qrCode: string;
  nfcTag?: string;
  sequence: number;
  lastScanned?: Date;
  scannedBy?: string;
}

export interface PatrolRoute {
  id: string;
  name: string;
  checkpoints: PatrolCheckpoint[];
  frequency: 'hourly' | 'every-2-hours' | 'every-4-hours' | 'once-per-shift';
  assignedTo: string;
  status: 'active' | 'inactive';
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdBy: string;
  createdAt: Date;
  assignedTo?: string;
  photos?: string[];
  location?: string;
  flatNumber?: string;
  resolutionNotes?: string;
  resolvedAt?: Date;
}

export interface Amenity {
  id: string;
  name: string;
  type: 'clubhouse' | 'gym' | 'pool' | 'court' | 'hall' | 'garden';
  capacity: number;
  pricePerHour: number;
  availableSlots: TimeSlot[];
  amenities: string[];
  images: string[];
  rules: string[];
}

export interface TimeSlot {
  date: Date;
  startTime: string;
  endTime: string;
  available: boolean;
  bookedBy?: string;
}

export interface Booking {
  id: string;
  amenityId: string;
  amenityName: string;
  date: Date;
  startTime: string;
  endTime: string;
  bookedBy: string;
  flatNumber: string;
  guests: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded';
}

export interface Package {
  id: string;
  trackingNumber?: string;
  courierName: string;
  recipientFlat: string;
  recipientName: string;
  receivedAt: Date;
  receivedBy: string;
  deliveredAt?: Date;
  deliveredTo?: string;
  photo?: string;
  signature?: string;
  qrCode: string;
  status: 'received' | 'notified' | 'delivered';
  notes?: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  flatNumber: string;
  month: string;
  year: number;
  maintenanceCharges: number;
  waterCharges: number;
  electricityCharges: number;
  gasCharges?: number;
  parkingCharges: number;
  otherCharges: number;
  totalAmount: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  paidAmount: number;
  paidDate?: Date;
  lateFee: number;
}

export interface Payment {
  id: string;
  billId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: 'mada' | 'visa' | 'mastercard' | 'apple-pay' | 'sadad' | 'bank-transfer';
  transactionId: string;
  status: 'success' | 'pending' | 'failed';
  receiptUrl?: string;
}

export interface Notice {
  id: string;
  title: string;
  description: string;
  type: 'announcement' | 'event' | 'emergency' | 'maintenance' | 'meeting';
  priority: 'low' | 'medium' | 'high';
  publishedAt: Date;
  expiresAt?: Date;
  publishedBy: string;
  attachments?: string[];
  readBy: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  designation: string;
  phone: string;
  email?: string;
  type: 'fire' | 'medical' | 'police' | 'security' | 'maintenance' | 'admin';
  available24x7: boolean;
}

export interface Asset {
  id: string;
  name: string;
  category: 'lift' | 'generator' | 'pump' | 'hvac' | 'fire-equipment' | 'other';
  location: string;
  qrCode: string;
  purchaseDate: Date;
  warrantyExpiry?: Date;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  status: 'active' | 'maintenance' | 'faulty' | 'retired';
  assignedTo?: string;
}

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  date: Date;
  startTime: string;
  endTime: string;
  checkInTime?: Date;
  checkOutTime?: Date;
  location?: { latitude: number; longitude: number };
  status: 'scheduled' | 'checked-in' | 'checked-out' | 'absent';
  notes?: string;
}

export interface QuickAction {
  icon: string;
  label: string;
  route: string;
  badge?: number;
  color?: string;
}

export interface DashboardStats {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  change?: string;
  period?: string;
}
