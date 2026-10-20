import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";

// Verses often quoted without their context; each gets a "Commonly misused" card in Phase 2.
const OFTEN_MISUSED = [
  ["Jeremiah 29:11", "/jeremiah/29/11"],
  ["Philippians 4:13", "/philippians/4/13"],
  ["Matthew 18:20", "/matthew/18/20"],
  ["Matthew 7:1", "/matthew/7/1"],
  ["Romans 8:28", "/romans/8/28"],
  ["Proverbs 22:6", "/proverbs/22/6"],
];

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <section className="home">
      <h1>Read every verse in its context.</h1>
      <p className="lede">
        Type any reference to see who wrote it, who it was written to, and what it meant where it stands.
      </p>
      <SearchForm autoFocus />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <h2>Often quoted out of context</h2>
      <ul className="chips">
        {OFTEN_MISUSED.map(([label, href]) => (
          <li key={href}>
            <Link href={href}>{label}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
