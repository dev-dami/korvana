import Phaser from "phaser";

import type { WorldScene } from "../scenes/WorldScene";
import { Atmosphere } from "./Atmosphere";
import { CombatFx } from "./CombatFx";
import { DayCycle } from "./DayCycle";
import type { Look } from "./DayCycle";
import { Lighting } from "./Lighting";
import type { FrameLight } from "./Lighting";
import { PostFx } from "./PostFx";
import { SWAY } from "./props";
import { WaterFx } from "./WaterFx";

/**
 * Everything that makes the world look alive, behind one object so the scene
 * hooks it in with three lines: construct in create, update each frame,
 * destroy on shutdown.
 *
 * It watches the scene rather than being told things: objects entering the
 * display list are sorted into light emitters, swaying foliage and water
 * layers; enemies are watched for hits; the clock and the player's biome set
 * the look. No gameplay code needs to know any of this exists.
 */

interface Swayer {
  img: Phaser.GameObjects.Image;
  amp: number;
  phase: number;
}

export class WorldFx {
  readonly lighting: Lighting;
  private readonly scene: WorldScene;
  private readonly day = new DayCycle();
  private readonly atmosphere: Atmosphere;
  private readonly post: PostFx;
  private readonly water: WaterFx;
  private readonly combat: CombatFx;
  private readonly swayers = new Map<Phaser.GameObjects.GameObject, Swayer>();
  private readonly view = new Phaser.Geom.Rectangle();
  private readonly personal: FrameLight = { x: 0, y: 0, radius: 0, color: 0xffe2b0, intensity: 0 };
  private time = 0;
  private look: Look | null = null;

  constructor(scene: WorldScene) {
    this.scene = scene;
    this.lighting = new Lighting(scene, scene.lightRegistry);
    this.water = new WaterFx(scene);
    this.atmosphere = new Atmosphere(scene);
    this.combat = new CombatFx(scene, this.lighting);
    this.post = new PostFx(scene);

    const events = scene.sys.events;
    events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, this.onAdded, this);
    events.on(Phaser.Scenes.Events.REMOVED_FROM_SCENE, this.onRemoved, this);
    // Anything that was on stage before we arrived.
    for (const obj of scene.children.list) this.onAdded(obj);
  }

  /** The current look (ambient colour, darkness...), for anyone who wants to match it. */
  get current(): Look | null {
    return this.look;
  }

  update(dt: number): void {
    const scene = this.scene;
    const player = scene.player;
    if (!player) return;
    this.time += dt;

    const camera = scene.cameras.main;
    const viewW = camera.width / camera.zoom;
    const viewH = camera.height / camera.zoom;
    this.view.setTo(camera.midPoint.x - viewW / 2, camera.midPoint.y - viewH / 2, viewW, viewH);

    const biome = scene.world.biomeNameAtPixel(player.x, player.y);
    const look = this.day.update(scene.state.dayFraction, biome, dt);
    this.look = look;

    this.water.update(dt, look, this.view, scene.world);
    this.atmosphere.update(dt, look, this.view);
    this.combat.update(dt, scene.enemies, player);
    this.updateSway();

    // A soft glow around the player once it gets dark; underground it is the
    // light you carry, wider and warmer.
    const crypt = biome === "crypt";
    const p = this.personal;
    p.x = player.x;
    p.y = player.y - 12;
    p.radius = crypt ? 200 : 140;
    p.color = crypt ? 0xffd49a : 0xd8e0ff;
    p.intensity = crypt ? 0.75 : Math.max(0, look.darkness - 0.2) * 0.75;

    this.lighting.update(
      dt,
      look,
      camera,
      p,
      this.atmosphere.frameLights,
      this.atmosphere.frameLightCount,
    );
    this.post.update(look);
  }

  destroy(): void {
    const events = this.scene.sys.events;
    events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, this.onAdded, this);
    events.off(Phaser.Scenes.Events.REMOVED_FROM_SCENE, this.onRemoved, this);
    this.lighting.destroy();
    this.water.destroy();
    this.atmosphere.destroy();
    this.combat.destroy();
    this.swayers.clear();
  }

  private onAdded(obj: Phaser.GameObjects.GameObject): void {
    const key = (obj as Phaser.GameObjects.Image).texture?.key;
    if (!key) return;
    this.lighting.track(obj);
    if (key.startsWith("chunkw_")) this.water.waterAdded(1);
    const amp = SWAY[key];
    if (amp !== undefined && obj instanceof Phaser.GameObjects.Image) {
      this.swayers.set(obj, { img: obj, amp, phase: obj.x * 0.05 + obj.y * 0.013 });
    }
  }

  private onRemoved(obj: Phaser.GameObjects.GameObject): void {
    const key = (obj as Phaser.GameObjects.Image).texture?.key;
    this.lighting.untrack(obj);
    this.swayers.delete(obj);
    if (key?.startsWith("chunkw_")) this.water.waterAdded(-1);
  }

  /**
   * Wind through the grass: a slow travelling wave plus gusts, so a field
   * ripples in a direction instead of every tuft nodding in unison.
   */
  private updateSway(): void {
    const t = this.time;
    const gust = 0.6 + 0.4 * Math.sin(t * 0.37) * Math.sin(t * 0.11 + 1.3);
    const v = this.view;
    const left = v.x - 40;
    const right = v.right + 40;
    const top = v.y - 40;
    const bottom = v.bottom + 60;
    for (const s of this.swayers.values()) {
      const img = s.img;
      if (img.x < left || img.x > right || img.y < top || img.y > bottom) continue;
      const wave = Math.sin(t * 1.9 - img.x * 0.012 + s.phase * 0.2);
      img.setRotation(s.amp * gust * (0.35 + 0.65 * wave));
    }
  }
}
