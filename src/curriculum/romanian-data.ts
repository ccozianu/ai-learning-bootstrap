export interface VerbSpec {
  inf: string;
  part: string;
  pres: [string, string, string, string, string, string];
  enPres: [string, string, string, string, string, string];
  enInf: string;
  enPart: string;
  group: 1 | 2 | 3 | 4;
  path?: "regular" | "ez";
  complements: Array<[string, string]>;
}

export const PRONOUNS_RO = [
  "Eu",
  "Tu",
  "El",
  "Ea",
  "Noi",
  "Voi",
  "Ei",
  "Ele",
] as const;

export const PRONOUNS_EN = [
  "I",
  "You",
  "He",
  "She",
  "We",
  "You all",
  "They",
  "They",
] as const;

// Maps the 8 pronoun forms to the 6 conjugation slots (El/Ea share slot 2; Ei/Ele share slot 5).
export const PRONOUN_CONJ_INDEX = [0, 1, 2, 2, 3, 4, 5, 5] as const;
export const AUX_PAST_RO = ["am", "ai", "a", "am", "ați", "au"] as const;
export const AUX_FUT_RO = ["voi", "vei", "va", "vom", "veți", "vor"] as const;
export const PAST_BE_EN = [
  "was",
  "were",
  "was",
  "was",
  "were",
  "were",
  "were",
  "were",
] as const;

export const CORE_VERBS: VerbSpec[] = [
  {
    inf: "fi",
    part: "fost",
    pres: ["sunt", "ești", "este", "suntem", "sunteți", "sunt"],
    enPres: ["am", "are", "is", "are", "are", "are"],
    enInf: "be",
    enPart: "been",
    group: 4,
    complements: [
      ["aici", "here"],
      ["acasă", "at home"],
      ["fericit", "happy"],
      ["absent la școală", "absent at school"],
    ],
  },
  {
    inf: "avea",
    part: "avut",
    pres: ["am", "ai", "are", "avem", "aveți", "au"],
    enPres: ["have", "have", "has", "have", "have", "have"],
    enInf: "have",
    enPart: "had",
    group: 2,
    complements: [
      ["un câine", "a dog"],
      ["timp", "time"],
      ["o mașină", "a car"],
      ["o idee", "an idea"],
    ],
  },
  {
    inf: "vrea",
    part: "vrut",
    pres: ["vreau", "vrei", "vrea", "vrem", "vreți", "vor"],
    enPres: ["want", "want", "wants", "want", "want", "want"],
    enInf: "want",
    enPart: "wanted",
    group: 2,
    complements: [
      ["apă", "water"],
      ["un măr", "an apple"],
      ["mai mult", "more"],
    ],
  },
  {
    inf: "merge",
    part: "mers",
    pres: ["merg", "mergi", "merge", "mergem", "mergeți", "merg"],
    enPres: ["go", "go", "goes", "go", "go", "go"],
    enInf: "go",
    enPart: "gone",
    group: 3,
    complements: [
      ["la școală", "to school"],
      ["în parc", "to the park"],
      ["repede", "fast"],
      ["acolo", "there"],
    ],
  },
  {
    inf: "pleca",
    part: "plecat",
    pres: ["plec", "pleci", "pleacă", "plecăm", "plecați", "pleacă"],
    enPres: ["leave", "leave", "leaves", "leave", "leave", "leave"],
    enInf: "leave",
    enPart: "left",
    group: 1,
    path: "regular",
    complements: [
      ["acasă", "home"],
      ["la mare", "for the seaside"],
      ["acum", "now"],
      ["mâine", "tomorrow"],
    ],
  },
  {
    inf: "face",
    part: "făcut",
    pres: ["fac", "faci", "face", "facem", "faceți", "fac"],
    enPres: ["do", "do", "does", "do", "do", "do"],
    enInf: "do",
    enPart: "done",
    group: 3,
    complements: [
      ["bine", "well"],
      ["temele", "the homework"],
      ["o prăjitură", "a cake"],
      ["gălăgie", "noise"],
    ],
  },
  {
    inf: "fugi",
    part: "fugit",
    pres: ["fug", "fugi", "fuge", "fugim", "fugiți", "fug"],
    enPres: ["run", "run", "runs", "run", "run", "run"],
    enInf: "run",
    enPart: "run",
    group: 4,
    complements: [
      ["repede", "fast"],
      ["în curte", "in the yard"],
      ["departe", "far away"],
      ["tare", "hard"],
    ],
  },
  {
    inf: "putea",
    part: "putut",
    pres: ["pot", "poți", "poate", "putem", "puteți", "pot"],
    enPres: ["can", "can", "can", "can", "can", "can"],
    enInf: "be able to",
    enPart: "been able to",
    group: 2,
    complements: [
      ["citi", "read"],
      ["veni", "come"],
      ["ajuta", "help"],
      ["vedea", "see"],
    ],
  },
  {
    inf: "vorbi",
    part: "vorbit",
    pres: ["vorbesc", "vorbești", "vorbește", "vorbim", "vorbiți", "vorbesc"],
    enPres: ["speak", "speak", "speaks", "speak", "speak", "speak"],
    enInf: "speak",
    enPart: "spoken",
    group: 4,
    complements: [
      ["engleză", "English"],
      ["tare", "loudly"],
      ["mult", "a lot"],
      ["cu mama", "with mom"],
    ],
  },
  {
    inf: "scrie",
    part: "scris",
    pres: ["scriu", "scrii", "scrie", "scriem", "scrieți", "scriu"],
    enPres: ["write", "write", "writes", "write", "write", "write"],
    enInf: "write",
    enPart: "written",
    group: 3,
    complements: [
      ["o carte", "a book"],
      ["o scrisoare", "a letter"],
      ["frumos", "beautifully"],
      ["pe tablă", "on the board"],
    ],
  },
  {
    inf: "citi",
    part: "citit",
    pres: ["citesc", "citești", "citește", "citim", "citiți", "citesc"],
    enPres: ["read", "read", "reads", "read", "read", "read"],
    enInf: "read",
    enPart: "read",
    group: 4,
    complements: [
      ["o poveste", "a story"],
      ["o carte", "a book"],
      ["seara", "in the evening"],
      ["bine", "well"],
    ],
  },
  {
    inf: "mânca",
    part: "mâncat",
    pres: ["mănânc", "mănânci", "mănâncă", "mâncăm", "mâncați", "mănâncă"],
    enPres: ["eat", "eat", "eats", "eat", "eat", "eat"],
    enInf: "eat",
    enPart: "eaten",
    group: 1,
    path: "regular",
    complements: [
      ["un măr", "an apple"],
      ["pâine", "bread"],
      ["supă", "soup"],
      ["pizza", "pizza"],
    ],
  },
  {
    inf: "bea",
    part: "băut",
    pres: ["beau", "bei", "bea", "bem", "beți", "beau"],
    enPres: ["drink", "drink", "drinks", "drink", "drink", "drink"],
    enInf: "drink",
    enPart: "drunk",
    group: 2,
    complements: [
      ["apă", "water"],
      ["lapte", "milk"],
      ["suc", "juice"],
      ["ceai", "tea"],
    ],
  },
  {
    inf: "veni",
    part: "venit",
    pres: ["vin", "vii", "vine", "venim", "veniți", "vin"],
    enPres: ["come", "come", "comes", "come", "come", "come"],
    enInf: "come",
    enPart: "come",
    group: 4,
    complements: [
      ["aici", "here"],
      ["mâine", "tomorrow"],
      ["acasă", "home"],
      ["la petrecere", "to the party"],
    ],
  },
  {
    inf: "ști",
    part: "știut",
    pres: ["știu", "știi", "știe", "știm", "știți", "știu"],
    enPres: ["know", "know", "knows", "know", "know", "know"],
    enInf: "know",
    enPart: "known",
    group: 4,
    complements: [
      ["răspunsul", "the answer"],
      ["bine", "well"],
      ["tot", "everything"],
      ["matematică", "math"],
    ],
  },
  {
    inf: "vedea",
    part: "văzut",
    pres: ["văd", "vezi", "vede", "vedem", "vedeți", "văd"],
    enPres: ["see", "see", "sees", "see", "see", "see"],
    enInf: "see",
    enPart: "seen",
    group: 2,
    complements: [
      ["o pasăre", "a bird"],
      ["bine", "well"],
      ["cerul", "the sky"],
      ["un film", "a movie"],
    ],
  },
];

