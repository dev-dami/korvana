import type Phaser from "phaser";

export interface Ctx {
  tex: Phaser.Textures.CanvasTexture;
  ctx: CanvasRenderingContext2D;
}

/**
 * Every texture in Korvana is generated at boot rather than loaded, so the
 * game ships as pure code plus the optional CC0 art library in
 * public/assets/kenney for anyone who wants to swap in hand-drawn tiles.
 */
export function canvasTex(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
): Ctx {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, width, height);
  if (!tex) throw new Error(`Failed to create canvas texture "${key}"`);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);
  return { tex, ctx };
}

export function commit({ tex, ctx }: Ctx): void {
  void ctx;
  tex.refresh();
}
