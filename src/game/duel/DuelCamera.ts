/**
 * The duel's pseudo-3D camera.
 *
 * Duellists stand on a flat floor (x, z) and may rise off it (y). The camera
 * hangs at head height behind the pair, looking along the floor, and is always
 * turned side-on to the line between them - the way a fighting game frames a
 * bout. When either duellist circles, that line turns, the camera swings with
 * it, and the floor, pillars and backdrop all wheel past: that motion is what
 * sells the depth, even though every sprite is a flat pixel billboard.
 *
 * A small yaw bias puts the camera a little over the player's shoulder, so the
 * player stands nearer (and larger) than the opponent - a three-quarter view
 * rather than a perfectly flat profile.
 *
 * Projection is a plain pinhole: scale = focal / depth, and a floor point at
 * depth d lands `height * focal / d` pixels below the horizon.
 */

export interface Projection {
  x: number;
  y: number;
  /** Screen pixels per world unit at this depth. */
  s: number;
  /** Distance in front of the camera. Larger is further away. */
  depth: number;
  visible: boolean;
}

/** How far over the player's shoulder the camera sits, in radians. */
const SHOULDER_BIAS = 0.3;
const NEAR = 140;
/** Base focal length at a 720px-high view; scaled with the viewport. */
const FOCAL_AT_720 = 1500;
/** Camera eye height in world units: a little above a duellist's head. */
const EYE_HEIGHT = 165;
const MIN_DIST = 880;

export class DuelCamera {
  /** Where the camera looks: the midpoint between the duellists. */
  tx = 0;
  tz = 0;
  yaw = 0;
  dist = MIN_DIST;

  /** Extra zoom for finishing blows (1 = none). */
  punch = 1;
  shakeX = 0;
  shakeY = 0;

  private w = 1280;
  private focal = FOCAL_AT_720;
  private horizon = 260;
  private shakeTime = 0;
  private shakeAmp = 0;

  // Basis, refreshed by `commit()` once per frame.
  private rx = 1;
  private rz = 0;
  private fx = 0;
  private fz = 1;
  private cx = 0;
  private cz = -MIN_DIST;

  resize(w: number, h: number): void {
    this.w = w;
    this.focal = FOCAL_AT_720 * (h / 720);
    this.horizon = h * 0.36;
  }

  get horizonY(): number {
    return this.horizon;
  }

  /**
   * Eases the camera towards framing two duellists. `axis` is the angle of the
   * line from the player to the opponent.
   */
  frame(ax: number, az: number, bx: number, bz: number, dt: number, snap = false): void {
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    const axis = Math.atan2(bz - az, bx - ax);
    const targetYaw = axis - SHOULDER_BIAS;
    const sep = Math.hypot(bx - ax, bz - az);
    // Pull back so both fit in the middle 55% of the screen.
    const targetDist = Math.max(MIN_DIST, (sep * this.focal) / (this.w * 0.55));

    const k = snap ? 1 : 1 - Math.exp(-dt * 6);
    this.tx += (mx - this.tx) * k;
    this.tz += (mz - this.tz) * k;
    this.yaw += wrapAngle(targetYaw - this.yaw) * (snap ? 1 : 1 - Math.exp(-dt * 4.5));
    this.dist += (targetDist - this.dist) * (snap ? 1 : 1 - Math.exp(-dt * 3));
  }

  shake(amplitude: number, seconds: number): void {
    if (amplitude >= this.shakeAmp || this.shakeTime <= 0) {
      this.shakeAmp = amplitude;
      this.shakeTime = seconds;
    }
  }

  /** Call once per frame after `frame`, before projecting anything. */
  commit(dt: number): void {
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const a = this.shakeAmp * Math.max(0, this.shakeTime) * 6;
      this.shakeX = (Math.random() * 2 - 1) * a;
      this.shakeY = (Math.random() * 2 - 1) * a * 0.6;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
    this.rx = Math.cos(this.yaw);
    this.rz = Math.sin(this.yaw);
    this.fx = -Math.sin(this.yaw);
    this.fz = Math.cos(this.yaw);
    const d = this.dist / this.punch;
    this.cx = this.tx - this.fx * d;
    this.cz = this.tz - this.fz * d;
  }

  /** World (x, height, z) to screen. Writes into `out` to avoid allocation. */
  project(x: number, y: number, z: number, out: Projection): Projection {
    const dx = x - this.cx;
    const dz = z - this.cz;
    const depth = dx * this.fx + dz * this.fz;
    out.depth = depth;
    if (depth < NEAR) {
      out.visible = false;
      out.s = 0;
      out.x = 0;
      out.y = 0;
      return out;
    }
    const lateral = dx * this.rx + dz * this.rz;
    const s = this.focal / depth;
    out.s = s;
    out.x = this.w / 2 + lateral * s + this.shakeX;
    out.y = this.horizon + (EYE_HEIGHT - y) * s + this.shakeY;
    out.visible = true;
    return out;
  }

  /** Horizontal offset of the backdrop for the current yaw, in texture pixels. */
  panoramaOffset(textureWidth: number): number {
    return (this.yaw / (Math.PI * 2)) * textureWidth * 2;
  }
}

export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function makeProjection(): Projection {
  return { x: 0, y: 0, s: 0, depth: 0, visible: false };
}