export const GROUP1_VERBS: VerbSpec[] = [
  {
    inf: "pleca",
    part: "plecat",
    pres: ["plec", "pleci", "pleacă", "plecăm", "plecați", "pleacă"],
    enPres: ["leave", "leave", "leaves", "leave", "leave", "leave"],
    enInf: "leave",
    enPart: "left",
    group: 1,
    path: "regular",
    complements: [
      ["acasă", "home"],
      ["la mare", "for the seaside"],
      ["repede", "quickly"],
      ["de la școală", "from school"],
    ],
  },
  {
    inf: "mânca",
    part: "mâncat",
    pres: ["mănânc", "mănânci", "mănâncă", "mâncăm", "mâncați", "mănâncă"],
    enPres: ["eat", "eat", "eats", "eat", "eat", "eat"],
    enInf: "eat",
    enPart: "eaten",
    group: 1,
    path: "regular",
    complements: [
      ["un măr", "an apple"],
      ["pâine", "bread"],
      ["supă", "soup"],
      ["pizza", "pizza"],
    ],
  },
  {
    inf: "cânta",
    part: "cântat",
    pres: ["cânt", "cânți", "cântă", "cântăm", "cântați", "cântă"],
    enPres: ["sing", "sing", "sings", "sing", "sing", "sing"],
    enInf: "sing",
    enPart: "sung",
    group: 1,
    path: "regular",
    complements: [
      ["frumos", "beautifully"],
      ["un cântec", "a song"],
      ["la pian", "the piano"],
      ["bine", "well"],
    ],
  },
  {
    inf: "juca",
    part: "jucat",
    pres: ["joc", "joci", "joacă", "jucăm", "jucați", "joacă"],
    enPres: ["play", "play", "plays", "play", "play", "play"],
    enInf: "play",
    enPart: "played",
    group: 1,
    path: "regular",
    complements: [
      ["fotbal", "soccer"],
      ["tenis", "tennis"],
      ["în curte", "in the yard"],
      ["un joc", "a game"],
    ],
  },
  {
    inf: "lucra",
    part: "lucrat",
    pres: ["lucrez", "lucrezi", "lucrează", "lucrăm", "lucrați", "lucrează"],
    enPres: ["work", "work", "works", "work", "work", "work"],
    enInf: "work",
    enPart: "worked",
    group: 1,
    path: "ez",
    complements: [
      ["mult", "a lot"],
      ["la calculator", "on the computer"],
      ["în grădină", "in the garden"],
      ["cu tata", "with dad"],
    ],
  },
  {
    inf: "asculta",
    part: "ascultat",
    pres: ["ascult", "asculți", "ascultă", "ascultăm", "ascultați", "ascultă"],
    enPres: ["listen", "listen", "listens", "listen", "listen", "listen"],
    enInf: "listen",
    enPart: "listened",
    group: 1,
    path: "regular",
    complements: [
      ["muzică", "to music"],
      ["la radio", "to the radio"],
      ["pe mama", "to mom"],
      ["o poveste", "to a story"],
    ],
  },
  {
    inf: "cumpăra",
    part: "cumpărat",
    pres: ["cumpăr", "cumperi", "cumpără", "cumpărăm", "cumpărați", "cumpără"],
    enPres: ["buy", "buy", "buys", "buy", "buy", "buy"],
    enInf: "buy",
    enPart: "bought",
    group: 1,
    path: "regular",
    complements: [
      ["mere", "apples"],
      ["o jucărie", "a toy"],
      ["pâine", "bread"],
      ["o carte", "a book"],
    ],
  },
  {
    inf: "dansa",
    part: "dansat",
    pres: ["dansez", "dansezi", "dansează", "dansăm", "dansați", "dansează"],
    enPres: ["dance", "dance", "dances", "dance", "dance", "dance"],
    enInf: "dance",
    enPart: "danced",
    group: 1,
    path: "ez",
    complements: [
      ["frumos", "beautifully"],
      ["la petrecere", "at the party"],
      ["mult", "a lot"],
      ["cu mine", "with me"],
    ],
  },
  {
    inf: "întreba",
    part: "întrebat",
    pres: [
      "întreb",
      "întrebi",
      "întreabă",
      "întrebăm",
      "întrebați",
      "întreabă",
    ],
    enPres: ["ask", "ask", "asks", "ask", "ask", "ask"],
    enInf: "ask",
    enPart: "asked",
    group: 1,
    path: "regular",
    complements: [
      ["ceva", "something"],
      ["o întrebare", "a question"],
      ["pe tata", "dad"],
      ["mereu", "always"],
    ],
  },
  {
    inf: "chema",
    part: "chemat",
    pres: ["chem", "chemi", "cheamă", "chemăm", "chemați", "cheamă"],
    enPres: ["call", "call", "calls", "call", "call", "call"],
    enInf: "call",
    enPart: "called",
    group: 1,
    path: "regular",
    complements: [
      ["un prieten", "a friend"],
      ["câinele", "the dog"],
      ["pe mama", "mom"],
      ["pe Andrei", "Andrei"],
    ],
  },
];

