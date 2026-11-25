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
  hideMs: tenMinutes,
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
  hero: {
    art: "min(45dvh, 500px)",
    text: "clamp(28px, 2vw, 36px)",
    bubbleRatio: 1.3,
    bubbleMax: 650,
    bubbleMin: 190,
  },
  center: {
    art: "min(28dvh, 355px)",
    text: "clamp(22px, 1.6vw, 28px)",
    bubbleRatio: 1.35,
    bubbleMax: 430,
    bubbleMin: 155,
  },
  corner: {
    art: "min(13.06vw, 300px)",
    portrait: "22cqw",
    avatar: "48px",
    text: "20px",
    bubbleRatio: 1.3,
    bubbleMax: 350,
    bubbleMin: 150,
  },
} as const;
export type StageSize = keyof typeof stageSizes;

export const stageLayout = {
  confirmWidth: "min(1050px, 96vw)",
  confirmArt: "min(45dvh, 410px, 40cqw)",
  confirmOffset: "4%",
  confirmActionSize: "48px",
  quietScale: 0.89,
  quietOpacity: 0.28,
  nearOpacity: 0.28,
  nearRadius: 80,
  compactWidth: 480,
  safePadding: 12,
  bubbleGap: 10,
  tailHalf: 12,
  tailInset: 18,
  head: { left: 0.29, right: 0.71, top: 0.13, bottom: 0.58, mouthY: 0.46 },
  cornerHeightLimit: 0.46,
  scales: { small: 0.75, medium: 1, large: 1.2 },
  arcStartX: "-58vw",
  arcStartY: "18dvh",
  arcCrestY: "-12dvh",
  arcOvershootX: "12px",
  arcOvershootY: "7px",
} as const;
