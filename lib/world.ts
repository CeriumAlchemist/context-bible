import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Book } from "./books";
import { formatReference, parseReference, referencePath } from "./reference";

/**
 * "The world around the text" for a book (data/world/<slug>.json): who ruled, what was happening nearby,
 * and what the places named in the book were like. Every note lists its sources, Scripture first.
 *
 * Sources are plain strings. A Bible reference ("Acts 19:24-27") becomes a link; anything else
 * ("Tacitus, Annals 15.44") is shown as written.
 */
export interface WorldNote {
  text: string;
  sources: string[];
  /** Verses of the book this note bears on directly, as "2:1-2" or "5:18". */
  verses?: string[];
}

export interface Ruler extends WorldNote {
  name: string;
  role: string;
  years: string;
}

export type EventKind = "war" | "disaster" | "rule" | "church" | "discovery" | "building";

export interface WorldEvent extends WorldNote {
  /** First year (AD positive, BC negative), for ordering. */
  year: number;
  /** The date as it should be read, with any "c." or range. */
  when: string;
  kind: EventKind;
  title: string;
}

export interface PlaceFact extends WorldNote {
  topic: string;
}

export interface PlaceProfile {
  slug: string;
  name: string;
  summary: string;
  facts: PlaceFact[];
}

export interface MapLabel {
  name: string;
  lat: number;
  lon: number;
}

export interface World {
  period: { label: string; note: string };
  map: { places: string[]; primary: string[]; regions: MapLabel[]; seas: MapLabel[] };
  rulers: Ruler[];
  events: WorldEvent[];
  places: PlaceProfile[];
  life: PlaceFact[];
  basis: string;
}

export async function loadWorld(book: Book): Promise<World | null> {
  try {
    const world: World = JSON.parse(await readFile(path.join(process.cwd(), "data", "world", `${book.slug}.json`), "utf8"));
    world.events.sort((a, b) => a.year - b.year);
    return world;
  } catch {
    return null;
  }
}

/** Whether a note's verse list ("2:1-2", "5:18") includes chapter:verse. */
export function touches(note: WorldNote, chapter: number, verse: number): boolean {
  return (note.verses ?? []).some((r) => {
    const m = r.match(/^(\d+):(\d+)(?:-(\d+))?$/);
    if (!m) return false;
    const [c, from, to] = [Number(m[1]), Number(m[2]), Number(m[3] ?? m[2])];
    return c === chapter && verse >= from && verse <= to;
  });
}

/** Everything in the book's world notes that bears directly on one verse. */
export function notesForVerse(world: World, chapter: number, verse: number) {
  const hit = <T extends WorldNote>(list: T[]) => list.filter((n) => touches(n, chapter, verse));
  return {
    rulers: hit(world.rulers),
    events: hit(world.events),
    places: world.places.flatMap((p) => hit(p.facts).map((f) => ({ ...f, place: p.name }))),
    life: hit(world.life),
  };
}

/** A label for a source and, for a Bible reference, a link to it. */
export function describeWorldSource(source: string): { label: string; href?: string } {
  const parsed = parseReference(source);
  if (parsed.ok && parsed.ref.chapter) return { label: formatReference(parsed.ref), href: referencePath(parsed.ref) };
  return { label: source };
}
