import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContextCardView } from "@/components/ContextCard";
import { CrossReferences, Places, WordStudy } from "@/components/StudySections";
import { loadChapter } from "@/lib/bible";
import { bookBySlug } from "@/lib/books";
import { loadCard } from "@/lib/cards/store";
import { formatReference, type Reference } from "@/lib/reference";
import { PRIMARY, TRANSLATIONS } from "@/lib/translations";

type Params = Promise<{ book: string; chapter: string; verse: string }>;

/** How many verses before and after the selection to show, dimmed, for context. */
const SURROUNDING = 2;

async function resolve(params: Params) {
  const p = await params;
  const book = bookBySlug(p.book);
  const chapter = Number(p.chapter);
  const m = p.verse.match(/^(\d+)(?:-(\d+))?$/);
  if (!book || !m || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) return null;

  const kjv = await loadChapter(PRIMARY.id, book, chapter);
  const verseStart = Number(m[1]);
  const verseEnd = m[2] ? Number(m[2]) : verseStart;
  if (verseStart < 1 || verseEnd < verseStart || verseEnd > kjv.length) return null;

  const ref: Reference = { book, chapter, verseStart, verseEnd };
  return { ref, kjv };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = await resolve(params);
  if (!r) return { title: "Not found" };
  const text = r.kjv.slice(r.ref.verseStart! - 1, r.ref.verseEnd).join(" ");
  return { title: formatReference(r.ref), description: text };
}

export default async function VersePage({ params }: { params: Params }) {
  const r = await resolve(params);
  if (!r) notFound();
  const { ref, kjv } = r;
  const { book } = ref;
  const chapter = ref.chapter!;
  const start = ref.verseStart!;
  const end = ref.verseEnd!;

  const from = Math.max(1, start - SURROUNDING);
  const to = Math.min(kjv.length, end + SURROUNDING);
  const selected = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  // Cards are written per verse; a range shows the first verse's card.
  const card = await loadCard(book, chapter, start);

  const others = await Promise.all(
    TRANSLATIONS.filter((t) => t.id !== PRIMARY.id).map(async (t) => ({
      t,
      verses: await loadChapter(t.id, book, chapter),
    })),
  );

  return (
    <article>
      <p className="crumbs">
        <Link href={`/${book.slug}`}>{book.name}</Link> ·{" "}
        <Link href={`/${book.slug}/${chapter}#v${start}`}>Chapter {chapter}</Link>
      </p>
      <h1>{formatReference(ref)}</h1>

      <section className="kjv" aria-label={PRIMARY.name}>
        <p className="translation-label">{PRIMARY.name}</p>
        {Array.from({ length: to - from + 1 }, (_, i) => from + i).map((v) => {
          const isSelected = v >= start && v <= end;
          return (
            <p key={v} className={isSelected ? "verse selected" : "verse surrounding"}>
              <sup>{v}</sup>
              {kjv[v - 1]}
            </p>
          );
        })}
      </section>

      <ContextCardView book={book} stored={card} />

      <Places book={book} chapter={chapter} verses={selected} />
      <WordStudy book={book} chapter={chapter} verses={selected} />
      <CrossReferences book={book} chapter={chapter} verses={selected} />

      <section>
        <h2>Other translations</h2>
        <div className="table-wrap">
          <table className="compare">
            <thead>
              <tr>
                <th scope="col">Verse</th>
                <th scope="col">{PRIMARY.abbreviation}</th>
                {others.map(({ t }) => (
                  <th scope="col" key={t.id}>
                    {t.abbreviation}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selected.map((v) => (
                <tr key={v}>
                  <th scope="row">{v}</th>
                  <td>{kjv[v - 1]}</td>
                  {others.map(({ t, verses }) => (
                    <td key={t.id}>{verses[v - 1] ?? "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <nav className="pager">
        {start > 1 ? <Link href={`/${book.slug}/${chapter}/${start - 1}`}>← Verse {start - 1}</Link> : <span />}
        {end < kjv.length ? <Link href={`/${book.slug}/${chapter}/${end + 1}`}>Verse {end + 1} →</Link> : <span />}
      </nav>
    </article>
  );
}
