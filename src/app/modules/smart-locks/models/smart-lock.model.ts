/** Smart lock device status from the API. */
export type SmartLockStatus = 'LOCKED' | 'UNLOCKED' | 'OFFLINE' | 'MAINTENANCE';

/** Hardware category for a registered lock. */
export type SmartLockType =
  | 'SMART_DEADBOLT'
  | 'SMART_PADLOCK'
  | 'GATE_CONTROLLER'
  | 'INTERCOM'
  | 'OTHER';

export interface SmartLockRow {
  id: string;
  societyId: string;
  flatId?: string;
  flatNumber?: string;
  lockName: string;
  location: string;
  lockType: SmartLockType;
  manufacturer?: string;
  deviceId?: string;
  serialNumber?: string;
  status: SmartLockStatus;
  batteryLevel?: number;
  allowRemoteUnlock: boolean;
  autoLockSeconds?: number;
  lastUnlockedAt?: Date;
  lastUnlockedBy?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SmartLockStats {
  total: number;
  locked: number;
  unlocked: number;
  offline: number;
}

export interface SmartLockFormData {
  flatId: string;
  lockName: string;
  location: string;
  lockType: SmartLockType;
  manufacturer: string;
  deviceId: string;
  serialNumber: string;
  status: SmartLockStatus;
  batteryLevel: number | null;
  allowRemoteUnlock: boolean;
  autoLockSeconds: number | null;
  notes: string;
}

export const SMART_LOCK_TYPES: Array<{ value: SmartLockType; label: string }> = [
  { value: 'SMART_DEADBOLT', label: 'Smart Deadbolt' },
  { value: 'SMART_PADLOCK', label: 'Smart Padlock' },
  { value: 'GATE_CONTROLLER', label: 'Gate Controller' },
  { value: 'INTERCOM', label: 'Video Intercom' },
  { value: 'OTHER', label: 'Other' }
];

export const SMART_LOCK_STATUSES: Array<{ value: SmartLockStatus; label: string }> = [
  { value: 'LOCKED', label: 'Locked' },
  { value: 'UNLOCKED', label: 'Unlocked' },
  { value: 'OFFLINE', label: 'Offline' },
  { value: 'MAINTENANCE', label: 'Maintenance' }
];

export const LOCK_MANUFACTURERS = [
  'Yale',
  'August',
  'Schlage',
  'TTLock',
  'Samsung',
  'Godrej',
  'Generic BLE',
  'Other'
] as const;
