import { committed, db } from "./books";
import { focus } from "./config";

export const focusStateKey = "study-or-perish:focus";
export const minute = 60_000;

export type FocusRecord = {
  id: string;
  kind: "study" | "extension";
  startedAt: number;
  durationMs: number;
  completed: boolean;
};

type Session = {
  id: string;
  kind: FocusRecord["kind"] | "rest";
  startedAt: number;
  durationMs: number;
  studyMinutes: number;
  anger: number;
};
type Running = Session & { status: "running"; endsAt: number };
type Paused = Session & { status: "paused"; remainingMs: number };
type Alert = Session & { status: "alert"; message: number };
export type FocusSession = Running | Paused | Alert;
export type FocusData = {
  session: FocusSession | null;
  records: FocusRecord[];
};
export const emptyFocus: FocusData = { session: null, records: [] };

export function remaining(session: FocusSession, now: number) {
  return session.status === "running"
    ? Math.max(0, session.endsAt - now)
    : session.status === "paused"
      ? session.remainingMs
      : 0;
}

function start(
  kind: Session["kind"],
  minutes: number,
  studyMinutes: number,
  anger: number,
  now: number,
): Running {
  const durationMs = minutes * minute;
  return {
    id: crypto.randomUUID(),
    kind,
    studyMinutes,
    anger,
    durationMs,
    startedAt: now,
    status: "running",
    endsAt: now + durationMs,
  };
}

function record(data: FocusData, session: FocusSession, completed: boolean) {
  if (session.kind === "rest") return data.records;
  const { id, kind, startedAt, durationMs } = session;
  return [...data.records, { id, kind, startedAt, durationMs, completed }];
}

export type FocusAction =
  | { type: "start"; minutes: number }
  | {
      type:
        | "advance"
        | "pause"
        | "resume"
        | "reset"
        | "rest"
        | "extend"
        | "done"
        | "again";
      id: string;
    };

export function transition(
  data: FocusData,
  action: FocusAction,
  now: number,
  random = Math.random,
): FocusData {
  const current = data.session;
  if (action.type === "start") {
    const { minutes } = action;
    if (
      current ||
      !Number.isInteger(minutes) ||
      minutes < 1 ||
      minutes > focus.maxMinutes
    )
      return data;
    return { ...data, session: start("study", minutes, minutes, 0, now) };
  }
  if (!current || action.id !== current.id) return data;

  if (current.status === "running" && current.endsAt <= now) {
    const message = Math.floor(
      random() * focus.reminders[current.anger].length,
    );
    const { endsAt, ...base } = current;
    return {
      session: { ...base, status: "alert", message },
      records: record(data, current, true),
    };
  }
  if (action.type === "pause" && current.status === "running") {
    const { endsAt, ...base } = current;
    return {
      ...data,
      session: { ...base, status: "paused", remainingMs: endsAt - now },
    };
  }
  if (action.type === "resume" && current.status === "paused") {
    const { remainingMs, ...base } = current;
    return {
      ...data,
      session: { ...base, status: "running", endsAt: now + remainingMs },
    };
  }
  if (action.type === "reset" && current.status !== "alert") {
    return { session: null, records: record(data, current, false) };
  }
  if (current.status !== "alert") return data;
  if (action.type === "done") return { ...data, session: null };
  if (action.type === "rest" && current.kind !== "rest")
    return {
      ...data,
      session: start("rest", focus.restMinutes, current.studyMinutes, 0, now),
    };
  if (action.type === "extend" && current.kind !== "rest")
    return {
      ...data,
      session: start(
        "extension",
        focus.extensionMinutes,
        current.studyMinutes,
        Math.min(focus.maxAnger, current.anger + 1),
        now,
      ),
    };
  if (action.type === "again" && current.kind === "rest")
    return {
      ...data,
      session: start(
        "study",
        current.studyMinutes,
        current.studyMinutes,
        0,
        now,
      ),
    };
  return data;
}

export async function updateFocus(action?: FocusAction) {
  const transaction = (await db).transaction(
    "state",
    action ? "readwrite" : "readonly",
  );
  const store = transaction.objectStore("state");
  const request = store.get(focusStateKey);
  let data = emptyFocus;
  let changed = false;
  request.onsuccess = () => {
    const previous: FocusData = request.result ?? emptyFocus;
    data = action ? transition(previous, action, Date.now()) : previous;
    changed = data !== previous;
    if (changed) store.put(data, focusStateKey);
  };
  await committed(transaction);
  return { data, changed };
}

// Include timer state and its history in the existing JSON backup format.
export function isFocusData(value: unknown): value is FocusData {
  if (!value || typeof value !== "object") return false;
  const { session, records } = value as FocusData;
  const finite = (number: unknown) =>
    typeof number === "number" && Number.isFinite(number) && number > 0;
  if (
    !Array.isArray(records) ||
    !records.every(
      (row) =>
        row &&
        typeof row.id === "string" &&
        ["study", "extension"].includes(row.kind) &&
        finite(row.startedAt) &&
        finite(row.durationMs) &&
        typeof row.completed === "boolean",
    )
  )
    return false;
  if (session === null) return true;
  if (
    !session ||
    typeof session.id !== "string" ||
    !["study", "extension", "rest"].includes(session.kind) ||
    !finite(session.startedAt) ||
    !finite(session.durationMs) ||
    session.durationMs > focus.maxMinutes * minute ||
    !Number.isInteger(session.studyMinutes) ||
    session.studyMinutes < 1 ||
    session.studyMinutes > focus.maxMinutes ||
    !Number.isInteger(session.anger) ||
    session.anger < 0 ||
    session.anger > focus.maxAnger
  )
    return false;
  if (session.status === "alert")
    return (
      Number.isInteger(session.message) &&
      session.message >= 0 &&
      session.message < focus.reminders[session.anger].length
    );
  if (session.status === "running") return finite(session.endsAt);
  return (
    session.status === "paused" &&
    finite(session.remainingMs) &&
    session.remainingMs <= session.durationMs
  );
}
