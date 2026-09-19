import { cutsceneById } from "../data/cutscenes";
import type { CutsceneDef, CutsceneLine } from "../data/cutscenes";

/**
 * Plays authored cutscenes one line at a time.
 *
 * Holds no game objects: the scene reads `line` and draws it, the same way the
 * HUD reads the dialogue system. Whatever the cutscene wants to happen when it
 * ends is handed back through `onEnd`, so a cutscene can still be a link in the
 * story chain without knowing about the scene that runs it.
 */
export class CutsceneSystem {
  private queue: CutsceneDef[] = [];
  private current: CutsceneDef | null = null;
  private lineIndex = 0;

  /** Called when a cutscene's last line is dismissed. */
  onEnd: ((def: CutsceneDef) => void) | null = null;

  get active(): boolean {
    return this.current !== null;
  }

  get def(): CutsceneDef | null {
    return this.current;
  }

  get line(): CutsceneLine | null {
    if (!this.current) return null;
    return this.current.lines[this.lineIndex] ?? null;
  }

  /** The chapter card, shown only alongside the opening line. */
  get actCard(): { number: number; title: string } | null {
    if (!this.current || this.lineIndex !== 0) return null;
    return this.current.act ?? null;
  }

  get isLastLine(): boolean {
    if (!this.current) return false;
    return this.lineIndex >= this.current.lines.length - 1;
  }

  get lineNumber(): number {
    return this.lineIndex + 1;
  }

  get lineCount(): number {
    return this.current?.lines.length ?? 0;
  }

  /** Queues a cutscene. Returns false if the id is unknown. */
  enqueue(id: string): boolean {
    const def = cutsceneById(id);
    if (!def) {
      console.warn(`Unknown cutscene "${id}"`);
      return false;
    }
    this.queue.push(def);
    if (!this.current) this.startNext();
    return true;
  }

  /** Dismisses the current line, or ends the cutscene if it was the last. */
  advance(): void {
    if (!this.current) return;
    if (this.lineIndex < this.current.lines.length - 1) {
      this.lineIndex++;
      return;
    }

    const finished = this.current;
    this.current = null;
    this.lineIndex = 0;

    this.onEnd?.(finished);
    if (!this.current) this.startNext();
  }

  /** Skips everything, including anything queued. */
  clear(): void {
    this.queue = [];
    this.current = null;
    this.lineIndex = 0;
  }

  private startNext(): void {
    if (this.current) return;
    const next = this.queue.shift();
    if (!next) return;
    this.current = next;
    this.lineIndex = 0;
  }
}
