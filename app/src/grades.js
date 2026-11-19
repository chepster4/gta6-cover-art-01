// Colour grades for the cover: each grade is a photo filter plus a tint overlay.
// Sunset is a warm Vice City evening, Neon is a cyan-to-magenta duotone, Vice Pink
// is a hot magenta wash, Noir is high-contrast black and white. All of it is drawn
// with plain canvas operations, no library and no network.

export const GRADES = {
  sunset: {
    label: 'Sunset',
    // CSS filter applied when the photo is drawn onto its panel.
    filter: 'saturate(1.25) contrast(1.08) brightness(1.03)',
    // Warm gradient washed over the photo, top to bottom.
    tint: ['rgba(255, 170, 60, 0.10)', 'rgba(255, 110, 40, 0.22)', 'rgba(214, 38, 120, 0.30)'],
    accent: '#ffb347',
    caption: '#ffffff',
  },
  neon: {
    label: 'Neon',
    filter: 'saturate(1.15) contrast(1.12) brightness(1.02)',
    // Duotone endpoints: shadows go cyan, highlights go magenta.
    duotoneFrom: [0, 224, 255],
    duotoneTo: [255, 0, 168],
    tint: ['rgba(0, 224, 255, 0.06)', 'rgba(120, 40, 255, 0.10)', 'rgba(255, 0, 168, 0.20)'],
    accent: '#00e0ff',
    caption: '#ffffff',
  },
  pink: {
    label: 'Vice Pink',
    filter: 'saturate(1.6) contrast(1.06) brightness(1.04)',
    tint: ['rgba(255, 80, 190, 0.22)', 'rgba(255, 0, 150, 0.32)', 'rgba(170, 0, 120, 0.42)'],
    accent: '#ff5ec4',
    caption: '#ffffff',
  },
  noir: {
    label: 'Noir',
    filter: 'grayscale(1) contrast(1.28) brightness(1.06)',
    tint: ['rgba(255, 255, 255, 0.02)', 'rgba(0, 0, 0, 0.06)', 'rgba(0, 0, 0, 0.22)'],
    accent: '#e8e8e8',
    caption: '#ffffff',
  },
};

export const GRADE_IDS = Object.keys(GRADES);

/** Returns the grade definition for `id`, falling back to Sunset for unknown ids. */
export function gradeOf(id) {
  return GRADES[id] ?? GRADES.sunset;
}

/**
 * Turns the pixels of `panelCanvas` into a duotone: each pixel's luminance picks a
 * colour on the line from `from` (shadows) to `to` (highlights). Used by Neon.
 */
export function duotonePanel(panelCanvas, from, to) {
  const ctx = panelCanvas.getContext('2d');
  const { width: w, height: h } = panelCanvas;
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const lum = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) / 255;
    // A gentle S-curve keeps mid-tones from washing out.
    const t = lum * lum * (3 - 2 * lum);
    px[i] = from[0] + (to[0] - from[0]) * t;
    px[i + 1] = from[1] + (to[1] - from[1]) * t;
    px[i + 2] = from[2] + (to[2] - from[2]) * t;
  }
  ctx.putImageData(data, 0, 0);
}

/**
 * Washes a tint gradient over a finished panel. `grade` is one of GRADES.
 * Called after the photo (and any duotone) is already on the panel canvas.
 */
export function tintPanel(panelCanvas, grade) {
  if (!grade.tint) return;
  const ctx = panelCanvas.getContext('2d');
  const { width: w, height: h } = panelCanvas;
  const g = ctx.createLinearGradient(0, 0, w * 0.25, h);
  g.addColorStop(0, grade.tint[0]);
  g.addColorStop(0.55, grade.tint[1]);
  g.addColorStop(1, grade.tint[2]);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
}
