import type { EffectRunner, StoryOutbox } from "./EffectRunner";
import type { GameEvent, GameEvents } from "./GameEvents";
import type { QuestSystem } from "./QuestSystem";

/**
 * The glue between "something happened" and "the story moves".
 *
 * Events go in, quest stages advance, their effects are applied, and any quest
 * that finishes fires its own event so the next link in the chain can react.
 * The cascade is drained from a queue rather than recursing, because completing
 * one quest regularly starts another.
 */
export class StoryDirector {
  private readonly quests: QuestSystem;
  private readonly effects: EffectRunner;
  private readonly events: GameEvents;
  private readonly outbox: StoryOutbox;

  private readonly queue: GameEvent[] = [];
  private draining = false;

  constructor(
    quests: QuestSystem,
    effects: EffectRunner,
    events: GameEvents,
    outbox: StoryOutbox,
  ) {
    this.quests = quests;
    this.effects = effects;
    this.events = events;
    this.outbox = outbox;
    this.events.on((event) => this.enqueue(event));
  }

  /** Reports a game event. Safe to call from inside another handler. */
  report(event: GameEvent): void {
    this.enqueue(event);
  }

  private enqueue(event: GameEvent): void {
    this.queue.push(event);
    this.drain();
  }

  private drain(): void {
    if (this.draining) return;
    this.draining = true;

    try {
      // Bounded, because two quests that complete each other would otherwise
      // spin forever - and a content mistake should cost a warning, not a hang.
      let guard = 0;
      while (this.queue.length > 0 && guard < 256) {
        guard++;
        const event = this.queue.shift();
        if (!event) break;

        for (const { questId, result } of this.quests.record(event)) {
          // The effect runner owns what a quest moving forward means, so both
          // this path and the dialogue path behave identically.
          this.effects.applyQuestProgress(questId, result, this.outbox);
        }
      }

      if (guard >= 256) {
        console.warn("StoryDirector: event cascade exceeded 256 steps and was truncated.");
      }
    } finally {
      this.draining = false;
    }
  }
}
