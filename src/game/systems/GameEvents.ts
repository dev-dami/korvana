/**
 * A tiny synchronous event bus.
 *
 * Systems announce what happened ("a shade died", "the player entered the
 * scar") and the story layer decides what that means. This is what keeps
 * WorldScene from growing a branch per quest: it reports facts, and quest
 * stages declare, in data, which facts move them along.
 */

export type GameEventKind =
  | "spell_cast"
  | "enemy_defeated"
  | "damage_taken"
  | "item_gained"
  | "item_used"
  | "gold_gained"
  | "npc_talked"
  | "biome_entered"
  | "landmark_reached"
  | "battle_won"
  | "battle_lost"
  | "quest_started"
  | "quest_completed"
  | "lore_found"
  | "boss_defeated";

export interface GameEvent {
  kind: GameEventKind;
  /**
   * The subject of the event - a spell id, enemy id, item id, npc id, biome
   * name or quest id. Omitted for events about nothing in particular.
   */
  id?: string;
  /** Progress this event is worth. Defaults to 1 at the point of use. */
  amount?: number;
}

export type GameEventListener = (event: GameEvent) => void;

export class GameEvents {
  private readonly listeners = new Set<GameEventListener>();

  /** Subscribe. Returns an unsubscribe function. */
  on(listener: GameEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: GameEvent): void {
    // Copy first: a listener may unsubscribe itself while handling the event.
    for (const listener of [...this.listeners]) listener(event);
  }

  clear(): void {
    this.listeners.clear();
  }
}
