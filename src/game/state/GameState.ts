import { DAY_LENGTH_MS, WORLD_SEED } from "../config";
import { STARTING_SPELLS } from "../data/spells";
import { STARTING_WEAPON } from "../data/weapons";

/** The four Houses of Korvana Academy. See docs/DESIGN.md. */
export const HOUSE_IDS = ["emberhart", "thornwick", "ravelle", "stillwater"] as const;
export type HouseId = (typeof HOUSE_IDS)[number];

export interface InventoryEntry {
  id: string;
  qty: number;
}

export interface PlayerState {
  name: string;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  gold: number;
  inventory: InventoryEntry[];
  learnedSpells: string[];
  selectedSpell: string;
  /** Equipped weapon id, resolved through data/weapons.ts. */
  weapon: string;
  /** Timestamp (scene clock ms) until which the ward holds. */
  wardUntil: number;
}

export interface WorldState {
  day: number;
  hour: number;
  minute: number;
  weather: string;
}

export interface QuestState {
  id: string;
  stageIndex: number;
  progress: number;
  complete: boolean;
}

export interface Vec {
  x: number;
  y: number;
}

export interface GameStateData {
  version: number;
  seed: number;
  player: PlayerState;
  world: WorldState;
  quests: Record<string, QuestState>;
  relationships: Record<string, number>;
  flags: Record<string, boolean>;
  /** Journal entries unlocked, in the order they were discovered. */
  lore: string[];
  /** Where the player wakes up after being beaten. Null until the story sets one. */
  checkpoint: Vec | null;
  position: Vec;
  /** Total elapsed in-game milliseconds. */
  clock: number;
}

export const SAVE_VERSION = 2;

function defaultData(): GameStateData {
  return {
    version: SAVE_VERSION,
    seed: WORLD_SEED,
    player: {
      name: "Wren",
      health: 100,
      maxHealth: 100,
      mana: 60,
      maxMana: 60,
      gold: 25,
      inventory: [
        { id: "lesser_tonic", qty: 2 },
        { id: "quillfeather", qty: 1 },
        { id: "iron_longsword", qty: 1 },
      ],
      learnedSpells: [...STARTING_SPELLS],
      selectedSpell: STARTING_SPELLS[0] ?? "arcane_dart",
      weapon: STARTING_WEAPON,
      wardUntil: 0,
    },
    world: { day: 1, hour: 8, minute: 0, weather: "clear" },
    quests: {},
    relationships: {},
    flags: {},
    lore: [],
    checkpoint: null,
    position: { x: 0, y: 0 },
    clock: 8 * (DAY_LENGTH_MS / 24),
  };
}

/**
 * One state object that dialogue, quests, inventory and combat all read and
 * write. Anything persisted lives here and nowhere else.
 */
export class GameState {
  data: GameStateData;

  constructor(data?: GameStateData) {
    this.data = data ?? defaultData();
  }

  get player(): PlayerState {
    return this.data.player;
  }

  get world(): WorldState {
    return this.data.world;
  }

  get clock(): number {
    return this.data.clock;
  }

  updateClock(dtMs: number): void {
    this.data.clock += dtMs;
    const hoursPerDay = 24;
    const totalHours = (this.data.clock / DAY_LENGTH_MS) * hoursPerDay;
    this.data.world.day = Math.floor(totalHours / hoursPerDay) + 1;
    this.data.world.hour = Math.floor(totalHours) % hoursPerDay;
    this.data.world.minute = Math.floor((totalHours % 1) * 60);
  }

  /** 0 = midnight, 0.5 = noon. Drives the day/night tint. */
  get dayFraction(): number {
    const totalHours = (this.data.clock / DAY_LENGTH_MS) * 24;
    return (totalHours % 24) / 24;
  }

  timeLabel(): string {
    const h = String(this.data.world.hour).padStart(2, "0");
    const m = String(this.data.world.minute).padStart(2, "0");
    return `${h}:${m}`;
  }

  // --- resources ---

  addMana(amount: number): void {
    const p = this.data.player;
    p.mana = Math.min(p.maxMana, p.mana + amount);
  }

  spendMana(amount: number): boolean {
    const p = this.data.player;
    if (p.mana < amount) return false;
    p.mana -= amount;
    return true;
  }

  damage(amount: number): void {
    const p = this.data.player;
    p.health = Math.max(0, p.health - amount);
  }

  heal(amount: number): void {
    const p = this.data.player;
    p.health = Math.min(p.maxHealth, p.health + amount);
  }

  get wardActive(): boolean {
    return this.data.player.wardUntil > this.data.clock;
  }

  setWard(durationMs: number): void {
    this.data.player.wardUntil = this.data.clock + durationMs;
  }

  // --- spells ---

  knowsSpell(id: string): boolean {
    return this.data.player.learnedSpells.includes(id);
  }

  learnSpell(id: string): boolean {
    if (this.knowsSpell(id)) return false;
    this.data.player.learnedSpells.push(id);
    return true;
  }

  // --- weapons ---

  equipWeapon(id: string): void {
    this.data.player.weapon = id;
  }

  // --- quests ---

  quest(id: string): QuestState | undefined {
    return this.data.quests[id];
  }

  // --- flags & relationships ---

  /**
   * The House the Choosing Lamp placed the player in, or null before the
   * Choosing. Stored as a `house_<id>` flag so it saves like any other flag.
   */
  get house(): HouseId | null {
    for (const id of HOUSE_IDS) if (this.flag(`house_${id}`)) return id;
    return null;
  }

  flag(id: string): boolean {
    return this.data.flags[id] === true;
  }

  setFlag(id: string, value = true): void {
    this.data.flags[id] = value;
  }

  relationship(id: string): number {
    return this.data.relationships[id] ?? 0;
  }

  adjustRelationship(id: string, delta: number): void {
    const next = this.relationship(id) + delta;
    this.data.relationships[id] = Math.max(-100, Math.min(100, next));
  }

  // --- journal ---

  hasLore(id: string): boolean {
    return this.data.lore.includes(id);
  }

  /** Records a journal entry. Returns false if it was already known. */
  unlockLore(id: string): boolean {
    if (this.hasLore(id)) return false;
    this.data.lore.push(id);
    return true;
  }

  get lore(): readonly string[] {
    return this.data.lore;
  }

  // --- checkpoint ---

  setCheckpoint(x: number, y: number): void {
    this.data.checkpoint = { x, y };
  }

  get checkpoint(): Vec | null {
    return this.data.checkpoint;
  }

  restore(data: GameStateData): void {
    this.data = data;
  }

  snapshot(): GameStateData {
    return structuredClone(this.data);
  }
}
