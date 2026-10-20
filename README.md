# Context

Quick, sourced context for any Bible verse: who wrote it, who it was written to, what is happening, when and where, and why it matters. The goal is to make it easy to read every verse in its context, so Scripture isn't quoted out of it.

The King James Version is the primary text. The full plan is in the project's "Context App: First Version Plan" doc.

## Status

Phase 1 (foundation):

- [x] Reference search (`John 3:16`, `1 Tim 2:1-3`, `ps 23`, `I Samuel 15`)
- [x] Book, chapter and verse pages
- [x] KJV text with the surrounding verses shown dimmed
- [x] Comparison with BSB and ASV
- [x] Original-language word study: Hebrew/Greek word, pronunciation, Strong's number, lexicon meaning
- [x] Cross-references (top 8 by reader votes)
- [x] Places named in the verse, with map links

Phase 2 adds the AI-drafted, source-checked context cards.

## Running it

```sh
npm install
npm run dev        # http://localhost:3000
npm test
npm run build
```

The data files in `data/` are checked in. To rebuild the translations, run `npm run build:data`; to rebuild the word study, lexicons, cross-references and places, run `npm run build:study` afterwards (it sizes everything from the KJV). The script checks that each translation has 66 books, the right chapter counts and 31,102 verses.

## Layout

| Path | What it is |
| --- | --- |
| `lib/books.ts` | The 66 books, chapter counts, URL slugs and the abbreviations people type |
| `lib/reference.ts` | Parses typed references and builds URLs |
| `lib/translations.ts` | Which translations ship, with license and source |
| `lib/bible.ts` | Reads a chapter from `data/translations` |
| `app/` | Next.js pages: home, `/[book]`, `/[book]/[chapter]`, `/[book]/[chapter]/[verse]`, and `/go?q=` for search |
| `scripts/build-data.ts` | Downloads and normalizes the translations |
| `lib/study.ts` | Reads words, lexicon entries, cross-references and places |
| `components/StudySections.tsx` | The word study, cross-reference and place sections of the verse page |
| `scripts/build-study-data.ts` | Builds `data/words`, `data/lexicon`, `data/crossrefs` and `data/places.json` |

## Sources and licenses

| Text | License | Source |
| --- | --- | --- |
| King James Version (1769) | Public domain (outside the UK) | [aruljohn/Bible-kjv](https://github.com/aruljohn/Bible-kjv) |
| Berean Standard Bible | Public domain | [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) |
| American Standard Version (1901) | Public domain | [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) |

The KJV comes from aruljohn rather than scrollmapper because scrollmapper's copy drops some punctuation and prints "Lord" where the KJV has "LORD" (for example, Genesis 1:2 and 2:4).

| Data | License | Source |
| --- | --- | --- |
| Hebrew and Greek words, Strong's tags, brief lexicons | CC BY 4.0, Tyndale House Cambridge | [STEPBible-Data](https://github.com/STEPBible/STEPBible-Data) (TAHOT, TAGNT, TBESH, TBESG) |
| Cross-references with votes | CC BY, OpenBible.info | [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) extras |
| Places and coordinates | CC BY 4.0, OpenBible.info | [openbibleinfo/Bible-Geocoding-Data](https://github.com/openbibleinfo/Bible-Geocoding-Data) |

Verse numbers follow the KJV. Hebrew words follow the Leningrad text with its Qere readings, and Greek words are limited to those in the KJV's Greek (Scrivener 1894). Eight verses have no word data yet because the source numbers them differently: John 7:53, Romans 16:25-27, 2 Corinthians 13:13-14 and Philippians 1:16-17.

AMP, ESV, NLT and ICB are copyrighted and are not included. They need a license or API agreement from their publishers.
