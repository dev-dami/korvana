import type { Conditions } from "./conditions";
import type { Effects } from "./effects";

/**
 * One line of a cutscene. A line may carry conditions; lines whose conditions
 * fail are dropped when the cutscene is queued, so one scene can be written
 * once and still remember whether Seren is your friend.
 */
export interface CutsceneLine extends Conditions {
  /** Speaker name. Omitted for narration, which is set in italic-ish framing. */
  speaker?: string;
  text: string;
}

/** Plays a different cutscene instead, when its conditions hold. The first match wins. */
export interface CutsceneBranch extends Conditions {
  id: string;
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
  /** Checked before anything plays; lets one trigger choose between whole scenes. */
  branches?: CutsceneBranch[];
}

// Speaker names match the NPC roster, so portraits resolve by name.
const VEY = "Headmistress Vey";
const LAMP = "The Choosing Lamp";
const ALDEN = "Professor Alden";
const WICK = "Mistress Wick";
const FENNICK = "Master Fennick";
const AMELIA = "Amelia";
const CORVIN = "Corvin";
const HOLLIS = "Brother Hollis";
const SEREN = "Seren Ashdown";
const ILSE = "Keeper Ilse";
const VALE = "Vale";

export const CUTSCENES: Record<string, CutsceneDef> = {
  // ================================================================ Act I

  opening: {
    id: "opening",
    act: { number: 1, title: "The Arrival" },
    lines: [
      {
        text: "The letter said to come north until the road stopped being a road, then keep going until it stopped being anything.",
      },
      {
        text: "It was written in a round, careful hand, on paper that smelled faintly of lamp-oil, and it was addressed to you by a name you have never told anyone.",
      },
      {
        text: "It did not say what you were arriving at. It said only that the grounds were unlimited, that this was considered a feature, and that you were expected.",
      },
      {
        text: "You have been walking since before dawn. Behind you the path has already forgotten you were on it.",
      },
      {
        text: "There is a hall ahead, black-roofed and enormous. There is smoke. There are, by the look of it, a handful of people in the courtyard who were not expecting you until Thursday.",
      },
      {
        text: "From somewhere inside, through a great many walls, comes the sound of a lot of children trying not to cheer.",
      },
    ],
    onEnd: {
      lore: "korvana",
      startQuest: "the_choosing",
      toast: "Talk to someone in the courtyard. You are, apparently, late.",
    },
  },

  the_great_hall: {
    id: "the_great_hall",
    lines: [
      {
        text: "The Great Hall is the kind of room that has been built to make people feel small, and then lived in for six hundred years until it gave up and made them feel at home instead.",
      },
      {
        text: "Four long tables run its length - red and brass, green and bone, blue and silver, teal and pearl - and every face at every table has turned to look at you.",
      },
      {
        text: "Above them the painted ceiling holds a night sky full of stars that are not in the one outside. Some of them, you would swear, are moving.",
      },
      {
        text: "On the dais, from an iron hook worn bright with age, hangs a lantern of black iron and old glass. Its flame leans towards you, the way a person leans in to hear.",
      },
      {
        speaker: LAMP,
        text: "Oh, there you are. Do come up. I have been holding the last question open for you since breakfast, and it is very bad for my wick.",
      },
    ],
    onEnd: { lore: "the_great_hall" },
  },

  the_chosen: {
    id: "the_chosen",
    lines: [
      {
        text: "The flame climbs the glass all at once, as if someone had opened a door behind it.",
      },
      { requiresHouse: "emberhart", text: "It burns the red of a forge at full heat, and for one breath the whole hall is warm." },
      { requiresHouse: "thornwick", text: "It burns green, the green of new leaves with light behind them, and the hall smells for one breath of cut grass." },
      { requiresHouse: "ravelle", text: "It burns a deep and starry blue, and for one breath every lock in the hall clicks, very softly, and is still." },
      { requiresHouse: "stillwater", text: "It burns the pale grey-green of deep water, and for one breath the whole hall is perfectly, restfully silent." },
      { requiresHouse: "emberhart", speaker: VEY, text: "Emberhart. Go first, and say so. Your table is the loud one, Wren; you will not need directions." },
      { requiresHouse: "thornwick", speaker: VEY, text: "Thornwick. Stay, tend, hold. Your table is the one that has already made room for you. They do that." },
      { requiresHouse: "ravelle", speaker: VEY, text: "Ravelle. Ask the second question. Your table is the one already trying to work out what the Lamp saw in you." },
      { requiresHouse: "stillwater", speaker: VEY, text: "Stillwater. Wait, then wait a little more. Your table is the quiet one. They are pleased. You will learn to tell." },
      { requiresFlag: "lamp_argued", speaker: LAMP, text: "Under protest. Noted. I have been argued with by better and lost to worse. Off you go." },
      { requiresHouse: "emberhart", speaker: AMELIA, text: "Yes! Yes. I mean - welcome. Sit here. Not there, that one's wobbly. I'm Amelia. Everyone knows that." },
      { requiresHouse: "ravelle", speaker: CORVIN, text: "Hm. Well. Sit down, then. Not that close. I'm in the middle of something." },
      {
        speaker: VEY,
        text: "And that is the last of us, for this year. Eat, all of you. Lessons begin in the morning, whatever the Lamp says about the hour.",
      },
      {
        text: "The cheering is the real kind this time. When you look back at the dais the Lamp's flame has gone low and gold, and it is - there is no other word for it - smug.",
      },
    ],
  },

  act1_close: {
    id: "act1_close",
    lines: [
      {
        text: "That night you cannot sleep, so you do what new students have always done at Korvana: you go and sit on the steps and look at the grounds, which do not end.",
      },
      {
        text: "Out on the dark grass, here and there, are points of pale light. Not fireflies. They do not move. Every one of them, if you watch long enough, is very slightly leaning north.",
      },
      {
        speaker: CORVIN,
        text: "There are more every week. Nobody else counts them. I count them. Last term it was nine a night. Tonight it is forty-one.",
      },
      {
        speaker: CORVIN,
        text: "The answer is in the Restricted Section. It has to be. And Fennick will not let a third-year past the door, because of what happened with - because of the last one.",
      },
      {
        speaker: CORVIN,
        text: "But he might let you. You're new. You haven't had time to disappoint him yet.",
      },
    ],
    onEnd: { setFlag: "act1_complete", cutscene: "act2_open" },
  },

  // =============================================================== Act II

  act2_open: {
    id: "act2_open",
    act: { number: 2, title: "The Undercroft" },
    lines: [
      {
        text: "The Library of Korvana occupies the whole of the east wing, and parts of several wings that are not, strictly, there.",
      },
      {
        text: "At the far end, behind a desk like a barricade, sits a man who has not been surprised by anything since before you were born and resents the possibility that you might change that.",
      },
      {
        text: "Behind him is a door of black oak with no handle. Under the door, very faintly, there is a draught that smells of river water.",
      },
    ],
    onEnd: { setFlag: "act2_started", lore: "the_restricted_section" },
  },

  shelf_opens: {
    id: "shelf_opens",
    lines: [
      {
        text: "The last page of the Vigil is a single word. You read it under your breath, and somewhere behind you in the Restricted Section, a shelf of very old books sighs and swings inward.",
      },
      {
        text: "Beyond it a stair goes down. The air that comes up it is cold and wet and two hundred years old, and on it, very faint, someone is singing the same four notes over and over.",
      },
      {
        speaker: FENNICK,
        text: "I heard that. I hear everything in here; it is the principal burden of the post. ... Take a lamp. Take two. And Wren - whatever is singing, it was a librarian once. Be civil.",
      },
    ],
    onEnd: { lore: "undercroft" },
  },

  floodgates_open: {
    id: "floodgates_open",
    lines: [
      {
        text: "Somewhere deep in the stone a gate that has not moved in two centuries grinds, catches, and gives. The water begins, very slowly, to go down.",
      },
      {
        text: "As it goes, the galleries come up out of it: shelves of drowned books, a reading-desk, a chair with a cushion still on it, and steps cut down into the dark.",
      },
      {
        speaker: HOLLIS,
        text: "Oh. Oh, look at that. There's the lectern. I had quite forgotten the lectern. I used to read the evening office from that lectern, and I was very bad at it.",
      },
      {
        speaker: HOLLIS,
        text: "Go on down. She is at the bottom, where she asked to be. Mind the last step; I slipped on it in the year of the long frost and have never entirely got over it.",
      },
    ],
  },

  lantern_claimed: {
    id: "lantern_claimed",
    lines: [
      {
        text: "The Warden lies on a bier of plain stone with her hands folded around a lantern that is still - impossibly, after six hundred years - alight.",
      },
      {
        text: "When you lift it her hands do not resist. The flame turns, the way the Lamp's did, and looks at you, and then it looks at the walls.",
      },
      {
        text: "And the walls are written on. Everywhere. Glyphs in a pale light that was always there and that you could not see: notes, warnings, a tally of watches kept, and, low down by the door, a small drawing of a heron.",
      },
      {
        text: "Then the Lantern's flame leans hard, suddenly, towards the far end of the chamber - and there is someone there.",
      },
      {
        text: "A boy, older than you, in a coat too thin for the season, with his arms full of splinters of cold light. He has been scraping them out of the wall-niches where the Keepers left them. He looks up.",
      },
      {
        speaker: VALE,
        text: "Ah. She chose you, then. The Lamp. Of course she did; she always did like the ones who come anyway.",
      },
      {
        speaker: VALE,
        text: "Do not follow me. I mean that kindly. You will want to, and you should not, and I have not got time to be kind twice.",
      },
      {
        text: "He steps back into a shadow that the Lantern, for all its light, does not quite reach, and is gone. The splinters go with him.",
      },
      {
        speaker: HOLLIS,
        text: "That one has been down here before. Three times this season. He never says good evening. Take it to the Headmistress, child. Take it now.",
      },
    ],
    onEnd: { setFlag: "vale_glimpsed", lore: "wardens_lantern", startQuest: "the_splinter_thief" },
  },

  act2_close: {
    id: "act2_close",
    lines: [
      {
        text: "Long after you have left her study, the Headmistress's window is still lit.",
      },
      {
        text: "From the courtyard you can see her standing at it, quite still, with the Warden's Lantern on the sill beside her, looking north.",
      },
      {
        text: "In the Great Hall below, the Choosing Lamp has turned its flame to face the same way. It has never done that before, Amelia says. Nobody has ever seen it look at anything but the door.",
      },
    ],
    onEnd: { cutscene: "act3_open" },
  },

  // ============================================================== Act III

  act3_open: {
    id: "act3_open",
    act: { number: 3, title: "Relics of the Keepers" },
    lines: [
      {
        text: "Three instruments made the Lock: a Lantern to see it, a Key to turn it, and a Bell to still the thing on the other side while it was turned.",
      },
      {
        text: "One sits in the Headmistress's study, looking north. One is buried under a hill of roots in the deep forest. One hangs in a vault on the high moor, where a star came down.",
      },
      {
        text: "The forest road has been closed for longer than the Academy has kept records of closing it. This morning, for the first time in living memory, the gate at the end of it is standing open.",
      },
    ],
    onEnd: { toast: "The forest road is open. The Thornroot Barrow lies deep in the woods to the west." },
  },

  seren_intro: {
    id: "seren_intro",
    lines: [
      {
        text: "The Barrow is a long hill furred with roots as thick as your arm, and the roots are moving - slowly, the way a sleeper turns over.",
      },
      {
        text: "There is a rope already fixed at the mouth of it. A good rope, well knotted, recently used. Beside it, a pack, a lowland bedroll, and a small fire that someone has been very careful to keep small.",
      },
      {
        text: "And on a root beside the fire, eating an apple with every appearance of having been waiting for you, sits a woman in a climber's coat with an Emberhart scarf gone grey with washing.",
      },
      {
        speaker: SEREN,
        text: "You're late, first-year. The roots have been showing off for an hour. Come and sit down before they get ideas.",
      },
    ],
  },

  roots_part: {
    id: "roots_part",
    lines: [
      {
        text: "The Thornroot unknots itself one coil at a time, grudgingly, like an old man letting go of an argument. Beneath it a passage goes down into the heart of the hill.",
      },
      { requiresFlag: "seren_ally", speaker: SEREN, text: "Look at that. Nine years I've been cutting my way into places. Never occurred to me to ask nicely." },
      { requiresFlag: "seren_rival", speaker: SEREN, text: "Thank you, first-year. Very kind of you to open the door. I'll be sure to wave from the bottom." },
      { requiresFlag: "seren_rival", text: "Something on a rope goes past you down the passage, very fast, and laughing." },
      {
        text: "From far below comes a sound like a lock being tried - one ward, then the next, then the next, nine times over, patiently, by someone who has all the time in the world.",
      },
    ],
  },

  key_claimed: {
    id: "key_claimed",
    lines: [
      {
        text: "The Keymaker sits upright in the heart of the hill, wrapped in roots that have grown through his chair and around his shoulders like an old coat.",
      },
      {
        text: "The Key is in his lap: nine rings nested one inside another, each cut differently, each turning on its own. When you lift it, every one of them turns at once and settles, and the hill gives a long, contented creak.",
      },
      { requiresFlag: "seren_ally", speaker: SEREN, text: "That's it, then. One down. Two, counting the one Vey's sitting on. ... Go on, put it away. I'm not going to look at it. I'm looking. But I'm not going to." },
      { requiresFlag: "seren_rival", text: "There is a scramble of boots in the passage behind you, and Seren arrives, breathing hard, just in time to see the Key go into your satchel." },
      { requiresFlag: "seren_rival", speaker: SEREN, text: "Oh, that's - fine. That's fine. The roots took me the long way round. They do that to people they don't like, apparently. Enjoy it while you've got it, first-year." },
      { requiresNotFlag: ["seren_ally", "seren_rival"], text: "Up at the barrow mouth, the stranger's fire has gone out, and her rope is gone. Whoever she was, she has seen enough." },
      {
        text: "As you climb back to the surface you could swear that, behind you, the Keymaker's hands have moved - very slightly - into the shape of someone who has finally been allowed to put something down.",
      },
    ],
    onEnd: { lore: "thornroot_barrow" },
  },

  reliquary_threshold: {
    id: "reliquary_threshold",
    lines: [
      {
        text: "The Skyfall Reliquary is cut into the lip of a crater on the high moor, where the heather grows in rings and the wind never quite stops.",
      },
      {
        text: "Its doors are open. Beyond them is a long gallery hung with bells - hundreds of them, of every size, all perfectly still, though the wind is blowing straight in.",
      },
      { requiresFlag: "seren_ally", speaker: SEREN, text: "Every bell's got a note and there's a right order. Get it wrong and I'm told the gallery starts ringing you. Personally. Until you stop." },
      { requiresFlag: "seren_rival", speaker: SEREN, text: "Don't mind me, first-year. I'm just going to sit here and watch you work it out. I've tried it twice. My ears are still ringing." },
      {
        text: "Somewhere in the depths of the vault there is a place where the bells stop, and a silence begins that is not just the absence of sound. It is a thing in its own right, and it is waiting.",
      },
    ],
    onEnd: { lore: "skyfall_reliquary" },
  },

  bell_claimed: {
    id: "bell_claimed",
    lines: [
      {
        text: "The Silent Bell is smaller than you expected - a cup of black iron with no tongue, hung from a cradle of star-metal over the bottom of the crater.",
      },
      {
        text: "When you lift it, every bell in the Reliquary rings at once. Then every one of them stops, in the same instant, and the silence comes down like a held breath.",
      },
      {
        text: "And then the floor moves. Dust falls from the vault in long sheets. Somewhere above, very large stones begin, politely and without hurry, to fall.",
      },
      { requiresFlag: "seren_ally", speaker: SEREN, text: "Built to be robbed once. She meant it. RUN, first-year!" },
      { requiresFlag: "seren_rival", speaker: SEREN, text: "Oh, you absolute - RUN!" },
      { requiresNotFlag: ["seren_ally", "seren_rival"], text: "There is no one to tell you to run. You run anyway." },
    ],
  },

  reliquary_escaped: {
    id: "reliquary_escaped",
    lines: [
      {
        text: "You come out of the Reliquary doors at a dead run with the moor tilting under you, and behind you the whole vault folds in on itself like a letter being closed.",
      },
      { requiresFlag: "seren_ally", text: "The last thing through the doors is Seren, who went back - you saw her go back - for the rope she had fixed across the crater, so you would have something to hold." },
      { requiresFlag: "seren_ally", speaker: SEREN, text: "Don't. Don't say anything. My brother did that for me once. I've been waiting eight years to pass it on." },
      { requiresFlag: "seren_rival", text: "Seren is already outside, sitting on the steps, watching the dust come up. She does not look as though she ran. She looks as though she has been waiting." },
      { requiresFlag: "seren_rival", speaker: SEREN, text: "That's three, then. Lantern, Key, Bell. And all of them in one satchel, on one first-year, on one very empty mountain." },
      {
        text: "When the dust settles there is no vault. There is a crater, and heather in rings, and the wind, and in your hands a small black bell that is perfectly, enormously silent.",
      },
    ],
  },

  act3_close: {
    id: "act3_close",
    lines: [
      {
        speaker: ALDEN,
        text: "Put them on the desk. No - all of them. I want to see them together. I have wanted to see them together since I was younger than you.",
      },
      {
        speaker: ALDEN,
        text: "Do you know, I have taught Divination for twenty-six years and I have predicted exactly two things correctly. One was that it would rain at my wedding.",
      },
      {
        speaker: ALDEN,
        text: "The other was that one day a student would put these three on my desk and I would have to send them north. I have been dreading it with great precision for a very long time.",
      },
    ],
    onEnd: { startQuest: "the_north_road" },
  },

  // =============================================================== Act IV

  act4_open: {
    id: "act4_open",
    act: { number: 4, title: "The Scar" },
    lines: [
      {
        speaker: ALDEN,
        text: "You will hear that the grounds are endless. That is our official position, and I would like you to hold to it in front of the first-years.",
      },
      {
        speaker: ALDEN,
        text: "Between us: the first survey walked north for six months and came back to this hall. They did not turn round. They were walking north the entire time.",
      },
      {
        speaker: ALDEN,
        text: "So the grounds are not endless. They are merely very good at closing. And now you know who closes them, and how, and what happens when nobody is left to do it.",
      },
      {
        speaker: ALDEN,
        text: "Take the road the waystone points down and do not leave it. Eight years ago I sent two students up it. One came back. I would very much like the number to be better this time.",
      },
    ],
    onEnd: { lore: "the_first_survey" },
  },

  waystone_reached: {
    id: "waystone_reached",
    lines: [
      {
        text: "The North Waystone is a ring of standing stones around a light that has burned for longer than the Academy has stood. Someone has been keeping it lit.",
      },
      {
        text: "In the Lantern's light the stones are written on: a long column of names, each in a different hand, each with a date beside it. The last is eight years old. TOBIN ASHDOWN. And under it, in the same hand: S. WENT HOME. GOOD.",
      },
      {
        text: "Past the ring the road goes on north, and the light changes. The grass beside it is greyer than it should be. The wind smells of nothing at all.",
      },
    ],
  },

  scar_crossing: {
    id: "scar_crossing",
    lines: [
      {
        text: "The waystone's hum stops about two hundred paces behind you, which is the first warning.",
      },
      {
        text: "The second warning is the ground. Grass, then gravel, then a band of pale ash a mile wide, and past the ash a sky that has been drained of its colour.",
      },
      {
        text: "Nothing grows here. Under the ash the old ground is still there, intact, unmarked, and entirely dead, as though the life had been lifted off it like a cloth.",
      },
      {
        text: "Somewhere out in the middle of it, someone has built a fire. It is the only thing moving.",
      },
    ],
    onEnd: { lore: "the_scar" },
  },

  ilse_meeting: {
    id: "ilse_meeting",
    lines: [
      {
        text: "The fire is ringed by nine tents. Eight of them are empty, their flaps tied back, their bedding aired and folded with military care.",
      },
      {
        text: "On a post by the fire hangs a rota with nine columns. Eight have been struck through. Beside one of the struck names, a grey stone token on a cord is turning slowly in the wind.",
      },
      {
        text: "The woman by the fire is younger than her hair. She does not get up. She looks at the Lantern on your belt, and then at the Key, and then at the Bell, and closes her eyes as if someone had finally answered a letter.",
      },
      {
        speaker: ILSE,
        text: "You are the first person to walk in here in four years who was not already dead or already him. Sit. Do not touch the rota. Tell me who sent you, and then tell me why it took so long.",
      },
    ],
  },

  // ================================================================ Act V

  act5_open: {
    id: "act5_open",
    act: { number: 5, title: "The Hollow Choir" },
    lines: [
      {
        speaker: ILSE,
        text: "That is Vale, down there. He was good - better than me at the reading, which is why he is the one at the bottom and I am the one at the top.",
      },
      {
        speaker: ILSE,
        text: "He has decided the well was always going to break, so there is no harm in helping it. That is a real argument. It is also, for him, not really the argument at all.",
      },
      { requiresFlag: "vale_heard", speaker: ILSE, text: "You know that already. You listened to him. I can see it on you. That is either going to save him or break your heart, and possibly both." },
      {
        speaker: ILSE,
        text: "I cannot go down. Somebody has to stand in the doorway, and it is now a job for one. Go and be the second.",
      },
      {
        speaker: ILSE,
        text: "When it starts singing, do not answer it. That is the whole of the technique. And Wren - whatever you decide down there, decide it. Do not let the well decide for you.",
      },
    ],
  },

  wellhead_arrival: {
    id: "wellhead_arrival",
    branches: [{ id: "wellhead_arrival_seren", requiresAnyFlag: ["seren_ally", "seren_rival"] }],
    lines: [
      {
        text: "The Wellhead is a ring of grey stone in the floor of the Scar, and the light coming up out of it is the colour of a sky with no sun in it.",
      },
      {
        text: "The singing is louder here. It has words, nearly. It has nine voices, nearly. Kneeling at the lip of the well with his hands full of splinters is Vale, and he is singing along.",
      },
    ],
  },

  wellhead_arrival_seren: {
    id: "wellhead_arrival_seren",
    lines: [
      {
        text: "The Wellhead is a ring of grey stone in the floor of the Scar, and the light coming up out of it is the colour of a sky with no sun in it.",
      },
      {
        text: "The singing is louder here. It has words, nearly. It has nine voices, nearly. Kneeling at the lip of the well with his hands full of splinters is Vale, and he is singing along.",
      },
      { requiresFlag: "seren_ally", text: "Boots on the stone behind you. Seren, with her rope over her shoulder and her jaw set, has followed you down after all." },
      { requiresFlag: "seren_ally", speaker: SEREN, text: "You didn't think I'd let you do the last bit on your own? Tobin would never let me hear the end of it. Wherever he is." },
      { requiresFlag: "seren_rival", text: "And on the far side of the ring, sitting on the stones as if she had been there all night, is Seren Ashdown." },
      { requiresFlag: ["seren_rival", "seren_has_bell"], speaker: SEREN, text: "Evening, first-year. Don't mind me. I've brought my own bell." },
      { requiresFlag: "seren_rival", requiresNotFlag: "seren_has_bell", speaker: SEREN, text: "Evening, first-year. Go on, then. Save the world. I'm just here to see what it costs, and who pays." },
    ],
    onEnd: { setFlag: "seren_at_wellhead" },
  },

  vale_phase2: {
    id: "vale_phase2",
    branches: [{ id: "vale_phase2_aided", requiresFlag: "seren_ally" }],
    lines: [
      {
        speaker: VALE,
        text: "No. No, you do not get to stop it now. Not now, when I can nearly hear her.",
      },
      {
        text: "He opens his hands, and every splinter he has ever carried comes up out of the well at once, and with them the singing - nine voices, near enough to touch, wrapping round him like a coat.",
      },
      { requiresFlag: "vale_heard", speaker: VALE, text: "You heard me. You did. So you know what this is. Help me or get out of the way, but do not pretend you do not understand." },
      { requiresNotFlag: "vale_heard", speaker: VALE, text: "You never even asked why. Nobody ever asks why. Listen, then. Listen to them." },
    ],
    onEnd: { restore: true, battle: "vale_choir" },
  },

  vale_phase2_aided: {
    id: "vale_phase2_aided",
    lines: [
      {
        speaker: VALE,
        text: "No. No, you do not get to stop it now. Not now, when I can nearly hear her.",
      },
      {
        text: "He opens his hands, and every splinter he has ever carried comes up out of the well at once, and with them the singing - nine voices, near enough to touch, wrapping round him like a coat.",
      },
      { speaker: SEREN, text: "Right. Big lad, lot of voices. I'll take the left half of the choir. You take the right half and the boy." },
      { speaker: SEREN, text: "And first-year? There's someone in that choir who taught me to tie a knot. If you hear him, tell him I'm here." },
    ],
    onEnd: { restore: true, battle: "vale_choir_aided" },
  },

  vale_fallen: {
    id: "vale_fallen",
    lines: [
      {
        text: "The choir breaks off mid-note. In the silence that follows you can hear the ash settling, and Vale breathing, and very far down the well, one voice, alone, finishing the verse.",
      },
      {
        text: "Vale lies at the lip of the well with his hand hanging over the edge, reaching down. He is not fighting any more. He is listening.",
      },
      {
        text: "The Ninefold Key is heavy in your satchel. The nine-sided keyhole in the Wellhead stone is waiting for it. What happens next is up to you.",
      },
    ],
  },

  // ---------------------------------------------------------- the endings

  ending_redeemed: {
    id: "ending_redeemed",
    lines: [
      {
        text: "You hold up the Warden's Lantern over the well, and for the first time Vale sees what it shows: the strands of the Lock, nine of them, bright and frayed and holding.",
      },
      {
        text: "And in the strands, the Keepers. Not trapped. Not singing because they cannot stop. Holding, because they chose to, and still choosing - every one of them, every moment, for eleven years.",
      },
      { speaker: VALE, text: "Mother." },
      { speaker: VALE, text: "She is not caught. She is keeping it. She has been keeping it this whole time, and I have been trying to take it away from her." },
      { requiresItem: "silent_bell", text: "You ring the Silent Bell - not at him, but for them. The silence goes down the well like a hand on a shoulder, and the choir, at last, at long last, is allowed to stop." },
      { requiresItem: "silent_bell", requiresFlag: "choir_freed", text: "Nine strands go dark, gently, one by one. Something in the well sighs, the way a house sighs when everyone has finally come home." },
      { requiresNotItem: "silent_bell", text: "The choir sings on, but differently: softer, slower, the watch-song sung by people who know that someone has finally come to relieve them." },
      { text: "Vale takes the Ninefold Key from your hand, and turns it in the Wellhead stone himself, nine wards, one after another, and sets the Lock." },
      { speaker: VALE, text: "I will take the first watch. Not for ever. For a season. And then someone else will, and then someone else. That is what she would have wanted. That is what I wanted, before I forgot." },
      { requiresFlag: "seren_ally", speaker: SEREN, text: "Second watch is mine. Tobin kept it. I can keep it. Somebody write it on the rota before I change my mind." },
      { requiresFlag: "seren_rival", speaker: SEREN, text: "...Fine. Put me down for a season. Don't look at me like that. It's good money, keeping the world shut. Probably." },
      { speaker: ILSE, text: "I am going to sleep. For about a week. Wake me if the world ends, and not otherwise." },
    ],
    onEnd: { lore: "the_new_watch", cutscene: "epilogue" },
  },

  ending_bound: {
    id: "ending_bound",
    lines: [
      { requiresNotFlag: "seren_rang_bell", text: "You lift the Silent Bell, and Vale sees what it is, and what it is for, and he does not run." },
      { requiresFlag: "seren_rang_bell", text: "Seren lifts the Silent Bell before you can stop her, and Vale sees what it is, and what it is for, and he does not run." },
      { speaker: VALE, text: "The last clause. Of course. A Keeper who never needs relieving. It is very elegant. I would have admired it, in a book." },
      { text: "The Bell makes no sound. The silence goes out from it like a ripple on still water and reaches him, and stops him - not as a blow, but as a word, spoken once and meant for ever." },
      { text: "Vale stands at the Wellhead, very straight, very still, attentive. The strands of the Lock pull taut around him. The choir falls quiet, one voice after another, until there is only him, holding." },
      { requiresFlag: "seren_rang_bell", speaker: SEREN, text: "There. Done. Nobody else has to stand in a hole for the rest of their life. Just him." },
      { requiresFlag: "seren_rang_bell", speaker: SEREN, text: "...I thought that would feel better than it does." },
      { requiresFlag: "seren_ally", speaker: SEREN, text: "It's what my brother would have done, if he'd been allowed. Doesn't make it right. Doesn't make it wrong. Just makes it done." },
      { speaker: ILSE, text: "The Lock has one Keeper, then. And it will not need another. I could go home." },
      { speaker: ILSE, text: "I think I will stay a while. Somebody ought to talk to him. He always liked to be argued with." },
    ],
    onEnd: { lore: "the_bound_keeper", cutscene: "epilogue" },
  },

  ending_defeated: {
    id: "ending_defeated",
    lines: [
      { text: "You fit the Ninefold Key into the Wellhead stone. Nine wards, one after another, and every one of them gives the click a good lock gives when it is right." },
      { text: "Vale lifts his head at the sound. For a moment he looks at you as if he is about to ask a second question. Then the lip of the well gives way beneath his reaching hand, and he goes down into the light without a sound." },
      { text: "The light coming up the well goes pale, then dim, then stops coming up at all. It does not feel like a victory. It feels like a door being shut carefully, by someone who intends to keep checking it." },
      { speaker: ILSE, text: "The Key has turned. The Lock is set. It will hold, now, for as long as someone sits here and remembers that it is locked." },
      { requiresFlag: "seren_ally", speaker: SEREN, text: "Then two of us will sit here. Don't argue, Keeper. I've had eight years of practice at not going home." },
      { requiresFlag: "seren_rival", speaker: SEREN, text: "Well. That's the end of that." },
      { requiresFlag: "seren_took_key", text: "When you look round, the Ninefold Key is no longer in the Wellhead stone, and Seren Ashdown is a small figure walking very fast towards the south." },
      { requiresFlag: "seren_took_key", speaker: ILSE, text: "Let her go. The Lock is set; the Key has done its work. A key is only a promise that someone will come back. Perhaps she will." },
      { speaker: ILSE, text: "Go home. I will keep the watch. I am very good at it, and I have stopped wanting anything else." },
    ],
    onEnd: { lore: "the_quiet_well", cutscene: "epilogue" },
  },

  // ----------------------------------------------------------- epilogue

  epilogue: {
    id: "epilogue",
    act: { number: 5, title: "Epilogue" },
    lines: [
      { text: "Spring comes to Korvana late that year, and all at once." },

      { requiresFlag: "ending_redeemed", text: "The Lamp's letters go out by the hundred now, and they say plainly what they are asking: a season at the Wellhead, and then home. Many more people say yes than anyone expected." },
      { requiresFlag: "ending_redeemed", speaker: VEY, text: "I have rewritten the rota. My name is on it, third. Fennick has asked to be fourth so that he can reorganise the Keepers' camp library, which he describes as a disgrace." },
      { requiresFlag: "ending_bound", text: "In the north, a tenth figure stands at the Wellhead, still and attentive and reading aloud from memory. The splinters have stopped. The Scar has stopped growing. Nobody at Korvana talks about why." },
      { requiresFlag: "ending_bound", speaker: VEY, text: "I read the Accord's last clause every night now, before I sleep. I would like to be able to say that I have made my peace with it. I am a Stillwater, and I am still waiting to." },
      { requiresFlag: "ending_defeated", text: "In the north the well is quiet, and the Keeper keeps her watch, and at the southern edge of the Scar a little grass has come up through the ash." },
      { requiresFlag: "ending_defeated", speaker: VEY, text: "I am going north at midsummer, to stand a season beside her. It is twelve years late. She will tell me so, at length, and I intend to let her." },

      { requiresFlag: ["ending_redeemed", "seren_ally"], text: "Seren Ashdown keeps the second watch, with her brother's token round her neck. She has fixed a rope across the Wellhead, she says, so that the next one has something to hold." },
      { requiresFlag: ["ending_defeated", "seren_ally"], text: "Seren Ashdown stays in the Scar with Ilse. They argue about everything. Ilse says it is the best company she has had in four years, and Seren says that is a very low bar." },
      { requiresFlag: ["ending_bound", "seren_ally"], text: "Seren Ashdown walks south in the spring, and then, a month later, north again. She cannot quite say why. She leaves an apple at the Wellhead every time she passes." },
      { requiresFlag: "seren_took_key", text: "A nine-ringed key is offered for sale in the auction rooms of a lowland city, and withdrawn the night before, by its owner, without explanation. Nobody knows where she took it." },
      { requiresFlag: "seren_rang_bell", text: "Seren Ashdown does not come back to the Academy. But Ilse writes that once a month a woman in a climber's coat sits beside the still figure at the Wellhead for an hour, says nothing at all, and leaves an apple." },
      { requiresFlag: "seren_rival", requiresNotFlag: ["seren_took_key", "seren_rang_bell"], text: "A postcard arrives at the Academy, addressed to 'The First-Year', with a lowland stamp. It says only: 'Still not lucky. Still walking north. S.'" },

      { requiresFlag: "hollis_released", text: "The Undercroft is quiet now. Students who go down the stair on a dare say the water is gone and the galleries are dry, and that the air smells, of all things, of fresh bread." },
      { requiresFlag: "hollis_stays", text: "In the Undercroft, Brother Hollis has started cataloguing again. He has asked for ink. Fennick has sent him some, with a note about the fines." },

      { requiresFlag: "pages_done", speaker: FENNICK, text: "The Commonplace Book of the Nine is on the open shelves. I have waived the fine. It was six hundred years overdue, and I have decided, on reflection, that this was not their fault." },
      { requiresNotFlag: "pages_done", speaker: FENNICK, text: "Several pages of the Keepers' commonplace book remain at large. I mention it only because I mention everything that is overdue." },

      { requiresFlag: "corvin_home", speaker: CORVIN, text: "I'm writing a paper. About the splinters, and the Lock, and him. Mostly him. Somebody ought to write down what he got right, so that the next one does not have to work it all out alone in the dark." },
      { requiresNotFlag: "corvin_home", text: "Corvin comes back from the treeline in the end, on his own, and does not talk about what he was told there. He counts the splinters every night. There are none. He keeps counting." },

      { requiresFlag: "owl_done", speaker: AMELIA, text: "I've been made prefect. Nobody can work out why, least of all me. Pip has taken to sleeping on my badge, which I think is a comment." },
      { requiresNotFlag: "owl_done", speaker: AMELIA, text: "Pip came home in the end, on her own, three weeks late and extremely pleased with herself. I am still furious. I expect to be furious for years." },

      { speaker: WICK, text: "I have planted ashbloom along the edge of the Scar. Somebody told me once that nothing would grow up there. I would like to prove her wrong, in person, to her face." },
      { speaker: ALDEN, text: "I have added a third entry to the RIGHT column on my wall. It says: 'Sent a student north. Got them back.' It is in very large letters. I am not ashamed." },

      { requiresHouse: "emberhart", text: "In the Emberhart common room they tell the story loudly and badly and all at once, and you come out of it as tall as the stag on the banner." },
      { requiresHouse: "thornwick", text: "In the Thornwick common room somebody has planted a briar in a pot with your name on the label. It is doing remarkably well. They water it every Thursday." },
      { requiresHouse: "ravelle", text: "The riddle on the Ravelle common room door has changed. The answer, the first-years whisper, is your name." },
      { requiresHouse: "stillwater", text: "In the Stillwater common room nobody says anything about it at all, which is how you know it is the highest honour they have." },

      { speaker: LAMP, text: "Well. That will do. That will more than do. Now, if you will excuse me, I have letters to write." },
      { text: "And somewhere far to the south, someone opens a letter they do not remember asking for, in a round and careful hand. It says: come north. You will be expected. Come anyway." },
    ],
    onEnd: { toast: "You have finished the story. Korvana keeps going - wander, and see who has something to say." },
  },

  alden_epilogue: {
    id: "alden_epilogue",
    lines: [
      {
        speaker: ALDEN,
        text: "You have been gone a season. I did not send anyone after you, and I would like you to know that was a decision and not an oversight.",
      },
      {
        speaker: ALDEN,
        text: "The splinters have stopped coming up in the grass. Corvin has taken the news badly and is writing a paper about it.",
      },
      {
        speaker: ALDEN,
        text: "Korvana has no edge, which we both now know is a lie, and it is a lie I intend to keep telling to first-years for as long as they let me. Some lies are load-bearing.",
      },
      {
        text: "The grounds go on further than anyone has mapped. Somewhere north, a light stays lit, and someone very patient does not move.",
      },
    ],
  },
};

