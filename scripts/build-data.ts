/**
 * Downloads the public domain translations and writes one compact JSON file per book:
 *   data/translations/<id>/<book-slug>.json  ->  string[][]  (chapters -> verses)
 *
 * Run with: npm run build:data
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { BOOKS } from "../lib/books";
import { TRANSLATIONS } from "../lib/translations";

const OUT = path.join(process.cwd(), "data", "translations");
const EXPECTED_VERSES = 31102;

type Chapters = string[][];

async function getJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
  return res.json();
}

// KJV: one file per book, verses as {verse, text}. Keeps the KJV's punctuation and "LORD".
async function loadAruljohnKjv(): Promise<Chapters[]> {
  const base = "https://raw.githubusercontent.com/aruljohn/Bible-kjv/master";
  const names: string[] = await getJson(`${base}/Books.json`);
  return Promise.all(
    names.map(async (name) => {
      const book = await getJson(`${base}/${name.replace(/\s+/g, "")}.json`);
      return book.chapters.map((c: any) => c.verses.map((v: any) => String(v.text).trim()));
    }),
  );
}

// BSB, ASV: one file per translation, books in canonical order.
async function loadScrollmapper(code: string): Promise<Chapters[]> {
  const data = await getJson(
    `https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/${code}.json`,
  );
  return data.books.map((b: any) =>
    b.chapters.map((c: any) => c.verses.map((v: any) => String(v.text).trim())),
  );
}

const LOADERS: Record<string, () => Promise<Chapters[]>> = {
  kjv: loadAruljohnKjv,
  bsb: () => loadScrollmapper("BSB"),
  asv: () => loadScrollmapper("ASV"),
};

async function main() {
  for (const t of TRANSLATIONS) {
    const books = await LOADERS[t.id]();
    if (books.length !== BOOKS.length) throw new Error(`${t.id}: expected 66 books, got ${books.length}`);

    let verses = 0;
    await mkdir(path.join(OUT, t.id), { recursive: true });
    for (const [i, chapters] of books.entries()) {
      const book = BOOKS[i];
      if (chapters.length !== book.chapters) {
        throw new Error(`${t.id} ${book.name}: expected ${book.chapters} chapters, got ${chapters.length}`);
      }
      verses += chapters.reduce((n, c) => n + c.length, 0);
      await writeFile(path.join(OUT, t.id, `${book.slug}.json`), JSON.stringify(chapters));
    }
    if (verses !== EXPECTED_VERSES) throw new Error(`${t.id}: expected ${EXPECTED_VERSES} verses, got ${verses}`);
    console.log(`${t.id}: ${books.length} books, ${verses} verses`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
