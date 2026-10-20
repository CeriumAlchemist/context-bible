import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Book } from "./books";

/**
 * A book-level overview (data/books/<slug>.json): who wrote it, to whom, when, where and why.
 * Each field is a short statement; the context cards cite them as b:<field>.
 */
export interface BookOverview {
  author: string;
  recipients: string;
  date: { traditional: string; scholarly?: string };
  writtenFrom: string;
  destination: string;
  purpose: string;
  setting: string;
  outline: { range: string; title: string }[];
  themes: string[];
  /** Where the overview's content comes from. */
  basis: string;
}

export async function loadOverview(book: Book): Promise<BookOverview | null> {
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), "data", "books", `${book.slug}.json`), "utf8"));
  } catch {
    return null;
  }
}
