import {
  AUX_FUT_RO,
  AUX_PAST_RO,
  CORE_VERBS,
  GROUP1_VERBS,
  PAST_BE_EN,
  PRONOUNS_EN,
  PRONOUNS_RO,
  PRONOUN_CONJ_INDEX,
  type VerbSpec,
} from "./romanian-data.js";

export type RoSegment =
  { type: "text"; value: string } | { type: "blank"; index: number };

export interface GeneratedExercise {
  id: string;
  orderIndex: number;
  exerciseType: "FILL_IN_BLANKS";
  promptEn: string;
  promptRoTemplate: string;
  roSegments: RoSegment[];
  blanksCount: number;
  acceptedBlanks: string[];
  hint: string;
  knowledgeNodeId: string;
}

// Deterministic 32-bit PRNG (Mulberry32) so both server grading and worksheet generation agree offline.
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

function shuffle<T>(rng: () => number, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

function makeBlankSentence(
  prefix: string,
  blanksCount: number,
  suffix: string,
): { promptRoTemplate: string; roSegments: RoSegment[] } {
  const roSegments: RoSegment[] = [];
  if (prefix) roSegments.push({ type: "text", value: `${prefix} ` });
  const markers: string[] = [];
  for (let i = 0; i < blanksCount; i++) {
    if (i > 0) roSegments.push({ type: "text", value: " " });
    roSegments.push({ type: "blank", index: i });
    markers.push("_____");
  }
  if (suffix) roSegments.push({ type: "text", value: ` ${suffix}` });
  const promptRoTemplate = [prefix, ...markers, suffix]
    .filter(Boolean)
    .join(" ");
  return { promptRoTemplate, roSegments };
}

function buildVerbExercises(
  seriesId: string,
  verbs: VerbSpec[],
  knowledgeNodeId: string,
  seedOffset: number,
  count: number,
): GeneratedExercise[] {
  const baseSeed =
    (seriesId === "ro-verbs-ch1" ? 1042 : 2042) + seedOffset * 97;
  const rng = mulberry32(baseSeed);
  const used = new Set<string>();
  const out: GeneratedExercise[] = [];
  const tenses = ["pres", "past", "fut"] as const;

  let guard = 0;
  while (out.length < count && guard < count * 40) {
    guard++;
    const v = pick(rng, verbs);
    const pIdx = randInt(rng, 0, PRONOUNS_RO.length - 1);
    const comp = pick(rng, v.complements);
    const tense = pick(rng, tenses);
    const key = `${v.inf}_${pIdx}_${comp[0]}_${tense}`;
    if (used.has(key)) continue;
    used.add(key);

    const pRo = PRONOUNS_RO[pIdx]!;
    const pEn = PRONOUNS_EN[pIdx]!;
    const cIdx = PRONOUN_CONJ_INDEX[pIdx]!;

    let promptEn = "";
    let blanks: string[] = [];
    let hint = "";

    if (tense === "pres") {
      promptEn =
        v.inf === "putea"
          ? `${pEn} can ${comp[1]}.`
          : `${pEn} ${v.enPres[cIdx]} ${comp[1]}.`;
      blanks = [v.pres[cIdx]!];
      hint = `Present tense of "a ${v.inf}" for "${pRo}"`;
    } else if (tense === "past") {
      if (v.inf === "fi") {
        promptEn = `${pEn} ${PAST_BE_EN[pIdx]} ${comp[1]}.`;
      } else if (v.inf === "putea") {
        promptEn = `${pEn} could ${comp[1]}.`;
      } else {
        const auxEn = pEn === "He" || pEn === "She" ? "has" : "have";
        promptEn = `${pEn} ${auxEn} ${v.enPart} ${comp[1]}.`;
      }
      blanks = [AUX_PAST_RO[cIdx]!, v.part];
      hint = `Compound past of "a ${v.inf}" (aux + participle "${v.part}")`;
    } else {
      promptEn =
        v.inf === "putea"
          ? `${pEn} will be able to ${comp[1]}.`
          : `${pEn} will ${v.enInf} ${comp[1]}.`;
      blanks = [AUX_FUT_RO[cIdx]!, v.inf];
      hint = `Future tense of "a ${v.inf}" (future helper + "${v.inf}")`;
    }

    const { promptRoTemplate, roSegments } = makeBlankSentence(
      pRo,
      blanks.length,
      `${comp[0]}.`,
    );

    const idx = out.length;
    out.push({
      id: `gen:${seriesId}:${seedOffset}:${idx}`,
      orderIndex: idx + 1,
      exerciseType: "FILL_IN_BLANKS",
      promptEn,
      promptRoTemplate,
      roSegments,
      blanksCount: blanks.length,
      acceptedBlanks: blanks,
      hint,
      knowledgeNodeId,
    });
  }
  return out;
}

// Ported directly from AiAsTutor/Romanian/Numerals/FirstChapter/generate_numerals_exercises.py
const UNITS_M = [
  "",
  "unu",
  "doi",
  "trei",
  "patru",
  "cinci",
  "șase",
  "șapte",
  "opt",
  "nouă",
] as const;

const UNITS_F = [
  "",
  "una",
  "două",
  "trei",
  "patru",
  "cinci",
  "șase",
  "șapte",
  "opt",
  "nouă",
] as const;

const TENS_WORDS = [
  "",
  "",
  "douăzeci",
  "treizeci",
  "patruzeci",
  "cincizeci",
  "șaizeci",
  "șaptezeci",
  "optzeci",
  "nouăzeci",
] as const;

type Gender = "masculine" | "feminine";

function under100(val: number, g: Gender): string {
  if (val === 0) return "";
  if (val < 10) return g === "masculine" ? UNITS_M[val]! : UNITS_F[val]!;
  if (val === 10) return "zece";
  if (val === 11) return "unsprezece";
  if (val === 12) return g === "masculine" ? "doisprezece" : "douăsprezece";
  if (val === 13) return "treisprezece";
  if (val === 14) return "paisprezece";
  if (val === 15) return "cincisprezece";
  if (val === 16) return "șaisprezece";
  if (val === 17) return "șaptesprezece";
  if (val === 18) return "optsprezece";
  if (val === 19) return "nouăsprezece";

  const t = Math.floor(val / 10);
  const u = val % 10;
  const tenWord = TENS_WORDS[t]!;
  if (u === 0) return tenWord;
  const uWord = g === "masculine" ? UNITS_M[u]! : UNITS_F[u]!;
  return `${tenWord} și ${uWord}`;
}

function under1000(val: number, g: Gender): string {
  const h = Math.floor(val / 100);
  const rem = val % 100;
  let hWord = "";
  if (h === 1) hWord = "o sută";
  else if (h === 2) hWord = "două sute";
  else if (h > 2) hWord = `${UNITS_F[h]} sute`;

  const remWord = under100(rem, g);
  if (hWord && remWord) return `${hWord} ${remWord}`;
  return hWord || remWord;
}

export function numToRo(n: number, gender: Gender = "masculine"): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999_999) {
    throw new Error(
      "Number out of supported prototype range (0..999,999,999).",
    );
  }
  if (n === 0) return "zero";

  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const remainder = n % 1000;
  const parts: string[] = [];

  if (millions > 0) {
    if (millions === 1) {
      parts.push("un milion");
    } else {
      const mText = under1000(millions, "feminine");
      parts.push(
        millions % 100 === 0 || millions % 100 >= 20
          ? `${mText} de milioane`
          : `${mText} milioane`,
      );
    }
  }
  if (thousands > 0) {
    if (thousands === 1) {
      parts.push("o mie");
    } else {
      const tText = under1000(thousands, "feminine");
      parts.push(
        thousands % 100 === 0 || thousands % 100 >= 20
          ? `${tText} de mii`
          : `${tText} mii`,
      );
    }
  }
  if (remainder > 0 || parts.length === 0) {
    parts.push(under1000(remainder, gender));
  }
  return parts.join(" ");
}

