export function SearchForm({ autoFocus = false }: { autoFocus?: boolean }) {
  return (
    <form action="/go" method="get" className="search" role="search">
      <input
        name="q"
        type="search"
        placeholder="John 3:16, 1 Tim 2, Psalm 23…"
        aria-label="Bible reference"
        autoFocus={autoFocus}
        required
      />
      <button type="submit">Go</button>
    </form>
  );
}
