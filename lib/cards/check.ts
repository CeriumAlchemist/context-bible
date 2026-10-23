import { BOOKS } from "../books";
import { parseReference } from "../reference";
import type { Claim, ContextCard } from "./schema";

/** Every claim on a card, with a label saying where it sits. */
export function claimsOf(card: ContextCard): [string, Claim][] {
  const out: [string, Claim][] = [
    ["in_context", card.in_context],
    ["who.speaker", card.who.speaker],
    ["who.audience", card.who.audience],
    ["what", card.what],
    ["when.events", card.when.events],
    ["when.written", card.when.written],
    ["where", card.where],
    ["why.purpose", card.why.purpose],
    ["why.big_picture", card.why.big_picture],
    ["why.for_readers", card.why.for_readers],
    ["takeaway", card.takeaway],
  ];
  if (card.who.affected) out.push(["who.affected", card.who.affected]);
  if (card.misuse) out.push(["misuse", card.misuse.in_context_reading]);
  if (card.christians_differ) out.push(["christians_differ", card.christians_differ]);
  card.key_words.forEach((k, i) => out.push([`key_words.${i}`, k.why_it_matters]));
  return out;
}

/**
 * Hedges about whether Christians agree, outside christians_differ. Kourtland's rule: when the text is clear,
 * answer from Scripture instead. Authorship and dating views (when.written, who.speaker) are exempt.
 */
const HEDGE =
  /\b(?:debated|(?:christians|readers|churches|traditions|interpreters|scholars)\s+(?:still\s+)?(?:differ|disagree|debate|read (?:it|this|the verse) differently))\b|\breaders (?:take|read) (?:it|this) (?:in )?(?:different|several) ways\b|\bhow far (?:it|this)(?: verse)? applies\b/i;
const HEDGE_EXEMPT = new Set(["christians_differ", "when.written", "who.speaker"]);

// "Acts 19:1", "1 Timothy 3:14-15", "Rom. 8:28". Bare "3:14" refers to the same book and is checked by the source ids.
const SCRIPTURE_REF = /\b((?:[1-3]\s?)?[A-Z][a-z]+\.?(?:\s(?:of\s)?[A-Z][a-z]+)?)\s(\d{1,3}):(\d{1,3})(?:[-–](\d{1,3}))?/g;

export interface CheckInput {
  card: ContextCard;
  /** Source ids the model was given. */
  sourceIds: Set<string>;
  /** Strong's numbers of the verse's own words. */
  verseStrongs: Set<string>;
  /** How many verses a chapter has, or undefined if the book or chapter doesn't exist. */
  versesIn: (bookSlug: string, chapter: number) => number | undefined;
}

/** Automated checks run on every card before it can be shown. Returns a list of problems; empty means it passed. */
export function checkCard({ card, sourceIds, verseStrongs, versesIn }: CheckInput): string[] {
  const problems: string[] = [];

  for (const [where, claim] of claimsOf(card)) {
    const hedge = HEDGE_EXEMPT.has(where) ? null : claim.text.match(HEDGE);
    if (hedge) problems.push(`${where}: hedges ("${hedge[0]}"); answer from the text and other Scripture instead`);
    if (claim.sources.length === 0) problems.push(`${where}: no source cited`);
    for (const id of claim.sources) {
      if (!sourceIds.has(id)) problems.push(`${where}: cites ${id}, which it was not given`);
    }
    for (const m of claim.text.matchAll(SCRIPTURE_REF)) {
      // The match can start with an ordinary word ("Compare John 3:16"), so try the book name's tail too.
      const words = m[1].split(/\s+/);
      const verses = `${m[2]}:${m[3]}${m[4] ? `-${m[4]}` : ""}`;
      const parsed = words
        .map((_, i) => parseReference(`${words.slice(i).join(" ")} ${verses}`))
        .find((r) => r.ok || !/isn't a book/.test(r.error));
      // No book name before the numbers ("In 3:4"): not a reference.
      if (!parsed) continue;
      const count = parsed.ok ? versesIn(parsed.ref.book.slug, parsed.ref.chapter!) : undefined;
      if (!parsed.ok || count === undefined || (parsed.ref.verseEnd ?? 0) > count) {
        problems.push(`${where}: "${m[0]}" is not a real verse`);
      }
    }
  }

  if (card.key_words.length > 5) problems.push(`key_words: ${card.key_words.length} words; the limit is 5`);
  for (const k of card.key_words) {
    if (!verseStrongs.has(k.strong)) problems.push(`key_words: ${k.strong} is not a word in this verse`);
  }

  const sentences = card.in_context.text.split(/(?<=[.!?])\s+/).filter(Boolean).length;
  if (sentences > 3) problems.push(`in_context: ${sentences} sentences; keep it to 3`);

  return problems;
}

/** versesIn backed by the KJV data, for use outside tests. */
export async function kjvVerseCounter(): Promise<CheckInput["versesIn"]> {
  const { loadBook } = await import("../bible");
  const counts = new Map<string, number[]>();
  await Promise.all(
    BOOKS.map(async (b) => counts.set(b.slug, (await loadBook("kjv", b)).map((c) => c.length))),
  );
  return (slug, chapter) => counts.get(slug)?.[chapter - 1];
}
