import { z } from "zod";

/**
 * One statement on a card and the ids of the sources it rests on (see lib/cards/packet.ts for the id scheme).
 * Every claim must cite at least one source the model was given.
 */
export const Claim = z.object({
  text: z.string().describe("One to three plain sentences."),
  sources: z.array(z.string()).describe("Ids of the sources this statement rests on, e.g. v:1.3, b:date, w:G3870."),
});

/** The context card for one verse: the 5 W's from the project goal, in the order of Kourtland's protocol. */
export const ContextCard = z.object({
  in_context: Claim.describe("What this verse actually says where it stands, and what it does not mean. 2-3 sentences."),
  who: z.object({
    speaker: Claim.describe("Who is speaking or writing."),
    audience: Claim.describe("Who it is addressed to."),
    affected: Claim.nullable().describe("Who is affected or talked about, if different from the audience."),
  }),
  what: Claim.describe("What is happening in this passage and its consequences."),
  when: z.object({
    events: Claim.describe("When the events happen, if the text says."),
    written: Claim.describe(
      "When it was written. Give the traditional date, and the main scholarly view if it differs, each labeled.",
    ),
  }),
  where: Claim.describe("Where this takes place or where the readers were."),
  why: z.object({
    purpose: Claim.describe("Why the writer says this here."),
    big_picture: Claim.describe("Why it matters in the whole story of Scripture."),
    for_readers: Claim.describe("Why a reader today should care, without stretching the text."),
  }),
  misuse: z
    .object({
      popular_reading: z.string().describe("How the verse is commonly quoted out of context."),
      in_context_reading: Claim.describe("What it means in context instead."),
    })
    .nullable()
    .describe("Only if the verse is commonly quoted out of context; otherwise null."),
  christians_differ: Claim.nullable().describe(
    "Only if Christian traditions read this verse differently: name the main views fairly. Otherwise null.",
  ),
  key_words: z
    .array(
      z.object({
        strong: z.string().describe("A Strong's number from the verse's word list, e.g. G3870."),
        english: z.string(),
        why_it_matters: Claim,
      }),
    )
    .describe("Up to 5 words whose original meaning changes how the verse is understood."),
  takeaway: Claim.describe("1-3 sentences on how to apply the verse faithfully."),
});

export type Claim = z.infer<typeof Claim>;
export type ContextCard = z.infer<typeof ContextCard>;

/** A card as stored in data/cards/<book-slug>/<chapter>.<verse>.json. */
export interface StoredCard {
  ref: { book: string; chapter: number; verse: number };
  /** "ai-drafted" until a reviewer signs off. */
  status: "ai-drafted" | "reviewed";
  model: string;
  generatedAt: string;
  card: ContextCard;
  /** Problems the automated checks found; a card with any is not published. */
  problems: string[];
  /** Claims the second AI pass could not match to their sources. */
  unsupported: { claim: string; reason: string }[];
  reviewedBy?: string;
}
