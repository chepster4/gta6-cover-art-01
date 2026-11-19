// Wires the editor: photo tray, panel picking, drag-to-pan and wheel-to-zoom,
// layout and grade pickers, caption fields, live preview and PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).

import { EXPORT_SIZES, renderCover, sizeOf } from './cover.js';
import { LAYOUT_IDS, layoutPanels, panelCount } from './layouts.js';
import { GRADE_IDS, gradeOf } from './grades.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('preview');
const tray = document.getElementById('tray');
const status = document.getElementById('status');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');

export const state = {
  layout: 'vice-five',
  grade: 'neon',
  title: 'VICE CITY',
  subtitle: 'SUNSET HEIST',
  size: '1920x1080',
  photos: [], // HTMLImageElements in tray order
  photoNames: [],
  panels: [], // one { photo, zoom, ox, oy, mode } per layout panel
  selected: 0,
};

export function freshPanels(layoutId) {
  const n = panelCount(layoutId);
  return Array.from({ length: n }, () => ({ photo: -1, zoom: 1, ox: 0, oy: 0, mode: 'fill' }));
}

export function applyLayout(layoutId) {
  state.layout = layoutId;
  state.panels = freshPanels(layoutId);
  state.selected = 0;
  syncPanelControls();
}

function previewSize() {
  const { w, h } = sizeOf(state.size);
  const scale = 880 / Math.max(w, h);
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

export function redraw() {
  const { w, h } = previewSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  renderCover(canvas, state);
  drawSelection();
  updateTraySelection();
}

/** Outlines the selected panel on the preview so the user sees what they edit. */
export function drawSelection() {
  const ctx = canvas.getContext('2d');
  const { panels } = previewLayout();
  const rect = panels[state.selected];
  if (!rect) return;
  ctx.save();
  ctx.strokeStyle = '#00e0ff';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 6]);
  ctx.strokeRect(rect.x + 1.5, rect.y + 1.5, rect.w - 3, rect.h - 3);
  ctx.setLineDash([]);
  ctx.restore();
}

// The layout geometry of the current preview, in preview pixels.
function previewLayout() {
  const { w, h } = previewSize();
  return layoutPanels(state.layout, w, h);
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function addPhotoFile(file) {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  state.photos.push(img);
  state.photoNames.push(file.name);
  addTrayThumb(state.photos.length - 1);
  // First photo fills every empty panel; later ones fill the selected panel.
  if (state.photos.length === 1) {
    state.panels.forEach((p) => { p.photo = 0; });
  } else {
    const panel = state.panels[state.selected];
    if (panel && panel.photo === -1) panel.photo = state.photos.length - 1;
  }
  redraw();
}

export function addTrayThumb(index) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'thumb';
  button.dataset.index = String(index);
  button.title = state.photoNames[index] ?? `Photo ${index + 1}`;
  const img = document.createElement('img');
  img.src = state.photos[index].src;
  img.alt = button.title;
  button.append(img);
  button.addEventListener('click', () => {
    const panel = state.panels[state.selected];
    if (!panel) return;
    panel.photo = index;
    panel.zoom = 1;
    panel.ox = 0;
    panel.oy = 0;
    redraw();
    status.textContent = `Panel ${state.selected + 1} uses ${button.title}.`;
  });
  tray.append(button);
}

function updateTraySelection() {
  const panel = state.panels[state.selected];
  tray.querySelectorAll('.thumb').forEach((el) => {
    el.classList.toggle('active', panel && Number(el.dataset.index) === panel.photo);
  });
  document.getElementById('panel-label').textContent = `Panel ${state.selected + 1} of ${state.panels.length}`;
}

function syncPanelControls() {
  const panel = state.panels[state.selected];
  const zoom = document.getElementById('zoom');
  zoom.value = panel ? String(panel.zoom) : '1';
  document.getElementById('zoom-value').textContent = panel ? `${Math.round(panel.zoom * 100)}%` : '—';
  document.getElementById('fit-mode').textContent = panel?.mode === 'fit' ? 'Fit: on' : 'Fit: off';
}

// ---- Pickers: layout, grade, export size ------------------------------------

function buildPicker(containerId, ids, labels, current, onPick) {
  const box = document.getElementById(containerId);
  box.innerHTML = '';
  ids.forEach((id, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick' + (id === current ? ' active' : '');
    b.textContent = labels[i];
    b.addEventListener('click', () => {
      box.querySelectorAll('.pick').forEach((el) => el.classList.remove('active'));
      b.classList.add('active');
      onPick(id);
    });
    box.append(b);
  });
}