export const KNOWLEDGE_NODES = [
  {
    id: "ro_pronouns_infinitive",
    title: "Subject Pronouns & Verb Infinitive",
    description:
      "Recognize Romanian pronouns (Eu, Tu, El/Ea, Noi, Voi, Ei/Ele) and infinitive markers (a + verb).",
  },
  {
    id: "ro_verb_tenses_core",
    title: "Present, Past & Future Tenses (16 Core Verbs)",
    description:
      "Conjugate 16 essential verbs in the Present, Compound Past (am/ai/a/am/ați/au + participle), and Future (voi/vei/va/vom/veți/vor + infinitive).",
  },
  {
    id: "ro_verb_kingdoms_4",
    title: "The 4 Verb Conjugation Kingdoms",
    description:
      "Classify Romanian verbs by infinitive ending into Group I (-a), Group II (-ea), Group III (-e), and Group IV (-i/-î).",
  },
  {
    id: "ro_verb_group1_a_family",
    title: "Kingdom I: The '-a' Family & '-ez' Suffix",
    description:
      "Apply regular endings vs. the -ez/-eaz suffix path and the -at past participle rule across Group I verbs.",
  },
  {
    id: "ro_cardinal_numerals",
    title: "Cardinal Numerals (0 to Millions) & 'de' Rule",
    description:
      "Form Romanian cardinal numbers, gender agreement for 1/2 (un/o, doi/două), teen mutations, and the preposition 'de' after endings 00 or 20–99.",
  },
  {
    id: "ro_ordinal_numerals",
    title: "Ordinal Numerals (1st to 100th+)",
    description:
      "Use primul/prima and the sandwich formula (al + cardinal + -lea vs. a + cardinal + -a/-ea).",
  },
] as const;

