import type { AnchorPoint } from "./memory";

export type Sample = { x: number; y: number; width: number };
type Line = { id: string; rect: DOMRect };
export function visibleLines(content: HTMLElement, bounds: DOMRect): Line[] {
  return [
    ...content.querySelectorAll<HTMLElement>("[data-sentence-id]"),
  ].flatMap((span) =>
    [...span.getClientRects()]
      .filter(
        (rect) =>
          rect.width > 0 &&
          rect.bottom >= bounds.top &&
          rect.top <= bounds.bottom,
      )
      .map((rect) => ({ id: span.dataset.sentenceId!, rect })),
  );
}

export function classifySweep(points: Sample[], lines: Line[], em: number) {
  if (points.length < 3) return [];
  const dx = points.at(-1)!.x - points[0].x;
  const ys = points.map((point) => point.y);
  if (Math.abs(dx) < em * 1.2 || Math.max(...ys) - Math.min(...ys) > em * 0.7)
    return [];

  let length = 0,
    passing = 0;
  const hits = new Map<string, number>();
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    length += distance;
    const samples = Math.ceil(distance / 4);
    for (let j = 0; j < samples; j++) {
      const part = (j + 0.5) / samples;
      const x = a.x + (b.x - a.x) * part,
        y = a.y + (b.y - a.y) * part;
      const hit = lines.find(
        ({ rect }) =>
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom + em * 0.27,
      );
      if (!hit) continue;
      const weight = distance / samples;
      passing += weight;
      hits.set(hit.id, (hits.get(hit.id) ?? 0) + weight);
    }
  }
  if (Math.abs(dx) < length * 0.86 || passing < length * 0.63) return [];
  return [...hits]
    .filter(([, distance]) => distance >= em * 0.55)
    .map(([id]) => id);
}

export function glyphLayout(content: HTMLElement) {
  const sections = [
    ...content.querySelectorAll<HTMLElement>("[data-sentence-id]"),
  ].map((span) => {
    const start = Number(span.dataset.start);
    return {
      span,
      start,
      end: start + (span.textContent?.length ?? 0),
      nodes: undefined as Text[] | undefined,
    };
  });
  const cached = new Map<number, DOMRect | undefined>();
  const range = document.createRange();
  function glyph(at: number) {
    if (cached.has(at)) return cached.get(at);
    let low = 0,
      high = sections.length - 1;
    while (low <= high) {
      const mid = (low + high) >>> 1;
      const section = sections[mid];
      if (at < section.start) {
        high = mid - 1;
        continue;
      }
      if (at >= section.end) {
        low = mid + 1;
        continue;
      }
      if (!section.nodes) {
        section.nodes = [];
        const walker = document.createTreeWalker(
          section.span,
          NodeFilter.SHOW_TEXT,
        );
        for (let node = walker.nextNode(); node; node = walker.nextNode())
          section.nodes.push(node as Text);
      }
      let offset = at - section.start;
      for (const node of section.nodes) {
        if (offset >= node.length) {
          offset -= node.length;
          continue;
        }
        range.setStart(node, offset);
        range.setEnd(node, offset + 1);
        const rect = range.getBoundingClientRect();
        cached.set(at, rect);
        return rect;
      }
      break;
    }
    cached.set(at, undefined);
  }
  return { glyph, sections };
}

export function anchorSamples(
  points: Sample[],
  content: HTMLElement,
  bounds: DOMRect,
  em: number,
): AnchorPoint[] {
  const { glyph, sections } = glyphLayout(content);
  const candidates: { at: number; rect: DOMRect }[] = [];
  for (const { span, start, end } of sections) {
    const box = span.getBoundingClientRect();
    if (box.bottom < bounds.top || box.top > bounds.bottom) continue;
    for (let at = start; at < end; at++) {
      const rect = glyph(at);
      if (rect?.width && rect.bottom >= bounds.top && rect.top <= bounds.bottom)
        candidates.push({ at, rect });
    }
  }
  if (!candidates.length) return [];
  return points.map((point) => {
    let best = candidates[0],
      nearest = Infinity;
    for (const candidate of candidates) {
      const { rect } = candidate;
      const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
      const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
      const distance = dx * dx + dy * dy;
      if (distance < nearest) {
        nearest = distance;
        best = candidate;
      }
    }
    return {
      at: best.at,
      x: (point.x - best.rect.left) / em,
      y: (point.y - best.rect.top) / em,
      width: point.width,
    };
  });
}
