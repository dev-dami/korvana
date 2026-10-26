import type Phaser from "phaser";

/** Characters per second for ordinary prose. */
const CPS = 58;

/** Registry flag WorldScene reads: while true, a key press finishes the line instead of advancing. */
export const TYPING_FLAG = "ui:typing";
/** Game event WorldScene emits to ask the UI to finish the current line. */
export const FINISH_TYPING = "korvana:finish-typing";

/**
 * Types a line into a Text object letter by letter.
 *
 * The full line is wrapped *once*, up front, and the reveal walks those fixed
 * lines - so a long word never starts on one line and jumps to the next when
 * its last letter lands. Punctuation earns a beat: a comma breathes, a full
 * stop pauses.
 */
export class Typewriter {
  private readonly scene: Phaser.Scene;
  private readonly text: Phaser.GameObjects.Text;
  private full = "";
  private lines: string[] = [];
  /** When each character becomes visible, in ms after the start. */
  private times: number[] = [];
  private startedAt = 0;
  private shown = -1;
  private finished = false;
  private wrapWidth = 0;
  fullHeight = 0;
  completedAt = 0;

  constructor(scene: Phaser.Scene, text: Phaser.GameObjects.Text) {
    this.scene = scene;
    this.text = text;
    scene.game.events.on(FINISH_TYPING, this.finish, this);
  }

  get complete(): boolean {
    return this.finished;
  }

  /** Call every frame with the line that should be on screen. */
  show(line: string, time: number): void {
    const wrap = this.text.style.wordWrapWidth ?? 0;
    if (line !== this.full) {
      this.full = line;
      this.startedAt = time;
      this.finished = false;
      this.shown = -1;
      this.rewrap(wrap);
      this.schedule();
    } else if (wrap !== this.wrapWidth) {
      this.rewrap(wrap);
      this.shown = -1;
    }

    const elapsed = time - this.startedAt;
    let count = this.finished ? this.times.length : 0;
    if (!this.finished) {
      while (count < this.times.length && this.times[count]! <= elapsed) count++;
      if (count >= this.times.length) this.markDone(time);
    }
    if (count !== this.shown) {
      this.shown = count;
      this.text.setText(this.slice(count));
    }
    this.scene.registry.set(TYPING_FLAG, !this.finished);
  }

  /** The text's style changed: re-wrap on the next show(). */
  invalidate(): void {
    this.wrapWidth = -1;
  }

  /** Shows the whole line now. */
  finish(): void {
    if (this.finished || !this.full) return;
    this.markDone(this.scene.time.now);
    this.shown = this.times.length;
    this.text.setText(this.lines.join("\n"));
  }

  /** The line has gone away; let input through again. */
  stop(): void {
    this.full = "";
    this.finished = true;
    this.scene.registry.set(TYPING_FLAG, false);
  }

  destroy(): void {
    this.stop();
    this.scene.game.events.off(FINISH_TYPING, this.finish, this);
  }

  private markDone(time: number): void {
    if (this.finished) return;
    this.finished = true;
    this.completedAt = time;
    this.scene.registry.set(TYPING_FLAG, false);
  }

  private rewrap(width: number): void {
    this.wrapWidth = width;
    this.lines = width > 0 ? this.text.getWrappedText(this.full) : this.full.split("\n");
    this.text.setText(this.lines.join("\n"));
    this.fullHeight = this.text.height;
  }

  private schedule(): void {
    this.times = [];
    let t = 0;
    const chars = this.lines.join("");
    for (let i = 0; i < chars.length; i++) {
      this.times.push(t);
      const c = chars[i]!;
      t += 1000 / CPS;
      if (".!?".includes(c)) t += 170;
      else if (",;:".includes(c)) t += 70;
      else if (c === "—" || c === "-") t += 40;
    }
  }

  /** The first `count` characters, keeping the precomputed line breaks. */
  private slice(count: number): string {
    let left = count;
    const out: string[] = [];
    for (const line of this.lines) {
      if (left <= 0) break;
      out.push(line.slice(0, left));
      left -= line.length;
    }
    return out.join("\n");
  }
}