buildPicker('layout-picker', LAYOUT_IDS, LAYOUT_IDS.map((id) => {
  const names = { 'vice-five': 'Vice Five · 5', 'sunset-strip': 'Sunset Strip · 3', 'neon-duo': 'Neon Duo · 2', 'solo-hero': 'Solo Hero · 1' };
  return names[id] ?? id;
}), state.layout, (id) => { applyLayout(id); redraw(); });

buildPicker('grade-picker', GRADE_IDS, GRADE_IDS.map((id) => gradeOf(id).label), state.grade, (id) => {
  state.grade = id;
  redraw();
});

buildPicker('size-picker', EXPORT_SIZES.map((s) => s.id), EXPORT_SIZES.map((s) => s.label), state.size, (id) => {
  state.size = id;
  redraw();
});

// ---- Photo input -------------------------------------------------------------

document.getElementById('photos').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    try { await addPhotoFile(file); } catch { status.textContent = `Could not read ${file.name}.`; }
  }
  e.target.value = '';
});

document.getElementById('load-samples').addEventListener('click', async () => {
  for (const name of ['boulevard', 'pier']) {
    if (state.photoNames.includes(`${name}.jpg`)) continue;
    try {
      const img = await loadImage(`samples/${name}.jpg`);
      state.photos.push(img);
      state.photoNames.push(`${name}.jpg`);
      addTrayThumb(state.photos.length - 1);
    } catch { /* sample missing: keep going */ }
  }
  if (state.photos.length > 0) {
    state.panels.forEach((p, i) => { if (p.photo === -1) p.photo = i % state.photos.length; });
  }
  redraw();
  status.textContent = 'Sample photos loaded. Click a panel, then a photo, to place it.';
});

// ---- Panel picking, drag-to-pan, wheel-to-zoom -------------------------------

function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const x = (clientX - r.left) * (canvas.width / r.width);
  const y = (clientY - r.top) * (canvas.height / r.height);
  const { panels } = previewLayout();
  const i = panels.findIndex((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h);
  return { index: i, x, y };
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const hit = panelAt(e.clientX, e.clientY);
  if (hit.index === -1) return;
  state.selected = hit.index;
  syncPanelControls();
  updateTraySelection();
  const panel = state.panels[hit.index];
  drag = { panel, startX: hit.x, startY: hit.y, ox: panel.ox, oy: panel.oy };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const hit = panelAt(e.clientX, e.clientY);
  const { panels } = previewLayout();
  const rect = panels[state.selected];
  if (!rect) return;
  // Pan in panel-relative units: a full drag across the panel moves the photo
  // across its whole spare range.
  drag.panel.ox = clamp(drag.ox + ((hit.x - drag.startX) / rect.w) * 2, -1, 1);
  drag.panel.oy = clamp(drag.oy + ((hit.y - drag.startY) / rect.h) * 2, -1, 1);
  drag.startX = hit.x;
  drag.startY = hit.y;
  drag.ox = drag.panel.ox;
  drag.oy = drag.panel.oy;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.zoom = clamp(panel.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 1, 4);
  syncPanelControls();
  redraw();
}, { passive: false });

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

document.getElementById('zoom').addEventListener('input', (e) => {
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.zoom = Number(e.target.value);
  document.getElementById('zoom-value').textContent = `${Math.round(panel.zoom * 100)}%`;
  redraw();
});
document.getElementById('fit-mode').addEventListener('click', () => {
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.mode = panel.mode === 'fit' ? 'fill' : 'fit';
  panel.zoom = 1;
  panel.ox = 0;
  panel.oy = 0;
  syncPanelControls();
  redraw();
});
document.getElementById('reset-panel').addEventListener('click', () => {
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.zoom = 1;
  panel.ox = 0;
  panel.oy = 0;
  syncPanelControls();
  redraw();
});

// ---- Caption -----------------------------------------------------------------

titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });

// ---- Export ------------------------------------------------------------------

/**
 * Renders the cover at export size and resolves to a PNG data URL.
 * The screenshot harness calls this directly, so the cover screenshots are
 * the app's own exported PNG bytes, never a composite.
 */
export async function exportCoverPNG(sizeId = state.size) {
  await document.fonts.ready;
  const { w, h } = sizeOf(sizeId);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  renderCover(off, state);
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
window.__viceExport = exportCoverPNG;
window.__viceState = state;

document.getElementById('export').addEventListener('click', async () => {
  status.textContent = 'Exporting…';
  try {
    const url = await exportCoverPNG();
    const { w, h } = sizeOf(state.size);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vice-cover-${w}x${h}.png`;
    a.click();
    status.textContent = `Saved vice-cover-${w}x${h}.png — share it anywhere.`;
  } catch {
    status.textContent = 'Export failed in this browser.';
  }
});

// ---- Start -------------------------------------------------------------------

applyLayout(state.layout);
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    loadImage, state, redraw, applyLayout, exportCoverPNG, addTrayThumb,
  });
} else {
  redraw();
}
