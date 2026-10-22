/**
 * Writes AI-drafted context cards, one per verse, to data/cards/<book-slug>/<chapter>.<verse>.json.
 *
 *   npm run cards -- 1-timothy            every verse in 1 Timothy
 *   npm run cards -- 1-timothy 2          chapter 2 only
 *   npm run cards -- 1-timothy 2 4        2:4 only
 *   npm run cards -- 1-timothy --dry-run  print the prompt for the first verse; no API calls
 *
 * Each card is written by Claude from the verse's source packet only, checked automatically,
 * then read against its sources by a second Claude pass. Needs CONTEXT_CARDS_KEY or ANTHROPIC_API_KEY (or an `ant auth login` profile).
 * Existing cards are skipped unless --force is given.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { loadChapter } from "../lib/bible";
import { bookBySlug, type Book } from "../lib/books";
import { checkCard, claimsOf, kjvVerseCounter } from "../lib/cards/check";
import { buildPacket, renderPacket, type Packet } from "../lib/cards/packet";
import { ContextCard, type StoredCard } from "../lib/cards/schema";
import { formatReference } from "../lib/reference";

const MODEL = "claude-opus-5-5";
const CONCURRENCY = 4;
// Server-side fallback: if the model declines (Scripture can touch violence, sexuality, etc.), the API
// retries on its default fallback model within the same call instead of returning a refusal.
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

const WRITER_SYSTEM = `You write short context cards for a Bible study app. The app exists so that anyone who sees a verse quoted can quickly learn what it meant where it stands, and stop it being used out of context. The primary text is the King James Version.

You are given one verse and a numbered set of sources: the verses of its chapter (v:), a book overview (b:), lexicon entries for the verse's original words (w:), cross-references (x:), and places (p:).

Write the card from these sources only. Every claim lists the ids of the sources it rests on. If the sources don't support something, leave it out or say plainly that the text doesn't say; never fill gaps from memory. Quote Scripture only from the sources, and only with real references.

Write for a general reader: plain words, short sentences, no jargon without a gloss. Be accurate and fair. Where Christian traditions genuinely read the verse differently, say so in christians_differ and name the main views without taking a side. Where dates or authorship are disputed, give the traditional view and the scholarly view, each labeled. Only fill misuse when the verse is in fact commonly quoted out of context. Pick key words only from the verse's own w: entries, and only when the original meaning changes how the verse is understood.`;

const VERIFIER_SYSTEM = `You check context cards for a Bible study app. For each numbered claim, read the sources it cites and decide whether they support it. A claim is unsupported if it states something its cited sources don't say, overstates them, or presents one tradition's interpretation as the only reading. Reasonable summary and plain inference from the cited text are fine. Report only the unsupported claims.`;

const Verdict = z.object({
  unsupported: z.array(z.object({ claim: z.string().describe("The claim's label, e.g. why.purpose"), reason: z.string() })),
});

function verseTask(packet: Packet): string {
  const ref = formatReference({ book: packet.book, chapter: packet.chapter, verseStart: packet.verse, verseEnd: packet.verse });
  return `Verse: ${ref} [v:${packet.chapter}.${packet.verse}]\n\nSources:\n${renderPacket(packet)}`;
}

async function writeCard(client: Anthropic, packet: Packet) {
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    system: WRITER_SYSTEM,
    output_config: { effort: "high", format: betaZodOutputFormat(ContextCard) },
    messages: [{ role: "user", content: verseTask(packet) }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`no card (stop_reason ${response.stop_reason})`);
  }
  return { card: response.parsed_output, model: response.model };
}

async function verifyCard(client: Anthropic, packet: Packet, card: ContextCard) {
  const claims = claimsOf(card)
    .map(([label, c]) => `${label}: ${c.text}\n  cites: ${c.sources.map((id) => `[${id}] ${packet.sources.get(id) ?? "(missing)"}`).join(" | ")}`)
    .join("\n\n");
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    system: VERIFIER_SYSTEM,
    output_config: { effort: "high", format: betaZodOutputFormat(Verdict) },
    messages: [{ role: "user", content: `${verseTask(packet)}\n\nClaims to check:\n${claims}` }],
  });
  return response.parsed_output?.unsupported ?? [{ claim: "card", reason: "verifier returned no verdict" }];
}

async function exists(file: string) {
  return access(file).then(
    () => true,
    () => false,
  );
}

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const [slug, ch, vs] = args.filter((a) => !a.startsWith("--"));
  const book: Book | undefined = slug ? bookBySlug(slug) : undefined;
  if (!book) throw new Error("Usage: npm run cards -- <book-slug> [chapter] [verse] [--dry-run] [--force]");

  const targets: [number, number][] = [];
  for (let c = ch ? Number(ch) : 1; c <= (ch ? Number(ch) : book.chapters); c++) {
    const count = (await loadChapter("kjv", book, c)).length;
    for (let v = vs ? Number(vs) : 1; v <= (vs ? Number(vs) : count); v++) targets.push([c, v]);
  }

  if (flags.has("--dry-run")) {
    const [c, v] = targets[0];
    console.log(`${WRITER_SYSTEM}\n\n---\n\n${verseTask(await buildPacket(book, c, v))}`);
    return;
  }

  // CONTEXT_CARDS_KEY is for cloud environments, where ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL are reserved.
  const cloudKey = process.env.CONTEXT_CARDS_KEY;
  const client = cloudKey ? new Anthropic({ apiKey: cloudKey, baseURL: "https://api.anthropic.com" }) : new Anthropic();
  const versesIn = await kjvVerseCounter();
  const outDir = path.join(process.cwd(), "data", "cards", book.slug);
  await mkdir(outDir, { recursive: true });

  let next = 0;
  const summary = { written: 0, flagged: 0, skipped: 0, failed: 0 };
  async function worker() {
    while (next < targets.length) {
      const [c, v] = targets[next++];
      const file = path.join(outDir, `${c}.${v}.json`);
      const label = `${book!.name} ${c}:${v}`;
      if (!flags.has("--force") && (await exists(file))) {
        summary.skipped++;
        continue;
      }
      try {
        const packet = await buildPacket(book!, c, v);
        const { card, model } = await writeCard(client, packet);
        const problems = checkCard({
          card,
          sourceIds: new Set(packet.sources.keys()),
          verseStrongs: new Set(packet.words.map((w) => w[3])),
          versesIn,
        });
        const unsupported = await verifyCard(client, packet, card);
        const stored: StoredCard = {
          ref: { book: book!.slug, chapter: c, verse: v },
          status: "ai-drafted",
          model,
          generatedAt: new Date().toISOString(),
          card,
          problems,
          unsupported,
        };
        await writeFile(file, JSON.stringify(stored, null, 2) + "\n");
        const flagged = problems.length + unsupported.length > 0;
        summary.written++;
        if (flagged) summary.flagged++;
        console.log(`${label}: ${flagged ? `flagged (${problems.length} check, ${unsupported.length} unsupported)` : "ok"}`);
      } catch (err) {
        summary.failed++;
        if (err instanceof Anthropic.RateLimitError) console.error(`${label}: rate limited; rerun to continue`);
        else if (err instanceof Anthropic.APIError) console.error(`${label}: API error ${err.status}: ${err.message}`);
        else console.error(`${label}: ${(err as Error).message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(summary);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
