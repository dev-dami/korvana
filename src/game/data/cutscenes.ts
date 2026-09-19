import type { Effects } from "./effects";

export interface CutsceneLine {
  /** Speaker name. Omitted for narration, which is set in italic-ish framing. */
  speaker?: string;
  text: string;
}

/**
 * A cutscene is a letterboxed sequence of lines. Deliberately not a cinematic
 * system: no camera moves, no scripted actors, just the screen dimming and a
 * few sentences landing with enough ceremony to mark a chapter.
 */
export interface CutsceneDef {
  id: string;
  /** Chapter card shown before the lines. */
  act?: { number: number; title: string };
  lines: CutsceneLine[];
  /** Applied when the last line is dismissed. */
  onEnd?: Effects;
}

export const CUTSCENES: Record<string, CutsceneDef> = {
  opening: {
    id: "opening",
    act: { number: 1, title: "The Arrival" },
    lines: [
      {
        text: "The letter said to come north until the road stopped being a road, then keep going until it stopped being anything.",
      },
      {
        text: "It did not say what you were arriving at. It said only that the grounds were unlimited, and that this was considered a feature.",
      },
      {
        speaker: "Korvana",
        text: "You have been walking since before dawn. Behind you the path has already forgotten you were on it.",
      },
      {
        text: "There is a hall ahead. There is smoke. There are, by the look of it, four people who were not expecting you until Thursday.",
      },
    ],
    onEnd: { lore: "korvana", toast: "Talk to the tutors and students around the hall." },
  },

  act1_close: {
    id: "act1_close",
    lines: [
      {
        speaker: "Professor Alden",
        text: "You will hear that the grounds are endless. That is our official position and I would like you to hold to it in front of the first-years.",
      },
      {
        speaker: "Professor Alden",
        text: "Between us: the first survey walked north for six months and came back to the same hall. They did not turn around. They were walking north the entire time.",
      },
      {
        speaker: "Professor Alden",
        text: "So the grounds are not endless. They are merely very good at closing. And lately they have been shedding pieces of something that was keeping them closed.",
      },
      {
        speaker: "Professor Alden",
        text: "The splinters Corvin keeps going on about. Go and see the waystone north of here. Then come back and tell me I am being dramatic.",
      },
    ],
    onEnd: { lore: "waystones", setFlag: "act1_complete", toast: "New objective: the north waystone." },
  },

  act2_open: {
    id: "act2_open",
    act: { number: 2, title: "The Scar" },
    lines: [
      {
        text: "The waystone stops humming about two hundred paces north of itself, which is the first warning.",
      },
      {
        text: "The second warning is the ground. Grass, then gravel, then a band of pale ash a mile wide, and past the ash a sky that has been drained of its colour.",
      },
      {
        text: "Nothing grows here. Nothing has grown here for eleven years. Under the ash the old ground is still there, intact, unmarked, and entirely dead.",
      },
      {
        text: "Somewhere out in the middle of it, someone has built a fire. It is the only thing moving.",
      },
    ],
    onEnd: { lore: "the_scar", setFlag: "act2_started" },
  },

  ilse_meeting: {
    id: "ilse_meeting",
    lines: [
      {
        speaker: "Keeper Ilse",
        text: "You are the first person to walk in here in four years who was not already dead or already him.",
      },
      {
        speaker: "Keeper Ilse",
        text: "I am the Keeper of the Moonwell. Was. There were nine of us. The others went north to fetch the survey back and did not return, and I have been standing in the doorway since.",
      },
      {
        speaker: "Keeper Ilse",
        text: "The splinters are the well coming apart. Every one that gets carried away is a piece of the lock. Something has been carrying them, and it has been singing while it does it.",
      },
      {
        speaker: "Keeper Ilse",
        text: "Break the wraiths that fetch them, and then we will talk about the boy at the Wellhead.",
      },
    ],
    onEnd: { lore: "hollow_choir", setFlag: "met_ilse" },
  },

  act3_open: {
    id: "act3_open",
    act: { number: 3, title: "The Hollow" },
    lines: [
      {
        speaker: "Keeper Ilse",
        text: "That is Vale. Fourth-year. He was good - better than me at the reading, which is why he is the one down there and I am the one up here.",
      },
      {
        speaker: "Keeper Ilse",
        text: "He has decided the well was always going to break, so there is no harm in helping it. That is a real argument. It is also the only argument he has.",
      },
      {
        speaker: "Keeper Ilse",
        text: "I cannot go down. Somebody has to stand in the doorway, and it is now a job for one. Go and be the second.",
      },
    ],
    onEnd: { lore: "vale" },
  },

  ending: {
    id: "ending",
    lines: [
      {
        speaker: "Vale",
        text: "You cannot put it back. Nobody can put it back. I have read everything the Keepers ever wrote and the whole of it is nine people standing very still for six hundred years.",
      },
      {
        speaker: "Vale",
        text: "What do you think you are keeping it from? It is not coming for you. It does not know you are here. You are standing in a doorway shouting at a storm to notice you.",
      },
      {
        speaker: "Keeper Ilse",
        text: "Yes. And the storm does not, and that is the entire point, and it is a very dull point to die for.",
      },
      {
        speaker: "Keeper Ilse",
        text: "The shards went in. Hand me the last of them. Not to destroy anything - just to be nine people again instead of one.",
      },
      {
        text: "The light coming up the well goes pale, then dim, then stops coming up at all. It does not feel like a victory. It feels like a door being shut carefully, by someone who intends to keep checking it.",
      },
      {
        speaker: "Keeper Ilse",
        text: "Go home. I will keep the watch. I am very good at it and there is nothing else I want.",
      },
    ],
    onEnd: { lore: "the_long_dark", setFlag: "game_complete" },
  },

  epilogue: {
    id: "epilogue",
    lines: [
      {
        speaker: "Professor Alden",
        text: "You have been gone a season. I did not send anyone after you, and I would like you to know that was a decision and not an oversight.",
      },
      {
        speaker: "Professor Alden",
        text: "The splinters have stopped coming up in the grass. Corvin has taken the news badly and is writing a paper about it.",
      },
      {
        speaker: "Professor Alden",
        text: "Korvana has no edge, which we both know is a lie, and it is a lie I intend to keep telling to first-years for as long as they will let me.",
      },
      {
        text: "The grounds go on further than anyone has mapped. Somewhere north, a light stays lit, and someone very patient does not move.",
      },
    ],
    onEnd: { toast: "You have finished the story. Korvana keeps going - wander if you like." },
  },
};

export function cutsceneById(id: string): CutsceneDef | undefined {
  return CUTSCENES[id];
}
