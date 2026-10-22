/**
 * Builds data/maps/land.json: the coastlines of the Mediterranean and the Near East as one SVG path,
 * so the site can draw its own maps without a tile server.
 *
 * Source: Natural Earth 1:50m land polygons (public domain). Polygons are clipped to the area the
 * Bible covers, simplified, and projected with lib/map.ts (equirectangular, scaled for latitude 36°).
 * Run with: npm run build:map
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { BOUNDS, project } from "../lib/map";

const SOURCE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson";
/** Simplification tolerance, in degrees. 0.02° is about 2 km: finer than any map on the site shows. */
const TOLERANCE = 0.02;

type Pt = [number, number];

/** Sutherland-Hodgman clip of a ring to the bounding box. Edges along the box are hidden by the map's own frame. */
function clip(ring: Pt[]): Pt[] {
  const edges: [(p: Pt) => boolean, (a: Pt, b: Pt) => Pt][] = [
    [(p) => p[0] >= BOUNDS.west, (a, b) => at(a, b, 0, BOUNDS.west)],
    [(p) => p[0] <= BOUNDS.east, (a, b) => at(a, b, 0, BOUNDS.east)],
    [(p) => p[1] >= BOUNDS.south, (a, b) => at(a, b, 1, BOUNDS.south)],
    [(p) => p[1] <= BOUNDS.north, (a, b) => at(a, b, 1, BOUNDS.north)],
  ];
  let out = ring;
  for (const [inside, cross] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) {
        if (!inside(prev)) out.push(cross(prev, cur));
        out.push(cur);
      } else if (inside(prev)) {
        out.push(cross(prev, cur));
      }
    }
    if (out.length === 0) break;
  }
  return out;
}

function at(a: Pt, b: Pt, axis: 0 | 1, value: number): Pt {
  const t = (value - a[axis]) / (b[axis] - a[axis]);
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}

/** Douglas-Peucker simplification. */
function simplify(points: Pt[], tolerance: number): Pt[] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    let index = -1;
    let max = tolerance;
    for (let i = first + 1; i < last; i++) {
      const d = distance(points[i], points[first], points[last]);
      if (d > max) {
        max = d;
        index = i;
      }
    }
    if (index !== -1) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function distance(p: Pt, a: Pt, b: Pt): number {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
}

async function main() {
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`${res.status} fetching ${SOURCE}`);
  const geo = (await res.json()) as { features: { geometry: { type: string; coordinates: unknown } }[] };

  const parts: string[] = [];
  for (const f of geo.features) {
    const polygons = (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates) as Pt[][][];
    for (const polygon of polygons) {
      // Natural Earth land has no holes worth drawing at this scale (inland seas come from the outer rings).
      const ring = simplify(clip(polygon[0]), TOLERANCE);
      if (ring.length < 3) continue;
      parts.push(
        "M" +
          ring
            .map((p) => project(p[1], p[0]))
            .map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`)
            .join("L") +
          "Z",
      );
    }
  }

  const dir = path.join(process.cwd(), "data", "maps");
  await mkdir(dir, { recursive: true });
  const out = { source: "Natural Earth 1:50m land (public domain)", bounds: BOUNDS, path: parts.join("") };
  await writeFile(path.join(dir, "land.json"), JSON.stringify(out));
  console.log(`data/maps/land.json: ${parts.length} polygons, ${(out.path.length / 1024).toFixed(0)} KB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
