/**
 * Stable data URL from a file — same bytes always produce the same base64 (for POC fingerprint match).
 */
export async function fileToStableDataUrl(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const base64 = btoa(binary);
  const mime = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}
