/**
 * The journal.
 *
 * Entries unlock as the player discovers things and are kept forever, so the
 * story survives being put down for a week. `act` only controls the order they
 * are listed in. Bodies are kept under about 850 characters so they fit the
 * journal's detail pane without scrolling.
 */
export interface LoreEntry {
  id: string;
  title: string;
  act: number;
  body: string;
}

export const LORE: Record<string, LoreEntry> = {
  // ================================================================ Act I

  korvana: {
    id: "korvana",
    title: "Korvana",
    act: 1,
    body: "The Academy of the Old Workings stands at the edge of the Endless Grounds, which go on further than anyone has mapped and do not repeat. Every survey sent out comes back with a different answer, which the faculty has agreed to describe as 'encouraging'. There is one hall, a handful of tutors, a varying number of students, and no edge. There is no edge that anyone has walked to.",
  },
  the_great_hall: {
    id: "the_great_hall",
    title: "The Great Hall",
    act: 1,
    body: "Older than the rest of the Academy by a century, and built for a purpose nobody now admits to. Four long tables, one per House; a dais; a ceiling painted with a night sky that does not match the one outside, and is said by Professor Alden to be the more accurate of the two. On the dais, on an iron hook worn bright by six hundred years of nothing happening to it, hangs the Choosing Lamp.",
  },
  the_choosing_lamp: {
    id: "the_choosing_lamp",
    title: "The Choosing Lamp",
    act: 1,
    body: "A lantern of black iron and old glass, lit before the Academy was built and never once put out. It speaks - at length - and sorts each new student into a House by asking them questions and listening to more than the answers. Students are told it writes the acceptance letters itself. Students are told a great many things. It has opinions about candles, which it regards as a lower order of being, and about every Headmaster it has outlived, which is all of them.",
  },
  the_houses: {
    id: "the_houses",
    title: "The Four Houses",
    act: 1,
    body: "Emberhart, for courage and candour: the stag with a burning crown. Thornwick, for loyalty and growing things: the briar wreath. Ravelle, for curiosity and cunning: the raven with a key. Stillwater, for patience and wisdom: the heron. Each House is named for a founder, and each founder, the Academy's histories say, was one of the Nine Keepers - a detail the histories mention once, on page four hundred, and never again.",
  },
  house_emberhart: {
    id: "house_emberhart",
    title: "House Emberhart",
    act: 1,
    body: "Founded by Aldis Emberhart, a smith who walked into a burning hall for a child he did not know and walked out carrying two. The House motto is 'Go first, and say so.' Emberharts are brave, frank, loud, and nearly always the first to arrive and the last to be told why. Their common room is the warmest in the Academy and the hardest to have a quiet thought in. They forgive quickly and argue about it afterwards. Amelia is an Emberhart, and would like you to know.",
  },
  house_thornwick: {
    id: "house_thornwick",
    title: "House Thornwick",
    act: 1,
    body: "Founded by Brannoch Thornwick, a gardener who grew a hedge-wall around a village in a single night and then stayed forty years to keep it trimmed. The motto is 'Stay. Tend. Hold.' Thornwicks are loyal past the point of sense, patient with anything that grows, and impossible to talk out of a friendship. Their common room is half greenhouse. Mistress Wick was a Thornwick, and still waters the founder's portrait every Thursday, because nobody has ever told her not to.",
  },
  house_ravelle: {
    id: "house_ravelle",
    title: "House Ravelle",
    act: 1,
    body: "Founded by Isolde Ravelle, a thief who stole the first lock ever made in order to find out how it worked, then returned it improved. The motto is 'Ask the second question.' Ravelles are curious, clever, and not as subtle as they think. Their common room has no door - only a riddle, which changes - and more than one Ravelle has spent a night in the corridor. Corvin is a Ravelle. So, the Lamp remarks without being asked, was Vale.",
  },
  house_stillwater: {
    id: "house_stillwater",
    title: "House Stillwater",
    act: 1,
    body: "Founded by Mother Hesper Stillwater, who is said to have stood at the edge of a lake for forty days to learn what the heron knew, and come back with nothing to say about it. The motto is 'Wait. Then wait a little more.' Stillwaters are patient, watchful, kind in a way that takes a while to notice, and very hard to surprise. Their common room overlooks the moat and is nearly silent. Headmistress Vey was a Stillwater. Master Fennick still is.",
  },
  divination: {
    id: "divination",
    title: "Alden on Divination",
    act: 1,
    body: "'Divination,' says Professor Alden, 'is the rigorous study of how often we are wrong, and in which direction.' He does not teach students to read the future. He teaches them to read the present carefully enough that the future stops being a surprise. He keeps a tally on the classroom wall of every prediction he has made. The column headed WRONG is very long. The column headed RIGHT has two entries, and he will not discuss either of them.",
  },
  wards: {
    id: "wards",
    title: "A Primer on Wards",
    act: 1,
    body: "A ward is not a wall. It is an argument with the world about where you end, held for as long as you can keep making it. Mistress Wick's Primer says this on page one and then spends two hundred pages on posture. The margin of the Academy's copy is annotated by a former student, I., in a small fierce hand: 'Hold it longer than you think you can. Then you will know how long you can.'",
  },
  treeline: {
    id: "treeline",
    title: "The Treeline",
    act: 1,
    body: "The forest begins where the mown grass stops, without any thinning in between, as though the trees were waiting for a signal. Students are told the treeline is where the grounds stop being the grounds. It is not a rule anyone has tested past about a mile. Owls roost there in great numbers, and at least one of them does so purely to be difficult.",
  },
  splinters: {
    id: "splinters",
    title: "Moonwell Splinters",
    act: 1,
    body: "Shards of cold light, no bigger than a finger joint, turning up in the grass as far south as the arrival grounds. They do not melt and do not reflect anything that is there. Corvin's discovery: every splinter, held loosely, turns to point north, like iron filings near a magnet. They are slightly warm on the side that points. Nothing about the Moonwell should be warm.",
  },

  // =============================================================== Act II

  the_restricted_section: {
    id: "the_restricted_section",
    title: "The Restricted Section",
    act: 2,
    body: "A long gallery behind a door of black oak and a librarian of similar construction. Master Fennick issues passes to students who have earned them, by a standard he refuses to write down. He has issued four in thirty-one years. The last went to Vale. The books inside are not dangerous in themselves; they are dangerous in the way that a very clear map of a cliff edge is dangerous to someone who has decided to jump.",
  },
  the_vigil: {
    id: "the_vigil",
    title: "The Vigil of the Nine",
    act: 2,
    body: "The Keepers' handbook for the watch - not the history, which they left to others, but the practice. How to sit. How to listen to the well without answering. How to sleep in shifts so that the Lock is never unattended for the length of a breath. Its first charm is Kindlesight, which shows what is hidden. Its last page is a single word, and the word is a key to a shelf in the Restricted Section that has been closed for two hundred years.",
  },
  the_nine_keepers: {
    id: "the_nine_keepers",
    title: "The Nine Keepers",
    act: 2,
    body: "Six hundred years ago, nine people sat down around the Moonwell and did not get up. Maudrey Lisle, the Warden, who lit the Lantern. Guthlac Orme, the Keymaker. Anwen of the Bells. Tamsin Fold, who drew the map that folds. Aldis Emberhart, Brannoch Thornwick, Isolde Ravelle and Hesper Stillwater, whose names the Houses carry. And the Ninth, whose name the Accord does not give, and who the Accord calls only 'the one who chose to keep choosing'.",
  },
  undercroft: {
    id: "undercroft",
    title: "The Undercroft",
    act: 2,
    body: "The crypt beneath the Academy, older than the hall above it, where the Warden was laid to rest with her Lantern. For four centuries its archivists kept the Keepers' records here in dry vaults. Two hundred and twelve years ago it was deliberately flooded, from the inside, by the last of them. The water has been very patient since. So has he.",
  },
  brother_hollis: {
    id: "brother_hollis",
    title: "Brother Hollis",
    act: 2,
    body: "Last archivist of the Undercroft. When Headmaster Corrigan Pell came down the stair with six students and a warrant to take the Warden's Lantern - to see, he said, the edges of the world and sell the maps - Hollis closed the floodgates behind him, opened the river-sluice in front, and sat down in the Warden's chamber to wait for the water. He sang to keep his nerve. He has not stopped. He would like it noted that the Lantern was never in any danger, and that he was.",
  },
  corrigan_pell: {
    id: "corrigan_pell",
    title: "Headmaster Corrigan Pell",
    act: 2,
    body: "Headmaster of Korvana two hundred and twelve years ago, and the only one whose portrait is turned to face the wall. Pell believed the Endless Grounds could be charted to their edge if only one could see the seams, and that a chart of the edge of the world would be worth a great deal to the lowland crowns. He was right on both counts, which is why Brother Hollis drowned the Undercroft rather than let him have the Lantern. Pell left the Academy the following spring. The Lamp has declined to discuss him for two centuries, which, for the Lamp, is a eulogy of sorts.",
  },
  wardens_lantern: {
    id: "wardens_lantern",
    title: "The Warden's Lantern",
    act: 2,
    body: "The first of the Keepers' instruments, lit by Maudrey Lisle from the light coming up the well, so that it burns with what the Moonwell holds back. By its light the seams of the Lock show - the places where the grounds fold back on themselves, the threads that hold the fold shut, the glyphs the Keepers wrote on walls for each other. The Choosing Lamp was lit from it. The two flames lean towards each other when they are in the same room.",
  },
  the_lock: {
    id: "the_lock",
    title: "The Lock",
    act: 2,
    body: "What the Headmistress told you, in the end: the Endless Grounds are not endless. Tamsin Fold drew them closed around the Moonwell, so that anything walking away from the well walks back to it, and whatever is on the other side can find no edge to come in by. The fold is held shut by attention. That is the whole of the secret. A lock is only a lock while someone remembers it is locked, and for six hundred years someone always has - nine at a time, at the Wellhead, in shifts, for the rest of their lives.",
  },
  the_withheld: {
    id: "the_withheld",
    title: "What Vey Withheld",
    act: 2,
    body: "For six centuries the Headmaster of Korvana chose, every twelfth year, a handful of graduates to go north and relieve the Keepers. Twelve years ago Orlaith Vey looked at the list, looked at the faces, and burned it. She meant to find another way - a Lock that did not cost a life apiece. A year later the Moonwell shattered for want of hands to hold it. She has not forgiven herself, and she has not, she says, changed her mind. Both of those are true. She would like you to understand how that is possible.",
  },

  // ============================================================== Act III

  thornroot_barrow: {
    id: "thornroot_barrow",
    title: "The Thornroot Barrow",
    act: 3,
    body: "A long hill in the deep forest that is not a hill. Guthlac Orme, the Keymaker, asked to be buried under living roots, so that his tomb would be locked by something that grew and could not be picked. The roots have had six hundred years to think about it. They let in, the stories say, those who come to take the Key back to the Lock. They are less specific about what happens to anyone else.",
  },
  ninefold_key: {
    id: "ninefold_key",
    title: "The Ninefold Key",
    act: 3,
    body: "Nine wards in one, nested like the rings of a tree, each cut by a different Keeper. It does not open a door. It opens the Keepers' seals - and, at the Wellhead, the Lock itself, to be turned the other way and set again. The Keymaker's note, cut into the bow: 'Every key is a promise that somebody will come back. Keep it.' It is heavier than it looks and gets heavier the further north it is carried.",
  },
  skyfall_reliquary: {
    id: "skyfall_reliquary",
    title: "The Skyfall Reliquary",
    act: 3,
    body: "A vault cut into the high moor where a star came down the year before the Accord. Anwen of the Bells cast the Silent Bell from its iron and built the Reliquary around the crater to hold it. She built it, by her own account, to be robbed exactly once: the bells in its galleries are a lock that only the Bell's rightful bearer will think to play, and the moment the Bell leaves its cradle the vault is designed to forget it was ever built.",
  },
  silent_bell: {
    id: "silent_bell",
    title: "The Silent Bell",
    act: 3,
    body: "A small bell of black star-iron with no tongue. Rung, it makes no sound; it makes silence, which spreads like a stone dropped into water and stills whatever it touches. Wraiths come apart in it. The well's song falters. The Accord's last clause, which nobody has read aloud in four hundred years, says what else it can do: that a person rung into silence at the Wellhead becomes part of the Lock - a strand held for ever, still and attentive, never needing to be relieved.",
  },
  seren_ashdown: {
    id: "seren_ashdown",
    title: "Seren Ashdown",
    act: 3,
    body: "Emberhart, the best climber the Academy ever expelled. Eight years ago Professor Alden sent her and her brother Tobin north to check the waystones; she came back alone and would not say why. A year later she broke the seal on the Undercroft stair, looking for a Lantern that would show her where he had gone. Fennick caught her at the water's edge. Vey expelled her the same night. She has been selling the Endless Grounds' oddities to lowland collectors ever since, and she has been, all that time, walking north.",
  },
  vales_notebook: {
    id: "vales_notebook",
    title: "Vale's Notebook",
    act: 3,
    body: "Vale's research, in a hand that gets smaller as it goes. The Keepers' records, cross-referenced. The rota of the watch for six hundred years. Every name; every age at which they went north; every age at which they stopped. 'The Lock is not a mechanism,' he writes. 'It is a congregation, and it has been praying without ceasing for six centuries, and the god it prays to is a door. When the well shattered, the nine on watch did not die. They are still singing. Listen.'",
  },

  // =============================================================== Act IV

  waystones: {
    id: "waystones",
    title: "The Waystones",
    act: 4,
    body: "Markers set down by the first survey, at intervals that are supposed to be regular. They are not regular, which the survey blamed on the ground moving rather than on the survey. Each is a ring of stone around a light that has burned for longer than the hall has stood. They were not set down by the survey at all, Alden admits: the survey found them already there, and lit by someone who had expected them.",
  },
  the_first_survey: {
    id: "the_first_survey",
    title: "The First Survey",
    act: 4,
    body: "Two hundred years ago a survey party walked north from the Academy for six months, keeping a careful log, and arrived back at the Academy from the south. They had not turned round. They had walked north the entire time. Their log is in the Restricted Section, and its last entry is a single line in the surveyor's own hand: 'We have been very thoroughly kept.'",
  },
  the_scar: {
    id: "the_scar",
    title: "The Moonwell Scar",
    act: 4,
    body: "A basin of ash in the north range, roughly a mile across, where the ground has been taken down to nothing and left that way. Nothing grows in it. The ash is not deep - you can see the old ground under it, intact and unmarked, as though the life had been lifted off rather than burned away. That is exactly what happened, eleven years ago, when the well shattered and something leaned in for the length of a breath.",
  },
  keepers: {
    id: "keepers",
    title: "Keeper's Rest",
    act: 4,
    body: "The Keepers' camp at the edge of the Scar: a ring of tents for nine, a fire, and a rota pinned to a post with nine columns, eight of them struck through. For four years Ilse has kept the watch from here alone, sleeping in the shifts the Vigil allows for nine, which is to say almost never. She has kept the tents pitched and the bedding aired. She would like it understood that this is discipline, not hope.",
  },
  tobin_ashdown: {
    id: "tobin_ashdown",
    title: "Tobin Ashdown",
    act: 4,
    body: "He reached the Scar eight years ago, met the Keepers, and stayed - because there were seven of them, and the Vigil says nine, and he could count. He sent his sister home with a lie about the waystones so that she would not stay too. Four years ago he went north with the others, along the seam of the fold, to find where it was tearing and stitch it. None of them came back. Ilse kept his token on the rota post, under his name, and turned it every morning so the stone would not fade on one side.",
  },
  hollow_choir: {
    id: "hollow_choir",
    title: "The Hollow Choir",
    act: 4,
    body: "Not a choir and not, properly, hollow. The name comes from the sound the wraiths make, which is close enough to singing that people write it down that way. They gather wherever the Moonwell has shed itself, and they carry the splinters back north. Ilse's opinion is that they are the Lock trying to mend itself without hands. Vale's opinion is that they are somebody's mother.",
  },
  wellhead: {
    id: "wellhead",
    title: "The Wellhead",
    act: 4,
    body: "The mouth of the Moonwell, ringed in stone that has been rebuilt more than once. The well goes down further than the deepest sounding the Keepers ever recorded, and the light coming up it is not the light going in. There is a keyhole in the ring, nine-sided, that nobody has turned in six hundred years. Ilse says it was never meant to be turned. Ilse says a number of things in the tone of someone who would like to be argued with.",
  },
  the_moonwell: {
    id: "the_moonwell",
    title: "The Moonwell",
    act: 4,
    body: "A well of cold light under the north range. It is not a well, does not hold water, and the light does not come from the moon - the moon was simply the first thing anyone compared it to, and the name stuck the way names do. It is the place where the world is thinnest, and something on the other side is pressed against it. It shattered eleven years ago. Every splinter is a piece of the attention that was holding it together.",
  },

  // ================================================================ Act V

  vale: {
    id: "vale",
    title: "Vale",
    act: 2,
    body: "Fourth-year, Ravelle, withdrawn mid-term and listed as left rather than lost. Raised at the Academy as the Headmistress's ward from the age of five, after his mother went north and did not come back. The finest reader of old texts Fennick ever passed. He took the view that a well which shatters is a well that was always going to, and that the Keepers were doing nothing so much as delaying an education. He has been at the Wellhead for a season. He has stopped answering to his own name, and started answering to hers.",
  },
  vale_research: {
    id: "vale_research",
    title: "Vale's Argument",
    act: 5,
    body: "Put fairly, because he would insist on it: that the Lock is a cruelty dressed as a duty; that nine people at a time have given up their lives to stand still for six hundred years; that when the well shattered, the nine on watch were not freed but caught in it, singing; that the thing beyond the door is not malicious, only large, and would pass over as weather passes; and that opening the well would end the fold, free the choir, and let the Endless Grounds be ordinary again. He is right about most of it. That is the trouble.",
  },
  hollow_choir_truth: {
    id: "hollow_choir_truth",
    title: "The Choir, Heard",
    act: 5,
    body: "Close to, in the Wellhead, the singing resolves into voices, and the voices into words, and the words into the Vigil's own litany: the watch-song the Keepers sang to stay awake. The nine who were on watch when the well shattered did not stop keeping it. They could not get up, and so they kept singing, and the wraiths are their song walking about in the ash collecting what was lost. It is the bravest thing you have ever heard, and it should have stopped years ago.",
  },
  the_long_dark: {
    id: "the_long_dark",
    title: "The Long Dark Between Stars",
    act: 5,
    body: "The Keepers' name for what the well holds back, which is not evil and not awake and has no interest in any of us. It is simply larger, and older, and on the other side of a door that was never meant to be opened, only ever kept shut. Where it leans, life is lifted off the ground the way a breath lifts dust. The Keepers do not fight it. They stand in the doorway and they do not move, for as long as it takes.",
  },
  edda: {
    id: "edda",
    title: "The Ninth Keeper",
    act: 5,
    body: "Her name was Edda. She was the youngest of the Nine and the only one who could not sit still, and when the others sat down around the well she asked the Warden for something else to do. 'Someone has to choose who comes next,' she said, 'and keep choosing, for as long as there is a next.' So Maudrey Lisle lit a lamp from the Lantern, and Edda went into it, and has been choosing ever since. She writes the letters. She wrote yours. She has been very tired for a very long time, and she would not trade it for anything.",
  },

  // ---------------------------------------------------------- the endings

  the_new_watch: {
    id: "the_new_watch",
    title: "The New Watch",
    act: 5,
    body: "The Lock holds, and it is held differently now. Not nine people for the rest of their lives, but many, for a season each: graduates and tutors and, once, to universal astonishment, a librarian, keeping the watch in shifts and coming home again. It was Vey's idea, twelve years late, and Vale's argument, and Ilse's discipline, and the Lamp's letters, which now go out in larger numbers and say plainly what they are asking. It is less elegant than the old Lock. It is a great deal kinder. The Lamp says that is usually the trade.",
  },
  the_bound_keeper: {
    id: "the_bound_keeper",
    title: "The Bound Keeper",
    act: 5,
    body: "There is a tenth figure at the Wellhead now, standing very still, attentive, not unhappy, not anything. The Lock no longer needs nine. It has him. Ilse could go home, and has not yet. Travellers who come to the Scar say that if you stand close to the well and are quiet you can hear him reading - the Keepers' records, one after another, from memory, to the choir. Nobody has tried to wake him. Nobody is certain that would be a kindness.",
  },
  the_quiet_well: {
    id: "the_quiet_well",
    title: "The Quiet Well",
    act: 5,
    body: "The Key turned and the Lock set, and the well is quiet. Vale is gone - into the well, or the fold, or somewhere the Keepers' records do not have a word for. The choir still sings, softly, a long way down. Ilse keeps the watch. The grounds have stopped shedding splinters, and the Scar has, very slightly, begun to grow grass at its southern edge. It is a victory in the way that a door shut carefully is a victory: complete, necessary, and not something you would want to have to do twice.",
  },
  keepers_commonplace: {
    id: "keepers_commonplace",
    title: "The Commonplace Book of the Nine",
    act: 5,
    body: "Rebound by Master Fennick in grey buckram, with a spine label in his own hand and a note inside the front board: 'Returned to the Library after six hundred years. Fine waived.' Nine pages, one per Keeper, none of them about the Lock. They are about what each of them would miss. It is the only book in the Restricted Section that Fennick will lend to first-years, and he insists they read it before anything else in there.",
  },

  // ------------------------------------------------ the nine Keeper pages

  keeper_page_1: {
    id: "keeper_page_1",
    title: "Keeper's Page I - The Warden",
    act: 3,
    body: "Maudrey Lisle, in a square, impatient hand: 'I will miss being bored. I have not been bored since the well woke and I do not expect to be again. I used to sit on my mother's step with nothing to do and nowhere to be and I thought it was a kind of dying. It was a kind of living, and I did not know, and I would give the Lantern and the light in it for one more afternoon of it. Do not tell the others. They think I am the brave one.'",
  },
  keeper_page_2: {
    id: "keeper_page_2",
    title: "Keeper's Page II - The Keymaker",
    act: 3,
    body: "Guthlac Orme: 'I will miss the sound a lock makes when it is right. Not open - right. There is a click a good lock gives when every ward lies where it should, and I have spent my life chasing it, and now I am to be the lock, and I will never hear it from the inside. Brannoch says roots grow towards water whether they know it or not. I have asked him to plant me where I can hear the forest. A key should be kept somewhere it can listen.'",
  },
  keeper_page_3: {
    id: "keeper_page_3",
    title: "Keeper's Page III - The Bellwright",
    act: 3,
    body: "Anwen of the Bells: 'I will miss noise. All of it. Market days. Hammers. My sister's terrible singing. I cast a bell that makes silence because somebody had to, and every time I ring it I lose a little of my hearing for anything else. By the end I will hear only the well. That is the cost and I agreed to it. But write this down for me, whoever finds it: my sister sang flat, and loudly, and it was the best sound in the world.'",
  },
  keeper_page_4: {
    id: "keeper_page_4",
    title: "Keeper's Page IV - The Mapmaker",
    act: 3,
    body: "Tamsin Fold: 'I will miss getting lost. I drew the map that closes the world, and so nobody inside it can ever be truly lost again - they will always, eventually, come home. I meant it as a mercy. I think it is. But I remember being twelve, and lost in the hill-country, and the terror and the joy of it, of not knowing what was over the next rise. I have taken that from everyone. I hope someone, some day, finds a way to give it back without letting the dark in with it.'",
  },
  keeper_page_5: {
    id: "keeper_page_5",
    title: "Keeper's Page V - Aldis Emberhart",
    act: 3,
    body: "Aldis Emberhart, in letters that press through the page: 'I will miss being afraid. That sounds mad. But a man who goes first into every fire is a man who has been frightened a great many times, and I have come to like it - it is how I know I am about to do something that matters. At the well I will stand still, for ever, and I will not be afraid, because there will be nothing left to decide. That frightens me more than anything. Good. I will go first.'",
  },
  keeper_page_6: {
    id: "keeper_page_6",
    title: "Keeper's Page VI - Brannoch Thornwick",
    act: 3,
    body: "Brannoch Thornwick: 'I will miss seeing the hedge come into leaf. Forty springs I watched it, and it never did it the same way twice. Somebody will have to trim it now and they will do it badly, and it will grow back regardless, because that is what hedges do. That is the only thing I have to teach anybody: if you hold on to a thing, and keep holding, it will mostly forgive you for how clumsily you did it. Tell whoever has the shears to stop fussing.'",
  },
  keeper_page_7: {
    id: "keeper_page_7",
    title: "Keeper's Page VII - Isolde Ravelle",
    act: 3,
    body: "Isolde Ravelle, in a hand that slopes as if in a hurry: 'I will miss the second question. The first question is always what is it - anyone can ask that. The second is why is it like that, and the second question is where all the trouble and all the joy is. At the well there will be no second question. There will be the door, and us, and that is all. I have hidden this page where only a nosy person will find it. Hello. Ask why. Keep asking.'",
  },
  keeper_page_8: {
    id: "keeper_page_8",
    title: "Keeper's Page VIII - Hesper Stillwater",
    act: 3,
    body: "Hesper Stillwater, very small and very neat: 'I will not miss very much, I think. I have always been good at waiting, and this is only waiting with a reason. But I will miss the heron. There was a heron on the lake by my house who stood in the shallows every morning and caught nothing and was not troubled by it. I learned everything I know from him. When you are at the well and the waiting is hard, think of a grey bird standing in cold water, perfectly content to be there. It helps. It is the only thing that does.'",
  },
  keeper_page_9: {
    id: "keeper_page_9",
    title: "Keeper's Page IX - The Ninth",
    act: 3,
    body: "Unsigned, in a round, young hand: 'I will miss my hands. I am to be a light, and lights do not have hands, and I have always talked with mine. I will choose the ones who come after us, and write to them, and I will never once be able to put a hand on a shoulder and say: you will be all right. So I am saying it here, to whichever of you finds this. You will be all right. You came anyway. That is the whole of what I look for.'",
  },
};

export function loreById(id: string): LoreEntry | undefined {
  return LORE[id];
}

export function loreList(): LoreEntry[] {
  return Object.values(LORE);
}
