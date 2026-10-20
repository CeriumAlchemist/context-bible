# Context

Quick, sourced context for any Bible verse: who wrote it, who it was written to, what is happening, when and where, and why it matters. The goal is to make it easy to read every verse in its context, so Scripture isn't quoted out of it.

The King James Version is the primary text. The full plan is in the project's "Context App: First Version Plan" doc.

## Status

Phase 1 (foundation):

- [x] Reference search (`John 3:16`, `1 Tim 2:1-3`, `ps 23`, `I Samuel 15`)
- [x] Book, chapter and verse pages
- [x] KJV text with the surrounding verses shown dimmed
- [x] Comparison with BSB and ASV
- [ ] Original-language word study (STEPBible data)
- [ ] Cross-references (OpenBible.info)
- [ ] Places (OpenBible.info geocoding)

Phase 2 adds the AI-drafted, source-checked context cards.

## Running it

```sh
npm install
npm run dev        # http://localhost:3000
npm test
npm run build
```

The translation files in `data/translations/` are checked in. To rebuild them from their sources, run `npm run build:data`. The script checks that each translation has 66 books, the right chapter counts and 31,102 verses.

## Layout

| Path | What it is |
| --- | --- |
| `lib/books.ts` | The 66 books, chapter counts, URL slugs and the abbreviations people type |
| `lib/reference.ts` | Parses typed references and builds URLs |
| `lib/translations.ts` | Which translations ship, with license and source |
| `lib/bible.ts` | Reads a chapter from `data/translations` |
| `app/` | Next.js pages: home, `/[book]`, `/[book]/[chapter]`, `/[book]/[chapter]/[verse]`, and `/go?q=` for search |
| `scripts/build-data.ts` | Downloads and normalizes the translations |

## Sources and licenses

| Text | License | Source |
| --- | --- | --- |
| King James Version (1769) | Public domain (outside the UK) | [aruljohn/Bible-kjv](https://github.com/aruljohn/Bible-kjv) |
| Berean Standard Bible | Public domain | [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) |
| American Standard Version (1901) | Public domain | [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases) |

The KJV comes from aruljohn rather than scrollmapper because scrollmapper's copy drops some punctuation and prints "Lord" where the KJV has "LORD" (for example, Genesis 1:2 and 2:4).

AMP, ESV, NLT and ICB are copyrighted and are not included. They need a license or API agreement from their publishers.
