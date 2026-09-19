/** Korvana's palette. Every texture in the game is drawn from these. */
export const C = {
  deepWater: "#16324f",
  water: "#215a86",
  shallow: "#2f7fae",
  foam: "#8fc7dd",

  sand: "#d8c48c",
  sandDark: "#b9a271",

  grass: "#4a8a3c",
  grassDark: "#3a6f2e",
  grassLight: "#61a44c",
  meadow: "#6aa84f",
  meadowDark: "#4f8a3a",
  meadowLight: "#7fbd5f",

  flowerRose: "#e05a7a",
  flowerGold: "#f0d05a",
  flowerViolet: "#b98ce0",
  flowerWhite: "#f2f0e6",

  forestFloor: "#2f5a2c",
  forestDark: "#24471f",
  forestLight: "#3d7136",

  marsh: "#4d6b46",
  marshDark: "#3b5436",
  marshLight: "#617f57",

  dirt: "#8a6a45",
  dirtDark: "#6e5334",

  stone: "#7b7d85",
  stoneDark: "#5f6169",
  stoneLight: "#9a9ca4",

  snow: "#e6edf3",
  snowDark: "#c3ced8",

  // The Moonwell Scar: everything here is the colour of something burnt out.
  ash: "#b3aca4",
  ashDark: "#8d867f",
  ashLight: "#d2ccc5",
  crackedEarth: "#5c5550",
  crackedEarthDark: "#3b3632",
  crackedEarthLight: "#726a63",
  deadBark: "#6b6157",
  deadBarkDark: "#4a423b",

  wallStone: "#8d8f97",
  wallStoneDark: "#6b6d75",
  wallStoneLight: "#a8aab2",
  wallWood: "#7d5a3a",
  wallWoodDark: "#5f4229",
  wallPlaster: "#d9cdb4",
  wallPlasterDark: "#b6a98f",

  floorWood: "#a9834f",
  floorWoodDark: "#8a6a3e",
  floorStone: "#9a9ca4",
  floorStoneDark: "#7b7d85",
  floorCarpet: "#7a2f3a",
  floorCarpetDark: "#5e222b",

  roofSlate: "#4b4f66",
  roofSlateDark: "#383b4d",
  roofThatch: "#b08a44",
  roofThatchDark: "#8d6c33",

  door: "#6b4a2c",
  doorDark: "#4d341e",
  iron: "#3c3f46",
  ironLight: "#6a6e78",

  trunk: "#5b4327",
  trunkDark: "#45311c",
  leaves: "#2f6b34",
  leavesDark: "#24532a",
  leavesLight: "#3f8443",
  pine: "#255c39",
  pineDark: "#1b452b",
  pineLight: "#347a4c",

  rock: "#6f727a",
  rockDark: "#55585f",
  rockLight: "#8b8e96",

  torch: "#ffb74d",
  torchCore: "#fff1a8",
  magic: "#8fd4ff",
  magicCore: "#ffffff",
  ember: "#ff7043",

  shadow: "#101418",
  ui: "#f0e6d2",
  uiDim: "#a99f8a",
  uiPanel: "#1b1c24",
  gold: "#d9b44a",
} as const;

function clamp255(n: number): number {
  return n < 0 ? 0 : n > 255 ? 255 : n | 0;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) | (clamp255(r) << 16) | (clamp255(g) << 8) | clamp255(b)).toString(16).slice(1)}`;
}

/** amount > 0 lightens towards white, amount < 0 darkens towards black. */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = amount > 0 ? 255 : 0;
  const k = Math.abs(amount);
  return rgbToHex(r + (t - r) * k, g + (t - g) * k, b + (t - b) * k);
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
