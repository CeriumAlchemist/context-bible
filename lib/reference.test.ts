import { describe, expect, it } from "vitest";
import { formatReference, parseReference, referencePath } from "./reference";

function ok(input: string) {
  const r = parseReference(input);
  if (!r.ok) throw new Error(r.error);
  return r.ref;
}

describe("parseReference", () => {
  it.each([
    ["John 3:16", "John 3:16", "/john/3/16"],
    ["john 3 16", "John 3:16", "/john/3/16"],
    ["Jn 3.16", "John 3:16", "/john/3/16"],
    ["1 Tim 2:1-3", "1 Timothy 2:1-3", "/1-timothy/2/1-3"],
    ["1tim 2:1 – 3", "1 Timothy 2:1-3", "/1-timothy/2/1-3"],
    ["I Samuel 15", "1 Samuel 15", "/1-samuel/15"],
    ["First John 4:8", "1 John 4:8", "/1-john/4/8"],
    ["ps 23", "Psalms 23", "/psalms/23"],
    ["Song of Solomon 2:4", "Song of Solomon 2:4", "/song-of-solomon/2/4"],
    ["Isaiah 53", "Isaiah 53", "/isaiah/53"],
    ["Phil 4:13", "Philippians 4:13", "/philippians/4/13"],
    ["Jer. 29:11", "Jeremiah 29:11", "/jeremiah/29/11"],
    ["1 Timothy", "1 Timothy", "/1-timothy"],
    ["Jude 1:3", "Jude 1:3", "/jude/1/3"],
  ])("%s", (input, formatted, path) => {
    const ref = ok(input);
    expect(formatReference(ref)).toBe(formatted);
    expect(referencePath(ref)).toBe(path);
  });

  it("rejects unknown books", () => {
    expect(parseReference("Hezekiah 1:1").ok).toBe(false);
  });

  it("rejects chapters past the end of the book", () => {
    const r = parseReference("Jude 2");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Jude has 1 chapter.");
  });

  it("rejects backwards ranges", () => {
    expect(parseReference("John 3:16-10").ok).toBe(false);
  });
});
