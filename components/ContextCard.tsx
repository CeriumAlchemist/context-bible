import Link from "next/link";
import type { Book } from "@/lib/books";
import type { Claim, StoredCard } from "@/lib/cards/schema";
import { describeSource, isPublishable } from "@/lib/cards/store";
import { LANG_CODE, lexiconFor, wordLanguage, wordsFor } from "@/lib/study";
import { SourcesToggle } from "./SourcesToggle";

function Sources({ book, ids }: { book: Book; ids: string[] }) {
  // Several b: ids all point to the same overview; show it once.
  const seen = new Set<string>();
  const items = ids
    .map((id) => describeSource(book, id))
    .filter((s) => (seen.has(s.label) ? false : (seen.add(s.label), true)));
  return (
    <span className="sources">
      {items.map((s) =>
        s.href ? (
          <Link key={s.label} href={s.href}>
            {s.label}
          </Link>
        ) : (
          <span key={s.label}>{s.label}</span>
        ),
      )}
    </span>
  );
}

function Statement({ book, claim, label }: { book: Book; claim: Claim; label?: string }) {
  return (
    <p>
      {label && <span className="part">{label}</span>}
      {claim.text} <Sources book={book} ids={claim.sources} />
    </p>
  );
}

function Tile({ title, wide, children }: { title: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={`tile tile-${title.toLowerCase()}${wide ? " wide" : ""}`}>
      <h3>{title}</h3>
      <div className="tile-body">{children}</div>
    </div>
  );
}

/**
 * The verse's context card, or a placeholder when none has been published yet.
 * `map` is drawn in the Where tile.
 */
export async function ContextCardView({ book, stored, map }: { book: Book; stored: StoredCard | null; map?: React.ReactNode }) {
  if (!stored || !isPublishable(stored)) {
    return (
      <section className="placeholder">
        <h2>In context</h2>
        <p>
          {stored
            ? "A context card for this verse is being checked and isn't ready yet."
            : "Who is speaking and to whom, what is happening, when and where, and why it matters, each with its sources. Coming with the context cards."}
        </p>
      </section>
    );
  }

  const { card } = stored;
  const lexicon = await lexiconFor(book);
  // Each key word is labeled with the language the verse was written in (Hebrew, Aramaic or Greek).
  const verseWords = await wordsFor(book, stored.ref.chapter, stored.ref.verse);
  const languageOf = (strong: string) => {
    const word = verseWords.find((w) => w[3] === strong);
    return word ? wordLanguage(book, word) : book.testament === "NT" ? "Greek" : "Hebrew";
  };

  const header = (
    <>
      <h2 id="in-context">In context</h2>
      <span className={stored.status === "reviewed" ? "badge reviewed" : "badge"}>
        {stored.status === "reviewed" ? `Reviewed${stored.reviewedBy ? ` by ${stored.reviewedBy}` : ""}` : "AI-drafted, sourced"}
      </span>
    </>
  );

  return (
    <SourcesToggle header={header}>
      <div className="lead">
        <Statement book={book} claim={card.in_context} />
      </div>

      {card.misuse && (
        <div className="misuse">
          <h3>Commonly taken out of context</h3>
          <p className="quoted">
            <span className="part">Often quoted as</span>
            {card.misuse.popular_reading}
          </p>
          <Statement book={book} claim={card.misuse.in_context_reading} label="In context" />
        </div>
      )}

      <div className="tiles">
        <Tile title="Who">
          <Statement book={book} claim={card.who.speaker} label="Speaking" />
          <Statement book={book} claim={card.who.audience} label="To" />
          {card.who.affected && <Statement book={book} claim={card.who.affected} label="Also involved" />}
        </Tile>
        <Tile title="What">
          <Statement book={book} claim={card.what} />
        </Tile>
        <Tile title="Where" wide>
          <div className={map ? "where" : undefined}>
            <Statement book={book} claim={card.where} />
            {map}
          </div>
        </Tile>
        <Tile title="When">
          <Statement book={book} claim={card.when.events} label="The events" />
          <Statement book={book} claim={card.when.written} label="Written" />
        </Tile>
        <Tile title="Why">
          <Statement book={book} claim={card.why.purpose} label="Here" />
          <Statement book={book} claim={card.why.big_picture} label="In the whole of Scripture" />
          <Statement book={book} claim={card.why.for_readers} label="For readers" />
        </Tile>
      </div>

      {card.christians_differ && (
        <div className="differ">
          <h3>Christians read this differently</h3>
          <Statement book={book} claim={card.christians_differ} />
        </div>
      )}

      {card.key_words.length > 0 && (
        <div className="key-words">
          <h3>Words that matter here</h3>
          <ul>
            {card.key_words.map((k) => {
              const entry = lexicon[k.strong];
              const language = languageOf(k.strong);
              return (
                <li key={k.strong}>
                  <div className="kw-head">
                    <strong>{k.english}</strong>
                    {entry && (
                      <span className="original" lang={LANG_CODE[language]}>
                        {entry.w}
                      </span>
                    )}
                  </div>
                  <span className="muted kw-meta">
                    {language} · {entry ? `${entry.tr} · ` : ""}
                    {k.strong}
                  </span>
                  <p>
                    {k.why_it_matters.text} <Sources book={book} ids={k.why_it_matters.sources} />
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="takeaway">
        <h3>Takeaway</h3>
        <Statement book={book} claim={card.takeaway} />
      </div>

      <p className="source">
        Drafted by AI from the Scripture and data shown under &ldquo;Show sources,&rdquo; then checked automatically and by
        a second AI pass. Updated {stored.generatedAt.slice(0, 10)}.
      </p>
    </SourcesToggle>
  );
}
