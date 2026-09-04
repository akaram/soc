/**
 * Maps Spring JSON for cab/taxi entries and school bus APIs to visitor-management UI models.
 */
import {
  CabTaxiEntry,
  VehicleType,
  EntryStatus,
  CabTaxiEntryStatistics
} from '../models/cab-taxi-entry.model';
import {
  SchoolBus,
  BusRoute,
  BusLocation,
  BusStudent,
  BusStop,
  BusStatus,
  RouteType,
  SchoolBusStatistics
} from '../models/school-bus-tracking.model';

function parseDate(v: unknown): Date | undefined {
  if (v == null) {
    return undefined;
  }
  if (v instanceof Date) {
    return v;
  }
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

function parseEnum<T extends string>(allowed: readonly T[], v: unknown, fallback: T): T {
  const s = String(v ?? '').trim();
  const hit = (allowed as readonly string[]).find(x => x === s);
  return (hit as T) ?? fallback;
}

const VEHICLE_TYPES = Object.values(VehicleType);
const ENTRY_STATUSES = Object.values(EntryStatus);
const BUS_STATUSES = Object.values(BusStatus);
const ROUTE_TYPES = Object.values(RouteType);

export function normalizeBusLocation(raw: Record<string, unknown> | null | undefined): BusLocation | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const lat = Number(raw['latitude']);
  const lng = Number(raw['longitude']);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return undefined;
  }
  return {
    latitude: lat,
    longitude: lng,
    address: raw['address'] != null ? String(raw['address']) : undefined,
    timestamp: parseDate(raw['timestamp']) ?? new Date(),
    speed: raw['speed'] != null ? Number(raw['speed']) : undefined,
    heading: raw['heading'] != null ? Number(raw['heading']) : undefined
  };
}

export function normalizeBusRoute(raw: Record<string, unknown> | null | undefined): BusRoute | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const wpsRaw = raw['waypoints'];
  const waypoints: BusLocation[] = Array.isArray(wpsRaw)
    ? (wpsRaw as Record<string, unknown>[])
        .map(w => normalizeBusLocation(w))
        .filter((x): x is BusLocation => !!x)
    : [];
  const start = normalizeBusLocation(raw['startLocation'] as Record<string, unknown>);
  const end = normalizeBusLocation(raw['endLocation'] as Record<string, unknown>);
  return {
    id: String(raw['id'] ?? ''),
    routeName: String(raw['routeName'] ?? ''),
    routeNumber: String(raw['routeNumber'] ?? ''),
    routeType: parseEnum(ROUTE_TYPES, raw['routeType'], RouteType.BOTH),
    startLocation: start ?? { latitude: 0, longitude: 0, timestamp: new Date() },
    endLocation: end ?? { latitude: 0, longitude: 0, timestamp: new Date() },
    waypoints,
    estimatedDuration: Number(raw['estimatedDuration'] ?? 0) || 0,
    scheduledStartTime: String(raw['scheduledStartTime'] ?? ''),
    scheduledEndTime: String(raw['scheduledEndTime'] ?? ''),
    isActive: raw['isActive'] !== false
  };
}

function normalizeBusStudent(raw: Record<string, unknown>): BusStudent {
  const pick = normalizeBusLocation(raw['pickupLocation'] as Record<string, unknown>);
  const drop = normalizeBusLocation(raw['dropoffLocation'] as Record<string, unknown>);
  return {
    id: String(raw['id'] ?? `st-${Math.random().toString(36).slice(2)}`),
    studentName: String(raw['studentName'] ?? ''),
    studentId: String(raw['studentId'] ?? ''),
    grade: String(raw['grade'] ?? ''),
    parentName: String(raw['parentName'] ?? ''),
    parentPhone: String(raw['parentPhone'] ?? ''),
    parentEmail: raw['parentEmail'] != null ? String(raw['parentEmail']) : undefined,
    pickupLocation: pick ?? { latitude: 0, longitude: 0, timestamp: new Date() },
    dropoffLocation: drop ?? { latitude: 0, longitude: 0, timestamp: new Date() },
    isOnBoard: Boolean(raw['isOnBoard']),
    boardedAt: parseDate(raw['boardedAt']),
    alightedAt: parseDate(raw['alightedAt']),
    boardingStop: undefined,
    alightingStop: undefined
  };
}

