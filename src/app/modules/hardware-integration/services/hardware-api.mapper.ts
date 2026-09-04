/**
 * Maps between Hardware Integration UI models and the live {@code /hardware-devices} API.
 */

import {
  HardwareDevice,
  HardwareType,
  DeviceStatus,
  DeviceConnectionType,
  CreateHardwareDeviceRequest,
  UpdateHardwareDeviceRequest,
  HardwareFilter,
  HardwareStatistics,
  DeviceTestRequest,
  DeviceTestResult
} from '../models/hardware.model';

/** Parse API date strings into Date objects */
export function parseApiDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

const GATE_NAMES: Record<string, string> = {
  MAIN_GATE: 'Main Gate',
  SIDE_GATE: 'Side Gate',
  PARKING_GATE: 'Parking Gate',
  EMERGENCY_GATE: 'Emergency Gate'
};

/** Resolve gate display name from gate id */
export function resolveGateName(gateId?: string): string {
  if (!gateId) return '';
  return GATE_NAMES[gateId] ?? gateId;
}

/** Raw device row from GET/POST/PUT /hardware-devices */
export function apiToHardwareDevice(raw: Record<string, unknown>): HardwareDevice {
  return {
    id: String(raw['id'] ?? ''),
    name: String(raw['name'] ?? ''),
    type: String(raw['type'] ?? HardwareType.OTHER) as HardwareType,
    model: raw['model'] ? String(raw['model']) : undefined,
    manufacturer: raw['manufacturer'] ? String(raw['manufacturer']) : undefined,
    serialNumber: raw['serialNumber'] ? String(raw['serialNumber']) : undefined,
    firmwareVersion: raw['firmwareVersion'] ? String(raw['firmwareVersion']) : undefined,
    gateId: raw['gateId'] ? String(raw['gateId']) : undefined,
    gateName: raw['gateName'] ? String(raw['gateName']) : resolveGateName(raw['gateId'] ? String(raw['gateId']) : undefined),
    location: raw['location'] ? String(raw['location']) : undefined,
    buildingName: raw['buildingName'] ? String(raw['buildingName']) : undefined,
    floorNumber: raw['floorNumber'] != null ? Number(raw['floorNumber']) : undefined,
    status: String(raw['status'] ?? DeviceStatus.CONFIGURING) as DeviceStatus,
    connectionType: String(raw['connectionType'] ?? DeviceConnectionType.ETHERNET) as DeviceConnectionType,
    ipAddress: raw['ipAddress'] ? String(raw['ipAddress']) : undefined,
    macAddress: raw['macAddress'] ? String(raw['macAddress']) : undefined,
    port: raw['port'] != null ? Number(raw['port']) : undefined,
    lastSeen: parseApiDate(raw['lastSeen']),
    lastMaintenance: parseApiDate(raw['lastMaintenance']),
    nextMaintenance: parseApiDate(raw['nextMaintenance']),
    configuration: (raw['configuration'] as Record<string, unknown>) ?? undefined,
    settings: raw['settings'] as HardwareDevice['settings'],
    uptime: raw['uptime'] != null ? Number(raw['uptime']) : 0,
    totalOperations: raw['totalOperations'] != null ? Number(raw['totalOperations']) : 0,
    errorCount: raw['errorCount'] != null ? Number(raw['errorCount']) : 0,
    lastError: raw['lastError'] ? String(raw['lastError']) : undefined,
    lastErrorTime: parseApiDate(raw['lastErrorTime']),
    isIntegrated: Boolean(raw['isIntegrated']),
    integrationStatus: raw['integrationStatus'] as HardwareDevice['integrationStatus'],
    apiEndpoint: raw['apiEndpoint'] ? String(raw['apiEndpoint']) : undefined,
    apiKey: raw['apiKey'] ? String(raw['apiKey']) : undefined,
    notes: raw['notes'] ? String(raw['notes']) : undefined,
    tags: Array.isArray(raw['tags']) ? (raw['tags'] as string[]) : [],
    createdAt: parseApiDate(raw['createdAt']) ?? new Date(),
    updatedAt: parseApiDate(raw['updatedAt'] ?? raw['lastModified']) ?? new Date(),
    createdBy: raw['createdBy'] ? String(raw['createdBy']) : '',
    updatedBy: raw['updatedBy'] ? String(raw['updatedBy']) : undefined
  };
}

