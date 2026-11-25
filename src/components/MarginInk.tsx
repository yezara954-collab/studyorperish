import React, { useRef, useState } from "react";
import type { Ink, Point } from "../memory";

function Stroke({ points }: { points: Point[] }) {
  const path = points
    .map(([x, y], index) => `${index ? "L" : "M"}${x} ${y}`)
    .join(" ");
  return (
    <path
      d={points.length === 1 ? path + "l0 .0001" : path}
      vectorEffect="non-scaling-stroke"
    />
  );
}

export function MarginInk({
  enabled,
  strokes,
  label,
  save,
}: {
  enabled: boolean;
  strokes: Ink[];
  label: string;
  save: (points: Point[]) => void;
}) {
  const active = useRef<{ id: number; points: Point[] } | undefined>(undefined);
  const [draft, setDraft] = useState<Point[]>([]);
  function point(event: React.PointerEvent<SVGSVGElement>): Point {
    const { left, top, width, height } =
      event.currentTarget.getBoundingClientRect();
    const clamp = (value: number) => Math.min(1, Math.max(0, value));
    return [
      clamp((event.clientX - left) / width),
      clamp((event.clientY - top) / height),
    ];
  }
  function cancel() {
    active.current = undefined;
    setDraft([]);
  }
  return (
    <svg
      className="margin-ink"
      data-enabled={enabled}
      role="img"
      aria-label={label}
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      onPointerDown={(event) => {
        if (!enabled || !event.isPrimary || event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        const points = [point(event)];
        active.current = { id: event.pointerId, points };
        setDraft(points);
      }}
      onPointerMove={(event) => {
        if (active.current?.id !== event.pointerId) return;
        active.current.points.push(point(event));
        setDraft([...active.current.points]);
      }}
      onPointerUp={(event) => {
        if (active.current?.id !== event.pointerId) return;
        save([...active.current.points, point(event)]);
        cancel();
      }}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
    >
      {strokes.map((stroke) => (
        <Stroke key={stroke.id} points={stroke.points} />
      ))}
      {draft.length > 0 && <Stroke points={draft} />}
    </svg>
  );
}
