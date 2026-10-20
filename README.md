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

Phase 2 (context cards):

- [x] Book overview for 1 Timothy (`data/books/1-timothy.json`), shown on the book page
- [x] Card format, grounding packet, automated checks and a second AI checking pass
- [x] Card display on the verse page; cards with any open problem stay hidden
- [ ] Generate the 1 Timothy cards (needs an Anthropic API key)
- [ ] Human review of the most-quoted verses

## Context cards

Each card is written by Claude from one verse's *source packet* only: the KJV chapter (`v:`), the book overview (`b:`), lexicon entries for the verse's words (`w:`), cross-references (`x:`) and places (`p:`). Every statement on the card lists the ids it rests on, and the page links them.

```sh
export ANTHROPIC_API_KEY=...            # or sign in with `ant auth login`
npm run cards -- 1-timothy --dry-run    # show the prompt for 1:1; no API calls
npm run cards -- 1-timothy 1 3          # one verse
npm run cards -- 1-timothy              # the whole book (113 verses); existing cards are skipped
```

Every card goes through two checks before it can be shown:

1. **Automated:** every statement cites at least one source it was actually given, every Scripture reference it writes is a real verse, key words are words in the verse, and the lead is at most 3 sentences.
2. **A second Claude pass** reads each statement against its cited sources and lists anything unsupported, overstated, or presenting one tradition's reading as the only one.

A card with anything from either check is saved but not shown. Setting `"status": "reviewed"` (and `"reviewedBy"`) in its file marks it reviewed by a person. Cards are stored in `data/cards/<book>/<chapter>.<verse>.json`.

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
| `lib/cards/` | Card schema, source packet, automated checks, loading |
| `components/ContextCard.tsx` | The card on the verse page |
| `scripts/generate-cards.ts` | Writes and checks cards with Claude |
| `data/books/` | Book overviews |
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