function normalizeBusStop(raw: Record<string, unknown> | null | undefined): BusStop | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const loc = normalizeBusLocation(raw['location'] as Record<string, unknown>);
  const studentsRaw = raw['students'];
  const students: BusStudent[] = Array.isArray(studentsRaw)
    ? (studentsRaw as Record<string, unknown>[]).map(normalizeBusStudent)
    : [];
  return {
    id: String(raw['id'] ?? ''),
    stopName: String(raw['stopName'] ?? ''),
    location: loc ?? { latitude: 0, longitude: 0, timestamp: new Date() },
    scheduledTime: String(raw['scheduledTime'] ?? ''),
    actualTime: parseDate(raw['actualTime']),
    students,
    isCompleted: Boolean(raw['isCompleted']),
    order: Number(raw['order'] ?? 0)
  };
}

/** Maps GET /school-buses payload (including nested route) to {@link SchoolBus}. */
export function normalizeSchoolBus(raw: Record<string, unknown>): SchoolBus {
  const cur = normalizeBusLocation(raw['currentLocation'] as Record<string, unknown>);
  const route = normalizeBusRoute(raw['route'] as Record<string, unknown>);
  const studentsRaw = raw['studentList'];
  const studentList: BusStudent[] | undefined = Array.isArray(studentsRaw)
    ? (studentsRaw as Record<string, unknown>[]).map(normalizeBusStudent)
    : undefined;
  const nextStop = normalizeBusStop(raw['nextStop'] as Record<string, unknown>);
  return {
    id: String(raw['id'] ?? ''),
    busNumber: String(raw['busNumber'] ?? ''),
    vehicleNumber: String(raw['vehicleNumber'] ?? ''),
    driverName: String(raw['driverName'] ?? ''),
    driverPhone: String(raw['driverPhone'] ?? ''),
    driverLicense: raw['driverLicense'] != null ? String(raw['driverLicense']) : undefined,
    conductorName: raw['conductorName'] != null ? String(raw['conductorName']) : undefined,
    conductorPhone: raw['conductorPhone'] != null ? String(raw['conductorPhone']) : undefined,
    routeId: String(raw['routeId'] ?? ''),
    route,
    status: parseEnum(BUS_STATUSES, raw['status'], BusStatus.NOT_STARTED),
    currentLocation: cur,
    lastLocationUpdate: parseDate(raw['lastLocationUpdate']),
    isLocationTrackingEnabled: raw['isLocationTrackingEnabled'] !== false,
    scheduledPickupTime: raw['scheduledPickupTime'] != null ? String(raw['scheduledPickupTime']) : undefined,
    scheduledDropoffTime: raw['scheduledDropoffTime'] != null ? String(raw['scheduledDropoffTime']) : undefined,
    actualPickupTime: parseDate(raw['actualPickupTime']),
    actualDropoffTime: parseDate(raw['actualDropoffTime']),
    studentCount: Number(raw['studentCount'] ?? 0),
    maxCapacity: Number(raw['maxCapacity'] ?? 0),
    studentList,
    totalDistance: raw['totalDistance'] != null ? Number(raw['totalDistance']) : undefined,
    averageSpeed: raw['averageSpeed'] != null ? Number(raw['averageSpeed']) : undefined,
    estimatedArrivalTime: parseDate(raw['estimatedArrival'] ?? raw['estimatedArrivalTime']),
    nextStop,
    isActive: raw['isActive'] !== false,
    createdAt: parseDate(raw['createdAt']) ?? new Date(0),
    updatedAt: parseDate(raw['updatedAt']) ?? new Date(0),
    createdBy: raw['createdBy'] != null ? String(raw['createdBy']) : undefined,
    notes: raw['notes'] != null ? String(raw['notes']) : undefined
  };
}

