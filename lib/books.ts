export type Testament = "OT" | "NT";

export interface Book {
  /** 1-based canonical order (Genesis = 1, Revelation = 66). */
  number: number;
  /** URL slug, e.g. "1-timothy". */
  slug: string;
  /** Display name, e.g. "1 Timothy". */
  name: string;
  testament: Testament;
  chapters: number;
  /** Extra spellings people type, lowercased with no spaces or dots. */
  aliases: string[];
}

type Row = [name: string, chapters: number, aliases: string[]];

// Protestant canon in KJV order.
const ROWS: Row[] = [
  ["Genesis", 50, ["gen", "ge", "gn"]],
  ["Exodus", 40, ["exo", "ex", "exod"]],
  ["Leviticus", 27, ["lev", "le", "lv"]],
  ["Numbers", 36, ["num", "nu", "nm", "nb"]],
  ["Deuteronomy", 34, ["deut", "deu", "dt"]],
  ["Joshua", 24, ["josh", "jos", "jsh"]],
  ["Judges", 21, ["judg", "jdg", "jg", "jdgs"]],
  ["Ruth", 4, ["rth", "ru"]],
  ["1 Samuel", 31, ["1sam", "1sa", "1sm", "isamuel", "firstsamuel"]],
  ["2 Samuel", 24, ["2sam", "2sa", "2sm", "iisamuel", "secondsamuel"]],
  ["1 Kings", 22, ["1kgs", "1ki", "1kin", "ikings", "firstkings"]],
  ["2 Kings", 25, ["2kgs", "2ki", "2kin", "iikings", "secondkings"]],
  ["1 Chronicles", 29, ["1chron", "1chr", "1ch", "ichronicles", "firstchronicles"]],
  ["2 Chronicles", 36, ["2chron", "2chr", "2ch", "iichronicles", "secondchronicles"]],
  ["Ezra", 10, ["ezr"]],
  ["Nehemiah", 13, ["neh", "ne"]],
  ["Esther", 10, ["est", "esth", "es"]],
  ["Job", 42, ["jb"]],
  ["Psalms", 150, ["psalm", "ps", "psa", "pss", "psm"]],
  ["Proverbs", 31, ["prov", "pro", "prv", "pr"]],
  ["Ecclesiastes", 12, ["eccl", "ecc", "ec", "qoh"]],
  ["Song of Solomon", 8, ["song", "sos", "songofsongs", "canticles", "sng"]],
  ["Isaiah", 66, ["isa", "is"]],
  ["Jeremiah", 52, ["jer", "je", "jr"]],
  ["Lamentations", 5, ["lam", "la"]],
  ["Ezekiel", 48, ["ezek", "eze", "ezk"]],
  ["Daniel", 12, ["dan", "da", "dn"]],
  ["Hosea", 14, ["hos", "ho"]],
  ["Joel", 3, ["jl"]],
  ["Amos", 9, ["am"]],
  ["Obadiah", 1, ["obad", "ob"]],
  ["Jonah", 4, ["jnh", "jon"]],
  ["Micah", 7, ["mic", "mc"]],
  ["Nahum", 3, ["nah", "na"]],
  ["Habakkuk", 3, ["hab", "hb"]],
  ["Zephaniah", 3, ["zeph", "zep", "zp"]],
  ["Haggai", 2, ["hag", "hg"]],
  ["Zechariah", 14, ["zech", "zec", "zc"]],
  ["Malachi", 4, ["mal", "ml"]],
  ["Matthew", 28, ["matt", "mat", "mt"]],
  ["Mark", 16, ["mrk", "mar", "mk", "mr"]],
  ["Luke", 24, ["luk", "lk"]],
  ["John", 21, ["joh", "jhn", "jn"]],
  ["Acts", 28, ["act", "ac"]],
  ["Romans", 16, ["rom", "ro", "rm"]],
  ["1 Corinthians", 16, ["1cor", "1co", "icorinthians", "firstcorinthians"]],
  ["2 Corinthians", 13, ["2cor", "2co", "iicorinthians", "secondcorinthians"]],
  ["Galatians", 6, ["gal", "ga"]],
  ["Ephesians", 6, ["eph", "ephes"]],
  ["Philippians", 4, ["phil", "php", "pp"]],
  ["Colossians", 4, ["col", "co"]],
  ["1 Thessalonians", 5, ["1thess", "1thes", "1th", "ithessalonians", "firstthessalonians"]],
  ["2 Thessalonians", 3, ["2thess", "2thes", "2th", "iithessalonians", "secondthessalonians"]],
  ["1 Timothy", 6, ["1tim", "1ti", "itimothy", "firsttimothy"]],
  ["2 Timothy", 4, ["2tim", "2ti", "iitimothy", "secondtimothy"]],
  ["Titus", 3, ["tit", "ti"]],
  ["Philemon", 1, ["philem", "phm", "pm"]],
  ["Hebrews", 13, ["heb"]],
  ["James", 5, ["jas", "jm"]],
  ["1 Peter", 5, ["1pet", "1pe", "1pt", "ipeter", "firstpeter"]],
  ["2 Peter", 3, ["2pet", "2pe", "2pt", "iipeter", "secondpeter"]],
  ["1 John", 5, ["1jn", "1jhn", "1jo", "ijohn", "firstjohn"]],
  ["2 John", 1, ["2jn", "2jhn", "2jo", "iijohn", "secondjohn"]],
  ["3 John", 1, ["3jn", "3jhn", "3jo", "iiijohn", "thirdjohn"]],
  ["Jude", 1, ["jud", "jd"]],
  ["Revelation", 22, ["rev", "re", "revelations", "apocalypse"]],
];

export const BOOKS: Book[] = ROWS.map(([name, chapters, aliases], i) => ({
  number: i + 1,
  slug: name.toLowerCase().replace(/\s+/g, "-"),
  name,
  testament: i < 39 ? "OT" : "NT",
  chapters,
  aliases,
}));

/** Lowercase, drop spaces and dots: "1 Tim." -> "1tim". */
export function normalizeBookKey(s: string): string {
  return s.toLowerCase().replace(/[\s.]+/g, "");
}

const BY_KEY = new Map<string, Book>();
for (const b of BOOKS) {
  BY_KEY.set(normalizeBookKey(b.name), b);
  BY_KEY.set(b.slug.replace(/-/g, ""), b);
  for (const a of b.aliases) BY_KEY.set(a, b);
}

export function findBook(input: string): Book | undefined {
  return BY_KEY.get(normalizeBookKey(input));
}

export function bookBySlug(slug: string): Book | undefined {
  return BOOKS.find((b) => b.slug === slug);
}
