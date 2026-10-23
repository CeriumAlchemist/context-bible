import { readFile } from "node:fs/promises";
import path from "node:path";
import { frame, project, type ViewBox } from "@/lib/map";
import type { Place } from "@/lib/study";
import type { MapLabel } from "@/lib/world";

// The coastline is read once per server process.
let land: Promise<string> | null = null;
function loadLand(): Promise<string> {
  land ??= readFile(path.join(process.cwd(), "data", "maps", "land.json"), "utf8").then((raw) => JSON.parse(raw).path);
  return land;
}

interface Props {
  /** Places to mark. */
  places: Place[];
  /** Slugs drawn in the accent color, with bold labels. */
  highlight: string[];
  /** Places the view must include; defaults to the highlighted ones. */
  focus?: Place[];
  /** Other places drawn faintly when they fall inside the view. */
  context?: Place[];
  regions?: MapLabel[];
  seas?: MapLabel[];
  /** Smallest span of the view, in degrees of latitude. */
  minSpan?: number;
  aspect?: number;
  caption?: string;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (vb: ViewBox, [x, y]: [number, number]) =>
  x > vb.x && x < vb.x + vb.width && y > vb.y && y < vb.y + vb.height;

/**
 * A map drawn from the stored coastline: no tiles, no scripts. Labels try the right of their dot first,
 * then the left, below and above, and are dropped if all four collide with labels already placed.
 */
export async function BibleMap({
  places,
  highlight,
  focus,
  context = [],
  regions = [],
  seas = [],
  minSpan = 6,
  aspect = 16 / 9,
  caption,
}: Props) {
  const coast = await loadLand();
  const framed = focus ?? places.filter((p) => highlight.includes(p.slug));
  const vb = frame(framed.length ? framed : places, aspect, minSpan);
  const font = vb.height / 26;
  const r = vb.height / 110;

  const placed: Box[] = [];
  function placeLabel(x: number, y: number, text: string, size: number, gap: number) {
    const w = text.length * size * 0.56;
    const h = size;
    const options: [Box, "start" | "middle" | "end"][] = [
      [{ x: x + gap, y: y - h / 2, w, h }, "start"],
      [{ x: x - gap - w, y: y - h / 2, w, h }, "end"],
      [{ x: x - w / 2, y: y + gap, w, h }, "middle"],
      [{ x: x - w / 2, y: y - gap - h, w, h }, "middle"],
    ];
    for (const [box, anchor] of options) {
      const fits = box.x > vb.x && box.x + box.w < vb.x + vb.width && box.y > vb.y && box.y + box.h < vb.y + vb.height;
      if (fits && !placed.some((p) => overlaps(p, box))) {
        placed.push(box);
        const tx = anchor === "start" ? box.x : anchor === "end" ? box.x + box.w : x;
        return { x: tx, y: box.y + h * 0.8, anchor };
      }
    }
    return null;
  }

  const marked = new Set(places.map((p) => p.slug));
  const faint = context.filter((p) => !marked.has(p.slug) && inside(vb, project(p.lat, p.lon)));
  // Highlighted places claim label space first.
  const order = [...places].sort((a, b) => Number(highlight.includes(b.slug)) - Number(highlight.includes(a.slug)));
  const placeNames = new Set([...places, ...faint].map((p) => p.name));
  // Labels must not cover any dot.
  for (const p of [...places, ...faint]) {
    if (p.type === "region") continue;
    const [x, y] = project(p.lat, p.lon);
    placed.push({ x: x - r * 1.3, y: y - r * 1.3, w: r * 2.6, h: r * 2.6 });
  }

  const dots = [...order, ...faint].map((p) => {
    const [x, y] = project(p.lat, p.lon);
    const isRegion = p.type === "region";
    const isHighlight = highlight.includes(p.slug);
    const isFaint = !marked.has(p.slug);
    if (isRegion) {
      const size = font * 1.05;
      // Region names sit centered on the region, not beside a dot.
      placed.push({ x: x - (p.name.length * size * 0.6) / 2, y: y - size / 2, w: p.name.length * size * 0.6, h: size });
      return { p, x, y, isRegion, isHighlight, isFaint, label: { x, y: y + size * 0.35, anchor: "middle" as const }, size };
    }
    const size = isFaint ? font * 0.8 : font;
    return { p, x, y, isRegion, isHighlight, isFaint, label: placeLabel(x, y, p.name, size, r * 1.8), size };
  });

  const area = [...regions.filter((g) => !placeNames.has(g.name)), ...seas].flatMap((g) => {
    const [x, y] = project(g.lat, g.lon);
    const isSea = seas.includes(g);
    const size = font * (isSea ? 0.85 : 0.8);
    const w = g.name.length * size * (isSea ? 0.5 : 0.75);
    const box = { x: x - w / 2, y: y - size / 2, w, h: size };
    if (!inside(vb, [x, y]) || placed.some((p) => overlaps(p, box))) return [];
    placed.push(box);
    return [{ g, x, y, size, isSea }];
  });

  return (
    <figure className="map">
      <svg
        viewBox={`${vb.x} ${vb.y} ${vb.width} ${vb.height}`}
        role="img"
        aria-label={`Map showing ${places.map((p) => p.name).join(", ")}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <rect x={vb.x} y={vb.y} width={vb.width} height={vb.height} className="map-sea" />
        <path d={coast} className="map-land" />
        {area.map(({ g, x, y, size, isSea }) => (
          <text key={g.name} x={x} y={y + size * 0.35} fontSize={size} textAnchor="middle" className={isSea ? "map-sea-label" : "map-region"}>
            {isSea ? g.name : g.name.toUpperCase()}
          </text>
        ))}
        {dots.map(({ p, x, y, isRegion, isHighlight, isFaint, label, size }) => (
          <g key={p.slug} className={isHighlight ? "map-place highlight" : isFaint ? "map-place faint" : "map-place"}>
            {!isRegion && <circle cx={x} cy={y} r={isFaint ? r * 0.7 : isHighlight ? r * 1.3 : r} />}
            {label && (
              <text
                x={label.x}
                y={label.y}
                fontSize={size}
                textAnchor={label.anchor}
                className={isRegion ? "map-region named" : undefined}
              >
                {isRegion ? p.name.toUpperCase() : p.name}
              </text>
            )}
          </g>
        ))}
      </svg>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
