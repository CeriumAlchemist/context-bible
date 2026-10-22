import { describe, expect, it } from "vitest";
import { bookBySlug } from "../books";
import { checkCard } from "./check";
import { buildPacket } from "./packet";
import type { ContextCard } from "./schema";
import { isPublishable } from "./store";

const claim = (text: string, ...sources: string[]) => ({ text, sources });

function card(overrides: Partial<ContextCard> = {}): ContextCard {
  return {
    in_context: claim("Paul reminds Timothy why he was left in Ephesus: to stop false teaching.", "v:1.3"),
    who: {
      speaker: claim("Paul.", "b:author"),
      audience: claim("Timothy.", "b:recipients"),
      affected: null,
    },
    what: claim("Timothy is to charge some not to teach other doctrine.", "v:1.3"),
    when: { events: claim("After Paul left for Macedonia.", "v:1.3"), written: claim("About AD 62-64.", "b:date") },
    where: claim("Ephesus; Paul went on to Macedonia.", "v:1.3", "p:ephesus"),
    why: {
      purpose: claim("False teaching was spreading.", "v:1.4"),
      big_picture: claim("Sound teaching guards the gospel; compare Acts 20:29-30.", "x:acts.20.29-30"),
      for_readers: claim("What is taught matters.", "v:1.5"),
    },
    misuse: null,
    christians_differ: null,
    key_words: [{ strong: "G3870", english: "besought", why_it_matters: claim("Means to urge.", "w:G3870") }],
    takeaway: claim("Guard what is taught.", "v:1.3"),
    ...overrides,
  };
}

const sourceIds = new Set(["v:1.3", "v:1.4", "v:1.5", "b:author", "b:recipients", "b:date", "p:ephesus", "x:acts.20.29-30", "w:G3870"]);
const versesIn = (slug: string, chapter: number) =>
  ({ acts: [26, 47, 26, 37, 42, 15, 60, 40, 43, 48, 30, 25, 52, 28, 41, 40, 34, 28, 41, 38] })[slug]?.[chapter - 1] ??
  (slug === "john" && chapter === 3 ? 36 : undefined);

describe("checkCard", () => {
  const run = (c: ContextCard) => checkCard({ card: c, sourceIds, verseStrongs: new Set(["G3870", "G2181"]), versesIn });

  it("passes a card whose claims all cite given sources", () => {
    expect(run(card())).toEqual([]);
  });

  it("flags uncited claims and sources the model wasn't given", () => {
    const problems = run(card({ what: claim("Something.") , takeaway: claim("Made up.", "b:invented") }));
    expect(problems).toContain("what: no source cited");
    expect(problems).toContain("takeaway: cites b:invented, which it was not given");
  });

  it("flags references to verses that don't exist, even after an ordinary word", () => {
    const problems = run(card({ takeaway: claim("Compare John 3:99 and Acts 20:29.", "v:1.3") }));
    expect(problems).toEqual(['takeaway: "Compare John 3:99" is not a real verse']);
  });

  it("ignores capitalized words with numbers that aren't references", () => {
    expect(run(card({ takeaway: claim("At 3:00 Paul wrote.", "v:1.3") }))).toEqual([]);
  });

  it("flags key words that aren't in the verse", () => {
    const problems = run(card({ key_words: [{ strong: "G0025", english: "love", why_it_matters: claim("x", "v:1.3") }] }));
    expect(problems).toContain("key_words: G0025 is not a word in this verse");
  });

  it("keeps the lead to three sentences", () => {
    const problems = run(card({ in_context: claim("One. Two. Three. Four.", "v:1.3") }));
    expect(problems).toContain("in_context: 4 sentences; keep it to 3");
  });
});

describe("isPublishable", () => {
  const stored = { ref: { book: "1-timothy", chapter: 1, verse: 3 }, model: "m", generatedAt: "", card: card() };

  it("hides cards with check problems or unsupported claims until reviewed", () => {
    expect(isPublishable({ ...stored, status: "ai-drafted", problems: [], unsupported: [] })).toBe(true);
    expect(isPublishable({ ...stored, status: "ai-drafted", problems: ["x"], unsupported: [] })).toBe(false);
    expect(isPublishable({ ...stored, status: "ai-drafted", problems: [], unsupported: [{ claim: "what", reason: "r" }] })).toBe(false);
    expect(isPublishable({ ...stored, status: "reviewed", problems: ["x"], unsupported: [] })).toBe(true);
  });
});

describe("buildPacket", () => {
  it("gathers 1 Timothy 1:3's chapter, overview, words, cross-references and places", async () => {
    const packet = await buildPacket(bookBySlug("1-timothy")!, 1, 3);
    const ids = [...packet.sources.keys()];
    expect(ids).toContain("v:1.3");
    expect(ids).toContain("v:1.20");
    expect(ids).toContain("b:date");
    expect(ids).toContain("w:G3870");
    expect(ids).toContain("p:ephesus");
    expect(ids.some((id) => id.startsWith("x:"))).toBe(true);
    expect(packet.sources.get("v:1.3")).toMatch(/^As I besought thee/);
  });
});
