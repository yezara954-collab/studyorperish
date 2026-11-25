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
  arrivalHoldMs: 3_000,
  entranceMs: 920,
  fadeMs: 340,
  quizMinimum: 3,
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

export const stageSizes = {
  hero: { art: "min(45dvh, 500px)", scene: "min(100%, 700px)" },
  center: { art: "min(28dvh, 355px)", scene: "min(100%, 560px)" },
  corner: {
    art: "108px",
    compact: "88px",
    scene: "108px",
    compactBubble: "240px",
  },
} as const;
export type StageSize = keyof typeof stageSizes;

export const stageLayout = {
  dialogueSize: "22px",
  confirmWidth: "min(690px, 94vw)",
  confirmActionSize: "48px",
  quietScale: 0.83,
  quietOpacity: 0.63,
  arcStartX: "-58vw",
  arcStartY: "18dvh",
  arcCrestY: "-12dvh",
  arcOvershootX: "12px",
  arcOvershootY: "7px",
} as const;
