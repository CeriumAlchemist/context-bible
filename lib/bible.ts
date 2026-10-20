import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type { Book } from "./books";

const DATA = path.join(process.cwd(), "data", "translations");

/** All chapters of one book in one translation: chapters[c - 1][v - 1]. */
export const loadBook = cache(async (translationId: string, book: Book): Promise<string[][]> => {
  const raw = await readFile(path.join(DATA, translationId, `${book.slug}.json`), "utf8");
  return JSON.parse(raw);
});

export async function loadChapter(translationId: string, book: Book, chapter: number): Promise<string[]> {
  const chapters = await loadBook(translationId, book);
  return chapters[chapter - 1] ?? [];
}
