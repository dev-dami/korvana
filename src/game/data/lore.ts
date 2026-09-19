/**
 * The journal.
 *
 * Entries unlock as the player discovers things and are kept forever, so the
 * story survives being put down for a week. `act` only controls the order they
 * are listed in.
 */
export interface LoreEntry {
  id: string;
  title: string;
  act: number;
  body: string;
}

export const LORE: Record<string, LoreEntry> = {
  korvana: {
    id: "korvana",
    title: "Korvana",
    act: 1,
    body: "The grounds go on further than anyone has mapped, and they do not repeat. Every survey sent out comes back with a different answer, which the faculty has agreed to describe as 'encouraging'. There is one hall, four tutors, a varying number of students, and no edge. There is no edge that anyone has walked to.",
  },
  treeline: {
    id: "treeline",
    title: "The Treeline",
    act: 1,
    body: "The forest begins where the mown grass stops, without any thinning in between, as though the trees were waiting for a signal. Students are told the treeline is where the grounds stop being the grounds. It is not a rule anyone has tested past about a mile.",
  },
  splinters: {
    id: "splinters",
    title: "Splinters",
    act: 1,
    body: "Shards of cold light, no bigger than a finger joint, turning up in the grass as far south as the arrival grounds. They do not melt, do not warm, and do not reflect anything that is there. Corvin's position is that a well cannot shed splinters. Corvin's other position is that he would like three of them.",
  },
  waystones: {
    id: "waystones",
    title: "The Waystones",
    act: 1,
    body: "Markers set down by the first survey, at intervals that are supposed to be regular. They are not regular, which the survey blamed on the ground moving, rather than on the survey. Each one is a ring of stone around a light that has burned for longer than the hall has stood.",
  },
  the_scar: {
    id: "the_scar",
    title: "The Moonwell Scar",
    act: 2,
    body: "A basin of ash in the north range, roughly a mile across, where the ground has been taken down to nothing and left that way. Nothing grows in it. The ash is not deep - you can see the old ground under it, intact and unmarked, as though the life had been lifted off rather than burned away.",
  },
  keepers: {
    id: "keepers",
    title: "The Keepers",
    act: 2,
    body: "An order older than the hall, whose whole work was to sit at the Moonwell and keep it from doing anything. They were patient about it for a very long time. There is now one of them, and she has been holding the same watch alone for four years, and she would like to know why nobody has relieved her.",
  },
  wellhead: {
    id: "wellhead",
    title: "The Wellhead",
    act: 2,
    body: "The mouth of the Moonwell, ringed in stone that has been rebuilt more than once. The well goes down further than the deepest sounding the Keepers ever recorded, and the light coming up it is not the light going in. What it is instead is a question the Keepers were founded to stop anyone asking.",
  },
  hollow_choir: {
    id: "hollow_choir",
    title: "The Hollow Choir",
    act: 2,
    body: "Not a choir and not, properly, hollow. The name comes from the sound the wraiths make, which is close enough to singing that people write it down that way. They gather wherever the Moonwell has shed itself, and they carry the splinters back north. Nobody taught them to do that.",
  },
  vale: {
    id: "vale",
    title: "Vale",
    act: 2,
    body: "Fourth-year, withdrawn mid-term, listed as left rather than lost. He took the long view that a well which shatters is a well that was always going to, and that the Keepers were doing nothing so much as delaying an education. He has been at the Wellhead for a season, and he has stopped answering to his own name.",
  },
  the_moonwell: {
    id: "the_moonwell",
    title: "The Moonwell",
    act: 3,
    body: "A well of cold light under the north range. It is not a well, does not hold water, and the light does not come from the moon - the moon was simply the first thing anyone compared it to, and the name stuck the way names do. It shattered eleven years ago. Every splinter is a piece of the thing that was holding it together.",
  },
  the_long_dark: {
    id: "the_long_dark",
    title: "The Long Dark Between Stars",
    act: 3,
    body: "The Keepers' name for what the well holds back, which is not evil and not awake and has no interest in any of us. It is simply larger, and older, and on the other side of a door that was never meant to be opened, only ever kept shut. The Keepers do not fight it. They stand in the doorway and they do not move, for as long as it takes.",
  },
};

export function loreById(id: string): LoreEntry | undefined {
  return LORE[id];
}

export function loreList(): LoreEntry[] {
  return Object.values(LORE);
}