export const KNOWLEDGE_DEPENDENCIES: Array<{
  prerequisiteNodeId: string;
  dependentNodeId: string;
}> = [
  {
    prerequisiteNodeId: "ro_pronouns_infinitive",
    dependentNodeId: "ro_verb_tenses_core",
  },
  {
    prerequisiteNodeId: "ro_verb_tenses_core",
    dependentNodeId: "ro_verb_kingdoms_4",
  },
  {
    prerequisiteNodeId: "ro_verb_kingdoms_4",
    dependentNodeId: "ro_verb_group1_a_family",
  },
  {
    prerequisiteNodeId: "ro_cardinal_numerals",
    dependentNodeId: "ro_ordinal_numerals",
  },
];

export const CURRICULUM_DATA = {
  id: "romanian-fundamentals",
  title: "Learn Romanian Part 1 (Verbs & Numerals)",
  description:
    "Interactive Romanian lessons and printable worksheets adapted from AiAsTutor: core verbs across three tenses, the 4 conjugation kingdoms with Group 1 '-a' mastery, and cardinal/ordinal numerals.",
  language: "ro",
  ageBand: "7-11",
  sourceUrl: "engineering-docs/other/AiAsTutor/README.md",
  license: "CC-BY-4.0",
  attribution: "AiAsTutor Romanian Prototype Series",
  version: {
    id: "romanian-fundamentals@1.0.0",
    version: "1.0.0",
    title: "Learn Romanian Part 1 — v1.0.0 (3 Chapters)",
    contentHash: "sha256:ro-part1-v1-all-3-chapters",
  },
};

export interface LessonCard {
  heading: string;
  body: string;
  highlights?: Array<{ ro: string; en: string; note?: string }>;
}

