import { useRef, useState } from "react";
import type { Annotation } from "./memory";

export type AnnotationChange = { before: Annotation[]; after: Annotation[] };
type Save = (updates: Annotation[], deletions?: string[]) => Promise<boolean>;
type Stack = { undo: AnnotationChange[]; redo: AnnotationChange[] };

export function useAnnotationHistory(key: string, save: Save) {
  const stacks = useRef(new Map<string, Stack>());
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  let stack = stacks.current.get(key);
  if (!stack) {
    stack = { undo: [], redo: [] };
    stacks.current.set(key, stack);
  }
  const history = stack;

  async function apply(
    change: AnnotationChange,
    action: "edit" | "undo" | "redo" = "edit",
  ) {
    if (locked.current || (!change.before.length && !change.after.length))
      return false;
    locked.current = true;
    setBusy(true);
    try {
      const previous = action === "undo" ? change.after : change.before;
      const next = action === "undo" ? change.before : change.after;
      if (
        !(await save(
          next,
          previous.map((item) => item.id),
        ))
      )
        return false;
      if (action === "undo") {
        history.undo.pop();
        history.redo.push(change);
      } else {
        history.undo.push(change);
        if (action === "redo") history.redo.pop();
        else history.redo.length = 0;
      }
      return true;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return { history, busy, apply };
}
