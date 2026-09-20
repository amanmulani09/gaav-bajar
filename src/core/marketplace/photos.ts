export const maxPhotoUploadBytes = 10 * 1024 * 1024;

export function validatePhotoSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) throw new Error("photoInvalid");
  if (bytes > maxPhotoUploadBytes) throw new Error("photoTooLarge");
}

export function photoResize(width: number, height: number, longestEdge: number) {
  if (!(width > 0) || !(height > 0)) throw new Error("photoInvalid");
  return width >= height
    ? { width: Math.min(width, longestEdge) }
    : { height: Math.min(height, longestEdge) };
}
