import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Book } from "./books";

/** [original, transliteration, English gloss in this verse, Strong's number, morphology code] */
export type Word = [string, string, string, string, string];

/** A Strong's entry: word, transliteration, short gloss, definition. */
export interface LexiconEntry {
  w: string;
  tr: string;
  g: string;
  d: string;
}

/** [book number (1-66), chapter, first verse, last verse, OpenBible votes] */
export type CrossRef = [number, number, number, number, number];

export interface Place {
  name: string;
  type: string;
  lat: number;
  lon: number;
  /** OpenBible's 0-1000 confidence in the identification. */
  confidence: number;
  slug: string;
}

const DATA = path.join(process.cwd(), "data");

// Study files are read once per server process and kept in memory.
const files = new Map<string, Promise<unknown>>();
function load<T>(file: string): Promise<T> {
  if (!files.has(file)) {
    files.set(
      file,
      readFile(path.join(DATA, file), "utf8").then((raw) => JSON.parse(raw)),
    );
  }
  return files.get(file) as Promise<T>;
}

export async function wordsFor(book: Book, chapter: number, verse: number): Promise<Word[]> {
  const grid = await load<Word[][][]>(`words/${book.slug}.json`);
  return grid[chapter - 1]?.[verse - 1] ?? [];
}

export async function lexiconFor(book: Book): Promise<Record<string, LexiconEntry>> {
  return load(`lexicon/${book.testament === "OT" ? "hebrew" : "greek"}.json`);
}

export async function crossRefsFor(book: Book, chapter: number, verse: number): Promise<CrossRef[]> {
  const grid = await load<CrossRef[][][]>(`crossrefs/${book.slug}.json`);
  return grid[chapter - 1]?.[verse - 1] ?? [];
}

export async function placesFor(book: Book, chapter: number, verse: number): Promise<Place[]> {
  const { places, byVerse } = await load<{ places: Place[]; byVerse: Record<string, number[]> }>("places.json");
  return (byVerse[`${book.slug}.${chapter}.${verse}`] ?? []).map((i) => places[i]);
}

/**
 * Syllable-by-syllable pronunciation from a STEPBible transliteration, which marks syllables with dots
 * and the stressed syllable with a capital: "be.re.Shit" -> "be-re-SHIT".
 * Greek transliterations carry no syllable marks and come back unchanged.
 */
export function pronunciation(translit: string): string {
  if (!translit.includes(".")) return translit;
  return translit
    .split(".")
    .filter(Boolean)
    .map((s) => (/^[^a-z]*[A-Z]/.test(s) ? s.toUpperCase() : s))
    .join("-");
}

/** Prefixes, suffixes and particles tagged H9001 to H9049 (and, the, in, object marker, punctuation). */
export function isFunctionWord(strong: string): boolean {
  return /^H90[0-4]\d/.test(strong) || strong === "H0853";
}

/** Places by OpenBible slug, for maps that name places the verse itself doesn't. */
export async function placesBySlug(slugs: string[]): Promise<Place[]> {
  const { places } = await load<{ places: Place[] }>("places.json");
  return slugs.map((s) => places.find((p) => p.slug === s)).filter((p): p is Place => !!p);
}
