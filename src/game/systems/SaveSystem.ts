import type { GameState, GameStateData } from "../state/GameState";
import { SAVE_VERSION } from "../state/GameState";

/**
 * Bumped whenever the save shape changes. The key carries the version too, so
 * an old save is simply not found rather than half-loaded into a state object
 * that no longer has the fields it expects.
 */
const KEY = "korvana.save.v2";

export class SaveSystem {
  static save(state: GameState): boolean {
    try {
      const payload = JSON.stringify(state.snapshot());
      localStorage.setItem(KEY, payload);
      return true;
    } catch {
      return false;
    }
  }

  static load(): GameStateData | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as GameStateData;
      if (parsed?.version !== SAVE_VERSION) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  static has(): boolean {
    try {
      return localStorage.getItem(KEY) !== null;
    } catch {
      return false;
    }
  }

  static clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // Storage may be unavailable (private mode); nothing to do.
    }
  }
}
