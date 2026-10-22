/**
 * The projection shared by the map data (scripts/build-map-data.ts) and the map component.
 * Equirectangular, with longitude scaled by cos(36°) so the Mediterranean keeps its shape.
 * Units are tenths of a degree of latitude; y grows southward, as SVG expects.
 */

/** The area the stored coastline covers: Spain to Persia, the Alps to Upper Egypt. */
export const BOUNDS = { west: -10, east: 55, south: 22, north: 48 };

const SCALE = 10;
const LON_SCALE = Math.cos((36 * Math.PI) / 180);

export function project(lat: number, lon: number): [number, number] {
  return [(lon - BOUNDS.west) * LON_SCALE * SCALE, (BOUNDS.north - lat) * SCALE];
}

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A view framing every point with some margin, never tighter than minSpan degrees of latitude,
 * and stretched to the given aspect ratio (width / height).
 */
export function frame(points: { lat: number; lon: number }[], aspect = 16 / 9, minSpan = 6): ViewBox {
  const xy = points.map((p) => project(p.lat, p.lon));
  const [x0, x1] = [Math.min(...xy.map((p) => p[0])), Math.max(...xy.map((p) => p[0]))];
  const [y0, y1] = [Math.min(...xy.map((p) => p[1])), Math.max(...xy.map((p) => p[1]))];
  const margin = 0.18;
  let w = Math.max(x1 - x0, minSpan * SCALE * aspect * 0.6) * (1 + 2 * margin);
  let h = Math.max(y1 - y0, minSpan * SCALE) * (1 + 2 * margin);
  if (w / h < aspect) w = h * aspect;
  else h = w / aspect;
  const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2];
  return { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
}
