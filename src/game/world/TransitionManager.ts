import type Phaser from "phaser";

/**
 * Scene-to-scene movement with a bit of ceremony: fade the camera out, hand
 * over, fade back in. Battles and (later) building interiors both go through
 * here so the player never sees a hard cut.
 */
export class TransitionManager {
  private readonly scene: Phaser.Scene;
  private busy = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get transitioning(): boolean {
    return this.busy;
  }

  /** Fades out, then starts `sceneKey` and stops the current scene. */
  travelTo(sceneKey: string, data: object = {}): void {
    if (this.busy) return;
    this.busy = true;

    const camera = this.scene.cameras.main;
    camera.fadeOut(280, 6, 6, 10);
    camera.once("camerafadeoutcomplete", () => {
      this.busy = false;
      this.scene.scene.start(sceneKey, data);
    });
  }

  /** Fades out, launches an overlay scene, then fades back in. */
  openOverlay(sceneKey: string, data: object = {}): void {
    if (this.busy) return;
    this.busy = true;

    const camera = this.scene.cameras.main;
    camera.fadeOut(240, 6, 6, 10);
    camera.once("camerafadeoutcomplete", () => {
      this.scene.scene.launch(sceneKey, data);
      this.scene.scene.pause();
      this.busy = false;
      camera.fadeIn(240, 6, 6, 10);
    });
  }

  fadeIn(duration = 400): void {
    this.scene.cameras.main.fadeIn(duration, 6, 6, 10);
  }

  flash(color = 0xffffff, duration = 120): void {
    this.scene.cameras.main.flash(duration, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
  }

  shake(intensity = 0.006, duration = 140): void {
    this.scene.cameras.main.shake(duration, intensity);
  }
}
