import { describe, expect, it } from "vitest";
import { bookBySlug } from "./books";
import { loadChapter } from "./bible";
import { placesBySlug } from "./study";
import { describeWorldSource, loadWorld, notesForVerse, touches } from "./world";

describe("world notes", () => {
  it("matches verse ranges", () => {
    const note = { text: "", sources: [], verses: ["2:1-2", "5:18"] };
    expect(touches(note, 2, 1)).toBe(true);
    expect(touches(note, 2, 3)).toBe(false);
    expect(touches(note, 5, 18)).toBe(true);
  });

  it("links Bible references and leaves other sources as written", () => {
    expect(describeWorldSource("Acts 19:24-27")).toEqual({ label: "Acts 19:24-27", href: "/acts/19/24-27" });
    expect(describeWorldSource("Tacitus, Annals 15.44")).toEqual({ label: "Tacitus, Annals 15.44" });
  });

  it("1 Timothy's world data points at real places and verses", async () => {
    const book = bookBySlug("1-timothy")!;
    const world = (await loadWorld(book))!;
    expect((await placesBySlug(world.map.places)).length).toBe(world.map.places.length);

    const notes = [...world.rulers, ...world.events, ...world.life, ...world.places.flatMap((p) => p.facts)];
    for (const n of notes) {
      expect(n.sources.length).toBeGreaterThan(0);
      for (const s of n.sources) {
        const { href } = describeWorldSource(s);
        if (!href) continue;
        // Every linked reference must be a real verse range.
        const [, slug, c, v, end] = href.match(/^\/([^/]+)\/(\d+)\/(\d+)(?:-(\d+))?$/)!;
        const chapter = await loadChapter("kjv", bookBySlug(slug)!, Number(c));
        expect(Number(end ?? v), s).toBeLessThanOrEqual(chapter.length);
      }
    }
    expect(notesForVerse(world, 2, 9).life.map((n) => n.topic)).toContain("Hair, gold and pearls");
  });
});
