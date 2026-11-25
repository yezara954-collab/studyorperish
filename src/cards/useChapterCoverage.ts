import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { chapterBoxKey, recordChapterProgress } from "./storage";

type Interval = [number, number];

function indexText(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: { text: Text; start: number }[] = [];
  let length = 0;
  while (walker.nextNode()) {
    const text = walker.currentNode as Text;
    if (!text.length) continue;
    nodes.push({ text, start: length });
    length += text.length;
  }
  return { nodes, length };
}

function lowerBound(
  from: number,
  to: number,
  predicate: (position: number) => boolean,
) {
  while (from < to) {
    const middle = Math.floor((from + to) / 2);
    if (predicate(middle)) to = middle;
    else from = middle + 1;
  }
  return from;
}

const visibilityTolerance = 2;
const sampleDelay = 180;

function visibleRange(
  passage: HTMLElement,
  index: ReturnType<typeof indexText>,
): Interval | undefined {
  if (!index.length || document.hidden) return;

  const area = passage.getBoundingClientRect();
  const viewport = window.visualViewport;
  const top = Math.max(area.top, viewport?.offsetTop ?? 0);
  const bottom = Math.min(
    area.bottom,
    (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight),
  );
  if (bottom <= top) return;

  const range = document.createRange();
  function rectAt(position: number) {
    const i =
      lowerBound(
        0,
        index.nodes.length,
        (n) => index.nodes[n].start > position,
      ) - 1;
    const { text, start } = index.nodes[i];
    const offset = position - start;
    range.setStart(text, offset);
    range.setEnd(text, offset + 1);
    return range.getBoundingClientRect();
  }
  const first = lowerBound(
    0,
    index.length,
    (i) => rectAt(i).bottom > top + visibilityTolerance,
  );
  const end = lowerBound(
    first,
    index.length,
    (i) => rectAt(i).top >= bottom - visibilityTolerance,
  );
  if (end > first) return [first, end];
}

export function useChapterCoverage({
  box,
  chapter,
  text,
  start,
  end,
  scroll,
  writing,
  paused,
  finished,
  onAward,
  onError,
}: {
  box: RefObject<HTMLDivElement | null>;
  chapter: number;
  text: string;
  start: number;
  end: number;
  scroll: boolean;
  writing: boolean;
  paused: boolean;
  finished: (key: string) => boolean;
  onAward: () => void;
  onError: () => void;
}) {
  const key = useMemo(() => chapterBoxKey(chapter, text), [chapter, text]);
  const complete = finished(key);
  const callbacks = useRef({ onAward, onError });
  callbacks.current = { onAward, onError };
  const flush = useRef<(finish?: boolean) => Promise<boolean>>(
    async () => false,
  );

  useLayoutEffect(() => {
    if (complete) {
      flush.current = async () => true;
      return;
    }
    const passage = box.current;
    const root = passage?.querySelector<HTMLElement>(".quill-text");
    if (!passage || !root || paused) {
      flush.current = async () => false;
      return;
    }

    const index = indexText(root);
    if (index.length !== end - start) {
      flush.current = async () => false;
      return;
    }
    let last: { range: Interval; finish: boolean } | undefined;
    let awarded = false;
    let inFlight: Promise<boolean> = Promise.resolve(false);
    function record(finish = false) {
      if (awarded) return Promise.resolve(true);
      const visible = visibleRange(passage!, index);
      if (!visible) return inFlight;
      const scrolledToEnd =
        scroll &&
        passage!.scrollTop > 0 &&
        passage!.scrollHeight - passage!.scrollTop - passage!.clientHeight <=
          visibilityTolerance;
      const canFinish = finish || scrolledToEnd;
      if (
        last?.range[0] === visible[0] &&
        last.range[1] === visible[1] &&
        last.finish === canFinish
      )
        return inFlight;
      last = { range: visible, finish: canFinish };
      const seen: Interval = [start + visible[0], start + visible[1]];
      inFlight = recordChapterProgress(key, text, seen, canFinish).then(
        (result) => {
          awarded = result.complete;
          if (result.granted) callbacks.current.onAward();
          return awarded;
        },
        () => {
          last = undefined;
          callbacks.current.onError();
          return false;
        },
      );
      return inFlight;
    }
    flush.current = record;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    function schedule() {
      if (timeout !== undefined || awarded) return;
      timeout = setTimeout(() => {
        timeout = undefined;
        void record();
      }, sampleDelay);
    }
    const resize = new ResizeObserver(schedule);
    resize.observe(passage);
    resize.observe(root);
    passage.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    document.addEventListener("visibilitychange", schedule);
    schedule();
    return () => {
      clearTimeout(timeout);
      resize.disconnect();
      passage.removeEventListener("scroll", schedule);
      window.removeEventListener("scroll", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [box, key, text, start, end, scroll, writing, paused, complete]);

  return { complete, capture: (finish?: boolean) => flush.current(finish) };
}
