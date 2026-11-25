import type { Expression, LineState } from "./types";

const tenMinutes = 10 * 60_000;
type Phase = "reading" | "sleeping" | "tauntCenter" | "quidditch";

export const companionStates = {
  cycle: [
    { state: "reading", durationMs: tenMinutes },
    { state: "sleeping", durationMs: tenMinutes },
    { state: "tauntCenter", durationMs: tenMinutes },
    { state: "quidditch", durationMs: tenMinutes },
  ] as readonly { state: Phase; durationMs: number }[],
  arrivalMs: 6_000,
  motionMs: 680,
  centerMs: 10_000,
  quidditchMs: 7_000,
  speechMs: 5_500,
  dragThresholdPx: 7,
  nameLimit: 40,
};
export const focusCycle = companionStates.cycle.filter(
  ({ state }) => state === "reading" || state === "sleeping",
);
export const faceFor: Record<LineState, Expression> = {
  arrive: "smug",
  clicked: "reading",
  reading: "reading",
  sleeping: "sleepy",
  tauntCenter: "teasing",
  dragged: "tsundere",
  returned: "default",
  quidditch: "cheering",
  praise: "cheering",
  chineseConfirm: "surprised",
  breakReminder: "embarrassed",
};
