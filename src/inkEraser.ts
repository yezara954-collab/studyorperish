import type { Ink, QuillStroke } from "./memory";
import type { Sample } from "./quillGeometry";

export type Stroke = Ink | QuillStroke;
export type Rect = { left: number; top: number; right: number; bottom: number };
export type RenderedStroke = {
  stroke: Stroke;
  points: (Sample | undefined)[];
  bounds: Rect;
};
export type Erased = Map<string, Set<number> | "all">;

export function intersects(a: Rect, b: Rect) {
  return (
    a.left <= b.right &&
    a.right >= b.left &&
    a.top <= b.bottom &&
    a.bottom >= b.top
  );
}

export function include(rect: Rect, x: number, y: number, radius: number) {
  rect.left = Math.min(rect.left, x - radius);
  rect.top = Math.min(rect.top, y - radius);
  rect.right = Math.max(rect.right, x + radius);
  rect.bottom = Math.max(rect.bottom, y + radius);
}

export function emptyRect(): Rect {
  return { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
}

export function eraseAlong(
  rendered: RenderedStroke[],
  removed: Erased,
  start: Sample,
  end: Sample,
  radius: number,
  whole: boolean,
) {
  const dirty = emptyRect();
  const swept = emptyRect();
  include(swept, start.x, start.y, radius);
  include(swept, end.x, end.y, radius);
  const dx = end.x - start.x,
    dy = end.y - start.y;
  const distanceSquared = dx * dx + dy * dy;
  for (const { stroke, points, bounds } of rendered) {
    if (!intersects(swept, bounds)) continue;
    const previous = removed.get(stroke.id);
    if (previous === "all") continue;
    const indices = previous ?? new Set<number>();
    for (let index = 0; index < points.length; index++) {
      const point = points[index];
      if (!point || indices.has(index)) continue;
      const x = point.x - start.x,
        y = point.y - start.y;
      const t = distanceSquared
        ? Math.max(0, Math.min(1, (x * dx + y * dy) / distanceSquared))
        : 0;
      if (Math.hypot(x - t * dx, y - t * dy) > radius + point.width / 2)
        continue;
      if (whole) {
        removed.set(stroke.id, "all");
        include(dirty, bounds.left, bounds.top, 0);
        include(dirty, bounds.right, bounds.bottom, 0);
        break;
      }
      indices.add(index);
      removed.set(stroke.id, indices);
      // Each removed control point affects the two adjacent line segments.
      for (const neighbor of points.slice(Math.max(index - 1, 0), index + 2))
        if (neighbor)
          include(dirty, neighbor.x, neighbor.y, neighbor.width + 2);
    }
  }
  return dirty;
}

export function strokeChanges(strokes: Stroke[], erased: Erased) {
  const before: Stroke[] = [],
    after: Stroke[] = [];
  for (const stroke of strokes) {
    const removal = erased.get(stroke.id);
    if (!removal) continue;
    before.push(stroke);
    if (removal === "all") continue;
    const spans: [number, number][] = [];
    let first = 0;
    for (let index = 0; index <= stroke.points.length; index++) {
      if (index !== stroke.points.length && !removal.has(index)) continue;
      if (first < index) spans.push([first, index]);
      first = index + 1;
    }
    for (const [start, end] of spans) {
      const id = crypto.randomUUID();
      if (stroke.kind === "ink")
        after.push({ ...stroke, id, points: stroke.points.slice(start, end) });
      else
        after.push({
          ...stroke,
          id,
          start: stroke.points[start].at,
          points: stroke.points.slice(start, end),
        });
    }
  }
  return { before, after };
}