/** Serialize device for POST/PUT (dates → ISO strings) */
export function deviceToApiBody(
  device: Partial<HardwareDevice> & { societyId: string },
  id?: string
): Record<string, unknown> {
  const body: Record<string, unknown> = JSON.parse(
    JSON.stringify(device, (_k, v) => (v instanceof Date ? v.toISOString() : v))
  );
  if (id) {
    body['id'] = id;
  }
  return body;
}

/** Build POST body from create request */
export function createRequestToApiBody(
  request: CreateHardwareDeviceRequest,
  societyId: string,
  createdBy: string
): Record<string, unknown> {
  return deviceToApiBody({
    societyId,
    name: request.name,
    type: request.type,
    model: request.model,
    manufacturer: request.manufacturer,
    serialNumber: request.serialNumber,
    gateId: request.gateId,
    gateName: resolveGateName(request.gateId),
    location: request.location,
    buildingName: request.buildingName,
    floorNumber: request.floorNumber,
    status: DeviceStatus.CONFIGURING,
    connectionType: request.connectionType,
    ipAddress: request.ipAddress,
    macAddress: request.macAddress,
    port: request.port,
    configuration: request.configuration ?? {},
    settings: request.settings,
    isIntegrated: false,
    integrationStatus: 'PENDING',
    notes: request.notes,
    tags: request.tags ?? [],
    createdBy,
    uptime: 0,
    totalOperations: 0,
    errorCount: 0
  });
}

/** Merge update request into existing device for PUT */
export function mergeDeviceUpdate(
  device: HardwareDevice,
  request: UpdateHardwareDeviceRequest,
  societyId: string
): Record<string, unknown> {
  const updated: HardwareDevice = {
    ...device,
    ...request,
    gateName: request.gateId !== undefined ? resolveGateName(request.gateId) : device.gateName,
    updatedAt: new Date()
  };
  return deviceToApiBody({ ...updated, societyId }, device.id);
}

/** Apply client-side filters on devices from API */
export function applyHardwareFilter(
  devices: HardwareDevice[],
  filter?: HardwareFilter
): HardwareDevice[] {
  if (!filter) return devices.sort((a, b) => a.name.localeCompare(b.name));

  let filtered = [...devices];
  if (filter.type) filtered = filtered.filter(d => d.type === filter.type);
  if (filter.status) filtered = filtered.filter(d => d.status === filter.status);
  if (filter.gateId) filtered = filtered.filter(d => d.gateId === filter.gateId);
  if (filter.connectionType) filtered = filtered.filter(d => d.connectionType === filter.connectionType);
  if (filter.isIntegrated !== undefined) filtered = filtered.filter(d => d.isIntegrated === filter.isIntegrated);
  if (filter.searchTerm) {
    const search = filter.searchTerm.toLowerCase();
    filtered = filtered.filter(
      d =>
        d.name.toLowerCase().includes(search) ||
        d.model?.toLowerCase().includes(search) ||
        d.manufacturer?.toLowerCase().includes(search) ||
        d.serialNumber?.toLowerCase().includes(search) ||
        d.location?.toLowerCase().includes(search)
    );
  }
  return filtered.sort((a, b) => a.name.localeCompare(b.name));
}

