import { DIALOGUES } from "../data/dialogues";
import type { DialogueChoice, DialogueNode, DialogueTree } from "../data/dialogues";
import type { GameState } from "../state/GameState";
import type { ConditionChecker } from "./ConditionChecker";
import type { EffectRunner, StoryOutbox } from "./EffectRunner";
import type { QuestSystem } from "./QuestSystem";

/** Redirect chains longer than this are a content loop, not a conversation. */
const MAX_REDIRECTS = 12;

/**
 * Walks a data-defined dialogue tree.
 *
 * The tree decides what is said and which effects a choice carries; the
 * EffectRunner decides what those effects actually do. Nothing here branches on
 * a speaker's name - reacting to the story means gating choices, wording and
 * redirects on conditions, which is data.
 */
export class DialogueSystem {
  private readonly state: GameState;
  private readonly runner: EffectRunner;
  private readonly outbox: StoryOutbox;
  private readonly conditions: ConditionChecker;

  private tree: DialogueTree | null = null;
  private nodeId = "";
  /**
   * Nodes with a variant applied, keyed by node and variant. The dialogue box
   * asks for the node every frame, so the resolved copy is made once and
   * reused rather than allocated per frame.
   */
  private readonly resolved = new Map<string, DialogueNode>();

  speakerId = "";
  speakerName = "";
  /** The name of the person the conversation is with, before any node overrides it. */
  private baseSpeakerName = "";

  constructor(
    state: GameState,
    quests: QuestSystem,
    runner: EffectRunner,
    outbox: StoryOutbox,
  ) {
    this.state = state;
    this.runner = runner;
    this.outbox = outbox;
    // The quest machine is reached through the runner's checker, so dialogue
    // and cutscenes can never disagree about what a condition means.
    void quests;
    this.conditions = runner.conditions;
  }

  get active(): boolean {
    return this.tree !== null;
  }

  /** The id of the node being shown, for tools and tests. */
  get currentNodeId(): string {
    return this.nodeId;
  }

  start(speakerId: string, speakerName: string, dialogueId: string): boolean {
    const tree = DIALOGUES[dialogueId];
    if (!tree) return false;
    this.tree = tree;
    this.speakerId = speakerId;
    this.baseSpeakerName = speakerName;
    this.speakerName = speakerName;
    this.enter(tree.start);
    return this.tree !== null;
  }

  node(): DialogueNode | null {
    if (!this.tree) return null;
    const node = this.tree.nodes[this.nodeId];
    if (!node) return null;
    if (!node.variants) return node;

    for (let i = 0; i < node.variants.length; i++) {
      const variant = node.variants[i]!;
      if (!this.conditions.check(variant, this.speakerId)) continue;
      const key = `${this.tree.id}/${this.nodeId}/${i}`;
      let copy = this.resolved.get(key);
      if (!copy) {
        copy = { ...node, text: variant.text };
        this.resolved.set(key, copy);
      }
      this.speakerName = variant.speaker ?? node.speaker ?? this.baseSpeakerName;
      return copy;
    }
    this.speakerName = node.speaker ?? this.baseSpeakerName;
    return node;
  }

  /** The choices the player can actually see right now. */
  choices(): DialogueChoice[] {
    const node = this.tree?.nodes[this.nodeId];
    if (!node?.choices) return [];
    return node.choices.filter((choice, index) => this.isAvailable(choice, index));
  }

  choose(index: number): void {
    const choice = this.choices()[index];
    if (!choice || !this.tree) return;

    if (choice.once) this.state.setFlag(this.onceFlag(choice));

    // `affinity` is about the person in front of you, so it is applied here
    // rather than in the generic effect runner, which has no speaker.
    if (choice.affinity) {
      this.state.adjustRelationship(this.speakerId, choice.affinity);
      const sign = choice.affinity > 0 ? "+" : "";
      this.outbox.messages.push(`${sign}${choice.affinity} with ${this.baseSpeakerName}`);
    }

    this.runner.run(choice, this.outbox);

    // A choice that calls for a battle ends the conversation; the scene takes
    // over from the outbox.
    if (choice.battle) {
      this.end();
      return;
    }

    if (choice.next && this.tree?.nodes[choice.next]) {
      this.enter(choice.next);
    } else {
      this.end();
    }
  }

  /** Used when a node has no available choices - moves on or closes the conversation. */
  advance(): void {
    const node = this.tree?.nodes[this.nodeId];
    if (!node) {
      this.end();
      return;
    }
    if (node.next && this.tree?.nodes[node.next]) {
      this.enter(node.next);
    } else {
      this.end();
    }
  }

  end(): void {
    this.tree = null;
    this.nodeId = "";
    this.speakerName = this.baseSpeakerName;
  }

  /** Moves to a node, following any redirect that applies, and runs its onEnter. */
  private enter(id: string): void {
    const tree = this.tree;
    if (!tree) return;

    let target = id;
    for (let hops = 0; hops < MAX_REDIRECTS; hops++) {
      const node = tree.nodes[target];
      if (!node?.redirect) break;
      const match = node.redirect.find(
        (r) => r.next !== target && tree.nodes[r.next] && this.conditions.check(r, this.speakerId),
      );
      if (!match) break;
      target = match.next;
    }

    const node = tree.nodes[target];
    if (!node) {
      this.end();
      return;
    }
    this.nodeId = target;
    this.speakerName = node.speaker ?? this.baseSpeakerName;
    if (node.onEnter) this.runner.run(node.onEnter, this.outbox);
    // An onEnter may itself call for a battle, which ends the talk.
    if (node.onEnter?.battle) this.end();
  }

  private onceFlag(choice: DialogueChoice): string {
    const node = this.tree?.nodes[this.nodeId];
    const index = node?.choices?.indexOf(choice) ?? -1;
    return `said_${this.tree?.id}_${this.nodeId}_${index}`;
  }

  private isAvailable(choice: DialogueChoice, index: number): boolean {
    if (choice.once && this.state.flag(`said_${this.tree?.id}_${this.nodeId}_${index}`)) return false;
    return this.conditions.check(choice, this.speakerId);
  }
}
