/**
 * Every character in Korvana, described rather than drawn.
 *
 * A look is a costume sheet: hair, hat, garment, colours and a few props. The
 * painters in gfx/paint/ turn one into a full animated sprite sheet and a
 * dialogue portrait, so a new villager is a data entry, not a drawing.
 *
 * Look keys are binding (docs/DESIGN.md, section 3). Add freely; never rename.
 */

export type BodyKind = "humanoid" | "lamp" | "owl" | "bat" | "spider";

export type HairStyle =
  | "messy"
  | "short"
  | "bob"
  | "ponytail"
  | "bun"
  | "braid"
  | "long"
  | "slick"
  | "bald"
  | "tonsure"
  | "none";

export type HatStyle = "none" | "pointed" | "tall" | "wide" | "hood" | "helm" | "circlet";

export type Outfit = "robe" | "gown" | "coat" | "rags" | "armor" | "bones";

/** What replaces the legs on things that do not walk. */
export type Lower = "legs" | "wisp" | "tatter" | "smoke";

export interface Look {
  key: string;
  body: BodyKind;
  /** child = first to fourth-years, adult, tall = the imposing ones. */
  size?: "child" | "adult" | "tall";

  skin: string;
  /** Iris colour. */
  eye: string;
  /** Eyes that glow (monsters); replaces the painted eye. */
  glowEyes?: string;
  brows?: "soft" | "stern" | "raised";
  blush?: boolean;

  hair: string;
  hairStyle: HairStyle;

  hat: HatStyle;
  hatColor?: string;
  hatBand?: string;
  /** A flower or feather tucked in the hat band. */
  hatFlower?: string;

  outfit: Outfit;
  /** The main garment colour. */
  robe: string;
  /** Edging, cuffs, hem and lining. */
  trim: string;
  /** Shirt and collar under the robe. */
  inner?: string;
  /** Tie or sash. */
  accent?: string;
  /** A striped house scarf in trim + accent. */
  scarf?: boolean;
  /** House patch on the chest. */
  emblem?: string;
  apron?: string;
  legs?: string;
  boots: string;

  beard?: "long" | "short";
  beardColor?: string;
  glasses?: boolean;
  /** Strap colour of a satchel worn across the body. */
  satchel?: string;
  /** A book carried under the arm. */
  book?: string;
  /** Wand holster on the hip. */
  holster?: boolean;
  /** A bone mask over the face. */
  mask?: string;
  cape?: string;

  hunch?: boolean;
  /** Lines on the face in the portrait. */
  age?: "old";
  /** A device worn on the chest. The Keepers bear a lantern. */
  sigil?: "lantern";
  /** Carries a lit hand-lantern. */
  lantern?: boolean;
  lower?: Lower;
  /** Overall opacity, for ghosts. */
  alpha?: number;
  /** Hovering things bob instead of walking. */
  floats?: boolean;
}

const BLACK_ROBE = "#2b2833";
const HERO_SKIN = "#f0c39d";
const HERO_HAIR = "#86402a";

/** House colours (docs/DESIGN.md, section 2). */
export const HOUSE_COLOURS: Record<string, { primary: string; secondary: string; name: string }> = {
  emberhart: { primary: "#b8372b", secondary: "#d9a843", name: "Emberhart" },
  thornwick: { primary: "#4f7d36", secondary: "#e8dfc4", name: "Thornwick" },
  ravelle: { primary: "#2e418c", secondary: "#c6cedb", name: "Ravelle" },
  stillwater: { primary: "#2e7478", secondary: "#eef2f2", name: "Stillwater" },
};

function heroInHouse(house: string): Look {
  const colours = HOUSE_COLOURS[house]!;
  return {
    key: `hero_${house}`,
    body: "humanoid",
    size: "child",
    skin: HERO_SKIN,
    eye: "#3f6f8e",
    hair: HERO_HAIR,
    hairStyle: "messy",
    hat: "none",
    outfit: "robe",
    robe: BLACK_ROBE,
    trim: colours.primary,
    inner: "#ece6d8",
    accent: colours.secondary,
    scarf: true,
    emblem: colours.primary,
    legs: "#2b2e38",
    boots: "#4a3324",
    satchel: "#8a5a32",
  };
}

