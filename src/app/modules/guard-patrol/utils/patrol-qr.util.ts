import QRCode from 'qrcode';

/** Normalize text into a patrol checkpoint code segment (uppercase, hyphenated). */
export function slugifyPatrolCode(value: string): string {
  return (
    value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'POINT'
  );
}

/** Build a unique patrol checkpoint code for QR stickers. */
export function buildPatrolCheckpointCode(
  routeLabel: string,
  checkpoint: { name?: string; location?: string; order?: number }
): string {
  const routeSlug = slugifyPatrolCode(routeLabel || 'ROUTE');
  const cpSlug = slugifyPatrolCode(
    checkpoint.name || checkpoint.location || `CP${checkpoint.order ?? 1}`
  );
  const order = String(checkpoint.order ?? 1).padStart(2, '0');
  return `CHK-${routeSlug}-${cpSlug}-${order}`;
}

/** Render patrol QR payload as a PNG data URL for preview/download. */
export async function createPatrolQrDataUrl(payload: string, size = 512): Promise<string> {
  return QRCode.toDataURL(payload.trim(), {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'M'
  });
}

/** Trigger browser download of a generated QR PNG. */
export function downloadQrPng(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Normalize raw QR text into a patrol checkpoint code for matching. */
export function normalizePatrolScanToken(raw: string): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      const code = obj['checkpointCode'] ?? obj['code'] ?? obj['qrCode'] ?? obj['checkpointId'];
      if (code != null && String(code).trim()) {
        return String(code).trim();
      }
    } catch {
      /* fall through to plain text */
    }
  }
  return trimmed;
}
