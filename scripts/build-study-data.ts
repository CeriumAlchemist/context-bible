/**
 * Builds the study data that sits beside the translations:
 *   data/words/<book-slug>.json     original-language words per verse (STEPBible TAHOT / TAGNT)
 *   data/lexicon/<hebrew|greek>.json brief lexicon entries for every Strong's number used (STEPBible TBESH / TBESG)
 *   data/crossrefs/<book-slug>.json  top cross-references per verse (OpenBible.info, via scrollmapper)
 *   data/places.json                 places named in each verse, with coordinates (OpenBible.info geocoding)
 *
 * Verse numbers follow the English (KJV) versification throughout.
 * Run with: npm run build:study
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { BOOKS } from "../lib/books";
import type { CrossRef, LexiconEntry, Place, Word } from "../lib/study";

const DATA = path.join(process.cwd(), "data");
const STEP = "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master";
const SCROLLMAPPER = "https://raw.githubusercontent.com/scrollmapper/bible_databases/master";
const GEO = "https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main";

/** Cross-references kept per verse, highest-voted first. */
const MAX_CROSSREFS = 8;

// Book codes in canonical order, as each source spells them.
const STEP_CODES =
  "Gen Exo Lev Num Deu Jos Jdg Rut 1Sa 2Sa 1Ki 2Ki 1Ch 2Ch Ezr Neh Est Job Psa Pro Ecc Sng Isa Jer Lam Ezk Dan Hos Jol Amo Oba Jon Mic Nam Hab Zep Hag Zec Mal Mat Mrk Luk Jhn Act Rom 1Co 2Co Gal Eph Php Col 1Th 2Th 1Ti 2Ti Tit Phm Heb Jas 1Pe 2Pe 1Jn 2Jn 3Jn Jud Rev".split(" ");
const OSIS_CODES =
  "Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev".split(" ");

const STEP_FILES = [
  "Translators Amalgamated OT+NT/TAHOT Gen-Deu - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
  "Translators Amalgamated OT+NT/TAHOT Jos-Est - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
  "Translators Amalgamated OT+NT/TAHOT Job-Sng - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
  "Translators Amalgamated OT+NT/TAHOT Isa-Mal - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt",
  "Translators Amalgamated OT+NT/TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt",
  "Translators Amalgamated OT+NT/TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt",
];
const LEXICONS = {
  hebrew: "Lexicons/TBESH - Translators Brief lexicon of Extended Strongs for Hebrew - STEPBible.org CC BY.txt",
  greek: "Lexicons/TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt",
};

async function getText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
  return res.text();
}

const stepUrl = (file: string) => `${STEP}/${file.split("/").map(encodeURIComponent).join("/")}`;

/** chapters[c - 1][v - 1] for every book, sized from the KJV's chapter counts and verse lengths. */
async function emptyGrid<T>(): Promise<T[][][][]> {
  return Promise.all(
    BOOKS.map(async (b) => {
      const kjv: string[][] = JSON.parse(await readFile(path.join(DATA, "translations", "kjv", `${b.slug}.json`), "utf8"));
      return kjv.map((verses) => verses.map(() => [] as T[]));
    }),
  );
}

// "Gen.1.1#01=L", "Psa.51.1(51.3)#01=L", "Jhn.3.16#01=NKO". The first reference is the English versification.
const WORD_REF = /^([1-3][A-Z][a-z]|[A-Z][a-z]{2})\.(\d+)\.(\d+)(?:\([^)]*\))?#\d+=(\S+)$/;

/** Hebrew: follow the Leningrad text and its Qere readings, as translators do. Greek: words in the KJV's text. */
function inKjvText(isGreek: boolean, type: string): boolean {
  return isGreek ? /k/i.test(type) : /^[LQRX]/.test(type);
}

/** The main Strong's number of a tagged word: "H9003/{H7225G}" -> "H7225G", "G3779=ADV" -> "G3779". */
function mainStrong(field: string): string {
  const braced = field.match(/\{([HG]\d+[A-Za-z]?)\}/);
  if (braced) return braced[1];
  return field.match(/[HG]\d+[A-Za-z]?/)?.[0] ?? "";
}

