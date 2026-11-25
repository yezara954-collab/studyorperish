import type { Book } from "./books";
import type { Annotation } from "./memory";

export type Sentence = { id: string; start: number; end: number; text: string };
const segmenter =
  typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter("en", { granularity: "sentence" })
    : undefined;

export function sentencesOf(text: string, chapter: number): Sentence[] {
  const sentences: Sentence[] = [];
  for (const paragraph of text.matchAll(/[^\r\n]+/g)) {
    const value = paragraph[0];
    // Mask abbreviation periods without changing UTF-16 offsets.
    const masked = value.replace(
      /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Sr\.|Jr\.|St\.|(?:[A-Za-z]\.){2,})/gi,
      (match) => match.replaceAll(".", "x"),
    );
    const segments = segmenter
      ? [...segmenter.segment(masked)]
      : [...masked.matchAll(/[^.!?。！？]+[.!?。！？]*|[.!?。！？]+/g)].map(
          (match) => ({ index: match.index!, segment: match[0] }),
        );
    for (const segment of segments) {
      const raw = value.slice(
        segment.index,
        segment.index + segment.segment.length,
      );
      if (!raw.trim()) continue;
      const start =
        paragraph.index! + segment.index + raw.length - raw.trimStart().length;
      const end = start + raw.trim().length;
      sentences.push({
        id: chapter + ":" + start,
        start,
        end,
        text: raw.trim(),
      });
    }
  }
  return sentences;
}

export function expandLegacyHighlights(
  annotations: Annotation[],
  books: Book[],
): Annotation[] {
  const cache = new Map<string, Sentence[]>();
  const lookup = new Map(books.map((book) => [book.id, book]));
  return annotations.flatMap((item): Annotation[] => {
    if (item.kind !== "highlight" || item.sentenceId) return [item];
    const text = lookup.get(item.bookId)?.chapters[item.chapter]?.text;
    if (text === undefined) return [item];
    const key = item.bookId + ":" + item.chapter;
    if (!cache.has(key)) cache.set(key, sentencesOf(text, item.chapter));
    const matches = cache
      .get(key)!
      .filter((s) => s.start < item.end && s.end > item.start);
    return matches.length
      ? matches.map((s, index) => ({
          ...item,
          id: index ? item.id + ":" + s.id : item.id,
          start: s.start,
          end: s.end,
          quote: s.text,
          sentenceId: s.id,
          strokeId: item.strokeId ?? item.id,
        }))
      : [item];
  });
}
