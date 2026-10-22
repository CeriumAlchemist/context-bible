import { loadChapter } from "../bible";
import { BOOKS, type Book } from "../books";
import { loadOverview } from "../books-overview";
import { formatReference } from "../reference";
import { crossRefsFor, isFunctionWord, lexiconFor, placesFor, wordsFor, type Word } from "../study";
import { PRIMARY } from "../translations";

/**
 * Everything the model may use to write one verse's card, each piece under a source id:
 *   v:<chapter>.<verse>     a KJV verse from the same chapter
 *   b:<field>               a field of the book overview (b:date, b:purpose, ...)
 *   w:<strong>              a lexicon entry for a word in the verse
 *   x:<slug>.<ch>.<v>[-<v>] a cross-referenced passage
 *   p:<slug>                a place named in the verse
 */
export interface Packet {
  book: Book;
  chapter: number;
  verse: number;
  sources: Map<string, string>;
  /** The verse's own original-language words, for the key-word check. */
  words: Word[];
}

export async function buildPacket(book: Book, chapter: number, verse: number): Promise<Packet> {
  const sources = new Map<string, string>();

  const kjv = await loadChapter(PRIMARY.id, book, chapter);
  kjv.forEach((text, i) => sources.set(`v:${chapter}.${i + 1}`, text));

  const overview = await loadOverview(book);
  if (overview) {
    sources.set("b:author", overview.author);
    sources.set("b:recipients", overview.recipients);
    sources.set(
      "b:date",
      `Traditional: ${overview.date.traditional}` + (overview.date.scholarly ? ` Scholarly: ${overview.date.scholarly}` : ""),
    );
    sources.set("b:writtenFrom", overview.writtenFrom);
    sources.set("b:destination", overview.destination);
    sources.set("b:purpose", overview.purpose);
    sources.set("b:setting", overview.setting);
    sources.set("b:outline", overview.outline.map((o) => `${o.range} ${o.title}`).join("; "));
    sources.set("b:themes", overview.themes.join(" "));
  }

  const words = await wordsFor(book, chapter, verse);
  const lexicon = await lexiconFor(book);
  for (const [original, translit, english, strong] of words) {
    const entry = lexicon[strong];
    if (!entry || isFunctionWord(strong) || sources.has(`w:${strong}`)) continue;
    sources.set(`w:${strong}`, `${original} (${translit}), "${english}" here. ${entry.g}. ${entry.d.replace(/\n/g, "; ")}`);
  }

  for (const [b, c, vs, ve] of await crossRefsFor(book, chapter, verse)) {
    const target = BOOKS[b - 1];
    const text = (await loadChapter(PRIMARY.id, target, c)).slice(vs - 1, ve).join(" ");
    const id = `x:${target.slug}.${c}.${vs}${ve !== vs ? `-${ve}` : ""}`;
    sources.set(id, `${formatReference({ book: target, chapter: c, verseStart: vs, verseEnd: ve })}: ${text}`);
  }

  for (const p of await placesFor(book, chapter, verse)) {
    sources.set(`p:${p.slug}`, `${p.name}, a ${p.type}, at latitude ${p.lat.toFixed(2)}, longitude ${p.lon.toFixed(2)}.`);
  }

  return { book, chapter, verse, sources, words };
}

/** The packet as the model reads it: one "[id] text" line per source. */
export function renderPacket(packet: Packet): string {
  return [...packet.sources].map(([id, text]) => `[${id}] ${text}`).join("\n");
}
