/**
 * Shrinks a picture in the app before it is sent to the main computer, so
 * the database (and every backup of it) stays small. Keeps the aspect ratio
 * and never enlarges. PNG keeps transparency (signatures); JPEG is smaller
 * for photos.
 */
export async function shrinkImage(
  file: Blob,
  opts: { maxWidth: number; maxHeight: number; type: 'image/png' | 'image/jpeg'; quality?: number },
): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('This file is not a picture the app can open.'));
      el.src = url;
    });
    const scale = Math.min(1, opts.maxWidth / img.naturalWidth, opts.maxHeight / img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not process the picture.');
    if (opts.type === 'image/jpeg') {
      // JPEG has no transparency: put transparent areas on white, not black.
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(opts.type, opts.quality ?? 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}
