# Vice Cover Studio

[![make.fun](https://img.shields.io/badge/make.fun-gta6--cover--art--01-ff2ea8)](https://make.fun/c/gta6-cover-art-01)

Turn your photos into a multi-panel GTA-style cover, right in your browser — no
upload, no account, no network. Pick a layout, a sunset or neon colour grade,
letter your caption in bold display type, and export a PNG to share.

## What it does

- **4 layouts** — Vice Five (hero + 4 frames), Sunset Strip (3 frames), Neon Duo
  (2 frames), Solo Hero (full-bleed). Each layout adapts to square, portrait and
  landscape exports.
- **4 colour grades** — Sunset, Neon (cyan→magenta duotone), Vice Pink, Noir —
  plus film grain and a vignette, and a synthwave sun behind the caption.
- **Any photo** — add one photo or many from your machine. Click a panel, then a
  photo, to place it. Drag inside a panel to move the photo, scroll (or the zoom
  slider) to zoom, or switch a panel between fill and fit.
- **Bold caption** — editable title and subtitle, lettered in Anton (SIL OFL).
- **Fast export** — one click exports a PNG in 1080 × 1080, 1080 × 1350 or
  1920 × 1080.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Everything is static files under `app/`; it works with no network request, and
your photos never leave your machine. Sample photos (`app/samples/`) were made
with an image model for make.fun and are free to use.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to
`/output` and writes `/output/dossier.json` with the vendored make.fun library.

## Originality

All artwork is drawn in code. No Rockstar Games logo, wordmark, official
artwork, character or font is used. The Anton typeface in `app/fonts/` is under
the SIL Open Font License (see `app/fonts/OFL.txt`).

## License

MIT — see [LICENSE](LICENSE).
