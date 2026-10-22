// Runs in the browser. Turns whatever the user picked into a small square JPEG, which also strips EXIF data
// (GPS location, camera, date) from the photo before it ever leaves their device.
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
export const PHOTO_MAX_INPUT = 10 * 1024 * 1024; // largest original file we will open
const OUT = 480;                                  // output is OUT x OUT pixels
const TARGET_BYTES = 250 * 1024;                  // try to land under this; the server's hard cap is 400 KB
const QUALITIES = [0.88, 0.8, 0.7, 0.6, 0.5];

const toBlob = (c: HTMLCanvasElement, q: number) =>
  new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", q));

export async function compressPhoto(file: File): Promise<Blob> {
  if (!PHOTO_ACCEPT.split(",").includes(file.type)) throw new Error("Please choose a JPG, PNG or WebP image.");
  if (file.size > PHOTO_MAX_INPUT) throw new Error("That photo is larger than 10 MB. Please choose a smaller one.");

  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); }          // honours the camera's rotation
  catch { try { bmp = await createImageBitmap(file); } catch { throw new Error("That image couldn’t be read. Try a different photo."); } }

  try {
    const side = Math.min(bmp.width, bmp.height);
    if (side < 200) throw new Error("That photo is too small. Use one at least 200 × 200 pixels.");
    // Centre square crop. For portrait photos lean towards the top, where faces usually are.
    const sx = (bmp.width - side) / 2;
    const sy = (bmp.height - side) * 0.25;
    const canvas = document.createElement("canvas");
    canvas.width = OUT; canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser couldn’t process the photo.");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, OUT, OUT);   // JPEG has no transparency: PNG/WebP cut-outs get a white background
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, sx, sy, side, side, 0, 0, OUT, OUT);
    for (const q of QUALITIES) {
      const blob = await toBlob(canvas, q);
      if (blob && blob.size <= TARGET_BYTES) return blob;
    }
    throw new Error("That photo couldn’t be made small enough. Try a different one.");
  } finally { bmp.close(); }
}
