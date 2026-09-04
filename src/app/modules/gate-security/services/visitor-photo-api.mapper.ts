/**
 * Maps visitor API rows into gate-security photo gallery cards.
 * Photos are stored as {@code local:{visitorId}} in the API with the JPEG in browser localStorage.
 */

import { Visitor } from '../../visitor-management/models/visitor.model';
import { RecurringVisitor } from '../../visitor-management/models/recurring-visitor.model';
import { MonthlyGatepass } from '../../visitor-management/models/monthly-gatepass.model';
import {
  VisitorPhoto,
  PhotoCaptureSource,
  PhotoQuality,
  PhotoStatus
} from '../models/visitor-photo.model';

export const RETENTION_DAYS = 7;
/** Marker stored in visitors.photo when full JPEG is kept in browser localStorage */
export const LOCAL_PHOTO_PREFIX = 'local:';

/** localStorage key for full JPEG when API row stores a short reference */
export function photoCacheKey(societyId: string, visitorId: string): string {
  return `visitor_photo_img_${societyId}_${visitorId}`;
}

/** True when API row points at a browser-cached image */
export function isLocalPhotoReference(url: string | undefined): boolean {
  return (url ?? '').trim().startsWith(LOCAL_PHOTO_PREFIX);
}

/** True when the string is a usable browser data URL */
export function isValidPhotoDataUrl(url: string | undefined): boolean {
  const raw = (url ?? '').trim();
  if (!raw.startsWith('data:image/')) {
    return false;
  }
  if (isLocalPhotoReference(raw)) {
    return false;
  }
  const base64 = raw.split(',')[1] ?? '';
  // Valid JPEG/PNG thumbs are typically well above this; rejects empty/truncated payloads
  return base64.length >= 80;
}

/**
 * Resize/compress a camera capture so it fits the visitors.photo TEXT column
 * and remains a valid JPEG data URL in the gallery.
 */
export function compressPhotoDataUrl(
  dataUrl: string,
  maxWidth = 320,
  maxChars = 55000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / Math.max(img.width, 1));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not available'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      for (let q = 0.75; q >= 0.35; q -= 0.07) {
        const out = canvas.toDataURL('image/jpeg', q);
        if (out.length <= maxChars) {
          resolve(out);
          return;
        }
      }
      resolve(canvas.toDataURL('image/jpeg', 0.35));
    };
    img.onerror = () => reject(new Error('Could not read captured image'));
    img.src = dataUrl;
  });
}

/** Tiny placeholder when stored photo bytes are missing or corrupt */
export function photoPlaceholderDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
    <rect width="320" height="180" fill="#e8ecf1"/>
    <text x="160" y="92" text-anchor="middle" fill="#64748b" font-family="Arial" font-size="14">Photo unavailable</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Read cached JPEG for a visitor if present */
export function readCachedPhoto(societyId: string, visitorId: string): string | undefined {
  if (!societyId || !visitorId) {
    return undefined;
  }
  try {
    const cached = localStorage.getItem(photoCacheKey(societyId, visitorId));
    return isValidPhotoDataUrl(cached ?? undefined) ? cached!.trim() : undefined;
  } catch {
    return undefined;
  }
}

/** Resolve display URL: local cache → inline data URL → placeholder */
export function resolvePhotoDisplayUrl(
  photoUrl: string | undefined,
  societyId: string,
  visitorId: string
): string {
  const cached = readCachedPhoto(societyId, visitorId);
  if (cached) {
    return cached;
  }

  const raw = (photoUrl ?? '').trim();
  if (isLocalPhotoReference(raw)) {
    return photoPlaceholderDataUrl();
  }

  if (isValidPhotoDataUrl(raw)) {
    return raw;
  }

  return photoPlaceholderDataUrl();
}

/** Encode capture metadata in guardNotes for later display filters */
export function buildPhotoGuardNotes(
  source: PhotoCaptureSource,
  gateId?: string,
  capturedBy?: string,
  notes?: string
): string {
  const parts = [
    `photoCapture:${source}`,
    gateId ? `gate:${gateId}` : undefined,
    capturedBy ? `capturedBy:${capturedBy}` : undefined,
    notes?.trim() || undefined
  ].filter(Boolean);
  return parts.join(' | ');
}

