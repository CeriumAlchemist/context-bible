import Link from "next/link";
import type { Book } from "@/lib/books";
import type { Claim, StoredCard } from "@/lib/cards/schema";
import { describeSource, isPublishable } from "@/lib/cards/store";

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

function Statement({ book, claim }: { book: Book; claim: Claim }) {
  return (
    <p>
      {claim.text} <Sources book={book} ids={claim.sources} />
    </p>
  );
}

/** The verse's context card, or a placeholder when none has been published yet. */
export function ContextCardView({ book, stored }: { book: Book; stored: StoredCard | null }) {
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
  return (
    <section className="card" aria-labelledby="in-context">
      <header className="card-head">
        <h2 id="in-context">In context</h2>
        <span className={stored.status === "reviewed" ? "badge reviewed" : "badge"}>
          {stored.status === "reviewed" ? `Reviewed${stored.reviewedBy ? ` by ${stored.reviewedBy}` : ""}` : "AI-drafted · sources shown"}
        </span>
      </header>
      <div className="lead">
        <Statement book={book} claim={card.in_context} />
      </div>

      {card.misuse && (
        <div className="misuse">
          <h3>Commonly misused</h3>
          <p>
            <strong>Often quoted as:</strong> {card.misuse.popular_reading}
          </p>
          <Statement book={book} claim={card.misuse.in_context_reading} />
        </div>
      )}

      <dl className="five-w">
        <dt>Who</dt>
        <dd>
          <Statement book={book} claim={card.who.speaker} />
          <Statement book={book} claim={card.who.audience} />
          {card.who.affected && <Statement book={book} claim={card.who.affected} />}
        </dd>
        <dt>What</dt>
        <dd>
          <Statement book={book} claim={card.what} />
        </dd>
        <dt>When</dt>
        <dd>
          <Statement book={book} claim={card.when.events} />
          <Statement book={book} claim={card.when.written} />
        </dd>
        <dt>Where</dt>
        <dd>
          <Statement book={book} claim={card.where} />
        </dd>
        <dt>Why</dt>
        <dd>
          <Statement book={book} claim={card.why.purpose} />
          <Statement book={book} claim={card.why.big_picture} />
          <Statement book={book} claim={card.why.for_readers} />
        </dd>
      </dl>

      {card.christians_differ && (
        <div className="differ">
          <h3>Christians read this differently</h3>
          <Statement book={book} claim={card.christians_differ} />
        </div>
      )}

      {card.key_words.length > 0 && (
        <div>
          <h3>Words that matter here</h3>
          {card.key_words.map((k) => (
            <p key={k.strong}>
              <strong>{k.english}</strong> <span className="muted">({k.strong})</span>: {k.why_it_matters.text}{" "}
              <Sources book={book} ids={k.why_it_matters.sources} />
            </p>
          ))}
        </div>
      )}

      <div className="takeaway">
        <h3>Takeaway</h3>
        <Statement book={book} claim={card.takeaway} />
      </div>

      <p className="source">
        Drafted by AI from the sources linked after each statement, then checked automatically and by a second AI pass.
        Updated {stored.generatedAt.slice(0, 10)}.
      </p>
    </section>
  );
}
