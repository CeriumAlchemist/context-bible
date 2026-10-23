"use client";

import { useState } from "react";

/** The card's frame, with a button that shows or hides the source tags after each statement. */
export function SourcesToggle({ children, header }: { children: React.ReactNode; header: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  return (
    <section className={shown ? "card show-sources" : "card"} aria-labelledby="in-context">
      <header className="card-head">
        {header}
        <button type="button" className="toggle" aria-pressed={shown} onClick={() => setShown(!shown)}>
          {shown ? "Hide sources" : "Show sources"}
        </button>
      </header>
      {children}
    </section>
  );
}
