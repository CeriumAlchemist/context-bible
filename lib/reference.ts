import { Book, findBook } from "./books";

export interface Reference {
  book: Book;
  /** Absent for a whole-book request such as "1 Timothy". */
  chapter?: number;
  verseStart?: number;
  /** Equal to verseStart for a single verse. */
  verseEnd?: number;
}

export type ParseResult =
  | { ok: true; ref: Reference }
  | { ok: false; error: string };

const PATTERN =
  /^((?:[1-3]|i{1,3})?\s*[a-z][a-z.\s]*?)\s*(?:(\d+)(?:\s*[:.\s]\s*(\d+)(?:\s*[-–—]\s*(\d+))?)?)?$/i;

/**
 * Parses what people type: "John 3:16", "1 Tim 2:1-3", "ps 23", "Genesis 1", "1 Timothy".
 * Chapter bounds are checked here; verse bounds need the text and are checked by the caller.
 */
export function parseReference(input: string): ParseResult {
  const m = input.trim().match(PATTERN);
  if (!m) return { ok: false, error: `Couldn't read "${input}" as a Bible reference.` };

  const [, bookPart, ch, vs, ve] = m;
  const book = findBook(bookPart);
  if (!book) return { ok: false, error: `"${bookPart.trim()}" isn't a book of the Bible we recognize.` };

  if (!ch) return { ok: true, ref: { book } };

  const chapter = Number(ch);
  if (chapter < 1 || chapter > book.chapters) {
    return { ok: false, error: `${book.name} has ${book.chapters} chapter${book.chapters === 1 ? "" : "s"}.` };
  }
  if (!vs) return { ok: true, ref: { book, chapter } };

  const verseStart = Number(vs);
  const verseEnd = ve ? Number(ve) : verseStart;
  if (verseStart < 1 || verseEnd < verseStart) {
    return { ok: false, error: `Verse range ${vs}-${ve} doesn't make sense.` };
  }
  return { ok: true, ref: { book, chapter, verseStart, verseEnd } };
}

export function formatReference(ref: Reference): string {
  let s = ref.book.name;
  if (ref.chapter) s += ` ${ref.chapter}`;
  if (ref.verseStart) s += `:${ref.verseStart}`;
  if (ref.verseEnd && ref.verseEnd !== ref.verseStart) s += `-${ref.verseEnd}`;
  return s;
}

/** URL path for a reference: /john/3/16, /1-timothy/2/1-3, /genesis/1, /1-timothy. */
export function referencePath(ref: Reference): string {
  let p = `/${ref.book.slug}`;
  if (ref.chapter) p += `/${ref.chapter}`;
  if (ref.verseStart) p += `/${ref.verseStart}`;
  if (ref.verseEnd && ref.verseEnd !== ref.verseStart) p += `-${ref.verseEnd}`;
  return p;
}
