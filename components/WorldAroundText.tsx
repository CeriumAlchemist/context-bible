import Link from "next/link";
import { describeWorldSource, notesForVerse, type EventKind, type World, type WorldEvent, type WorldNote } from "@/lib/world";

const KIND_LABEL: Record<EventKind, string> = {
  war: "War",
  disaster: "Disaster",
  rule: "Rulers",
  church: "The church",
  discovery: "Discovery",
  building: "Building",
};

function WorldSources({ note }: { note: WorldNote }) {
  return (
    <span className="sources">
      {note.sources.map((s) => {
        const { label, href } = describeWorldSource(s);
        return href ? (
          <Link key={s} href={href}>
            {label}
          </Link>
        ) : (
          <span key={s}>{label}</span>
        );
      })}
    </span>
  );
}

function Timeline({ events, mark = [] }: { events: WorldEvent[]; mark?: WorldEvent[] }) {
  return (
    <ol className="timeline">
      {events.map((e) => (
        <li key={e.title} className={`kind-${e.kind}${mark.includes(e) ? " marked" : ""}`}>
          <span className="when">{e.when}</span>
          <div>
            <span className="kind">{KIND_LABEL[e.kind]}</span>
            <strong>{e.title}</strong>
            <p>
              {e.text} <WorldSources note={e} />
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Rulers({ world }: { world: World }) {
  return (
    <ul className="rulers">
      {world.rulers.map((r) => (
        <li key={r.name}>
          <span className="role">{r.role}</span>
          <strong>{r.name}</strong>
          <span className="years">{r.years}</span>
          <p>
            {r.text} <WorldSources note={r} />
          </p>
        </li>
      ))}
    </ul>
  );
}

/** The full "world around the text" for a book page. */
export function WorldAroundText({ world, map }: { world: World; map?: React.ReactNode }) {
  return (
    <section id="world" className="world">
      <h2>The world around the text</h2>
      <p className="period">
        <strong>{world.period.label}.</strong> {world.period.note}
      </p>
      {map}

      <h3>Who ruled</h3>
      <Rulers world={world} />

      <h3>What was happening</h3>
      <Timeline events={world.events} />

      {world.places.map((p) => (
        <div key={p.slug} className="place-profile">
          <h3>{p.name}</h3>
          <p className="muted">{p.summary}</p>
          <dl className="facts">
            {p.facts.map((f) => (
              <div key={f.topic}>
                <dt>{f.topic}</dt>
                <dd>
                  {f.text} <WorldSources note={f} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}

      <h3>Daily life and culture</h3>
      <dl className="facts">
        {world.life.map((f) => (
          <div key={f.topic}>
            <dt>
              {f.topic}
              {f.verses && <span className="muted"> · {f.verses.join(", ")}</span>}
            </dt>
            <dd>
              {f.text} <WorldSources note={f} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="source">{world.basis}</p>
    </section>
  );
}

/**
 * The world around one verse: notes tied to this verse first, then who ruled and the timeline, folded.
 * Place facts for the setting appear only when a note is tied to this verse.
 */
export function VerseWorld({ world, chapter, verse, bookSlug }: { world: World; chapter: number; verse: number; bookSlug: string }) {
  const here = notesForVerse(world, chapter, verse);
  const notes: { topic: string; note: WorldNote }[] = [
    ...here.life.map((n) => ({ topic: n.topic, note: n })),
    ...here.places.map((n) => ({ topic: `${n.place}: ${n.topic}`, note: n })),
    ...here.rulers.map((n) => ({ topic: `${n.name}, ${n.role.toLowerCase()}`, note: n })),
  ];

  return (
    <section className="world">
      <h2>The world around the text</h2>
      {notes.length > 0 && (
        <div className="behind">
          <h3>Behind this verse</h3>
          <dl className="facts">
            {notes.map(({ topic, note }) => (
              <div key={topic}>
                <dt>{topic}</dt>
                <dd>
                  {note.text} <WorldSources note={note} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <p className="period">
        <strong>{world.period.label}.</strong>{" "}
        {world.rulers[0] && `${world.rulers[0].role}: ${world.rulers[0].name} (${world.rulers[0].years}). `}
        {world.places.find((p) => world.map.primary.includes(p.slug))?.summary}
      </p>
      <details>
        <summary>Who ruled</summary>
        <Rulers world={world} />
      </details>
      <details>
        <summary>What was happening, AD {world.events[0].year} to {world.events.at(-1)!.year}</summary>
        <Timeline events={world.events} mark={here.events} />
      </details>
      <p className="source">
        <Link href={`/${bookSlug}#world`}>The full picture: places, culture and daily life</Link>. {world.basis}
      </p>
    </section>
  );
}
