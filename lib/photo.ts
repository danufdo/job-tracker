// Shared photo rules (used by the server actions and the PDF builder).
export const PHOTO_BUCKET = "resume-photos";
export const photoPath = (userId: string) => `${userId}/photo.jpg`;
// The browser shrinks every photo to a 480x480 JPEG (normally 40-120 KB) before upload. The server refuses anything
// bigger than this hard cap. Keep it under the bucket's own 512 KB limit and Next's 1 MB server-action body limit.
export const PHOTO_MAX_BYTES = 400 * 1024;
export const PHOTO_MIN_BYTES = 1024;
export const PHOTO_MAX_SIDE = 1600; // pixels; stops a tiny file that decodes to a huge image

// Checks bytes really are a JPEG of sensible size. Returns an error message, or null when fine.
// Runs on upload AND again right before the photo goes into the PDF, because a user could write to Storage directly.
export function checkJpeg(b: Uint8Array): string | null {
  if (b.length < PHOTO_MIN_BYTES) return "That photo file looks empty or damaged.";
  if (b.length > PHOTO_MAX_BYTES) return "That photo is too large after processing. Try a different one.";
  if (b[0] !== 0xff || b[1] !== 0xd8 || b[2] !== 0xff) return "That file isn’t a valid JPEG image.";
  if (b[b.length - 2] !== 0xff || b[b.length - 1] !== 0xd9) return "That photo file looks truncated or damaged.";
  let i = 2, w = 0, h = 0;
  while (i + 3 < b.length) {
    if (b[i] !== 0xff) return "That photo file looks damaged.";
    const m = b[i + 1];
    if (m === 0xff) { i++; continue; }                         // fill byte
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; } // markers with no length
    if (m === 0xda || m === 0xd9) return "That photo file looks damaged."; // image data before any size info
    if (i + 8 >= b.length) return "That photo file looks damaged.";
    const isSof = m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;
    if (isSof) { h = (b[i + 5] << 8) | b[i + 6]; w = (b[i + 7] << 8) | b[i + 8]; break; }
    i += 2 + ((b[i + 2] << 8) | b[i + 3]);
  }
  if (!w || !h) return "That photo file looks damaged.";
  if (w < 100 || h < 100) return "That photo is too small. Use one at least 200 × 200 pixels.";
  if (w > PHOTO_MAX_SIDE || h > PHOTO_MAX_SIDE) return "That photo’s dimensions are too large.";
  return null;
}