export function takesDePreposition(n: number): boolean {
  if (n === 0) return false;
  const lastTwo = n % 100;
  return !(lastTwo >= 1 && lastTwo <= 19);
}

export function getNumeralPhrase(
  n: number,
  nounGender: "masculine" | "feminine" | "neuter",
): { wordsText: string; actualGender: Gender; usesDe: boolean } {
  const actualGender: Gender =
    nounGender === "neuter" ? (n === 1 ? "masculine" : "feminine") : nounGender;
  const baseText =
    n === 1
      ? actualGender === "masculine"
        ? "un"
        : "o"
      : numToRo(n, actualGender);
  const usesDe = n !== 1 && takesDePreposition(n);
  return {
    wordsText: usesDe ? `${baseText} de` : baseText,
    actualGender,
    usesDe,
  };
}

interface NounSpec {
  singularRo: string;
  pluralRo: string;
  gender: "masculine" | "feminine" | "neuter";
  singularEn: string;
  pluralEn: string;
}

const NOUNS: NounSpec[] = [
  {
    singularRo: "an",
    pluralRo: "ani",
    gender: "masculine",
    singularEn: "year",
    pluralEn: "years",
  },
  {
    singularRo: "băiat",
    pluralRo: "băieți",
    gender: "masculine",
    singularEn: "boy",
    pluralEn: "boys",
  },
  {
    singularRo: "câine",
    pluralRo: "câini",
    gender: "masculine",
    singularEn: "dog",
    pluralEn: "dogs",
  },
  {
    singularRo: "astronaut",
    pluralRo: "astronauți",
    gender: "masculine",
    singularEn: "astronaut",
    pluralEn: "astronauts",
  },
  {
    singularRo: "fată",
    pluralRo: "fete",
    gender: "feminine",
    singularEn: "girl",
    pluralEn: "girls",
  },
  {
    singularRo: "pisică",
    pluralRo: "pisici",
    gender: "feminine",
    singularEn: "cat",
    pluralEn: "cats",
  },
  {
    singularRo: "carte",
    pluralRo: "cărți",
    gender: "feminine",
    singularEn: "book",
    pluralEn: "books",
  },
  {
    singularRo: "stea",
    pluralRo: "stele",
    gender: "feminine",
    singularEn: "star",
    pluralEn: "stars",
  },
  {
    singularRo: "măr",
    pluralRo: "mere",
    gender: "neuter",
    singularEn: "apple",
    pluralEn: "apples",
  },
  {
    singularRo: "creion",
    pluralRo: "creioane",
    gender: "neuter",
    singularEn: "pencil",
    pluralEn: "pencils",
  },
  {
    singularRo: "film",
    pluralRo: "filme",
    gender: "neuter",
    singularEn: "movie",
    pluralEn: "movies",
  },
  {
    singularRo: "oraș",
    pluralRo: "orașe",
    gender: "neuter",
    singularEn: "city",
    pluralEn: "cities",
  },
];

