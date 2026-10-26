// Melo: een afbeelding of screenshot die je toevoegt (paperclip, plakken of slepen), klaarmaken voor de AI op dit apparaat.
// In beide edities (Lucas 22 okt: "als ik een afbeelding heb of screenshot etc, dat ik dat allemaal aan melo kan vragen",
// "fix ook dat dit in de extensie kan"). De afbeelding wordt verkleind en zonder metadata (zoals een locatie) als beeld aan
// de AI van de browser gegeven (device.js, askImage); er wordt niets verstuurd of bewaard. Bestanden met tekst (pdf, Word,
// Excel) lezen zit alleen in Business: chat/read.js, dat dit bestand gebruikt om afbeeldingen te verkleinen.
//
//   read(file) → { kind: 'image', name, blob, dataUrl } | { kind: 'unreadable', name, why: 'big' | 'type' }
(function (root) {
  'use strict';
  const MAX_BYTES = 20 * 1024 * 1024, MAX_SIDE = 1600;
  const IMAGE = /^image\/(png|jpe?g|webp|gif|bmp)$/;
  const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp)$/i;
  // Wat de paperclip in de gratis editie aanbiedt.
  const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';

  const isImage = (file, name = file.name || '') => IMAGE.test(file.type || '') || IMAGE_EXT.test(name);

  // Een afbeelding verkleinen tot hooguit MAX_SIDE pixels: sneller voor de AI en zonder metadata (zoals een locatie).
  async function shrink(file) {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
    const c = new OffscreenCanvas(w, h);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); // doorzichtig wordt wit, niet zwart
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const blob = await c.convertToBlob({ type: 'image/jpeg', quality: 0.88 });
    const dataUrl = await new Promise((ok, fail) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = fail; r.readAsDataURL(blob); });
    return { blob, dataUrl };
  }

  async function read(file) {
    const name = file.name || 'image.png';
    if (file.size > MAX_BYTES) return { kind: 'unreadable', name, why: 'big' };
    if (!isImage(file, name)) return { kind: 'unreadable', name, why: 'type' };
    try { return { kind: 'image', name, ...(await shrink(file)) }; }
    catch (err) { console.warn('Melo: afbeelding lezen', err); return { kind: 'unreadable', name, why: 'type' }; }
  }

  const api = { read, shrink, isImage, ACCEPT, MAX_BYTES, MAX_SIDE };
  root.KameloBeeld = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
