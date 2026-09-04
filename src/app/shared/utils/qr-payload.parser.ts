/** One labeled row in a human-readable QR scan result. */
export interface QrDisplayField {
  label: string;
  value: string;
}

/** Parsed QR payload for display (visitor pass, checkpoint, asset, etc.). */
export interface ParsedQrPayload {
  kind: 'visitor' | 'recurring' | 'gatepass' | 'patrol' | 'asset' | 'package' | 'url' | 'text';
  title: string;
  subtitle?: string;
  status?: string;
  fields: QrDisplayField[];
  visitorId?: string;
  recurringVisitorId?: string;
  gatepassId?: string;
  checkpointCode?: string;
  assetId?: string;
  raw: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function str(value: unknown): string {
  if (value == null || value === '') {
    return '';
  }
  return String(value).trim();
}

function formatStatus(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(value: string): string {
  if (!value) {
    return '—';
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return value;
  }
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function pushField(fields: QrDisplayField[], label: string, value: unknown): void {
  const v = str(value);
  if (v) {
    fields.push({ label, value: v });
  }
}

/** Build a short one-line summary for recent-scan lists. */
export function qrScanSummary(raw: string): string {
  const parsed = parseQrPayload(raw);
  if (parsed.subtitle) {
    return `${parsed.title} · ${parsed.subtitle}`;
  }
  return parsed.title;
}

/**
 * Turn raw QR text (often JSON from visitor/gate passes) into a readable card.
 */
export function parseQrPayload(raw: string, hintType?: string): ParsedQrPayload {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return { kind: 'text', title: 'Empty scan', fields: [], raw: trimmed };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return {
      kind: 'url',
      title: 'Web link',
      subtitle: trimmed,
      fields: [{ label: 'URL', value: trimmed }],
      raw: trimmed
    };
  }

  let obj: Record<string, unknown> | null = null;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      obj = asRecord(JSON.parse(trimmed));
    } catch {
      obj = null;
    }
  }

