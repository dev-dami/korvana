import type Phaser from "phaser";

/**
 * One place to change every font in the game.
 *
 * Cinzel Decorative is a decorative display face - beautiful for titles,
 * harder to read below about 20px. So the rule here is:
 *
 *   FONT_DISPLAY -> titles, headings, speaker names (20px and up, never body copy)
 *   FONT_BODY    -> everything a player actually has to read
 *   FONT_MONO    -> the debug overlay and numeric readouts
 *
 * Both faces are SIL Open Font License, bundled from @fontsource (see CREDITS.md).
 */
export const FONT_DISPLAY =
  '"Cinzel Decorative", "Palatino Linotype", "Book Antiqua", Georgia, serif';

export const FONT_BODY =
  '"EB Garamond", Georgia, "Palatino Linotype", "Times New Roman", serif';

export const FONT_MONO =
  '"Cascadia Mono", ui-monospace, "SFMono-Regular", Consolas, monospace';

export interface TextOpts {
  size?: number;
  color?: string;
  align?: "left" | "center" | "right";
  wrap?: number;
  lineSpacing?: number;
  bold?: boolean;
  background?: string;
  padding?: number;
}

/** Builds a Phaser text style from the shared scale, so sizes stay consistent. */
export function bodyText(opts: TextOpts = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_BODY,
    fontSize: `${opts.size ?? 15}px`,
    color: opts.color ?? "#f2ead8",
    align: opts.align ?? "left",
    fontStyle: opts.bold ? "bold" : "normal",
    lineSpacing: opts.lineSpacing ?? 6,
    ...(opts.wrap ? { wordWrap: { width: opts.wrap } } : {}),
    ...(opts.background ? { backgroundColor: opts.background } : {}),
    padding: { x: opts.padding ?? 0, y: opts.padding ?? 0 },
  };
}

export function displayText(opts: TextOpts = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_DISPLAY,
    fontSize: `${opts.size ?? 28}px`,
    color: opts.color ?? "#e8d9a8",
    align: opts.align ?? "center",
    fontStyle: opts.bold ? "bold" : "normal",
    lineSpacing: opts.lineSpacing ?? 6,
    ...(opts.wrap ? { wordWrap: { width: opts.wrap } } : {}),
    ...(opts.background ? { backgroundColor: opts.background } : {}),
    padding: { x: opts.padding ?? 0, y: opts.padding ?? 0 },
  };
}

export function monoText(opts: TextOpts = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_MONO,
    fontSize: `${opts.size ?? 13}px`,
    color: opts.color ?? "#8ff0a0",
    align: opts.align ?? "left",
    lineSpacing: opts.lineSpacing ?? 4,
    ...(opts.background ? { backgroundColor: opts.background } : {}),
    padding: { x: opts.padding ?? 0, y: opts.padding ?? 0 },
  };
}

/** Resolves once the display font is ready, so canvas text is not measured on a fallback. */
export async function waitForDisplayFont(): Promise<boolean> {
  if (typeof document === "undefined" || !document.fonts) return false;
  try {
    const faces = await Promise.all([
      document.fonts.load('32px "Cinzel Decorative"'),
      document.fonts.load('bold 32px "Cinzel Decorative"'),
      document.fonts.load('16px "EB Garamond"'),
      document.fonts.load('italic 16px "EB Garamond"'),
      document.fonts.load('bold 16px "EB Garamond"'),
    ]);
    await document.fonts.ready;
    return faces.some((list) => list.length > 0);
  } catch {
    return false;
  }
}
