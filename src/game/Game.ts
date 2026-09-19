import Phaser from "phaser";

import { containerHeight, containerWidth, DPR } from "./display";
import { BattleScene } from "./scenes/BattleScene";
import { BootScene } from "./scenes/BootScene";
import { UIScene } from "./scenes/UIScene";
import { WorldScene } from "./scenes/WorldScene";

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",

  // Sized in device pixels; WorldScene and friends lay out in CSS pixels.
  width: Math.round(containerWidth() * DPR),
  height: Math.round(containerHeight() * DPR),

  backgroundColor: "#0b0d12",

  pixelArt: true,
  roundPixels: true,

  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },

  // No engine-driven scaling: the backing store already matches the display.
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.NO_CENTER,
  },

  scene: [BootScene, WorldScene, UIScene, BattleScene],
});

declare global {
  interface Window {
    /** Debug handle: inspect scenes, textures and systems from the console. */
    korvana?: Phaser.Game;
  }
}

window.korvana = game;

window.addEventListener("resize", () => {
  game.scale.resize(
    Math.round(containerWidth() * DPR),
    Math.round(containerHeight() * DPR),
  );
});