/** Whether a line or branch carries any condition at all. */
function conditional(c: Conditions): boolean {
  for (const key in c) if (key.startsWith("requires")) return true;
  return false;
}

/**
 * Picks the cutscene that should actually play for `id` - following branches
 * and dropping lines whose conditions fail - and returns its id.
 *
 * A filtered cutscene is cached under a derived id (`name~1101...`), so the
 * playback system, which looks cutscenes up by id, never needs to know that
 * lines can be conditional. Returns null for an unknown id.
 */
export function resolveCutscene(id: string, check: (c: Conditions) => boolean): string | null {
  let def = CUTSCENES[id];
  if (!def) {
    console.warn(`Unknown cutscene "${id}"`);
    return null;
  }

  for (let hops = 0; hops < 8 && def.branches; hops++) {
    const branch: CutsceneBranch | undefined = def.branches.find((b) => CUTSCENES[b.id] && check(b));
    const next: CutsceneDef | undefined = branch ? CUTSCENES[branch.id] : undefined;
    if (!next || next === def) break;
    def = next;
  }

  const keep = def.lines.map((line) => !conditional(line) || check(line));
  if (keep.every(Boolean)) return def.id;

  const key = `${def.id}~${keep.map((k) => (k ? "1" : "0")).join("")}`;
  if (!CUTSCENES[key]) {
    const source = def;
    CUTSCENES[key] = { ...source, id: key, branches: undefined, lines: source.lines.filter((_, i) => keep[i]) };
  }
  return key;
}

export function cutsceneById(id: string): CutsceneDef | undefined {
  return CUTSCENES[id];
}