export const SERIES_DATA = [
  {
    id: "ro-verbs-ch1",
    orderIndex: 1,
    slug: "verbs-ch1",
    title: "Chapter 1: Magic Words — Core Romanian Verbs",
    subtitle: "Present, Past & Future Tenses + 16 Action Words",
    description:
      "Meet Romanian pronouns, infinitives, the three core tenses, and 16 everyday verbs with interactive and printable practice.",
    lessonPresenterKey: "ro-verbs-pres-ch1",
    exercisePresenterKey: "fill-blanks-sheet",
    exerciseGeneratorKey: "verbs-ch1-gen",
    exerciseEvaluatorKey: "deterministic-ro-v1",
    knowledgeNodeId: "ro_verb_tenses_core",
    lessons: [
      {
        id: "ro-v1-tenses",
        orderIndex: 1,
        slug: "magic-words-tenses",
        title: "Magic Words: Pronouns & 3 Tenses",
        kind: "PRESENTATION",
        knowledgeNodeId: "ro_pronouns_infinitive",
        contentJson: {
          badge: "Verb Presentation 0",
          hero: "Magic Words: Romanian Verbs!",
          cards: [
            {
              heading: "1. Our Heroes (Pronouns) & Infinitive ('a ...')",
              body: "In Romanian, every verb's dictionary name starts with 'a' (e.g., a face = to do, a citi = to read). Match each subject pronoun before conjugating!",
              highlights: [
                { ro: "Eu / Tu / El / Ea", en: "I / You / He / She" },
                {
                  ro: "Noi / Voi / Ei / Ele",
                  en: "We / You all / They (m) / They (f)",
                },
                {
                  ro: "a face / a citi",
                  en: "to do / to read",
                  note: "Infinitive marker 'a'",
                },
              ],
            },
            {
              heading: "2. Present Tense (Happening NOW!)",
              body: "Present tense uses a single verb form matched to the subject (e.g., for 'a face': Eu fac, Tu faci, El/Ea face, Noi facem, Voi faceți, Ei/Ele fac).",
              highlights: [
                {
                  ro: "Eu fac · Tu faci · El/Ea face",
                  en: "I do · You do · He/She does",
                },
                {
                  ro: "Noi facem · Voi faceți · Ei/Ele fac",
                  en: "We do · You all do · They do",
                },
              ],
            },
            {
              heading: "3. Compound Past (Already Done!)",
              body: "Use the helper verb (am, ai, a, am, ați, au) + the Participle (e.g., 'făcut' = done). Two words for the past!",
              highlights: [
                {
                  ro: "Eu am făcut · Tu ai făcut",
                  en: "I have done · You have done",
                },
                {
                  ro: "El/Ea a făcut · Noi am făcut",
                  en: "He/She has done · We have done",
                },
                {
                  ro: "Voi ați făcut · Ei/Ele au făcut",
                  en: "You all have done · They have done",
                },
              ],
            },
            {
              heading: "4. Future Tense (What Will Be!)",
              body: "Use the future helper (voi, vei, va, vom, veți, vor) + the Infinitive without 'a' (e.g., 'face' or 'citi'). Works for EVERY verb!",
              highlights: [
                {
                  ro: "Eu voi face · Tu vei face · El/Ea va face",
                  en: "I / You / He or She will do",
                },
                {
                  ro: "Noi vom citi · Voi veți citi · Ei/Ele vor citi",
                  en: "We / You all / They will read",
                },
              ],
            },
          ] as LessonCard[],
        },
      },
      {
        id: "ro-v1-core-16",
        orderIndex: 2,
        slug: "core-16-verbs",
        title: "16 Core Action Verbs Deck",
        kind: "PRESENTATION",
        knowledgeNodeId: "ro_verb_tenses_core",
        contentJson: {
          badge: "Verb Presentation 1",
          hero: "Most Useful Romanian Verbs!",
          showVerbDeck: "CORE_16",
          cards: [
            {
              heading: "How to Study the 16 Action Verbs",
              body: "Tap any verb card below to inspect all 6 present-tense forms, its past participle, and an example sentence.",
            },
          ] as LessonCard[],
        },
      },
      {
        id: "ro-v1-practice",
        orderIndex: 3,
        slug: "core-verbs-practice",
        title: "Core Verbs Fill-in-the-Blanks Worksheet",
        kind: "PRACTICE_SHEET",
        knowledgeNodeId: "ro_verb_tenses_core",
        contentJson: {
          badge: "Exercises 1 & 2",
          hero: "Fill in the Blanks: Present, Past & Future!",
          instructions:
            "Type the missing Romanian verb form(s). Present tense takes 1 blank; Past and Future take 2 blanks (helper + main verb). Use the diacritics bar if needed, or print this sheet for paper practice.",
          generatorSeriesId: "ro-verbs-ch1",
        },
      },
    ],
  },
  {
    id: "ro-verbs-ch2",
    orderIndex: 2,
    slug: "verbs-ch2",
    title: "Chapter 2: The 4 Verb Kingdoms & Group 1 '-a' Castle",
    subtitle: "Verb Families + Regular vs. '-ez' Suffix + Kingdom Game",
    description:
      "Sort verbs into the 4 Romanian conjugation kingdoms, conquer Kingdom I ('-a' verbs & '-ez' suffix), and practice with interactive challenges.",
    lessonPresenterKey: "ro-verbs-pres-ch2",
    exercisePresenterKey: "mixed-game-trainer-sheet",
    exerciseGeneratorKey: "verbs-ch2-gen",
    exerciseEvaluatorKey: "deterministic-ro-v1",
    knowledgeNodeId: "ro_verb_group1_a_family",
    lessons: [
      {
        id: "ro-v2-kingdoms",
        orderIndex: 1,
        slug: "four-verb-kingdoms",
        title: "The 4 Verb Kingdoms & Sorting Game",
        kind: "INTERACTIVE_TRAINER",
        knowledgeNodeId: "ro_verb_kingdoms_4",
        contentJson: {
          badge: "Groups Presentation 0",
          hero: "The 4 Verb Kingdoms of Romanian",
          cards: [
            {
              heading: "How to Find a Verb's Kingdom",
              body: "1) Take the infinitive (e.g., 'a pleca'). 2) Drop 'a' from the front ('pleca'). 3) Look at the ending: -a = Kingdom I, -ea = Kingdom II, -e = Kingdom III, -i/-î = Kingdom IV!",
              highlights: [
                {
                  ro: "Kingdom I (-a)",
                  en: "a pleca, a mânca, a cânta, a lucra",
                },
                {
                  ro: "Kingdom II (-ea)",
                  en: "a avea, a vrea, a putea, a vedea, a bea",
                },
                { ro: "Kingdom III (-e)", en: "a merge, a face, a scrie" },
                {
                  ro: "Kingdom IV (-i / -î)",
                  en: "a fi, a fugi, a vorbi, a citi, a veni, a ști",
                },
              ],
            },
          ] as LessonCard[],
        },
      },
      {
        id: "ro-v2-castle-a",
        orderIndex: 2,
        slug: "castle-a-trainer",
        title: "Kingdom I ('-a') Verbs & Interactive Quiz Trainer",
        kind: "INTERACTIVE_TRAINER",
        knowledgeNodeId: "ro_verb_group1_a_family",
        contentJson: {
          badge: "Groups Presentation 1",
          hero: "Kingdom I: The '-a' Verb Family",
          showVerbDeck: "GROUP_1",
          cards: [
            {
              heading: "Two Present Paths: Regular vs. Magic '-ez' Suffix",
              body: "Path A (Regular) adds endings directly: Eu cânt, Tu cânți, El/Ea cântă, Noi cântăm, Voi cântați, Ei/Ele cântă. Path B inserts '-ez / -eaz' for Eu/Tu/El/Ea/Ei/Ele: Eu lucrez, Tu lucrezi, El/Ea lucrează — while Noi lucrăm and Voi lucrați stay in the Suffix-Free Zone!",
              highlights: [
                {
                  ro: "Past Participle Rule",
                  en: "Drop -a and add -at: cânta -> cântat, lucra -> lucrat",
                },
                {
                  ro: "Sound shifts",
                  en: "a pleca -> El pleacă; a juca -> Eu joc, El joacă",
                },
              ],
            },
          ] as LessonCard[],
        },
      },
      {
        id: "ro-v2-practice",
        orderIndex: 3,
        slug: "group1-practice",
        title: "Group 1 '-a' Verbs Practice Sheet",
        kind: "PRACTICE_SHEET",
        knowledgeNodeId: "ro_verb_group1_a_family",
        contentJson: {
          badge: "Chapter 2 Worksheet",
          hero: "Group 1 Verbs: Practice Sheet!",
          instructions:
            "Conjugate all 10 Group 1 '-a' verbs (both Regular and '-ez' path verbs) in Present, Past, and Future tenses.",
          generatorSeriesId: "ro-verbs-ch2",
        },
      },
    ],
  },
  {
    id: "ro-numerals-ch1",
    orderIndex: 3,
    slug: "numerals-ch1",
    title: "Chapter 3: Romanian Numerals & Ordinals",
    subtitle: "Counting 0 to 50 Million, Gender, 'de' Rule & Ordinals",
    description:
      "Master Romanian cardinal numbers with the 'de' preposition rule and Copycat Neuter nouns, explore any number live, and conquer ordinal sandwiches.",
    lessonPresenterKey: "ro-numerals-pres",
    exercisePresenterKey: "fill-blanks-sheet",
    exerciseGeneratorKey: "numerals-ch1-gen",
    exerciseEvaluatorKey: "deterministic-ro-v1",
    knowledgeNodeId: "ro_cardinal_numerals",
    lessons: [
      {
        id: "ro-num-cardinals",
        orderIndex: 1,
        slug: "cardinal-numerals",
        title: "Space Mission: Cardinal Numerals (0 to Millions)",
        kind: "PRESENTATION",
        knowledgeNodeId: "ro_cardinal_numerals",
        contentJson: {
          badge: "Numerals Presentation 1",
          hero: "Space Mission: Romanian Numerals!",
          showNumeralExplorer: true,
          cards: [
            {
              heading: "1. Building Blocks (0–10) & The 1/2 Gender Split",
              body: "1 and 2 change before nouns! Use 'un' (1) / 'doi' (2) for Masculine nouns (un an, doi câini), and 'o' (1) / 'două' (2) for Feminine & plural Neuter nouns (o fată, două pisici, două mere).",
              highlights: [
                {
                  ro: "0–5",
                  en: "zero, unu/una, doi/două, trei, patru, cinci",
                },
                { ro: "6–10", en: "șase, șapte, opt, nouă, zece" },
              ],
            },
            {
              heading: "2. Teens (11–19): Unit + spre + zece & Mutations",
              body: "Teens follow 'unit + spre + zece', with 4 sneaky mutations: 11 unsprezece, 12 doisprezece (m) / douăsprezece (f), 14 paisprezece, 16 șaisprezece.",
            },
            {
              heading: "3. Tens (20–99), Hundreds, Thousands & Millions",
              body: "20 = douăzeci, 25 = douăzeci și cinci ('și' connects tens & units). 100 = o sută, 200 = două sute. 1,000 = o mie, 2,000 = două mii. 1,000,000 = un milion, 2,000,000 = două milioane.",
            },
            {
              heading: "4. The Magic 'DE' Rule & Copycat (Neuter) Nouns",
              body: "If the last two digits before 'mii', 'milioane', or a plural noun are 01–19, put the word right after the number. Otherwise (ending in 00 or 20–99, e.g. 20, 45, 100, 105,000), insert 'de' (e.g., o sută cinci mii de oameni)! Neuter nouns act Masculine in singular (un măr) and Feminine in plural (două mere).",
            },
          ] as LessonCard[],
        },
      },
      {
        id: "ro-num-ordinals",
        orderIndex: 2,
        slug: "ordinal-numerals",
        title: "Ordinal Numerals: Order & Rank!",
        kind: "PRESENTATION",
        knowledgeNodeId: "ro_ordinal_numerals",
        contentJson: {
          badge: "Ordinal Presentation 2",
          hero: "Who is First, Second, or Third?",
          cards: [
            {
              heading: "1. The Irregular 1st: primul / prima (întâi)",
              body: "For 1st, never build from 'unu': use 'primul' (masculine/neuter, e.g., primul băiat) or 'prima' (feminine, e.g., prima fată).",
            },
            {
              heading: "2. The Grammar Sandwich Formula (2nd and up)",
              body: "Masculine/Neuter: al + [cardinal] + lea (al doilea, al patrulea, al optulea, al zecelea). Feminine: a + [cardinal] + a/ea (a doua, a patra, a cincea, a opta, a zecea).",
              highlights: [
                { ro: "2nd", en: "al doilea (m) / a doua (f)" },
                {
                  ro: "4th & 8th",
                  en: "al patrulea / a patra · al optulea / a opta",
                },
                {
                  ro: "5th & 10th",
                  en: "al cincilea / a cincea · al zecelea / a zecea",
                },
              ],
            },
          ] as LessonCard[],
        },
      },
      {
        id: "ro-num-practice",
        orderIndex: 3,
        slug: "numerals-practice",
        title: "Numerals & Ordinals Practice Sheet",
        kind: "PRACTICE_SHEET",
        knowledgeNodeId: "ro_cardinal_numerals",
        contentJson: {
          badge: "Numerals Worksheet",
          hero: "Counting Stars: Romanian Numerals Practice!",
          instructions:
            "Write each number in Romanian words (one word per blank!). Remember gender agreement for 1/2 and add 'de' when the last two digits are 00 or 20–99.",
          generatorSeriesId: "ro-numerals-ch1",
        },
      },
    ],
  },
];

