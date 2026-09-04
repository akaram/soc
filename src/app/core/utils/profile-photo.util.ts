/** Returns true when the URL is a loadable profile image (data URL or http/https). */
export function isValidProfilePhoto(url?: string | null): boolean {
  if (!url || !url.trim()) {
    return false;
  }
  const value = url.trim();
  if (value.startsWith('data:image/')) {
    return value.length > 120;
  }
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return true;
  }
  // Legacy mock paths like assets/avatars/*.jpg are not bundled in this POC.
  return false;
}

/** Two-letter initials for avatar fallback circles. */
export function getProfileInitials(name?: string | null): string {
  if (!name?.trim()) {
    return '?';
  }
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
}

/** Remote fallback avatar (used only when initials UI is not shown). */
export function buildRemoteAvatarUrl(name: string, role?: string): string {
  const bg = role === 'GUARD' || role === 'SECURITY_GUARD' ? '475569' : '667eea';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=${bg}&color=fff&size=256&bold=true`;
}

/** Resize/compress an image file for profile storage (local + API). */
export async function compressProfileImage(
  file: File,
  maxDimension = 512,
  quality = 0.82
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height, 1));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not prepare image canvas.');
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL('image/jpeg', quality);
}

/** Capture a JPEG data URL from a live webcam video element. */
export function captureDataUrlFromVideo(
  video: HTMLVideoElement,
  maxDimension = 512,
  quality = 0.82
): string {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!sourceWidth || !sourceHeight) {
    throw new Error('Camera is not ready yet.');
  }

  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight, 1));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not prepare capture canvas.');
  }
  ctx.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

/** User-friendly message when getUserMedia fails. */
export function webcamErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera permission denied. Allow camera access in browser settings and try again.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera found on this device.';
  }
  if (name === 'NotReadableError') {
    return 'Camera is in use by another app. Close it and try again.';
  }
  return 'Could not open camera. Try "Choose from device" instead.';
}
