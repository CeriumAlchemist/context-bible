import { describe, expect, it } from "vitest";
import { isFunctionWord, pronunciation } from "./study";

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
