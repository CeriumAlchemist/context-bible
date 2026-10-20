import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { bookBySlug } from "@/lib/books";

type Params = Promise<{ book: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const book = bookBySlug((await params).book);
  return { title: book?.name ?? "Not found" };
}

export default async function BookPage({ params }: { params: Params }) {
  const book = bookBySlug((await params).book);
  if (!book) notFound();

  return (
    <article>
      <p className="crumbs">{book.testament === "OT" ? "Old Testament" : "New Testament"}</p>
      <h1>{book.name}</h1>
      <section className="placeholder">
        <h2>Book overview</h2>
        <p>Who wrote it, to whom, when, where and why. Coming with the context cards.</p>
      </section>
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