// Pronoun & infinitive foundational checkpoint exercises attached to ro-v1-tenses
export const PRONOUN_CHECKPOINT_EXERCISES = [
  {
    id: "ex-ch1-pron-1",
    orderIndex: 1,
    promptEn: "Choose the Romanian subject pronoun for 'We'",
    promptRoTemplate: "_________ vorbim engleză. (We speak English.)",
    options: ["Noi", "Voi", "Ei", "Tu"],
    correct: "Noi",
    explanation: '"Noi" means "We" (paired with Voi = You all).',
  },
  {
    id: "ex-ch1-pron-2",
    orderIndex: 2,
    promptEn: "How do you recognize a Romanian verb's Infinitive ('to ...')?",
    promptRoTemplate: "_________ citi (to read)",
    options: ["a", "am", "voi", "în"],
    correct: "a",
    explanation:
      'Every Romanian infinitive starts with the particle "a" (a citi, a face).',
  },
  {
    id: "ex-ch1-pron-3",
    orderIndex: 3,
    promptEn: "Choose the Compound Past helper word for 'You all' (Voi)",
    promptRoTemplate:
      "Voi _________ făcut temele. (You all have done the homework.)",
    options: ["ați", "am", "au", "veți"],
    correct: "ați",
    explanation: "Compound past helpers: am, ai, a, am, ați, au.",
  },
  {
    id: "ex-ch1-pron-4",
    orderIndex: 4,
    promptEn: "Choose the Future tense helper word for 'He / She' (El / Ea)",
    promptRoTemplate: "Ea _________ citi o poveste. (She will read a story.)",
    options: ["va", "a", "voi", "vom"],
    correct: "va",
    explanation:
      "Future tense uses voi, vei, va, vom, veți, vor + infinitive without 'a'.",
  },
];