export const LOOKS: Record<string, Look> = {
  // --- Wren -----------------------------------------------------------------
  hero: {
    key: "hero",
    body: "humanoid",
    size: "child",
    skin: HERO_SKIN,
    eye: "#3f6f8e",
    hair: HERO_HAIR,
    hairStyle: "messy",
    hat: "none",
    // A plain travelling robe: Wren arrives before anyone has said which House.
    outfit: "robe",
    robe: "#46505f",
    trim: "#a9b2c2",
    inner: "#ece6d8",
    accent: "#7f6a52",
    legs: "#2b2e38",
    boots: "#4a3324",
    satchel: "#8a5a32",
  },
  hero_emberhart: heroInHouse("emberhart"),
  hero_thornwick: heroInHouse("thornwick"),
  hero_ravelle: heroInHouse("ravelle"),
  hero_stillwater: heroInHouse("stillwater"),

  // --- Faculty --------------------------------------------------------------
  headmistress: {
    key: "headmistress",
    age: "old",
    body: "humanoid",
    size: "tall",
    skin: "#e6bc9c",
    eye: "#56688c",
    brows: "stern",
    hair: "#d9d6e0",
    hairStyle: "bun",
    hat: "tall",
    hatColor: "#2f1b40",
    hatBand: "#c9ccd8",
    outfit: "gown",
    robe: "#57306c",
    trim: "#cfd2de",
    inner: "#ece6f2",
    accent: "#7fd4dc",
    boots: "#2a1f2e",
    cape: "#2f1b40",
  },
  professor: {
    key: "professor",
    age: "old",
    body: "humanoid",
    size: "adult",
    skin: "#ddb088",
    eye: "#3a405c",
    brows: "raised",
    hair: "#a2a2ac",
    hairStyle: "short",
    hat: "pointed",
    hatColor: "#1f2f5c",
    hatBand: "#dcc47c",
    outfit: "robe",
    robe: "#2a3f78",
    trim: "#dcc47c",
    inner: "#e8e2d4",
    accent: "#dcc47c",
    beard: "long",
    beardColor: "#c4c4cc",
    glasses: true,
    boots: "#2b2b33",
  },
  herbologist: {
    key: "herbologist",
    body: "humanoid",
    size: "adult",
    skin: "#d49a72",
    eye: "#4c6e3c",
    blush: true,
    hair: "#7c4a2a",
    hairStyle: "bun",
    hat: "wide",
    hatColor: "#8a7444",
    hatBand: "#3f6b3a",
    hatFlower: "#e9607e",
    outfit: "robe",
    robe: "#3f6e3c",
    trim: "#d8c88c",
    inner: "#efe6cc",
    apron: "#a07a4a",
    boots: "#3a2a1c",
  },
  librarian: {
    key: "librarian",
    age: "old",
    body: "humanoid",
    size: "tall",
    skin: "#e3b894",
    eye: "#4a4036",
    brows: "stern",
    hair: "#c4beb2",
    hairStyle: "bald",
    hat: "none",
    outfit: "robe",
    robe: "#5c4c3c",
    trim: "#cbb88e",
    inner: "#e8e0cc",
    accent: "#7a2f2f",
    beard: "short",
    beardColor: "#c4beb2",
    glasses: true,
    book: "#7a2f2f",
    boots: "#2e241c",
  },

  // --- Students -------------------------------------------------------------
  student: {
    key: "student",
    body: "humanoid",
    size: "child",
    skin: "#f2c8a4",
    eye: "#5a7c3a",
    blush: true,
    hair: "#e3b456",
    hairStyle: "ponytail",
    hat: "none",
    outfit: "robe",
    robe: BLACK_ROBE,
    trim: HOUSE_COLOURS.emberhart!.primary,
    inner: "#ece6d8",
    accent: HOUSE_COLOURS.emberhart!.secondary,
    scarf: true,
    emblem: HOUSE_COLOURS.emberhart!.primary,
    legs: "#2b2e38",
    boots: "#3a2a1c",
  },
  scholar: {
    key: "scholar",
    body: "humanoid",
    size: "child",
    skin: "#c99572",
    eye: "#2a2a3a",
    brows: "raised",
    hair: "#2a2018",
    hairStyle: "short",
    hat: "none",
    outfit: "robe",
    robe: BLACK_ROBE,
    trim: HOUSE_COLOURS.ravelle!.primary,
    inner: "#ece6d8",
    accent: HOUSE_COLOURS.ravelle!.secondary,
    emblem: HOUSE_COLOURS.ravelle!.primary,
    glasses: true,
    book: "#3a5a8a",
    legs: "#2b2e38",
    boots: "#2f2233",
  },
  vale: {
    key: "vale",
    body: "humanoid",
    size: "child",
    skin: "#cdd8cc",
    eye: "#6fe0b0",
    brows: "stern",
    hair: "#161d1a",
    hairStyle: "slick",
    hat: "none",
    outfit: "gown",
    robe: "#1d2b25",
    trim: "#6fd0a0",
    inner: "#2c3f36",
    accent: "#6fd0a0",
    boots: "#0e1512",
  },

  // --- The wider world ------------------------------------------------------
  raider: {
    key: "raider",
    body: "humanoid",
    size: "adult",
    skin: "#e2b08a",
    eye: "#4c7c5c",
    brows: "raised",
    hair: "#8c3220",
    hairStyle: "braid",
    hat: "none",
    // A long weatherproof travel coat with copper buttons, over a work shirt.
    outfit: "coat",
    robe: "#3e5753",
    trim: "#c27c3c",
    inner: "#ddd0b4",
    accent: "#a8452e",
    legs: "#4a3b2a",
    boots: "#3a2618",
    satchel: "#7a5532",
    holster: true,
  },
  // Keeper Ilse: the last of the Nine, old and weathered, in the ash-grey
  // robes of the order with its lantern sigil, carrying a light of her own.
  keeper: {
    key: "keeper",
    body: "humanoid",
    size: "tall",
    skin: "#d2ab90",
    eye: "#93a8b8",
    brows: "soft",
    age: "old",
    hair: "#ecebe6",
    hairStyle: "long",
    hat: "hood",
    hatColor: "#6c6862",
    outfit: "gown",
    robe: "#8e8a82",
    trim: "#c9b27a",
    inner: "#bdb8ae",
    sigil: "lantern",
    lantern: true,
    boots: "#3e3a34",
  },
  ghost: {
    key: "ghost",
    body: "humanoid",
    size: "adult",
    skin: "#cdf0f2",
    eye: "#4a8a9a",
    brows: "soft",
    hair: "#a9e0e8",
    hairStyle: "tonsure",
    hat: "none",
    outfit: "robe",
    robe: "#8fcad6",
    trim: "#dcf6f8",
    inner: "#b8e6ee",
    accent: "#6fb0c0",
    boots: "#8fcad6",
    lower: "wisp",
    alpha: 0.7,
    floats: true,
  },

  // --- Creatures --------------------------------------------------------------
  lamp: {
    key: "lamp",
    body: "lamp",
    skin: "#ffd27a",
    eye: "#4a2a10",
    hair: "#b8862e",
    hairStyle: "none",
    hat: "none",
    outfit: "robe",
    robe: "#b8862e",
    trim: "#ffe9a8",
    boots: "#5a4020",
    floats: true,
  },
  owl: {
    key: "owl",
    body: "owl",
    skin: "#c89a62",
    eye: "#f2c84a",
    hair: "#7a5432",
    hairStyle: "none",
    hat: "none",
    outfit: "robe",
    robe: "#8a6440",
    trim: "#efe2c4",
    boots: "#d9a441",
  },

  // --- Enemies ----------------------------------------------------------------
  shade: {
    key: "shade",
    body: "humanoid",
    size: "adult",
    skin: "#2a2638",
    eye: "#ff5a5a",
    glowEyes: "#ff6a5a",
    hair: "#15131e",
    hairStyle: "none",
    hat: "hood",
    hatColor: "#1d1a29",
    outfit: "robe",
    robe: "#262235",
    trim: "#4a4468",
    boots: "#15131e",
    lower: "smoke",
    alpha: 0.94,
    floats: true,
  },
  husk: {
    key: "husk",
    body: "humanoid",
    size: "adult",
    skin: "#80705c",
    eye: "#ff8a3a",
    glowEyes: "#ff9a40",
    hair: "#2a221c",
    hairStyle: "messy",
    hat: "none",
    outfit: "rags",
    robe: "#5e4c3a",
    trim: "#3c3026",
    legs: "#6a5c4a",
    boots: "#4a3e30",
    hunch: true,
  },
  wraith: {
    key: "wraith",
    body: "humanoid",
    size: "tall",
    skin: "#7d93ab",
    eye: "#bfe9ff",
    glowEyes: "#c8f0ff",
    hair: "#2b3646",
    hairStyle: "none",
    hat: "hood",
    hatColor: "#3b4a63",
    outfit: "robe",
    robe: "#4d6076",
    trim: "#9fb6cc",
    boots: "#2b3646",
    lower: "tatter",
    alpha: 0.9,
    floats: true,
  },
  adept: {
    key: "adept",
    body: "humanoid",
    size: "adult",
    skin: "#b39ac9",
    eye: "#d0a6ff",
    glowEyes: "#e0b8ff",
    hair: "#150f20",
    hairStyle: "none",
    hat: "hood",
    hatColor: "#2a1f3d",
    outfit: "robe",
    robe: "#3d2c58",
    trim: "#a07ae0",
    inner: "#251a36",
    accent: "#a07ae0",
    mask: "#ddd4e6",
    boots: "#150f20",
  },
  guardian: {
    key: "guardian",
    body: "humanoid",
    size: "tall",
    skin: "#7d8594",
    eye: "#7fd8ff",
    glowEyes: "#8fe4ff",
    hair: "#7d8594",
    hairStyle: "none",
    hat: "helm",
    hatColor: "#8c94a2",
    hatBand: "#c9a04a",
    outfit: "armor",
    robe: "#7d8594",
    trim: "#c9a04a",
    accent: "#6a2a2a",
    legs: "#5e6574",
    boots: "#5e6574",
    cape: "#5a2626",
  },
  skeleton: {
    key: "skeleton",
    body: "humanoid",
    size: "adult",
    skin: "#e0d6bc",
    eye: "#ffb74d",
    glowEyes: "#ffbf5a",
    hair: "#e0d6bc",
    hairStyle: "bald",
    hat: "none",
    outfit: "bones",
    robe: "#4c3a5a",
    trim: "#8a7a5a",
    legs: "#e0d6bc",
    boots: "#cfc4a8",
  },
  bat: {
    key: "bat",
    body: "bat",
    skin: "#4a3a52",
    eye: "#ff6a6a",
    glowEyes: "#ff7a6a",
    hair: "#2e2436",
    hairStyle: "none",
    hat: "none",
    outfit: "robe",
    robe: "#3a2e44",
    trim: "#7a5a7e",
    boots: "#2e2436",
    floats: true,
  },
  spider: {
    key: "spider",
    body: "spider",
    skin: "#3a2e2a",
    eye: "#ff4a4a",
    glowEyes: "#ff5a4a",
    hair: "#241c1a",
    hairStyle: "none",
    hat: "none",
    outfit: "robe",
    robe: "#4a3a34",
    trim: "#a8463a",
    boots: "#241c1a",
  },
};

/** The look the player wears for a House, or the plain arrival robe. */
export function heroLook(house: string | null): string {
  return house && LOOKS[`hero_${house}`] ? `hero_${house}` : "hero";
}
