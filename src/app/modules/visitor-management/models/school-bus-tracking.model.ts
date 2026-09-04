/**
 * School Bus Tracking Models
 * For tracking school buses with real-time location updates
 */

export enum BusStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_GARAGE = 'IN_GARAGE',
  ON_ROUTE = 'ON_ROUTE',
  AT_SCHOOL = 'AT_SCHOOL',
  RETURNING = 'RETURNING',
  COMPLETED = 'COMPLETED',
  DELAYED = 'DELAYED',
  BREAKDOWN = 'BREAKDOWN'
}

export enum RouteType {
  PICKUP = 'PICKUP',
  DROPOFF = 'DROPOFF',
  BOTH = 'BOTH'
}

export interface BusLocation {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: Date;
  speed?: number; // in km/h
  heading?: number; // in degrees (0-360)
}

export interface BusRoute {
  id: string;
  routeName: string;
  routeNumber: string;
  routeType: RouteType;
  startLocation: BusLocation;
  endLocation: BusLocation;
  waypoints: BusLocation[];
  estimatedDuration: number; // in minutes
  scheduledStartTime: string; // HH:mm format
  scheduledEndTime: string; // HH:mm format
  isActive: boolean;
}

export interface SchoolBus {
  id: string;
  busNumber: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  driverLicense?: string;
  conductorName?: string;
  conductorPhone?: string;
  routeId: string;
  route?: BusRoute;
  status: BusStatus;
  
  // Real-time location
  currentLocation?: BusLocation;
  lastLocationUpdate?: Date;
  isLocationTrackingEnabled: boolean;
  
  // Schedule
  scheduledPickupTime?: string; // HH:mm format
  scheduledDropoffTime?: string; // HH:mm format
  actualPickupTime?: Date;
  actualDropoffTime?: Date;
  
  // Students
  studentCount: number;
  maxCapacity: number;
  studentList?: BusStudent[];
  
  // Tracking
  totalDistance?: number; // in km
  averageSpeed?: number; // in km/h
  estimatedArrivalTime?: Date;
  nextStop?: BusStop;
  
  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  notes?: string;
}

export interface BusStudent {
  id: string;
  studentName: string;
  studentId: string;
  grade: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  pickupLocation: BusLocation;
  dropoffLocation: BusLocation;
  isOnBoard: boolean;
  boardedAt?: Date;
  alightedAt?: Date;
  boardingStop?: BusStop;
  alightingStop?: BusStop;
}

export interface BusStop {
  id: string;
  stopName: string;
  location: BusLocation;
  scheduledTime: string; // HH:mm format
  actualTime?: Date;
  students: BusStudent[];
  isCompleted: boolean;
  order: number; // Order in the route
}

export interface CreateSchoolBusRequest {
  busNumber: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  driverLicense?: string;
  conductorName?: string;
  conductorPhone?: string;
  routeId: string;
  maxCapacity: number;
  scheduledPickupTime?: string;
  scheduledDropoffTime?: string;
  notes?: string;
}

export interface UpdateBusLocationRequest {
  busId: string;
  latitude: number;
  longitude: number;
  address?: string;
  speed?: number;
  heading?: number;
}

export interface SchoolBusResponse {
  success: boolean;
  message: string;
  bus?: SchoolBus;
  errors?: string[];
}

export interface SchoolBusStatistics {
  totalBuses: number;
  activeBuses: number;
  onRoute: number;
  atSchool: number;
  delayed: number;
  breakdown: number;
  totalStudents: number;
  studentsOnBoard: number;
  averageSpeed: number;
  totalDistance: number;
}

export interface SchoolBusFilter {
  status?: BusStatus;
  routeId?: string;
  searchTerm?: string;
  date?: Date;
}

