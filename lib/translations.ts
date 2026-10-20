export interface Translation {
  id: string;
  abbreviation: string;
  name: string;
  license: string;
  source: string;
}

/** KJV is primary and always first. Every translation here is free to redistribute. */
export const TRANSLATIONS: Translation[] = [
  {
    id: "kjv",
    abbreviation: "KJV",
    name: "King James Version (1769)",
    license: "Public domain (outside the UK)",
    source: "https://github.com/aruljohn/Bible-kjv",
  },
  {
    id: "bsb",
    abbreviation: "BSB",
    name: "Berean Standard Bible",
    license: "Public domain",
    source: "https://github.com/scrollmapper/bible_databases",
  },
  {
    id: "asv",
    abbreviation: "ASV",
    name: "American Standard Version (1901)",
    license: "Public domain",
    source: "https://github.com/scrollmapper/bible_databases",
  },
];

export const PRIMARY = TRANSLATIONS[0];
