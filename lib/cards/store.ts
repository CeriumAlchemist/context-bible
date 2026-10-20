import { readFile } from "node:fs/promises";
import path from "node:path";
import { bookBySlug, type Book } from "../books";
import type { StoredCard } from "./schema";

/** A card is shown only once it has passed the automated checks and the second AI pass found nothing unsupported. */
export function isPublishable(card: StoredCard): boolean {
  return card.status === "reviewed" || (card.problems.length === 0 && card.unsupported.length === 0);
}

export async function loadCard(book: Book, chapter: number, verse: number): Promise<StoredCard | null> {
  try {
    const file = path.join(process.cwd(), "data", "cards", book.slug, `${chapter}.${verse}.json`);
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

/** A short label and, where there is one, a link for a source id. */
export function describeSource(book: Book, id: string): { label: string; href?: string } {
  const [kind, rest] = [id.slice(0, 1), id.slice(2)];
  switch (kind) {
    case "v": {
      const [c, v] = rest.split(".");
      return { label: `${book.name} ${c}:${v}`, href: `/${book.slug}/${c}/${v}` };
    }
    case "x": {
      const [slug, c, v] = rest.split(".");
      return { label: `${bookBySlug(slug)?.name ?? slug} ${c}:${v}`, href: `/${slug}/${c}/${v}` };
    }
    case "b":
      return { label: `${book.name} overview`, href: `/${book.slug}#overview` };
    case "w":
      return { label: `Strong's ${rest}` };
    case "p":
      return { label: rest.replace(/-/g, " ").replace(/\b[a-z]/g, (c) => c.toUpperCase()), href: `https://www.openbible.info/geo/ancient/${rest}` };
    default:
      return { label: id };
  }
}