const LARGE_NOUNS: NounSpec[] = [
  {
    singularRo: "locuitor",
    pluralRo: "locuitori",
    gender: "masculine",
    singularEn: "inhabitant",
    pluralEn: "inhabitants",
  },
  NOUNS[7]!,
  {
    singularRo: "pagină",
    pluralRo: "pagini",
    gender: "feminine",
    singularEn: "page",
    pluralEn: "pages",
  },
  {
    singularRo: "euro",
    pluralRo: "euro",
    gender: "masculine",
    singularEn: "euro",
    pluralEn: "euros",
  },
];

const PRONOUN_HAVE = [
  { ro: "Eu am", en: "I have" },
  { ro: "Tu ai", en: "You have" },
  { ro: "El are", en: "He has" },
  { ro: "Ea are", en: "She has" },
  { ro: "Noi avem", en: "We have" },
  { ro: "Voi aveți", en: "You all have" },
  { ro: "Ei au", en: "They have" },
  { ro: "Ele au", en: "They have" },
] as const;

function buildNumeralsExercises(
  seedOffset: number,
  count: number,
): GeneratedExercise[] {
  const rng = mulberry32(3101 + seedOffset * 131);
  // Healthy pedagogical ladder: units, teens, tens, hundreds, thousands, millions
  const bands: Array<[number, number]> = [
    [1, 9],
    [10, 19],
    [20, 99],
    [100, 999],
    [1000, 999999],
    [1000000, 50000000],
  ];
  const perBand = Math.max(1, Math.floor(count / bands.length));
  const used = new Set<string>();
  const rawItems: Array<Omit<GeneratedExercise, "id" | "orderIndex">> = [];

  for (let bIdx = 0; bIdx < bands.length; bIdx++) {
    const [start, end] = bands[bIdx]!;
    const targetForBand =
      bIdx === bands.length - 1 ? count - rawItems.length : perBand;
    let made = 0;
    let guard = 0;
    while (made < targetForBand && guard < 400) {
      guard++;
      const n = randInt(rng, start, end);
      const noun = pick(rng, start >= 10000 ? LARGE_NOUNS : NOUNS);
      const pv = pick(rng, PRONOUN_HAVE);
      const key = `${n}_${noun.singularRo}_${pv.ro}`;
      if (used.has(key)) continue;
      used.add(key);

      const nRo = n === 1 ? noun.singularRo : noun.pluralRo;
      const nEn = n === 1 ? noun.singularEn : noun.pluralEn;
      const nFormatted = n.toLocaleString("en-US");
      const { wordsText, usesDe } = getNumeralPhrase(n, noun.gender);
      const blanks = wordsText.split(" ");

      let prefix: string = pv.ro;
      let suffix = `(${nFormatted}) ${nRo}.`;
      let promptEn = `${pv.en} ${nFormatted} ${nEn}.`;

      if (noun.singularRo === "locuitor") {
        prefix = "Orașul are";
        promptEn = `The city has ${nFormatted} ${nEn}.`;
      } else if (noun.singularRo === "astronaut") {
        prefix = "Noi vedem";
        promptEn = `We see ${nFormatted} ${nEn}.`;
      } else if (noun.singularRo !== "an") {
        const variant = randInt(rng, 0, 2);
        if (variant === 1) {
          prefix = n === 1 ? "Este" : "Sunt";
          suffix = `(${nFormatted}) ${nRo} aici.`;
          promptEn = `There ${n === 1 ? "is" : "are"} ${nFormatted} ${nEn} here.`;
        } else if (variant === 2) {
          prefix = "Noi vedem";
          suffix = `(${nFormatted}) ${nRo} în curte.`;
          promptEn = `We see ${nFormatted} ${nEn} in the yard.`;
        }
      }

      const { promptRoTemplate, roSegments } = makeBlankSentence(
        prefix,
        blanks.length,
        suffix,
      );
      rawItems.push({
        exerciseType: "FILL_IN_BLANKS",
        promptEn,
        promptRoTemplate,
        roSegments,
        blanksCount: blanks.length,
        acceptedBlanks: blanks,
        hint: usesDe
          ? `Number ends in ${(n % 100).toString().padStart(2, "0")} -> include "de" at the end (${noun.gender} noun)`
          : `No "de" before "${nRo}" (${noun.gender} noun)`,
        knowledgeNodeId: "ro_cardinal_numerals",
      });
      made++;
    }
  }

  shuffle(rng, rawItems);
  return rawItems.map((item, idx) => ({
    ...item,
    id: `gen:ro-numerals-ch1:${seedOffset}:${idx}`,
    orderIndex: idx + 1,
  }));
}