  if (obj) {
    const type = str(obj['type']).toUpperCase();

    if (obj['visitorId'] || type === 'VISITOR' || hintType === 'visitor') {
      const fields: QrDisplayField[] = [];
      pushField(fields, 'Phone', obj['phone']);
      pushField(fields, 'Visiting flat', obj['visitingFlat'] ?? obj['flatNumber']);
      pushField(fields, 'Host', obj['hostName']);
      pushField(fields, 'Purpose', obj['purpose']);
      pushField(fields, 'Visit date', obj['visitDate'] ? formatDate(str(obj['visitDate'])) : '');
      pushField(fields, 'Visit time', obj['visitTime']);
      pushField(fields, 'Vehicle', obj['vehicleNumber']);
      pushField(fields, 'Valid until', obj['expiryDate'] ? formatDate(str(obj['expiryDate'])) : '');
      const status = str(obj['status']);
      return {
        kind: 'visitor',
        title: str(obj['name']) || 'Visitor pass',
        subtitle: str(obj['visitingFlat'] ?? obj['flatNumber']) || undefined,
        status: status ? formatStatus(status) : undefined,
        fields,
        visitorId: str(obj['visitorId']) || undefined,
        raw: trimmed
      };
    }

    if (obj['recurringVisitorId'] || type === 'RECURRING') {
      const fields: QrDisplayField[] = [];
      pushField(fields, 'Phone', obj['phone']);
      pushField(fields, 'Visiting flat', obj['visitingFlat']);
      pushField(fields, 'Schedule', obj['recurringPattern']);
      pushField(fields, 'Visit time', obj['visitTime']);
      pushField(fields, 'Valid until', obj['expiryDate'] ? formatDate(str(obj['expiryDate'])) : '');
      return {
        kind: 'recurring',
        title: str(obj['name']) || 'Recurring visitor',
        subtitle: str(obj['visitingFlat']) || undefined,
        status: obj['isActive'] === false ? 'Inactive' : 'Active',
        fields,
        recurringVisitorId: str(obj['recurringVisitorId']) || undefined,
        raw: trimmed
      };
    }

    if (obj['gatepassId'] || type === 'GATEPASS' || type === 'MONTHLY_GATEPASS') {
      const fields: QrDisplayField[] = [];
      pushField(fields, 'Phone', obj['phone']);
      pushField(fields, 'Visiting flat', obj['visitingFlat']);
      pushField(fields, 'Valid until', obj['expiryDate'] ? formatDate(str(obj['expiryDate'])) : '');
      return {
        kind: 'gatepass',
        title: str(obj['visitorName'] ?? obj['name']) || 'Monthly gatepass',
        subtitle: str(obj['visitingFlat']) || undefined,
        fields,
        gatepassId: str(obj['gatepassId'] ?? obj['id']) || undefined,
        raw: trimmed
      };
    }

    if (obj['checkpointCode'] || obj['checkpointId'] || hintType === 'patrol') {
      const fields: QrDisplayField[] = [];
      pushField(fields, 'Checkpoint', obj['checkpointName'] ?? obj['name']);
      pushField(fields, 'Route', obj['routeName']);
      pushField(fields, 'Code', obj['checkpointCode'] ?? obj['code']);
      return {
        kind: 'patrol',
        title: str(obj['checkpointName'] ?? obj['name']) || 'Patrol checkpoint',
        subtitle: str(obj['routeName']) || undefined,
        fields,
        checkpointCode: str(obj['checkpointCode'] ?? obj['code'] ?? obj['checkpointId']) || undefined,
        raw: trimmed
      };
    }

    if (obj['assetId'] || hintType === 'asset') {
      const fields: QrDisplayField[] = [];
      pushField(fields, 'Asset code', obj['assetCode'] ?? obj['code']);
      pushField(fields, 'Location', obj['location']);
      pushField(fields, 'Category', obj['category']);
      return {
        kind: 'asset',
        title: str(obj['name'] ?? obj['assetName']) || 'Society asset',
        subtitle: str(obj['assetCode'] ?? obj['code']) || undefined,
        fields,
        assetId: str(obj['assetId'] ?? obj['id']) || undefined,
        raw: trimmed
      };
    }

    if (obj['packageId'] || hintType === 'package') {
      const fields: QrDisplayField[] = [];
      pushField(fields, 'Courier', obj['courier']);
      pushField(fields, 'Flat', obj['flatNumber'] ?? obj['deliverTo']);
      pushField(fields, 'Tracking', obj['trackingNumber']);
      return {
        kind: 'package',
        title: str(obj['recipientName'] ?? obj['name']) || 'Package delivery',
        subtitle: str(obj['flatNumber']) || undefined,
        fields,
        raw: trimmed
      };
    }

    // Generic JSON object — flatten common keys instead of dumping raw JSON.
    const fields: QrDisplayField[] = [];
    for (const [key, value] of Object.entries(obj)) {
      if (value == null || typeof value === 'object') {
        continue;
      }
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, c => c.toUpperCase())
        .trim();
      pushField(fields, label, value);
    }
    return {
      kind: 'text',
      title: str(obj['name'] ?? obj['title']) || 'Scanned code',
      fields: fields.length ? fields : [{ label: 'Details', value: 'QR data recognized' }],
      raw: trimmed
    };
  }

  // Plain text / short codes (e.g. VST-2024-001234, CHK-POOL-045)
  const kind =
    hintType === 'visitor'
      ? 'visitor'
      : hintType === 'patrol'
        ? 'patrol'
        : hintType === 'asset'
          ? 'asset'
          : hintType === 'package'
            ? 'package'
            : 'text';

  const titleByKind: Record<string, string> = {
    visitor: 'Visitor code',
    patrol: 'Checkpoint code',
    asset: 'Asset tag',
    package: 'Package code',
    text: 'Scanned code'
  };

  return {
    kind,
    title: titleByKind[kind] ?? 'Scanned code',
    fields: [{ label: 'Code', value: trimmed }],
    checkpointCode: kind === 'patrol' ? trimmed : undefined,
    raw: trimmed
  };
}

/** Prefer a readable label over raw JSON in scan history rows. */
export function formatScannedDataLabel(raw: string): string {
  const parsed = parseQrPayload(raw);
  if (parsed.kind !== 'text' || parsed.fields.length > 1) {
    return qrScanSummary(raw);
  }
  const code = parsed.fields[0]?.value;
  return code && code.length < 80 ? code : parsed.title;
}
