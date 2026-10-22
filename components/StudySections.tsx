import Link from "next/link";
import { loadChapter } from "@/lib/bible";
import { BOOKS, type Book } from "@/lib/books";
import { formatReference } from "@/lib/reference";
import {
  crossRefsFor,
  isFunctionWord,
  LANG_CODE,
  languagesOf,
  lexiconFor,
  placesFor,
  pronunciation,
  wordLanguage,
  wordsFor,
  type CrossRef,
  type Place,
} from "@/lib/study";
import { PRIMARY } from "@/lib/translations";

interface Props {
  book: Book;
  chapter: number;
  verses: number[];
}

/**
 * Original-language words for each selected verse, with Strong's numbers and brief lexicon meanings.
 * Only the language the verse was written in is shown: Greek for the New Testament, Hebrew for the Old,
 * and Aramaic for the Aramaic chapters of Daniel and Ezra and Jeremiah 10:11.
 */
export async function WordStudy({ book, chapter, verses }: Props) {
  const lexicon = await lexiconFor(book);
  const perVerse = await Promise.all(
    verses.map(async (v) => ({
      v,
      // Particles (and, the, in, the object marker, the Greek article) add rows without adding meaning.
      words: (await wordsFor(book, chapter, v)).filter(([, , , s]) => !isFunctionWord(s) && s !== "G3588"),
    })),
  );

  const languages = languagesOf(book, perVerse.flatMap((p) => p.words));
  const language = languages.join(" and ");
  const mixed = languages.length > 1;

  return (
    <section>
      <h2>Original {language} words</h2>
      {languages.includes("Aramaic") && (
        <p className="muted">
          {mixed ? "Part of this passage was" : "This passage was"} written in Aramaic, the common language of the
          Babylonian and Persian empires, which the Jews of the exile also spoke. It uses the same alphabet as Hebrew.
        </p>
      )}
      {perVerse.map(({ v, words }) => (
        <div key={v} className="table-wrap">
          {verses.length > 1 && <h3>Verse {v}</h3>}
          {words.length === 0 ? (
            <p className="muted">Word data isn't available for this verse yet; its numbering differs in the source.</p>
          ) : (
            <table className="words">
              <thead>
                <tr>
                  <th scope="col">English</th>
                  <th scope="col">{mixed ? "Original" : language}</th>
                  <th scope="col">Say it</th>
                  <th scope="col">Strong&apos;s</th>
                  <th scope="col">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {words.map((word, i) => {
                  const [original, translit, english, strong] = word;
                  const entry = lexicon[strong];
                  const lang = wordLanguage(book, word);
                  return (
                    <tr key={i}>
                      <td>{english.replace(/[<>]/g, "")}</td>
                      <td className="original" lang={LANG_CODE[lang]}>
                        {original}
                        {mixed && <span className="lang-tag">{lang}</span>}
                      </td>
                      <td>{pronunciation(translit)}</td>
                      <td className="strongs">{strong}</td>
                      <td>
                        {entry ? (
                          <details>
                            <summary>{entry.g}</summary>
                            <p className="definition">
                              <span lang={LANG_CODE[lang]}>{entry.w}</span> ({entry.tr})
                              {"\n"}
                              {entry.d}
                            </p>
                          </details>
                        ) : (
                          <span className="muted">No entry</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ))}
      <p className="source">
        Words and meanings from <a href="https://github.com/STEPBible/STEPBible-Data">STEPBible data</a> (Tyndale House,
        Cambridge, CC BY 4.0). The capitalized syllable is the stressed one.
      </p>
    </section>
  );
}

/** The most-voted cross-references for the selected verses, with their KJV text. */
export async function CrossReferences({ book, chapter, verses }: Props) {
  const seen = new Set<string>();
  const refs: CrossRef[] = [];
  for (const v of verses) {
    for (const r of await crossRefsFor(book, chapter, v)) {
      const key = r.slice(0, 4).join(".");
      if (!seen.has(key)) {
        seen.add(key);
        refs.push(r);
      }
    }
  }
  refs.sort((a, z) => z[4] - a[4]);
  const top = refs.slice(0, 8);
  if (top.length === 0) return null;

  const rows = await Promise.all(
    top.map(async ([b, c, vs, ve]) => {
      const target = BOOKS[b - 1];
      const text = (await loadChapter(PRIMARY.id, target, c)).slice(vs - 1, ve).join(" ");
      const ref = { book: target, chapter: c, verseStart: vs, verseEnd: ve };
      return { ref, text, href: `/${target.slug}/${c}/${vs === ve ? vs : `${vs}-${ve}`}` };
    }),
  );

  return (
    <section>
      <h2>Scripture with Scripture</h2>
      <ul className="crossrefs">
        {rows.map(({ ref, text, href }) => (
          <li key={href}>
            <Link href={href}>{formatReference(ref)}</Link>
            <span>{text}</span>
          </li>
        ))}
      </ul>
      <p className="source">
        Cross-references ranked by reader votes at <a href="https://www.openbible.info/labs/cross-references/">OpenBible.info</a>{" "}
        (CC BY).
      </p>
    </section>
  );
}

/** Places named in the selected verses, with links to a map. */
export async function Places({ book, chapter, verses }: Props) {
  const found = new Map<string, Place>();
  for (const v of verses) for (const p of await placesFor(book, chapter, v)) found.set(p.slug, p);
  if (found.size === 0) return null;

  return (
    <section>
      <h2>Where</h2>
      <ul className="places">
        {[...found.values()].map((p) => (
          <li key={p.slug}>
            <strong>{p.name}</strong> <span className="muted">{p.type}</span>
            <span className="place-links">
              <a href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=8/${p.lat}/${p.lon}`}>Map</a>
              <a href={`https://www.openbible.info/geo/ancient/${p.slug}`}>About this place</a>
            </span>
          </li>
        ))}
      </ul>
      <p className="source">
        Locations from <a href="https://www.openbible.info/geo/">OpenBible.info</a> (CC BY 4.0). Some ancient sites are
        uncertain.
      </p>
    </section>
  );
}
