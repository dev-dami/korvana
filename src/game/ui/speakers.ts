import { NPC_ROSTER } from "../data/npcs";

/**
 * Who a line belongs to, by the name printed above it.
 *
 * Dialogue nodes and cutscene lines name their speaker in prose ("The
 * Choosing Lamp", "Brother Hollis"), and a node can speak for someone other
 * than the NPC you clicked on. This table turns those display names into look
 * keys so the right portrait appears. Names not listed fall back to the NPC
 * roster (exact name, then surname), so a new character still gets a face.
 */
const SPEAKER_LOOKS: Record<string, string> = {
  "headmistress vey": "headmistress",
  "headmistress orlaith vey": "headmistress",
  "orlaith vey": "headmistress",
  "the choosing lamp": "lamp",
  "choosing lamp": "lamp",
  "professor alden": "professor",
  alden: "professor",
  "mistress wick": "herbologist",
  "professor wick": "herbologist",
  "master fennick": "librarian",
  fennick: "librarian",
  amelia: "student",
  corvin: "scholar",
  pip: "owl",
  "brother hollis": "ghost",
  hollis: "ghost",
  "seren ashdown": "raider",
  seren: "raider",
  "keeper ilse": "keeper",
  ilse: "keeper",
  vale: "vale",
};

/** A look key for a speaker's display name, or null for narration and strangers. */
export function lookForSpeaker(name: string | undefined | null, fallbackLook?: string): string | null {
  if (!name) return fallbackLook ?? null;
  const lower = name.trim().toLowerCase();
  const mapped = SPEAKER_LOOKS[lower];
  if (mapped) return mapped;
  const npc =
    NPC_ROSTER.find((n) => n.name.toLowerCase() === lower) ??
    NPC_ROSTER.find((n) => n.name.toLowerCase().split(" ").pop() === lower.split(" ").pop());
  return npc?.look ?? fallbackLook ?? null;
}