// Interactive 10-question quiz from Verb/SecondChapter/RomanianVerbsGroupsPresentation_1.html
export const CASTLE_A_QUIZ_ITEMS = [
  {
    id: "ex-ch2-quiz-1",
    orderIndex: 1,
    promptEn: 'Fill in the correct present tense form of "a lucra" [-ez]',
    promptRoTemplate: "Eu _________ (a lucra) la o prăjitură.",
    options: ["lucrez", "lucrăm", "lucru", "lucrează"],
    correct: "lucrez",
    explanation: 'Path B (-ez): "Eu" takes the "-ez" suffix -> lucrez.',
  },
  {
    id: "ex-ch2-quiz-2",
    orderIndex: 2,
    promptEn: 'Fill in the correct present tense form of "a cânta" [Regular]',
    promptRoTemplate: "Noi _________ (a cânta) un cântec frumos.",
    options: ["cântăm", "cânt", "cântă", "cântați"],
    correct: "cântăm",
    explanation: '"Noi" always takes "-ăm" for Group 1 verbs -> cântăm.',
  },
  {
    id: "ex-ch2-quiz-3",
    orderIndex: 3,
    promptEn: 'Fill in the correct present tense form of "a juca" [Regular]',
    promptRoTemplate: "Tu _________ (a juca) fotbal în curte.",
    options: ["joci", "joc", "joacă", "jucați"],
    correct: "joci",
    explanation: '"Tu" uses the stem with "-i" -> joci.',
  },
  {
    id: "ex-ch2-quiz-4",
    orderIndex: 4,
    promptEn:
      'What is the participle form of "a mânca"? (used for the past tense)',
    promptRoTemplate: 'Care este participiul verbului "a mânca"?',
    options: ["mâncat", "mănâncă", "mâncare", "mâncată"],
    correct: "mâncat",
    explanation: "Drop -a and add -at: a mânca -> mâncat.",
  },
  {
    id: "ex-ch2-quiz-5",
    orderIndex: 5,
    promptEn:
      'Fill in the correct present tense form of "a dansa" [-ez] for "They"',
    promptRoTemplate: "Ei/Ele _________ (a dansa) foarte bine.",
    options: ["dansează", "dansez", "dansăm", "dansați"],
    correct: "dansează",
    explanation: 'Path B (-ez) 3rd person plural uses "-ează" -> dansează.',
  },
  {
    id: "ex-ch2-quiz-6",
    orderIndex: 6,
    promptEn: 'What is the participle form of "a lucra"?',
    promptRoTemplate: 'Care este participiul verbului "a lucra"?',
    options: ["lucrat", "lucrează", "lucru", "lucrare"],
    correct: "lucrat",
    explanation: "Drop -a and add -at: a lucra -> lucrat.",
  },
  {
    id: "ex-ch2-quiz-7",
    orderIndex: 7,
    promptEn: 'Fill in the present tense form for "We" of "a lucra" [-ez]',
    promptRoTemplate: "Noi _________ (a lucra) împreună.",
    options: ["lucrăm", "lucrez", "lucrează", "lucrați"],
    correct: "lucrăm",
    explanation: '"Noi" is in the Suffix-Free Zone (no -ez!) -> lucrăm.',
  },
  {
    id: "ex-ch2-quiz-8",
    orderIndex: 8,
    promptEn: 'Fill in the correct present tense form of "a cumpăra" [Regular]',
    promptRoTemplate: "Tu _________ (a cumpăra) un măr.",
    options: ["cumperi", "cumpăr", "cumpără", "cumpărați"],
    correct: "cumperi",
    explanation: '"Tu" raises final stem ă -> e + i: cumperi.',
  },
  {
    id: "ex-ch2-quiz-9",
    orderIndex: 9,
    promptEn: 'Fill in the correct present tense form of "a întreba" [Regular]',
    promptRoTemplate: "El _________ (a întreba) ceva important.",
    options: ["întreabă", "întreb", "întrebi", "întrebăm"],
    correct: "întreabă",
    explanation: "3rd person singular dips e -> ea + ă: întreabă.",
  },
  {
    id: "ex-ch2-quiz-10",
    orderIndex: 10,
    promptEn: 'Fill in the correct past participle form of "a chema"',
    promptRoTemplate: "Eu am _________ (a chema) pisica în casă.",
    options: ["chemat", "chem", "cheamă", "chemare"],
    correct: "chemat",
    explanation: "Drop -a and add -at: a chema -> chemat.",
  },
];

