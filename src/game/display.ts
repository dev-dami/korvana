import type Phaser from "phaser";

/**
 * Display sizing.
 *
 * The game used to render into a fixed 1280x720 buffer and let the browser
 * stretch it to the window. That stretch is usually a non-integer factor, so
 * every glyph got resampled and looked mushy - made worse by
 * `image-rendering: pixelated`, which turned the softness into hard jaggies.
 *
 * Instead we render at true device resolution:
 *
 *   canvas backing store = CSS size x DPR
 *   every scene camera is zoomed by DPR
 *   every Text is rasterised at DPR
 *
 * World units therefore equal CSS pixels (so all layout maths stays readable),
 * while glyphs land on exact device pixels and stay sharp.
 */

/** Device pixels per CSS pixel, capped so 4K displays don't quadruple fill cost. */
export const DPR = Math.max(1, Math.min(2, Math.round(window.devicePixelRatio || 1)));

/** Text textures are rasterised at device resolution so glyphs stay sharp. */
export const TEXT_RES = DPR;

export function containerWidth(): number {
  const el = document.getElementById("app");
  return Math.max(400, Math.floor(el?.clientWidth || window.innerWidth));
}

export function containerHeight(): number {
  const el = document.getElementById("app");
  return Math.max(300, Math.floor(el?.clientHeight || window.innerHeight));
}

/** Logical (CSS pixel) viewport width. All UI layout is expressed in these. */
export function viewWidth(scene: Phaser.Scene): number {
  return scene.scale.width / DPR;
}

/** Logical (CSS pixel) viewport height. */
export function viewHeight(scene: Phaser.Scene): number {
  return scene.scale.height / DPR;
}

/** Applies the device-pixel zoom to a scene's main camera. */
export function applyCameraZoom(scene: Phaser.Scene): void {
  scene.cameras.main.setZoom(DPR);
}
