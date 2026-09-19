import { DIALOGUES } from "../data/dialogues";
import type { DialogueChoice, DialogueNode, DialogueTree } from "../data/dialogues";
import type { GameState } from "../state/GameState";
import type { EffectRunner, StoryOutbox } from "./EffectRunner";
import type { QuestSystem } from "./QuestSystem";

/**
 * Walks a data-defined dialogue tree.
 *
 * The tree decides what is said and which effects a choice carries; the
 * EffectRunner decides what those effects actually do. Nothing here branches on
 * a speaker's name - reacting to the story means gating choices on flags and
 * quests, which is data.
 */
export class DialogueSystem {
  private readonly state: GameState;
  private readonly quests: QuestSystem;
  private readonly runner: EffectRunner;
  private readonly outbox: StoryOutbox;

  private tree: DialogueTree | null = null;
  private nodeId = "";

  speakerId = "";
  speakerName = "";

  constructor(
    state: GameState,
    quests: QuestSystem,
    runner: EffectRunner,
    outbox: StoryOutbox,
  ) {
    this.state = state;
    this.quests = quests;
    this.runner = runner;
    this.outbox = outbox;
  }

  get active(): boolean {
    return this.tree !== null;
  }

  start(speakerId: string, speakerName: string, dialogueId: string): boolean {
    const tree = DIALOGUES[dialogueId];
    if (!tree) return false;
    this.tree = tree;
    this.speakerId = speakerId;
    this.speakerName = speakerName;
    this.nodeId = tree.start;
    return true;
  }

  node(): DialogueNode | null {
    if (!this.tree) return null;
    return this.tree.nodes[this.nodeId] ?? null;
  }

  /** The choices the player can actually see right now. */
  choices(): DialogueChoice[] {
    const node = this.node();
    if (!node?.choices) return [];
    return node.choices.filter((choice) => this.isAvailable(choice));
  }

  choose(index: number): void {
    const choice = this.choices()[index];
    if (!choice) return;

    // `affinity` is about the person in front of you, so it is applied here
    // rather than in the generic effect runner, which has no speaker.
    if (choice.affinity) {
      this.state.adjustRelationship(this.speakerId, choice.affinity);
      const sign = choice.affinity > 0 ? "+" : "";
      this.outbox.messages.push(`${sign}${choice.affinity} with ${this.speakerName}`);
    }

    this.runner.run(choice, this.outbox);

    // A choice that calls for a battle ends the conversation; the scene takes
    // over from the outbox.
    if (choice.battle) {
      this.end();
      return;
    }

    if (choice.next && this.tree?.nodes[choice.next]) {
      this.nodeId = choice.next;
    } else {
      this.end();
    }
  }

  /** Used when a node has no available choices - moves on or closes the conversation. */
  advance(): void {
    const node = this.node();
    if (!node) {
      this.end();
      return;
    }
    if (node.next && this.tree?.nodes[node.next]) {
      this.nodeId = node.next;
    } else {
      this.end();
    }
  }

  end(): void {
    this.tree = null;
    this.nodeId = "";
  }

  private isAvailable(choice: DialogueChoice): boolean {
    if (choice.requiresFlag && !this.state.flag(choice.requiresFlag)) return false;
    if (choice.requiresQuest && !this.quests.has(choice.requiresQuest)) return false;
    if (choice.requiresCompleteQuest && !this.quests.isComplete(choice.requiresCompleteQuest)) {
      return false;
    }
    if (choice.requiresActiveQuest && !this.quests.isActive(choice.requiresActiveQuest)) {
      return false;
    }
    return true;
  }
}
