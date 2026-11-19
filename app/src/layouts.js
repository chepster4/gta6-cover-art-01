// Multi-panel layouts for the cover. Every layout is a function of the cover size,
// so the same layout works for square, portrait and landscape exports. Panels are
// returned as pixel rects plus a caption band; a `gap` separates the panels, the
// way a comic-book poster splits its frames.
//
//   vice-five     hero photo plus four small frames (the classic GTA poster grid)
//   sunset-strip  three wide frames over a caption band
//   neon-duo      two tall frames side by side (stacked when portrait)
//   solo-hero     one full-bleed photo, caption overlaid at the foot

export const LAYOUTS = {
  'vice-five': { label: 'Vice Five', panels: 5 },
  'sunset-strip': { label: 'Sunset Strip', panels: 3 },
  'neon-duo': { label: 'Neon Duo', panels: 2 },
  'solo-hero': { label: 'Solo Hero', panels: 1 },
};

export const LAYOUT_IDS = Object.keys(LAYOUTS);

/**
 * Returns `{ panels, caption, gap }` for a layout at cover size W x H.
 * `panels` is an array of { x, y, w, h } pixel rects; `caption` is the band
 * (or overlay zone) where the title and subtitle are lettered, or null when
 * the caption floats over the photo (solo-hero).
 */
export function layoutPanels(layoutId, W, H) {
  const gap = Math.max(4, Math.round(W * 0.006));
  const captionH = Math.round(H * 0.17);
  const photoH = H - captionH - gap;
  const wide = W >= H;
  const tall = H > W * 1.1;

  if (layoutId === 'sunset-strip') {
    const pw = (W - gap * 2) / 3;
    const panels = [0, 1, 2].map((i) => ({
      x: Math.round(i * (pw + gap)), y: 0, w: Math.round(pw), h: photoH,
    }));
    panels[2].w = W - panels[2].x;
    return { panels, caption: { x: 0, y: photoH + gap, w: W, h: captionH }, gap };
  }

  if (layoutId === 'neon-duo') {
    if (tall) {
      const ph = (photoH - gap) / 2;
      return {
        panels: [
          { x: 0, y: 0, w: W, h: Math.round(ph) },
          { x: 0, y: Math.round(ph) + gap, w: W, h: photoH - Math.round(ph) - gap },
        ],
        caption: { x: 0, y: photoH + gap, w: W, h: captionH },
        gap,
      };
    }
    const pw = (W - gap) / 2;
    return {
      panels: [
        { x: 0, y: 0, w: Math.round(pw), h: photoH },
        { x: Math.round(pw) + gap, y: 0, w: W - Math.round(pw) - gap, h: photoH },
      ],
      caption: { x: 0, y: photoH + gap, w: W, h: captionH },
      gap,
    };
  }

  if (layoutId === 'solo-hero') {
    // Full-bleed photo; the caption floats over a scrim at the foot.
    return {
      panels: [{ x: 0, y: 0, w: W, h: H }],
      caption: { x: 0, y: Math.round(H * 0.68), w: W, h: Math.round(H * 0.32), overlay: true },
      gap,
    };
  }

  // vice-five (default): a hero frame plus four small frames.
  if (wide) {
    const heroW = Math.round(W * 0.56);
    const sideW = W - heroW - gap;
    const sideH = (photoH - gap) / 2;
    const smallW = (sideW - gap) / 2;
    return {
      panels: [
        { x: 0, y: 0, w: heroW, h: photoH },
        { x: heroW + gap, y: 0, w: Math.round(smallW), h: Math.round(sideH) },
        { x: heroW + gap + Math.round(smallW) + gap, y: 0, w: sideW - Math.round(smallW) - gap, h: Math.round(sideH) },
        { x: heroW + gap, y: Math.round(sideH) + gap, w: Math.round(smallW), h: photoH - Math.round(sideH) - gap },
        { x: heroW + gap + Math.round(smallW) + gap, y: Math.round(sideH) + gap, w: sideW - Math.round(smallW) - gap, h: photoH - Math.round(sideH) - gap },
      ],
      caption: { x: 0, y: photoH + gap, w: W, h: captionH },
      gap,
    };
  }
  const heroH = Math.round(photoH * 0.58);
  const rowH = photoH - heroH - gap;
  const smallW = (W - gap * 3) / 4;
  const panels = [{ x: 0, y: 0, w: W, h: heroH }];
  for (let i = 0; i < 4; i++) {
    panels.push({
      x: Math.round(i * (smallW + gap)), y: heroH + gap, w: Math.round(smallW), h: rowH,
    });
  }
  panels[4].w = W - panels[4].x;
  return { panels, caption: { x: 0, y: photoH + gap, w: W, h: captionH }, gap };
}

/** How many panels a layout has (so the state can size its panel list). */
export function panelCount(layoutId) {
  return LAYOUTS[layoutId]?.panels ?? 5;
}
