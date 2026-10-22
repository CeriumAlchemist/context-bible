import { describe, expect, it } from "vitest";
import { BOOKS } from "./books";
import { isFunctionWord, languagesOf, pronunciation, wordLanguage, wordsFor } from "./study";

describe("pronunciation", () => {
  it("splits Hebrew syllables and capitalizes the stressed one", () => {
    expect(pronunciation("be.re.Shit")).toBe("be-re-SHIT");
    expect(pronunciation("ba.Ra'")).toBe("ba-RA'");
  });

  it("leaves Greek transliterations without syllable marks alone", () => {
    expect(pronunciation("ēgapēsen")).toBe("ēgapēsen");
  });
});

describe("isFunctionWord", () => {
  it("drops prefixes, particles and the object marker", () => {
    expect(isFunctionWord("H9003")).toBe(true);
    expect(isFunctionWord("H0853")).toBe(true);
    expect(isFunctionWord("H1254A")).toBe(false);
    expect(isFunctionWord("G0025")).toBe(false);
  });
});

describe("wordLanguage", () => {
  const ot = BOOKS.find((b) => b.slug === "daniel")!;
  const nt = BOOKS.find((b) => b.slug === "1-timothy")!;

  it("reads Hebrew and Aramaic from the morphology code, and Greek from the testament", () => {
    expect(wordLanguage(ot, ["", "", "", "H8141", "HR/Ncfsc"])).toBe("Hebrew");
    expect(wordLanguage(ot, ["", "", "", "H1768", "AC"])).toBe("Aramaic");
    expect(wordLanguage(nt, ["", "", "", "G2085", "V-PAN"])).toBe("Greek");
  });

  it("finds Aramaic in Daniel 3 and only Hebrew in Daniel 1", async () => {
    expect(languagesOf(ot, await wordsFor(ot, 3, 11))).toEqual(["Aramaic"]);
    expect(languagesOf(ot, await wordsFor(ot, 1, 1))).toEqual(["Hebrew"]);
    expect(languagesOf(ot, await wordsFor(ot, 2, 4))).toEqual(["Hebrew", "Aramaic"]);
  });
});
