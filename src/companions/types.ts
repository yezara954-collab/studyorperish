import type { MessageKey } from "../i18n";

export const expressions = [
  "default",
  "reading",
  "sleepy",
  "smug",
  "teasing",
  "tsundere",
  "surprised",
  "angry",
  "cheering",
  "embarrassed",
] as const;
export type Expression = (typeof expressions)[number];
export const lineStates = [
  "arrive",
  "clicked",
  "reading",
  "sleeping",
  "tauntCenter",
  "dragged",
  "returned",
  "quidditch",
  "praise",
  "chineseConfirm",
  "breakReminder",
] as const;
export type LineState = (typeof lineStates)[number];
export type CompanionId = "draco" | "harry" | "ron" | "hermione";
export type Role = {
  id: CompanionId;
  displayName: MessageKey;
  personality: readonly MessageKey[];
  centerBehavior: "taunt" | "bet" | "beg" | "quiz";
  dragFace: Expression;
  lines: Record<LineState, readonly MessageKey[]>;
  expressions: readonly Expression[];
  sprite: string | null;
  animation: Partial<Record<LineState, string>>;
  expressionSprites: Partial<Record<Expression, string>>;
};
export type CompanionSettings = {
  enabled: boolean;
  mode: "rotate" | "fixed";
  fixed: CompanionId;
  position: "top" | "bottom";
  focus: boolean;
  userName: string;
  preview: boolean;
};

export type CompanionPreview = {
  cue: LineState;
  id: number;
  role: CompanionId;
  focus: boolean;
};
