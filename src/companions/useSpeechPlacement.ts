import { useLayoutEffect, type RefObject } from "react";
import {
  companionStates,
  stageLayout,
  stageSizes,
  type StageSize,
} from "./states";

const clamp = (x: number, lower: number, upper: number) =>
  Math.min(Math.max(x, lower), Math.max(lower, upper));
type Side = "right" | "left" | "above" | "below";

export function useSpeechPlacement(
  stage: RefObject<HTMLDivElement | null>,
  art: RefObject<HTMLDivElement | null>,
  bubble: RefObject<HTMLDivElement | null>,
  size: StageSize,
  pose: string,
  visible: boolean,
  moving: boolean,
  layoutKey: string,
) {
  useLayoutEffect(() => {
    const root = stage.current,
      character = art.current,
      speech = bubble.current;
    if (!visible || !root || !character || !speech) return;
    const area = root.closest<HTMLElement>(".companion-layer") ?? root;
    const { safePadding: inset, bubbleGap: gap, tailInset, head } = stageLayout;
    let frame = 0;
    let followUntil =
      performance.now() +
      (pose === "arrive"
        ? companionStates.entranceMs
        : companionStates.motionMs);
    function layout() {
      const bounds = area.getBoundingClientRect();
      const base = root!.getBoundingClientRect();
      const figure = character!.getBoundingClientRect();
      const left = Math.max(0, bounds.left) + inset;
      const right = Math.min(innerWidth, bounds.right) - inset;
      const top = Math.max(0, bounds.top) + inset;
      const bottom = Math.min(innerHeight, bounds.bottom) - inset;
      const maxWidth = Math.max(1, right - left);
      const headLeft = figure.left + figure.width * head.left;
      const headRight = figure.left + figure.width * head.right;
      const headTop = figure.top + figure.height * head.top;
      const headBottom = figure.top + figure.height * head.bottom;
      const mouth = figure.top + figure.height * head.mouthY;
      const headMid = (headLeft + headRight) / 2;
      const rightRoom = right - headRight - gap,
        leftRoom = headLeft - left - gap;
      const config = stageSizes[size];
      const ideal = Math.min(
        maxWidth,
        config.bubbleMax,
        Math.max(config.bubbleMin, figure.width * config.bubbleRatio),
      );
      const minimum = Math.min(ideal, config.bubbleMin);
      let side: Side =
        rightRoom >= ideal || (rightRoom >= minimum && rightRoom >= leftRoom)
          ? "right"
          : leftRoom >= minimum
            ? "left"
            : "above";
      if (side === "above" && rightRoom >= minimum) side = "right";
      let width =
        side === "right"
          ? Math.min(ideal, rightRoom)
          : side === "left"
            ? Math.min(ideal, leftRoom)
            : ideal;

      function setWidth(value: number) {
        const next = Math.floor(value) + "px";
        if (speech!.style.width !== next) speech!.style.width = next;
        return speech!.offsetHeight;
      }
      let height = setWidth(width);
      if (side === "above" && headTop - top < height + gap) {
        if (bottom - (headBottom + gap) >= height) side = "below";
        else if (Math.max(leftRoom, rightRoom) >= minimum * 0.68) {
          side = rightRoom >= leftRoom ? "right" : "left";
          width = Math.min(ideal, Math.max(rightRoom, leftRoom));
          height = setWidth(width);
        } else {
          side = headTop - top >= bottom - headBottom ? "above" : "below";
        }
      }
      const x =
        side === "right"
          ? headRight + gap
          : side === "left"
            ? headLeft - gap - width
            : clamp(headMid + gap - width / 2, left, right - width);
      const y =
        side === "above"
          ? headTop - gap - height
          : side === "below"
            ? headBottom + gap
            : clamp(mouth - height + tailInset * 1.65, top, bottom - height);
      const safeY = clamp(y, top, bottom - height);
      speech!.dataset.side = side;
      speech!.style.left = Math.round(x - base.left) + "px";
      speech!.style.top = Math.round(safeY - base.top) + "px";
      const vertical = side === "left" || side === "right";
      const tail = vertical
        ? clamp(mouth - safeY, tailInset, height - tailInset)
        : clamp(headMid - x, tailInset, width - tailInset);
      speech!.style.setProperty(
        "--speech-tail-offset",
        Math.round(tail) + "px",
      );
      speech!.dataset.placed = String(bottom > top && right > left);
    }
    function tick() {
      frame = 0;
      layout();
      if (moving || performance.now() < followUntil)
        frame = requestAnimationFrame(tick);
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(tick);
    }
    layout();
    schedule();
    const observer = new ResizeObserver(schedule);
    for (const element of [root, area, speech, character])
      observer.observe(element);
    const actor = root.closest(".companion-actor");
    const follow = (event: Event) => {
      if (event.target !== actor) return;
      followUntil = performance.now() + companionStates.motionMs;
      schedule();
    };
    actor?.addEventListener("transitionrun", follow);
    window.addEventListener("resize", schedule);
    document.addEventListener("scroll", schedule, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      actor?.removeEventListener("transitionrun", follow);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("scroll", schedule, true);
    };
  }, [stage, art, bubble, size, pose, visible, moving, layoutKey]);
}
