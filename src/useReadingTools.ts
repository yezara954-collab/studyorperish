import { useRef, useState, type PointerEvent } from "react";

type Range = { start: number; end: number };
type Gesture = {
  id: number;
  x: number;
  y: number;
  first?: Range;
  latest?: Range;
};
export type ReadingTool = "read" | "highlight" | "ink";

export function useReadingTools(
  text: string,
  scroll: boolean,
  turn: (dir: number) => void,
  save: (range: Range) => void,
) {
  const [tool, setTool] = useState<ReadingTool>("read");
  const [boundary, setBoundary] = useState("word");
  const [draft, setDraft] = useState<Range>();
  const gesture = useRef<Gesture | undefined>(undefined);
  const suppressClick = useRef(false);

  function hit(event: PointerEvent<HTMLDivElement>): Range | undefined {
    const word = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-at][data-end]");
    if (!word || !event.currentTarget.contains(word)) return;
    const start = Number(word.dataset.at),
      end = Number(word.dataset.end);
    if (boundary === "word") return { start, end };
    const before = text.slice(0, start);
    const left =
      Math.max(
        ...[".", "!", "?", "。", "！", "？", "\n"].map((mark) =>
          before.lastIndexOf(mark),
        ),
      ) + 1;
    const right = text.slice(end).search(/[.!?。！？\n]/);
    return {
      start: left + (text.slice(left, start).match(/^\s*/)?.[0].length ?? 0),
      end:
        right < 0
          ? text.length
          : end + right + (text[end + right] === "\n" ? 0 : 1),
    };
  }

  function cancel() {
    gesture.current = undefined;
    setDraft(undefined);
  }

  const handlers = {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (!event.isPrimary || event.button !== 0) return;
      suppressClick.current = false;
      if (
        tool === "ink" ||
        (tool === "read" && (scroll || event.pointerType !== "touch"))
      )
        return;
      const first = tool === "highlight" ? hit(event) : undefined;
      if (tool === "highlight") {
        if (!first) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDraft(first);
      }
      gesture.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        first,
        latest: first,
      };
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      const active = gesture.current;
      if (active?.id !== event.pointerId || !active.first) return;
      active.latest = hit(event) ?? active.latest;
      if (active.latest) setDraft(join(active.first, active.latest));
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      const active = gesture.current;
      if (active?.id !== event.pointerId) return;
      cancel();
      if (active.first) {
        const last = hit(event) ?? active.latest ?? active.first;
        save(join(active.first, last));
        return;
      }
      const dx = event.clientX - active.x,
        dy = event.clientY - active.y;
      if (Math.abs(dx) >= 44 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        suppressClick.current = true;
        turn(dx < 0 ? 1 : -1);
      }
    },
    onPointerCancel: cancel,
    onLostPointerCapture: cancel,
    onClickCapture(event: React.MouseEvent) {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.stopPropagation();
      event.preventDefault();
    },
  };
  return { tool, setTool, boundary, setBoundary, draft, handlers };
}

function join(first: Range, last: Range) {
  return {
    start: Math.min(first.start, last.start),
    end: Math.max(first.end, last.end),
  };
}
