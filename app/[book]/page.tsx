import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { bookBySlug } from "@/lib/books";
import { loadOverview } from "@/lib/books-overview";

type Params = Promise<{ book: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const book = bookBySlug((await params).book);
  return { title: book?.name ?? "Not found" };
}

export default async function BookPage({ params }: { params: Params }) {
  const book = bookBySlug((await params).book);
  if (!book) notFound();
  const overview = await loadOverview(book);

  return (
    <article>
      <p className="crumbs">{book.testament === "OT" ? "Old Testament" : "New Testament"}</p>
      <h1>{book.name}</h1>
      {overview ? (
        <section id="overview" className="overview">
          <h2>Overview</h2>
          <dl className="five-w">
            <dt>Who</dt>
            <dd>
              <p>
                <strong>Written by</strong> {overview.author}
              </p>
              <p>
                <strong>Written to</strong> {overview.recipients}
              </p>
            </dd>
            <dt>When</dt>
            <dd>
              <p>
                <strong>Traditional view:</strong> {overview.date.traditional}
              </p>
              {overview.date.scholarly && (
                <p>
                  <strong>Scholarly view:</strong> {overview.date.scholarly}
                </p>
              )}
            </dd>
            <dt>Where</dt>
            <dd>
              <p>
                <strong>Written to</strong> {overview.destination}
              </p>
              <p>
                <strong>Written from</strong> {overview.writtenFrom}
              </p>
            </dd>
            <dt>Why</dt>
            <dd>
              <p>{overview.purpose}</p>
              <p>{overview.setting}</p>
            </dd>
          </dl>
          <h3>Outline</h3>
          <ol className="outline">
            {overview.outline.map((o) => (
              <li key={o.range}>
                <span className="muted">{o.range}</span> {o.title}
              </li>
            ))}
          </ol>
          <h3>Key themes</h3>
          <ul>
            {overview.themes.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="source">{overview.basis}</p>
        </section>
      ) : (
        <section className="placeholder">
          <h2>Book overview</h2>
          <p>Who wrote it, to whom, when, where and why. Coming with the context cards.</p>
        </section>
      )}
      <h2>Chapters</h2>
      <ol className="chapter-grid">
        {Array.from({ length: book.chapters }, (_, i) => (
          <li key={i}>
            <Link href={`/${book.slug}/${i + 1}`}>{i + 1}</Link>
          </li>
        ))}
      </ol>
    </article>
  );
}