export function normalizeCabTaxiEntry(raw: Record<string, unknown>): CabTaxiEntry {
  return {
    id: String(raw['id'] ?? ''),
    entryType: parseEnum(VEHICLE_TYPES, raw['entryType'], VehicleType.OTHER),
    vehicleNumber: String(raw['vehicleNumber'] ?? ''),
    driverName: String(raw['driverName'] ?? ''),
    driverPhone: String(raw['driverPhone'] ?? ''),
    driverLicense: raw['driverLicense'] != null ? String(raw['driverLicense']) : undefined,
    passengerName: String(raw['passengerName'] ?? ''),
    passengerPhone: String(raw['passengerPhone'] ?? ''),
    passengerEmail: raw['passengerEmail'] != null ? String(raw['passengerEmail']) : undefined,
    visitingFlat: String(raw['visitingFlat'] ?? ''),
    visitingUnit: raw['visitingUnit'] != null ? String(raw['visitingUnit']) : undefined,
    hostName: String(raw['hostName'] ?? ''),
    hostPhone: String(raw['hostPhone'] ?? ''),
    hostId: String(raw['hostId'] ?? ''),
    otpCode: raw['otpCode'] != null ? String(raw['otpCode']) : undefined,
    otpSentAt: parseDate(raw['otpSentAt']),
    otpExpiresAt: parseDate(raw['otpExpiresAt']),
    otpVerified: Boolean(raw['otpVerified']),
    otpVerifiedAt: parseDate(raw['otpVerifiedAt']),
    otpAttempts: Number(raw['otpAttempts'] ?? 0),
    maxOtpAttempts: Number(raw['maxOtpAttempts'] ?? 3),
    status: parseEnum(ENTRY_STATUSES, raw['status'], EntryStatus.PENDING),
    entryTime: parseDate(raw['entryTime']),
    exitTime: parseDate(raw['exitTime']),
    expectedDuration: raw['expectedDuration'] != null ? Number(raw['expectedDuration']) : undefined,
    purpose: String(raw['purpose'] ?? ''),
    entryGate: raw['entryGate'] != null ? String(raw['entryGate']) : undefined,
    exitGate: raw['exitGate'] != null ? String(raw['exitGate']) : undefined,
    currentLocation: raw['currentLocation'] != null ? String(raw['currentLocation']) : undefined,
    requiresApproval: Boolean(raw['requiresApproval']),
    approved: Boolean(raw['approved']),
    approvedBy: raw['approvedBy'] != null ? String(raw['approvedBy']) : undefined,
    approvedAt: parseDate(raw['approvedAt']),
    rejectedBy: raw['rejectedBy'] != null ? String(raw['rejectedBy']) : undefined,
    rejectedAt: parseDate(raw['rejectedAt']),
    rejectionReason: raw['rejectionReason'] != null ? String(raw['rejectionReason']) : undefined,
    qrCode: raw['qrCode'] != null ? String(raw['qrCode']) : undefined,
    qrCodeData: raw['qrCodeData'] != null ? String(raw['qrCodeData']) : undefined,
    notes: raw['notes'] != null ? String(raw['notes']) : undefined,
    isActive: raw['isActive'] !== false,
    createdAt: parseDate(raw['createdAt']) ?? new Date(0),
    updatedAt: parseDate(raw['updatedAt']) ?? new Date(0),
    createdBy: raw['createdBy'] != null ? String(raw['createdBy']) : undefined
  };
}

export function mapCabTaxiStatistics(raw: Record<string, unknown> | null | undefined): CabTaxiEntryStatistics {
  const by = (raw?.['byType'] as Record<string, unknown>) ?? {};
  return {
    totalToday: Number(raw?.['totalToday'] ?? 0),
    pending: Number(raw?.['pending'] ?? 0),
    otpSent: Number(raw?.['otpSent'] ?? 0),
    otpVerified: Number(raw?.['otpVerified'] ?? 0),
    entered: Number(raw?.['entered'] ?? 0),
    exited: Number(raw?.['exited'] ?? 0),
    rejected: Number(raw?.['rejected'] ?? 0),
    byType: {
      cab: Number(by['cab'] ?? 0),
      taxi: Number(by['taxi'] ?? 0),
      autoRickshaw: Number(by['autoRickshaw'] ?? 0),
      privateCar: Number(by['privateCar'] ?? 0),
      other: Number(by['other'] ?? 0)
    }
  };
}

export function mapSchoolBusStatistics(raw: Record<string, unknown> | null | undefined): SchoolBusStatistics {
  return {
    totalBuses: Number(raw?.['totalBuses'] ?? 0),
    activeBuses: Number(raw?.['activeBuses'] ?? 0),
    onRoute: Number(raw?.['onRoute'] ?? 0),
    atSchool: Number(raw?.['atSchool'] ?? 0),
    delayed: Number(raw?.['delayed'] ?? 0),
    breakdown: Number(raw?.['breakdown'] ?? 0),
    totalStudents: Number(raw?.['totalStudents'] ?? 0),
    studentsOnBoard: Number(raw?.['studentsOnBoard'] ?? 0),
    averageSpeed: Number(raw?.['averageSpeed'] ?? 0),
    totalDistance: Number(raw?.['totalDistance'] ?? 0)
  };
}
