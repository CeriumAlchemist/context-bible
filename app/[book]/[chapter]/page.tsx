import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadChapter } from "@/lib/bible";
import { bookBySlug } from "@/lib/books";
import { PRIMARY } from "@/lib/translations";

type Params = Promise<{ book: string; chapter: string }>;

async function resolve(params: Params) {
  const p = await params;
  const book = bookBySlug(p.book);
  const chapter = Number(p.chapter);
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) return null;
  return { book, chapter };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = await resolve(params);
  return { title: r ? `${r.book.name} ${r.chapter}` : "Not found" };
}

export default async function ChapterPage({ params }: { params: Params }) {
  const r = await resolve(params);
  if (!r) notFound();
  const { book, chapter } = r;
  const verses = await loadChapter(PRIMARY.id, book, chapter);

  return (
    <article>
      <p className="crumbs">
        <Link href={`/${book.slug}`}>{book.name}</Link>
      </p>
      <h1>
        {book.name} {chapter}
      </h1>
      <p className="translation-label">{PRIMARY.name}</p>
      <div className="chapter-text">
        {verses.map((text, i) => (
          <Link key={i} href={`/${book.slug}/${chapter}/${i + 1}`} className="verse-link" id={`v${i + 1}`}>
            <sup>{i + 1}</sup>
            {text}{" "}
          </Link>
        ))}
      </div>
      <nav className="pager">
        {chapter > 1 ? <Link href={`/${book.slug}/${chapter - 1}`}>← Chapter {chapter - 1}</Link> : <span />}
        {chapter < book.chapters ? <Link href={`/${book.slug}/${chapter + 1}`}>Chapter {chapter + 1} →</Link> : <span />}
      </nav>
    </article>
  );
}