/** Parse gate id stored in guardNotes during capture */
export function parseGateIdFromNotes(notes?: string): string | undefined {
  if (!notes) {
    return undefined;
  }
  const match = notes.match(/gate:([A-Z_]+)/i);
  return match?.[1]?.toUpperCase();
}

/** Parse capture source from guardNotes */
export function parseCaptureSourceFromNotes(notes?: string): PhotoCaptureSource {
  if (!notes) {
    return PhotoCaptureSource.GATE_ENTRY;
  }
  const match = notes.match(/photoCapture:([A-Z_]+)/i);
  const raw = match?.[1]?.toUpperCase();
  if (raw && Object.values(PhotoCaptureSource).includes(raw as PhotoCaptureSource)) {
    return raw as PhotoCaptureSource;
  }
  if (notes.toLowerCase().includes('manual')) {
    return PhotoCaptureSource.MANUAL_CAPTURE;
  }
  if (notes.toLowerCase().includes('exit')) {
    return PhotoCaptureSource.GATE_EXIT;
  }
  return PhotoCaptureSource.GATE_ENTRY;
}

function formatGateName(gateId?: string): string | undefined {
  if (!gateId) {
    return undefined;
  }
  return gateId
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function resolveCaptureDate(visitor: Visitor): Date {
  return visitor.checkInTime ?? visitor.createdAt ?? new Date();
}

function estimateQuality(photoUrl: string): { quality: PhotoQuality; score: number } {
  const len = photoUrl.length;
  if (len > 400) {
    return { quality: PhotoQuality.HIGH, score: 82 };
  }
  if (len > 200) {
    return { quality: PhotoQuality.MEDIUM, score: 68 };
  }
  return { quality: PhotoQuality.LOW, score: 45 };
}

function applyRetention(captureDate: Date): {
  expiryDate: Date;
  daysRemaining: number;
  isExpired: boolean;
} {
  const expiryDate = new Date(captureDate);
  expiryDate.setDate(expiryDate.getDate() + RETENTION_DAYS);
  const diffMs = expiryDate.getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  return { expiryDate, daysRemaining, isExpired: diffMs <= 0 };
}

/** Visitor row with embedded photo → gallery card */
export function visitorToPhoto(
  visitor: Visitor,
  archivedIds: Set<string>,
  deletedIds: Set<string>,
  societyId?: string
): VisitorPhoto | null {
  const photoUrl = (visitor.photo ?? '').trim();
  if (deletedIds.has(visitor.id)) {
    return null;
  }

  const hasCachedImage = societyId ? !!readCachedPhoto(societyId, visitor.id) : false;
  if (!photoUrl && !hasCachedImage) {
    return null;
  }

  const captureDate = resolveCaptureDate(visitor);
  const retention = applyRetention(captureDate);
  const quality = estimateQuality(photoUrl);
  const gateId = parseGateIdFromNotes(visitor.guardNotes);
  const isArchived = archivedIds.has(visitor.id);

  let status = PhotoStatus.ACTIVE;
  if (isArchived) {
    status = PhotoStatus.ARCHIVED;
  } else if (retention.isExpired) {
    status = PhotoStatus.PENDING_DELETION;
  }

  return {
    id: visitor.id,
    visitorId: visitor.id,
    visitorName: visitor.name,
    visitorPhone: visitor.phone,
    visitingFlat: visitor.visitingFlat,
    hostName: visitor.hostName,
    photoUrl,
    thumbnailUrl: photoUrl,
    captureSource: parseCaptureSourceFromNotes(visitor.guardNotes),
    captureDate,
    captureTime: captureDate,
    capturedBy: visitor.checkedInBy ?? visitor.invitedBy ?? 'system',
    capturedByGuard: visitor.checkedInBy,
    gateId,
    gateName: formatGateName(gateId),
    quality: quality.quality,
    qualityScore: quality.score,
    faceDetected: photoUrl.length > 100,
    faceCount: photoUrl.length > 100 ? 1 : 0,
    fileSize: Math.floor(photoUrl.length * 0.75),
    status,
    storageDate: captureDate,
    expiryDate: retention.expiryDate,
    daysRemaining: retention.daysRemaining,
    isExpired: retention.isExpired && !isArchived,
    notes: visitor.guardNotes,
    relatedVisitorEntryId: visitor.id,
    createdAt: visitor.createdAt,
    updatedAt: visitor.updatedAt
  };
}

/** Recurring visitor photoUrl → gallery card */
export function recurringVisitorToPhoto(
  row: RecurringVisitor,
  archivedIds: Set<string>
): VisitorPhoto | null {
  const photoUrl = (row.photo ?? '').trim();
  if (!photoUrl) {
    return null;
  }
  const captureDate = row.createdAt ?? new Date();
  const retention = applyRetention(captureDate);
  const quality = estimateQuality(photoUrl);
  const isArchived = archivedIds.has(`recurring::${row.id}`);

  return {
    id: `recurring::${row.id}`,
    visitorId: row.id,
    visitorName: row.name,
    visitorPhone: row.phone,
    visitingFlat: row.visitingFlat,
    hostName: row.hostName,
    photoUrl,
    thumbnailUrl: photoUrl,
    captureSource: PhotoCaptureSource.VISITOR_REGISTRATION,
    captureDate,
    captureTime: captureDate,
    capturedBy: 'registration',
    quality: quality.quality,
    qualityScore: quality.score,
    faceDetected: true,
    faceCount: 1,
    fileSize: Math.floor(photoUrl.length * 0.75),
    status: isArchived ? PhotoStatus.ARCHIVED : retention.isExpired ? PhotoStatus.PENDING_DELETION : PhotoStatus.ACTIVE,
    storageDate: captureDate,
    expiryDate: retention.expiryDate,
    daysRemaining: retention.daysRemaining,
    isExpired: retention.isExpired && !isArchived,
    createdAt: captureDate,
    updatedAt: row.updatedAt ?? captureDate
  };
}

/** Monthly gatepass photo → gallery card */
export function gatepassToPhoto(
  row: MonthlyGatepass,
  archivedIds: Set<string>
): VisitorPhoto | null {
  const photoUrl = (row.photo ?? '').trim();
  if (!photoUrl) {
    return null;
  }
  const captureDate = row.createdAt ?? new Date();
  const retention = applyRetention(captureDate);
  const quality = estimateQuality(photoUrl);
  const isArchived = archivedIds.has(`gatepass::${row.id}`);

  return {
    id: `gatepass::${row.id}`,
    visitorId: row.id,
    visitorName: row.visitorName,
    visitorPhone: row.phone,
    visitingFlat: row.visitingFlat,
    hostName: row.hostName,
    photoUrl,
    thumbnailUrl: photoUrl,
    captureSource: PhotoCaptureSource.VISITOR_REGISTRATION,
    captureDate,
    captureTime: captureDate,
    capturedBy: 'registration',
    quality: quality.quality,
    qualityScore: quality.score,
    faceDetected: true,
    faceCount: 1,
    fileSize: Math.floor(photoUrl.length * 0.75),
    status: isArchived ? PhotoStatus.ARCHIVED : retention.isExpired ? PhotoStatus.PENDING_DELETION : PhotoStatus.ACTIVE,
    storageDate: captureDate,
    expiryDate: retention.expiryDate,
    daysRemaining: retention.daysRemaining,
    isExpired: retention.isExpired && !isArchived,
    createdAt: captureDate,
    updatedAt: row.updatedAt ?? captureDate
  };
}

/** Minimal PUT body to attach or clear a photo on an existing visitor */
export function visitorPhotoPatchBody(
  visitor: Visitor,
  societyId: string,
  photo: string | null,
  guardNotes?: string
): Record<string, unknown> {
  const visitDate =
    visitor.visitDate instanceof Date
      ? visitor.visitDate.toISOString().split('T')[0]
      : String(visitor.visitDate ?? '').split('T')[0];

  return {
    societyId,
    name: visitor.name,
    phone: visitor.phone,
    email: visitor.email,
    purpose: visitor.purpose,
    visitingFlat: visitor.visitingFlat,
    visitingUnit: visitor.visitingUnit,
    hostName: visitor.hostName,
    hostPhone: visitor.hostPhone,
    hostId: visitor.hostId,
    visitDate,
    visitTime: visitor.visitTime,
    expectedDuration: visitor.expectedDuration,
    vehicleNumber: visitor.vehicleNumber,
    vehicleType: visitor.vehicleType,
    numberOfVisitors: visitor.numberOfVisitors,
    status: visitor.status,
    approvalStatus: visitor.approvalStatus,
    photo: photo ?? '',
    guardNotes: guardNotes ?? visitor.guardNotes
  };
}
