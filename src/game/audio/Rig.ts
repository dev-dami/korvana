import { Ambience } from "./Ambience";
import { Kit } from "./Kit";
import { Mixer } from "./Mixer";
import { MusicEngine } from "./MusicEngine";
import { makePool } from "./Patch";
import { Sfx } from "./Sfx";

/**
 * Everything that makes sound, wired together on one context. Built from a
 * BaseAudioContext so the same graph runs live in the game and inside an
 * OfflineAudioContext when rendering themes for testing.
 */
export interface AudioRig {
  ctx: BaseAudioContext;
  kit: Kit;
  mixer: Mixer;
  music: MusicEngine;
  ambience: Ambience;
  sfx: Sfx;
}

/** Polyphony budgets. Past these, ornaments and accompaniment drop out first. */
const MUSIC_VOICES = 80;
const SFX_VOICES = 40;
const AMBIENCE_VOICES = 14;

export function buildRig(ctx: BaseAudioContext): AudioRig {
  const kit = new Kit(ctx);
  const mixer = new Mixer(ctx);
  const music = new MusicEngine(ctx, mixer.music, mixer.musicReverb, kit, makePool(MUSIC_VOICES));
  const sfx = new Sfx({ ctx, kit, pool: makePool(SFX_VOICES), dry: mixer.sfx, hall: mixer.sfxHall });
  const ambience = new Ambience(ctx, kit, mixer.ambience, mixer.ambienceReverb, makePool(AMBIENCE_VOICES), sfx);
  return { ctx, kit, mixer, music, ambience, sfx };
}
