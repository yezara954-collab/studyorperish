import {
  useLayoutEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { quill } from "./config";
import {
  anchorSamples,
  glyphLayout,
  visibleLines,
  type Sample,
} from "./quillGeometry";
import type { AnchorPoint } from "./memory";
import {
  emptyRect,
  include,
  intersects,
  eraseAlong,
  strokeChanges,
  type Stroke,
  type Rect,
  type RenderedStroke,
  type Erased,
} from "./inkEraser";

type Gesture = {
  id: number;
  finger: boolean;
  x: number;
  y: number;
  scrollTop: number;
  horizontal?: boolean;
  points: Sample[];
  time: number;
  painted: number;
  drawing?: boolean;
  erased?: Erased;
};
type Options = {
  box: RefObject<HTMLDivElement | null>;
  enabled: boolean;
  fingerInk: boolean;
  leftHand: boolean;
  color: string;
  size: number;
  paged: boolean;
  layoutKey: string;
  strokes: Stroke[];
  strokeTool: "ink" | "highlight" | "eraser";
  radius: number;
  whole: boolean;
  blocked: boolean;
  onDrawing?: (active: boolean) => void;
  erase: (change: ReturnType<typeof strokeChanges>) => Promise<boolean>;
  deleteHighlight: (id: string) => void;
  turn: (direction: number) => void;
  commit: (sentences: string[], points: AnchorPoint[]) => void;
};

function draw(ctx: CanvasRenderingContext2D, point: Sample, previous?: Sample) {
  ctx.beginPath();
  if (!previous || (previous.x === point.x && previous.y === point.y)) {
    ctx.arc(point.x, point.y, point.width / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.lineWidth = (point.width + previous.width) / 2;
  ctx.moveTo(previous.x, previous.y);
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
}

export function useQuill(options: Options) {
  const {
    box,
    enabled,
    fingerInk,
    leftHand,
    color,
    size,
    paged,
    strokes,
    turn,
    commit,
    strokeTool,
    radius,
    whole,
    blocked,
    erase,
    deleteHighlight,
  } = options;
  const saved = useRef<HTMLCanvasElement>(null);
  const live = useRef<HTMLCanvasElement>(null);
  const sprite = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const rendered = useRef<RenderedStroke[]>([]);
  const repaint = useRef<(dirty?: Rect, removed?: Erased) => void>(() => {});
  const palette = useRef(new Map<string, string>());
  const active = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const bounds = useRef<DOMRect | null>(null);
  const frame = useRef(0);
  const feather = useRef({ x: 0, y: 0, opacity: 0 });

  useLayoutEffect(() => {
    if (!enabled) return;
    const surface = live.current;
    if (!surface) return;
    const clearSelection = () => {
      const selection = window.getSelection();
      if (selection?.rangeCount) selection.removeAllRanges();
    };
    const prevent = (event: Event) => event.preventDefault();
    const events = [
      "selectstart",
      "contextmenu",
      "dragstart",
      "touchforcechange",
    ];
    const gestures = ["gesturestart", "gesturechange", "gestureend"];
    const listenerOptions = { capture: true, passive: false };
    const layout = surface.parentElement;
    clearSelection();
    for (const event of gestures)
      document.addEventListener(event, prevent, listenerOptions);
    document.addEventListener("selectionchange", clearSelection);
    for (const event of events)
      layout?.addEventListener(event, prevent, listenerOptions);
    return () => {
      document.removeEventListener("selectionchange", clearSelection);
      for (const event of gestures)
        document.removeEventListener(event, prevent, true);
      for (const event of events)
        layout?.removeEventListener(event, prevent, true);
    };
  }, [enabled]);

  function ink(ctx: CanvasRenderingContext2D, shade: string) {
    const colorValue =
      palette.current.get(shade) ??
      getComputedStyle(ctx.canvas)
        .getPropertyValue(
          shade === "highlight"
            ? "--color-reading-highlight"
            : "--quill-ink-" + shade,
        )
        .trim();
    palette.current.set(shade, colorValue);
    ctx.fillStyle = colorValue;
    ctx.strokeStyle = colorValue;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
  }
  function context(canvas: HTMLCanvasElement, rect: DOMRect) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2.5);
    const width = Math.round(rect.width * ratio),
      height = Math.round(rect.height * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext("2d");
    ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
    return ctx;
  }

  useLayoutEffect(() => {
    const viewport = box.current,
      canvas = saved.current;
    if (!viewport || !canvas) return;
    const content = viewport.querySelector<HTMLElement>(".quill-text")!;
    let pending = 0;
    repaint.current = (dirty, removed) => {
      if (dirty && !Number.isFinite(dirty.left)) return;
      const rect = viewport.getBoundingClientRect();
      const ctx = context(canvas, rect);
      if (!ctx) return;
      const area = dirty ?? {
        left: 0,
        top: 0,
        right: rect.width,
        bottom: rect.height,
      };
      const x = Math.floor(area.left),
        y = Math.floor(area.top);
      const w = Math.ceil(area.right) - x,
        h = Math.ceil(area.bottom) - y;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.clearRect(x, y, w, h);
      for (const { stroke, points, bounds } of rendered.current) {
        if (!intersects(bounds, area)) continue;
        const erased = removed?.get(stroke.id);
        if (erased === "all") continue;
        ink(ctx, stroke.kind === "ink" ? "brown" : stroke.color);
        let previous: Sample | undefined;
        for (let i = 0; i < points.length; i++) {
          const point = points[i];
          if (!point || erased?.has(i)) {
            previous = undefined;
            continue;
          }
          const gap =
            previous && Math.hypot(point.x - previous.x, point.y - previous.y);
          draw(
            ctx,
            point,
            gap !== undefined && (stroke.kind === "ink" || gap < size * 1.4)
              ? previous
              : undefined,
          );
          previous = point;
        }
      }
      ctx.restore();
    };
    function paint() {
      pending = 0;
      const rect = viewport!.getBoundingClientRect();
      const { glyph, sections } = glyphLayout(content);
      rendered.current = strokes.map((stroke) => {
        const bounds = emptyRect();
        let points: (Sample | undefined)[];
        if (stroke.kind === "ink") {
          const first = sections[0],
            last = sections.at(-1);
          if (
            !first ||
            !last ||
            stroke.start < first.start ||
            stroke.start >= last.end
          )
            return { stroke, points: [], bounds };
          const origin = sections
            .find((item) => item.end > stroke.start)!
            .span.getBoundingClientRect();
          points = stroke.points.map(([x, y]) => ({
            x: rect.width - Math.min(size * 4, rect.width / 4) * (1 - x),
            y: origin.top - rect.top + y * size * 8,
            width: quill.width,
          }));
        } else {
          points = stroke.points.map((point) => {
            const anchor = glyph(point.at);
            return (
              anchor && {
                x: anchor.left - rect.left + point.x * size,
                y: anchor.top - rect.top + point.y * size,
                width: (point.width * size) / stroke.fontSize,
              }
            );
          });
        }
        for (const point of points)
          if (point) include(bounds, point.x, point.y, point.width + 2);
        return { stroke, points, bounds };
      });
      repaint.current(undefined, active.current?.erased);
    }
    const schedule = () => {
      if (!pending) pending = requestAnimationFrame(paint);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(viewport);
    observer.observe(content);
    viewport.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    paint();
    return () => {
      cancelAnimationFrame(pending);
      observer.disconnect();
      viewport.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [box, strokes, size, enabled, options.layoutKey]);

  useLayoutEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
    },
    [],
  );

  useLayoutEffect(() => {
    finish(true);
  }, [enabled, strokeTool, options.layoutKey, size]);

  function schedule() {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const { x, y, opacity } = feather.current;
      const pose = `translate3d(${x}px,${y}px,0)`;
      if (sprite.current) {
        sprite.current.style.transform = `${pose} rotate(${leftHand ? quill.leftTilt : quill.rightTilt}deg) scaleX(${leftHand ? -1 : 1})`;
        sprite.current.dataset.visible = String(
          opacity > 0 && strokeTool !== "eraser",
        );
        sprite.current.style.opacity = String(
          strokeTool === "eraser" ? 0 : opacity,
        );
      }
      if (ring.current) {
        ring.current.style.transform = pose;
        ring.current.style.opacity = String(
          strokeTool === "eraser" ? opacity : 0,
        );
      }
      const gesture = active.current,
        rect = bounds.current,
        canvas = live.current;
      if (!gesture || gesture.finger || !rect || !canvas) return;
      if (gesture.erased) {
        paintEraser(gesture, rect);
        return;
      }
      const ctx = context(canvas, rect);
      if (!ctx) return;
      if (gesture.painted === 0)
        ink(ctx, strokeTool === "highlight" ? "highlight" : color);
      const local = (point: Sample) => ({
        ...point,
        x: point.x - rect.left,
        y: point.y - rect.top,
      });
      for (let i = gesture.painted; i < gesture.points.length; i++) {
        draw(
          ctx,
          local(gesture.points[i]),
          i ? local(gesture.points[i - 1]) : undefined,
        );
      }
      gesture.painted = gesture.points.length;
    });
  }

  function featherAt(event: PointerEvent, opacity: number) {
    if (event.pointerType === "mouse" && strokeTool !== "eraser") return;
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    feather.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      opacity,
    };
    schedule();
  }
  function hide() {
    feather.current = { ...feather.current, opacity: 0 };
    schedule();
  }

  function sample(event: PointerEvent, gesture: Gesture) {
    const previous = gesture.points.at(-1);
    const distance =
      previous &&
      Math.hypot(event.clientX - previous.x, event.clientY - previous.y);
    if (distance !== undefined && distance < 0.45) return;
    const speed = (distance ?? 0) / Math.max(1, event.timeStamp - gesture.time);
    const width =
      event.pointerType === "pen"
        ? quill.width * (0.48 + 1.25 * (event.pressure || 0.25))
        : quill.width * (1.12 - Math.min(0.26, speed * 0.08));
    const count = Math.max(1, Math.ceil((distance ?? 0) / 6));
    for (let i = 1; i <= count; i++) {
      const fraction = i / count;
      gesture.points.push({
        x: previous
          ? previous.x + (event.clientX - previous.x) * fraction
          : event.clientX,
        y: previous
          ? previous.y + (event.clientY - previous.y) * fraction
          : event.clientY,
        width: previous
          ? previous.width + (width - previous.width) * fraction
          : width,
      });
    }
    gesture.time = event.timeStamp;
  }
  function paintEraser(gesture: Gesture, rect: DOMRect) {
    const removed = gesture.erased;
    if (!removed) return;
    const dirty = emptyRect();
    const local = (point: Sample) => ({
      ...point,
      x: point.x - rect.left,
      y: point.y - rect.top,
    });
    for (let i = gesture.painted; i < gesture.points.length; i++) {
      const end = local(gesture.points[i]);
      const start = i ? local(gesture.points[i - 1]) : end;
      const area = eraseAlong(
        rendered.current,
        removed,
        start,
        end,
        radius,
        whole,
      );
      if (Number.isFinite(area.left)) {
        include(dirty, area.left, area.top, 0);
        include(dirty, area.right, area.bottom, 0);
      }
    }
    gesture.painted = gesture.points.length;
    repaint.current(dirty, removed);
  }

  function pageInk() {
    const viewport = box.current;
    if (!viewport) return { before: [], after: [] };
    const rect = viewport.getBoundingClientRect();
    const erased: Erased = new Map();
    for (const { stroke, points } of rendered.current) {
      const indices = new Set<number>();
      points.forEach((point, index) => {
        if (point && (paged || (point.y >= 0 && point.y <= rect.height)))
          indices.add(index);
      });
      if (indices.size)
        erased.set(stroke.id, indices.size === points.length ? "all" : indices);
    }
    return strokeChanges(strokes, erased);
  }

  function finish(cancel = false) {
    if (cancel && active.current?.erased?.size) repaint.current();
    if (active.current?.drawing) options.onDrawing?.(false);
    active.current = null;
    const canvas = live.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    hide();
  }

  return {
    saved,
    live,
    sprite,
    ring,
    pageInk,
    handlers: {
      onPointerDown(event: ReactPointerEvent<HTMLElement>) {
        if (
          !event.isPrimary ||
          event.button !== 0 ||
          active.current ||
          (enabled && blocked)
        )
          return;
        suppressClick.current = false;
        const touch = event.pointerType === "touch";
        if (!enabled && (!touch || !paged)) return;
        const gesture: Gesture = {
          id: event.pointerId,
          finger: touch && (!enabled || !fingerInk),
          x: event.clientX,
          y: event.clientY,
          scrollTop: box.current?.scrollTop ?? 0,
          points: [],
          time: event.timeStamp,
          painted: 0,
          erased: enabled && strokeTool === "eraser" ? new Map() : undefined,
        };
        active.current = gesture;
        if (!enabled) return; // Reading mode leaves vertical scrolling to the browser.
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        if (gesture.finger) return;
        gesture.drawing = true;
        options.onDrawing?.(true);
        bounds.current = event.currentTarget.getBoundingClientRect();
        sample(event.nativeEvent, gesture);
        featherAt(event.nativeEvent, 1);
        schedule();
      },
      onPointerMove(event: ReactPointerEvent<HTMLElement>) {
        const gesture = active.current;
        if (!gesture) {
          if (
            enabled &&
            (event.pointerType === "pen" ||
              (strokeTool === "eraser" && event.pointerType === "mouse")) &&
            event.buttons === 0
          )
            featherAt(event.nativeEvent, quill.hoverOpacity);
          return;
        }
        if (gesture.id !== event.pointerId) return;
        if (gesture.finger) {
          if (!enabled) return;
          const dx = event.clientX - gesture.x,
            dy = event.clientY - gesture.y;
          if (
            gesture.horizontal === undefined &&
            Math.max(Math.abs(dx), Math.abs(dy)) > 8
          )
            gesture.horizontal = paged && Math.abs(dx) > Math.abs(dy) * 1.4;
          if (gesture.horizontal === false)
            box.current!.scrollTop = gesture.scrollTop - dy;
          return;
        }
        const events = event.nativeEvent.getCoalescedEvents?.() ?? [];
        for (const point of events.length ? events : [event.nativeEvent])
          sample(point, gesture);
        featherAt(event.nativeEvent, 1);
        schedule();
      },
      onPointerUp(event: ReactPointerEvent<HTMLElement>) {
        const gesture = active.current;
        if (!gesture || gesture.id !== event.pointerId) return;
        if (gesture.finger) {
          const dx = event.clientX - gesture.x,
            dy = event.clientY - gesture.y;
          if (
            paged &&
            gesture.horizontal !== false &&
            Math.abs(dx) >= 44 &&
            Math.abs(dx) > Math.abs(dy) * 1.5
          ) {
            suppressClick.current = true;
            turn(dx < 0 ? 1 : -1);
          }
        } else {
          sample(event.nativeEvent, gesture);
          const content =
            box.current!.querySelector<HTMLElement>(".quill-text")!;
          const rect = event.currentTarget.getBoundingClientRect();
          if (gesture.erased) {
            paintEraser(gesture, bounds.current ?? rect);
            if (gesture.erased.size)
              void erase(strokeChanges(strokes, gesture.erased)).then((ok) => {
                if (!ok) repaint.current();
              });
          } else if (strokeTool === "highlight") {
            const lines = visibleLines(content, rect);
            const pathLength = gesture.points.reduce((length, point, i) => {
              const previous = gesture.points[i - 1];
              return (
                length +
                (previous
                  ? Math.hypot(point.x - previous.x, point.y - previous.y)
                  : 0)
              );
            }, 0);
            if (pathLength < 5) {
              const hit = lines.find(
                ({ rect: line }) =>
                  event.clientX >= line.left &&
                  event.clientX <= line.right &&
                  event.clientY >= line.top &&
                  event.clientY <= line.bottom,
              );
              if (hit) deleteHighlight(hit.id);
            } else {
              const ids = new Set<string>();
              for (const point of gesture.points) {
                const hit = lines.find(
                  ({ rect: line }) =>
                    point.x >= line.left &&
                    point.x <= line.right &&
                    point.y >= line.top &&
                    point.y <= line.bottom + size * 0.22,
                );
                if (hit) ids.add(hit.id);
              }
              commit([...ids], []);
            }
          } else commit([], anchorSamples(gesture.points, content, rect, size));
        }
        finish();
      },
      onPointerCancel(event: ReactPointerEvent<HTMLElement>) {
        if (active.current?.id === event.pointerId) finish(true);
      },
      onLostPointerCapture(event: ReactPointerEvent<HTMLElement>) {
        if (active.current?.id === event.pointerId) finish(true);
      },
      onPointerLeave() {
        if (!active.current) hide();
      },
      onClickCapture(event: React.MouseEvent) {
        if (!suppressClick.current) return;
        suppressClick.current = false;
        event.stopPropagation();
      },
    },
  };
}
