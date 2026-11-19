// Fixed scenes for screenshots: ?shot=editor shows the editor with sample photos
// loaded; ?shot=cover shows the cover alone at export size. Query params pick
// the scene: layout, grade, size, title, subtitle, photos (sample names, comma
// separated). window.__shotReady is set once the scene is painted.

import { renderCover, sizeOf } from './cover.js';

export async function runShot(shot, query, api) {
  const { loadImage, state, redraw, applyLayout } = api;
  const canvas = document.getElementById('preview');
  if (shot === 'cover') document.body.classList.add('shot-cover');

  const layout = query.get('layout') ?? 'vice-five';
  const grade = query.get('grade') ?? 'neon';
  const size = query.get('size') ?? '1920x1080';
  const title = query.get('title') ?? 'VICE CITY';
  const subtitle = query.get('subtitle') ?? 'SUNSET HEIST';
  const photoNames = (query.get('photos') ?? 'boulevard,pier').split(',').filter(Boolean);

  state.size = size;
  state.grade = grade;
  state.title = title;
  state.subtitle = subtitle;
  const titleInput = document.getElementById('title');
  const subtitleInput = document.getElementById('subtitle');
  if (titleInput) titleInput.value = title;
  if (subtitleInput) subtitleInput.value = subtitle;

  // Load the sample photos into the tray.
  for (const name of photoNames) {
    try {
      const img = await loadImage(`samples/${name}.jpg`);
      state.photos.push(img);
      state.photoNames.push(`${name}.jpg`);
      api.addTrayThumb?.(state.photos.length - 1);
    } catch {
      // A missing sample leaves its panels empty; the scene still renders.
    }
  }

  applyLayout(layout);
  // Fill the panels round-robin with the loaded photos.
  if (state.photos.length > 0) {
    state.panels.forEach((p, i) => { p.photo = i % state.photos.length; });
  }

  // Anton must be ready before the first paint, or the caption falls back.
  try { await document.fonts.load('100px Anton'); } catch { /* keep the fallback */ }
  await document.fonts.ready;

  if (shot === 'cover') {
    // Draw the cover at full export size on the visible canvas, so a viewport
    // screenshot at the same size is the app's own drawing, pixel for pixel.
    const { w, h } = sizeOf(size);
    canvas.width = w;
    canvas.height = h;
    renderCover(canvas, state);
  } else {
    redraw();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
