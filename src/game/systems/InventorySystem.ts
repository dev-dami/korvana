import { ITEMS } from "../data/items";
import type { ItemDef } from "../data/items";
import type { GameState } from "../state/GameState";

export class InventorySystem {
  private readonly state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  add(id: string, qty = 1): boolean {
    const def = ITEMS[id];
    if (!def) return false;
    const inventory = this.state.player.inventory;
    const existing = inventory.find((e) => e.id === id);
    if (existing) {
      if (!def.stackable) return false;
      existing.qty += qty;
    } else {
      inventory.push({ id, qty });
    }
    return true;
  }

  remove(id: string, qty = 1): boolean {
    const inventory = this.state.player.inventory;
    const index = inventory.findIndex((e) => e.id === id);
    if (index === -1) return false;
    const entry = inventory[index];
    if (!entry) return false;
    entry.qty -= qty;
    if (entry.qty <= 0) inventory.splice(index, 1);
    return true;
  }

  count(id: string): number {
    return this.state.player.inventory.find((e) => e.id === id)?.qty ?? 0;
  }

  entries(): Array<{ def: ItemDef; qty: number }> {
    const out: Array<{ def: ItemDef; qty: number }> = [];
    for (const entry of this.state.player.inventory) {
      const def = ITEMS[entry.id];
      if (def) out.push({ def, qty: entry.qty });
    }
    return out.sort((a, b) => a.def.name.localeCompare(b.def.name));
  }

  /** Consumes a usable item. Returns a message to show the player. */
  use(id: string): string | null {
    const def = ITEMS[id];
    if (!def || this.count(id) === 0) return null;

    if (id === "lesser_tonic") {
      this.state.heal(40);
      this.remove(id, 1);
      return "You drink the tonic. The ache fades. (+40 health)";
    }
    if (id === "mana_draught") {
      this.state.addMana(35);
      this.remove(id, 1);
      return "The draught is cold and tastes of iron. (+35 mana)";
    }
    if (id === "primer_of_wards") {
      const learned = this.state.learnSpell("aegis");
      this.remove(id, 1);
      return learned ? "You study the Primer. You have learned Aegis." : "You already know these wards.";
    }
    if (def.kind === "weapon") {
      this.state.equipWeapon(id);
      return `You take up the ${def.name}.`;
    }
    if (def.useText) return def.useText;
    return `${def.name} cannot be used here.`;
  }
}