async function buildWords() {
  const grid = await emptyGrid<Word>();
  const used = { hebrew: new Set<string>(), greek: new Set<string>() };
  let words = 0;

  for (const file of STEP_FILES) {
    const isGreek = file.includes("TAGNT");
    for (const line of (await getText(stepUrl(file))).split("\n")) {
      const cols = line.split("\t");
      const m = cols[0]?.match(WORD_REF);
      if (!m || !inKjvText(isGreek, m[4])) continue;

      const bookIndex = STEP_CODES.indexOf(m[1]);
      const chapter = Number(m[2]);
      const verse = Number(m[3]);
      // Verse 0 is a Hebrew psalm title, which the KJV prints unnumbered above verse 1.
      const slot = grid[bookIndex]?.[chapter - 1]?.[verse === 0 ? 0 : verse - 1];
      if (!slot) continue;

      let word: Word;
      if (isGreek) {
        // "οὕτως (houtōs)" | "Thus" | "G3779=ADV"
        const [, greek = "", translit = ""] = cols[1].match(/^(.*?)\s*\((.*)\)$/) ?? [];
        const [strongField, morph = ""] = cols[3].split("=");
        word = [greek.replace(/[[\]]/g, ""), translit, cols[2], mainStrong(strongField), morph];
        used.greek.add(word[3]);
      } else {
        // "בְּ/רֵאשִׁ֖ית" | "be./re.Shit" | "in/ beginning" | "H9003/{H7225G}" | "HR/Ncfsa"
        word = [cols[1].replace(/[/\\]/g, ""), cols[2].replace(/\//g, ""), cols[3].replace(/\/\s*/g, " "), mainStrong(cols[4]), cols[5]];
        used.hebrew.add(word[3]);
      }
      slot.push(word);
      words++;
    }
  }

  await mkdir(path.join(DATA, "words"), { recursive: true });
  for (const [i, b] of BOOKS.entries()) {
    await writeFile(path.join(DATA, "words", `${b.slug}.json`), JSON.stringify(grid[i]));
  }
  console.log(`words: ${words}`);
  return used;
}

/** Plain text from the lexicons' light HTML, cut at a line break near maxLen. */
function plainDefinition(html: string, maxLen = 600): string {
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/__/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*/g, "\n")
    .trim();
  if (text.length <= maxLen) return text;
  const cut = text.lastIndexOf("\n", maxLen);
  return (cut > maxLen / 3 ? text.slice(0, cut) : text.slice(0, maxLen)).trim() + " …";
}

async function buildLexicons(used: { hebrew: Set<string>; greek: Set<string> }) {
  await mkdir(path.join(DATA, "lexicon"), { recursive: true });
  for (const lang of ["hebrew", "greek"] as const) {
    const all = new Map<string, LexiconEntry>();
    for (const line of (await getText(stepUrl(LEXICONS[lang]))).split("\n")) {
      // eStrong | dStrong = | uStrong | word | transliteration | morph | gloss | definition
      const cols = line.split("\t");
      if (!/^[HG]\d+/.test(cols[0] ?? "") || cols.length < 8) continue;
      const entry: LexiconEntry = { w: cols[3], tr: cols[4], g: cols[6], d: plainDefinition(cols[7]) };
      for (const key of [cols[0].toUpperCase(), cols[2].trim().toUpperCase()]) {
        if (key && !all.has(key)) all.set(key, entry);
      }
    }

    const out: Record<string, LexiconEntry> = {};
    let missing = 0;
    for (const s of used[lang]) {
      // Fall back from a disambiguated number (H0430G) to the plain one (H0430).
      const entry = all.get(s.toUpperCase()) ?? all.get(s.replace(/[A-Za-z]$/, "").toUpperCase());
      if (entry) out[s] = entry;
      else missing++;
    }
    await writeFile(path.join(DATA, "lexicon", `${lang}.json`), JSON.stringify(out));
    console.log(`lexicon ${lang}: ${Object.keys(out).length} entries, ${missing} numbers without one`);
  }
}

async function buildCrossRefs() {
  // scrollmapper names books as its KJV file does ("I Samuel", "Revelation of John"); map by position.
  const kjv = JSON.parse(await getText(`${SCROLLMAPPER}/formats/json/KJV.json`));
  const bookIndex = new Map<string, number>(kjv.books.map((b: { name: string }, i: number) => [b.name, i]));
  const grid = await emptyGrid<CrossRef>();
  const row = /VALUES \('([^']+)', (\d+), (\d+), '([^']+)', (\d+), (\d+), (\d+), (-?\d+)\)/g;

  let total = 0;
  for (let part = 0; part <= 6; part++) {
    const sql = await getText(`${SCROLLMAPPER}/formats/sql/extras/cross_references_${part}.sql`);
    for (const m of sql.matchAll(row)) {
      const from = bookIndex.get(m[1]);
      const to = bookIndex.get(m[4]);
      const votes = Number(m[8]);
      const slot = from === undefined ? undefined : grid[from]?.[Number(m[2]) - 1]?.[Number(m[3]) - 1];
      if (!slot || to === undefined || votes <= 0) continue;
      slot.push([to + 1, Number(m[5]), Number(m[6]), Number(m[7]), votes]);
      total++;
    }
  }

  await mkdir(path.join(DATA, "crossrefs"), { recursive: true });
  for (const [i, b] of BOOKS.entries()) {
    for (const verses of grid[i]) {
      for (const refs of verses) refs.sort((a, z) => z[4] - a[4]).splice(MAX_CROSSREFS);
    }
    await writeFile(path.join(DATA, "crossrefs", `${b.slug}.json`), JSON.stringify(grid[i]));
  }
  console.log(`cross-references: ${total} with positive votes, top ${MAX_CROSSREFS} kept per verse`);
}

async function buildPlaces() {
  const places: Place[] = [];
  const byVerse: Record<string, number[]> = {};

  for (const line of (await getText(`${GEO}/data/ancient.jsonl`)).split("\n")) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    const best = r.identifications?.[0];
    const lonlat: string | undefined = best?.resolutions?.find((x: { lonlat?: string }) => x.lonlat)?.lonlat;
    if (!lonlat) continue;
    const [lon, lat] = lonlat.split(",").map(Number);
    const id = places.length;
    places.push({
      name: r.friendly_id,
      type: r.types?.[0] ?? "place",
      lat,
      lon,
      // OpenBible's 0-1000 confidence that this identification is right.
      confidence: best.score?.vote_average ?? 0,
      slug: r.url_slug,
    });
    for (const v of r.verses ?? []) {
      const [osis, ch, vs] = String(v.osis).split(".");
      const b = OSIS_CODES.indexOf(osis);
      if (b < 0) continue;
      (byVerse[`${BOOKS[b].slug}.${ch}.${vs}`] ??= []).push(id);
    }
  }

  await writeFile(path.join(DATA, "places.json"), JSON.stringify({ places, byVerse }));
  console.log(`places: ${places.length}, in ${Object.keys(byVerse).length} verses`);
}

async function main() {
  const used = await buildWords();
  await buildLexicons(used);
  await buildCrossRefs();
  await buildPlaces();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