export function generatePracticeExercises(
  seriesId: string,
  seedOffset = 0,
  count = 12,
): GeneratedExercise[] {
  if (seriesId === "ro-verbs-ch1") {
    return buildVerbExercises(
      "ro-verbs-ch1",
      CORE_VERBS,
      "ro_verb_tenses_core",
      seedOffset,
      count,
    );
  }
  if (seriesId === "ro-verbs-ch2") {
    return buildVerbExercises(
      "ro-verbs-ch2",
      GROUP1_VERBS,
      "ro_verb_group1_a_family",
      seedOffset,
      count,
    );
  }
  if (seriesId === "ro-numerals-ch1") {
    return buildNumeralsExercises(seedOffset, count);
  }
  return [];
}

export function resolveGeneratedExercise(
  exerciseId: string,
): GeneratedExercise | undefined {
  const parts = exerciseId.split(":");
  if (parts.length !== 4 || parts[0] !== "gen") return undefined;
  const [, seriesId, seedStr, idxStr] = parts;
  const seedOffset = Number(seedStr);
  const idx = Number(idxStr);
  if (
    !seriesId ||
    !Number.isInteger(seedOffset) ||
    seedOffset < 0 ||
    seedOffset > 10000 ||
    !Number.isInteger(idx) ||
    idx < 0 ||
    idx >= 40
  ) {
    return undefined;
  }
  const batch = generatePracticeExercises(
    seriesId,
    seedOffset,
    Math.max(12, idx + 1),
  );
  return batch[idx];
}
