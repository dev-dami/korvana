import { ACT_TITLES } from "../data/quests";
import { UiComponent } from "./UiComponent";
import { COLOR_GOLD, COLOR_TEXT, heading, label } from "./theme";

/** How many quest entries fit before the log has to start summarising. */
const MAX_SHOWN = 5;

/**
 * The objective tracker.
 *
 * Previously it silently dropped everything past the fourth active quest. Now
 * the overflow is counted and reported, so a player with six things to do can
 * see that there are six.
 */
export class QuestLog extends UiComponent {
  private title!: Phaser.GameObjects.Text;
  private body!: Phaser.GameObjects.Text;

  create(): void {
    this.title = this.track(
      heading(this.scene, "Objectives", { size: 20, color: COLOR_GOLD, align: "left" }).setDepth(2),
    );
    this.body = this.track(
      label(this.scene, "", { size: 15, color: COLOR_TEXT, lineSpacing: 8 }).setDepth(2),
    );
  }

  update(_width: number, height: number, _time: number): void {
    const active = this.world.quests.activeQuests();

    if (active.length === 0) {
      this.title.setVisible(false);
      this.body.setText("");
      return;
    }

    this.title.setVisible(true).setPosition(24, height - 258);

    const lines: string[] = [];
    let lastAct = 0;

    for (const { def, stage, progress } of active.slice(0, MAX_SHOWN)) {
      if (def.act !== lastAct) {
        lastAct = def.act;
        lines.push(ACT_TITLES[def.act] ?? `Act ${def.act}`);
      }
      lines.push(`  ${def.name}`);
      lines.push(`      ${stage.objective}   (${progress}/${stage.count})`);
    }

    const hidden = active.length - MAX_SHOWN;
    if (hidden > 0) lines.push(`  ...and ${hidden} more`);

    this.body.setPosition(24, height - 230).setText(lines.join("\n"));
    this.body.setVisible(true);
  }
}