// Ordinal MCQ items grounded in RomanianOrdinalNumeralsPresentation.html
export const ORDINAL_EXERCISES = [
  {
    id: "ex-num-ord-1",
    orderIndex: 101,
    promptEn: "Choose the masculine ordinal for 'the 1st boy'",
    promptRoTemplate: "_________ băiat (the first boy)",
    options: ["primul", "prima", "al unulea", "unu"],
    correct: "primul",
    explanation: "1st is irregular: 'primul' for masculine/neuter nouns.",
  },
  {
    id: "ex-num-ord-2",
    orderIndex: 102,
    promptEn: "Choose the feminine ordinal for 'the 1st girl'",
    promptRoTemplate: "_________ fată (the first girl)",
    options: ["prima", "primul", "a una", "întâiul"],
    correct: "prima",
    explanation: "1st is irregular: 'prima' for feminine nouns.",
  },
  {
    id: "ex-num-ord-3",
    orderIndex: 103,
    promptEn: "Build the feminine ordinal for '2nd' (e.g., a doua casă)",
    promptRoTemplate: "_________ casă (the 2nd house)",
    options: ["a doua", "al doilea", "două", "a douăa"],
    correct: "a doua",
    explanation: "Feminine 2nd removes the hat on ă -> 'a doua'.",
  },
  {
    id: "ex-num-ord-4",
    orderIndex: 104,
    promptEn: "Build the masculine ordinal for '4th'",
    promptRoTemplate: "_________ elev (the 4th student)",
    options: ["al patrulea", "a patra", "al patru", "patrulea"],
    correct: "al patrulea",
    explanation: "Masculine sandwich: al + patru + lea = al patrulea.",
  },
  {
    id: "ex-num-ord-5",
    orderIndex: 105,
    promptEn: "Build the feminine ordinal for '5th'",
    promptRoTemplate: "_________ lecție (the 5th lesson)",
    options: ["a cincea", "al cincilea", "a cinca", "a cincia"],
    correct: "a cincea",
    explanation: "Feminine 5th uses the '-ea' sandwich -> a cincea.",
  },
  {
    id: "ex-num-ord-6",
    orderIndex: 106,
    promptEn: "Build the masculine ordinal for '8th'",
    promptRoTemplate: "_________ capitol (the 8th chapter)",
    options: ["al optulea", "a opta", "al optlea", "al optea"],
    correct: "al optulea",
    explanation: "8th adds 'u' before -lea: al optulea.",
  },
];