/** Compute statistics from loaded device list */
export function computeHardwareStatistics(devices: HardwareDevice[]): HardwareStatistics {
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byGate: Record<string, number> = {};

  devices.forEach(d => {
    byType[d.type] = (byType[d.type] || 0) + 1;
    byStatus[d.status] = (byStatus[d.status] || 0) + 1;
    if (d.gateId) byGate[d.gateId] = (byGate[d.gateId] || 0) + 1;
  });

  const totalUptime = devices.reduce((sum, d) => sum + (d.uptime || 0), 0);
  const totalOps = devices.reduce((sum, d) => sum + (d.totalOperations || 0), 0);

  return {
    totalDevices: devices.length,
    onlineDevices: devices.filter(d => d.status === DeviceStatus.ONLINE).length,
    offlineDevices: devices.filter(d => d.status === DeviceStatus.OFFLINE).length,
    maintenanceDevices: devices.filter(d => d.status === DeviceStatus.MAINTENANCE).length,
    errorDevices: devices.filter(d => d.status === DeviceStatus.ERROR).length,
    byType,
    byStatus,
    byGate,
    averageUptime: devices.length > 0 ? totalUptime / devices.length : 0,
    totalOperations: totalOps,
    integrationStatus: {
      active: devices.filter(d => d.integrationStatus === 'ACTIVE').length,
      inactive: devices.filter(d => d.integrationStatus === 'INACTIVE').length,
      pending: devices.filter(d => d.integrationStatus === 'PENDING').length
    }
  };
}

/** Map type-specific test names to generic hardware test types */
export function toGenericTestType(testType: string): DeviceTestRequest['testType'] {
  if (testType === 'CONNECTION') return 'CONNECTION';
  if (testType === 'INTEGRATION') return 'INTEGRATION';
  if (testType === 'FUNCTIONALITY') return 'FUNCTIONALITY';
  return 'FULL';
}

/** Client-side device test based on stored device status (no telephony backend) */
export function runDeviceTest(
  device: HardwareDevice | null,
  request: DeviceTestRequest
): DeviceTestResult {
  if (!device) {
    return {
      success: false,
      testType: request.testType,
      results: { device_found: { passed: false, message: 'Device not found' } },
      overallStatus: 'FAIL',
      timestamp: new Date()
    };
  }

  const results: DeviceTestResult['results'] = {};

  if (request.testType === 'CONNECTION' || request.testType === 'FULL') {
    results['connection'] = {
      passed: device.status === DeviceStatus.ONLINE,
      message: device.status === DeviceStatus.ONLINE ? 'Device is online' : `Device status: ${device.status}`,
      duration: 500
    };
  }
  if (request.testType === 'FUNCTIONALITY' || request.testType === 'FULL') {
    results['functionality'] = {
      passed: device.status !== DeviceStatus.ERROR,
      message: device.status !== DeviceStatus.ERROR ? 'Device functionality check passed' : 'Device reported errors',
      duration: 800
    };
  }
  if (request.testType === 'INTEGRATION' || request.testType === 'FULL') {
    results['integration'] = {
      passed: device.isIntegrated && device.integrationStatus === 'ACTIVE',
      message: device.isIntegrated ? `Integration: ${device.integrationStatus ?? 'unknown'}` : 'Device not integrated',
      duration: 600
    };
  }

  const values = Object.values(results);
  const allPassed = values.every(r => r.passed);
  const anyPassed = values.some(r => r.passed);

  return {
    success: allPassed,
    testType: request.testType,
    results,
    overallStatus: allPassed ? 'PASS' : anyPassed ? 'PARTIAL' : 'FAIL',
    timestamp: new Date()
  };
}

/** Check if raw device belongs to a hardware type group */
export function matchesHardwareTypes(raw: Record<string, unknown>, types: HardwareType[]): boolean {
  const t = String(raw['type'] ?? '');
  return types.includes(t as HardwareType);
}

/** Map any typed device JSON to a generic record preserving extra fields */
export function apiToTypedDevice<T extends Record<string, unknown>>(
  raw: Record<string, unknown>,
  typeField: string,
  defaultType: string
): T {
  const base = apiToHardwareDevice(raw) as unknown as Record<string, unknown>;
  return {
    ...raw,
    ...base,
    [typeField]: raw[typeField] ?? raw['subType'] ?? defaultType
  } as T;
}
