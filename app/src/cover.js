// Renders the cover onto any 2D canvas: panels with per-panel crop/position, the
// colour grade, a synthwave sun in the caption band, bold Anton lettering, film
// grain and a vignette. The same function draws the live preview and the exported
// PNG, so what you see is exactly what you share.

import { gradeOf, duotonePanel, tintPanel } from './grades.js';
import { layoutPanels } from './layouts.js';

export const EXPORT_SIZES = [
  { id: '1080x1080', label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: 'Landscape · 1920 × 1080', w: 1920, h: 1080 },
];

export function sizeOf(id) {
  return EXPORT_SIZES.find((s) => s.id === id) ?? EXPORT_SIZES[0];
}

// One shared noise tile, built once, reused for every grain pass.
let noiseTile = null;
function getNoiseTile() {
  if (noiseTile) return noiseTile;
  const c = document.createElement('canvas');
  c.width = 140;
  c.height = 140;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(140, 140);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 256);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  noiseTile = c;
  return c;
}

/**
 * Draws one photo into a panel rect, honouring the panel's crop state:
 * `zoom` (1 = fit the panel exactly, higher = zoomed in) and `ox`/`oy`
 * pan offsets in the range -1..1. `mode` is 'fill' (crop to cover) or 'fit'.
 */
export function drawPhotoPanel(ctx, img, rect, transform, grade) {
  const { x, y, w, h } = rect;
  const panel = document.createElement('canvas');
  panel.width = Math.max(2, Math.round(w));
  panel.height = Math.max(2, Math.round(h));
  const pctx = panel.getContext('2d');
  pctx.fillStyle = '#1a1024';
  pctx.fillRect(0, 0, panel.width, panel.height);
  if (img) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const zoom = transform?.zoom ?? 1;
    const base = transform?.mode === 'fit'
      ? Math.min(panel.width / iw, panel.height / ih)
      : Math.max(panel.width / iw, panel.height / ih);
    const s = base * zoom;
    const dw = iw * s;
    const dh = ih * s;
    const rangeX = Math.max(0, (dw - panel.width) / 2);
    const rangeY = Math.max(0, (dh - panel.height) / 2);
    const dx = (panel.width - dw) / 2 - (transform?.ox ?? 0) * rangeX;
    const dy = (panel.height - dh) / 2 - (transform?.oy ?? 0) * rangeY;
    pctx.filter = grade.filter;
    pctx.drawImage(img, dx, dy, dw, dh);
    pctx.filter = 'none';
  }
  if (grade.duotoneFrom) duotonePanel(panel, grade.duotoneFrom, grade.duotoneTo);
  tintPanel(panel, grade);
  ctx.drawImage(panel, x, y, w, h);
  // Thin dark frame line, comic-poster style.
  ctx.strokeStyle = 'rgba(10, 6, 18, 0.9)';
  ctx.lineWidth = Math.max(2, Math.round(w * 0.004));
  ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
}

/** A synthwave sun: a striped disc glowing behind the caption band. */
function drawSun(ctx, cx, cy, r, grade) {
  ctx.save();
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.9);
  glow.addColorStop(0, grade.accent);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  const disc = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  disc.addColorStop(0, '#ffd76a');
  disc.addColorStop(0.55, '#ff7a3d');
  disc.addColorStop(1, grade.accent);
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Horizontal slits cut through the lower half of the disc.
  ctx.fillStyle = 'rgba(16, 8, 28, 0.9)';
  let sy = cy + r * 0.08;
  let sh = r * 0.05;
  while (sy < cy + r) {
    ctx.fillRect(cx - r, sy, r * 2, sh);
    sy += sh + r * 0.16;
    sh *= 1.35;
  }
  ctx.restore();
}

/** Letters the title and subtitle into the caption band (or overlay zone). */
export function drawCaption(ctx, band, title, subtitle, grade, W, H) {
  const { x, y, w, h } = band;
  if (band.overlay) {
    const scrim = ctx.createLinearGradient(0, y, 0, y + h);
    scrim.addColorStop(0, 'rgba(10, 5, 20, 0)');
    scrim.addColorStop(1, 'rgba(10, 5, 20, 0.82)');
    ctx.fillStyle = scrim;
    ctx.fillRect(x, y, w, h);
  }
  const text = (title || '').trim().toUpperCase();
  const sub = (subtitle || '').trim().toUpperCase();
  const pad = Math.round(w * 0.045);
  // The sun sits at the right end of the band when there is room for it.
  const sunR = h * 0.34;
  const sunX = x + w - pad - sunR;
  const sunY = y + h * 0.5;
  const textW = w - pad * 2 - (w > 900 ? sunR * 2.2 : 0);
  if (text) {
    let size = Math.round(h * 0.52);
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    while (size > 16 && ctx.measureText(text).width > textW) {
      size -= 2;
      ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(12, 4, 22, 0.95)';
    ctx.lineWidth = Math.max(3, size * 0.09);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = size * 0.12;
    ctx.shadowOffsetY = size * 0.03;
    const ty = y + (sub ? h * 0.36 : h * 0.52);
    ctx.strokeText(text, x + pad, ty);
    ctx.fillStyle = grade.caption;
    ctx.fillText(text, x + pad, ty);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  if (sub) {
    const subSize = Math.max(14, Math.round(h * 0.17));
    ctx.font = `${subSize}px Anton, 'Arial Narrow', sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.28)}px`; } catch { /* older canvas */ }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = grade.accent;
    ctx.fillText(sub, x + pad, y + h * 0.8);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
  // The synthwave sun rides in the caption band for the warm and neon grades.
  const sunny = grade === gradeOf('sunset') || grade === gradeOf('neon') || grade === gradeOf('pink');
  if (w > 900 && sunny) {
    drawSun(ctx, sunX, sunY, sunR, grade);
  }
}

/** Film grain: a tiled noise pattern washed over the whole cover. */
export function applyGrain(ctx, W, H, amount = 0.07) {
  const tile = getNoiseTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Vignette: darkened corners so the panels read like a poster. */
export function applyVignette(ctx, W, H, strength = 0.32) {
  const g = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, `rgba(0, 0, 0, ${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Renders a whole cover. `state` carries layout, grade, title, subtitle, the
 * tray of photos and one crop transform per panel. `photos` are HTMLImageElements
 * (or null for an empty panel). Draws at the canvas's own pixel size.
 */
export function renderCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = gradeOf(state.grade);
  const { panels, caption } = layoutPanels(state.layout, W, H);
  ctx.fillStyle = '#12081d';
  ctx.fillRect(0, 0, W, H);
  panels.forEach((rect, i) => {
    const t = state.panels?.[i];
    const img = t && t.photo >= 0 ? state.photos[t.photo] ?? null : null;
    drawPhotoPanel(ctx, img, rect, t, grade);
  });
  drawCaption(ctx, caption, state.title, state.subtitle, grade, W, H);
  applyGrain(ctx, W, H, state.grade === 'noir' ? 0.1 : 0.07);
  applyVignette(ctx, W, H, state.grade === 'noir' ? 0.42 : 0.32);
  return { panels, caption };
}
