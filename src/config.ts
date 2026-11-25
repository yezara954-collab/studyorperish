import type { MessageKey } from "./i18n";
import { Plate, Flourish } from "./art";
export const illustrations = { Cover: Plate, Banner: Flourish };
export const companion = { languagePrompt: "languagePrompt" } satisfies {
  languagePrompt: MessageKey;
};
export { default as sigilPaths } from "./sigil.json";
export const iconPaths: Record<string, string> = {
  shelf: "M3 5h4v14H3zM10 4h3v15h-3zM15 6l3-1 4 13-3 1z",
  bin: "M4 6h16M9 6V3h6v3M6 7l1 14h10l1-14M10 10v7M14 10v7",
  settings: "M3 7h7m4 0h7M3 17h11m4 0h3M10 4v6m6 4v6",
  plus: "M12 4v16M4 12h16",
  notebook: "M5 3h14v18H5zM8 3v18M11 8h5M11 12h5",
  book: "M2 5q6-2 10 2 5-4 10-2v14q-6-2-10 2-5-4-10-2zM12 7v14",
};

export const quill = {
  image: "./assets/quill.svg",
  cursorFallback: "./assets/quill-cursor.png",
  cursorHotspot: [3, 29],
  spriteSize: 48,
  spriteHotspot: [4.5, 43.5],
  rightTilt: 0,
  leftTilt: 0,
  fadeMs: 300,
  hoverOpacity: 0.45,
  width: 2.25,
  colors: ["brown", "black", "blue", "red"],
} as const;
