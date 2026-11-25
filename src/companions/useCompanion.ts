import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Translate, MessageKey } from "../i18n";
import { companionIds, roles } from "./index";
import { companionStates, focusCycle } from "./states";
import type { CompanionId, CompanionSettings, LineState, Role } from "./types";

export const companionDefaults: CompanionSettings = {
  enabled: true,
  mode: "rotate",
  fixed: "draco",
  position: "top",
  focus: false,
  userName: "",
  preview: false,
};
const rotationKey = "study-or-perish:companion-rotation";

export function useCompanionRole(
  bookId: string | undefined,
  settings: CompanionSettings,
  ready: boolean,
) {
  const [rotated, setRotated] = useState<{ bookId: string; id: CompanionId }>();
  useEffect(() => {
    if (!bookId || !ready || !settings.enabled || settings.mode !== "rotate") {
      setRotated(undefined);
      return;
    }
    let next = 0;
    try {
      const last = companionIds.findIndex(
        (id) => id === localStorage.getItem(rotationKey),
      );
      next = (last + 1) % companionIds.length;
      localStorage.setItem(rotationKey, companionIds[next]);
    } catch {}
    setRotated({ bookId, id: companionIds[next] });
  }, [bookId, ready, settings.mode, settings.enabled]);

  if (!bookId || !ready || !settings.enabled) return undefined;
  if (settings.mode === "fixed") return roles[settings.fixed] ?? roles.draco;
  return rotated?.bookId === bookId ? roles[rotated.id] : undefined;
}

function formatLine(key: MessageKey | undefined, t: Translate, name: string) {
  return key
    ? t(key).replaceAll("{name}", name.trim() || t("companionGuest"))
    : "";
}
function pickLine(
  role: Role,
  state: LineState,
  t: Translate,
  name: string,
  last?: MessageKey,
) {
  const lines = role.lines[state];
  const lastText = formatLine(last, t, name);
  const available = lines.filter(
    (key) => formatLine(key, t, name) !== lastText,
  );
  return available[Math.floor(Math.random() * available.length)] ?? lines[0];
}
export function firstLine(
  role: Role,
  state: LineState,
  t: Translate,
  name: string,
) {
  return formatLine(role.lines[state][0], t, name);
}

function usePausableTimeout(
  key: string,
  duration: number,
  blocked: boolean,
  run: () => void,
) {
  const timer = useRef({ key: "", left: 0 });
  const latest = useRef(run);
  latest.current = run;
  useLayoutEffect(() => {
    if (timer.current.key !== key) timer.current = { key, left: duration };
    if (blocked || !duration) return;
    const started = performance.now();
    const id = window.setTimeout(() => {
      timer.current.left = 0;
      latest.current();
    }, timer.current.left);
    return () => {
      window.clearTimeout(id);
      timer.current.left = Math.max(
        0,
        timer.current.left - (performance.now() - started),
      );
    };
  }, [key, blocked, duration]);
}

type Pose = "arrive" | "reading" | "sleeping" | "center" | "quidditch";
type Phase = "arrive" | "reading" | "sleeping" | "tauntCenter" | "quidditch";

function poseFor(state: LineState): Pose {
  if (state === "tauntCenter" || state === "dragged") return "center";
  if (state === "arrive" || state === "sleeping" || state === "quidditch")
    return state;
  return "reading";
}

export function useCompanion(
  role: Role,
  settings: CompanionSettings,
  t: Translate,
  blocked: boolean,
  writing: boolean,
) {
  const [visit, setVisit] = useState(() => ({
    phase: (settings.focus ? "reading" : "arrive") as Phase,
    pose: (settings.focus ? "reading" : "arrive") as Pose,
    cue: (settings.focus ? "reading" : "arrive") as LineState,
    lineKey: role.lines[settings.focus ? "reading" : "arrive"][0],
    revision: 0,
    speech: 0,
  }));
  const [bubble, setBubble] = useState(true);
  const [pendingCenter, setPendingCenter] = useState(false);
  const cycle = settings.focus ? focusCycle : companionStates.cycle;
  function begin(state: LineState) {
    const requested = poseFor(state);
    if (writing && requested === "center") {
      setPendingCenter(true);
      return;
    }
    const pose = writing && requested === "arrive" ? "reading" : requested;
    const phase: Phase = pose === "center" ? "tauntCenter" : pose;
    setBubble(true);
    setVisit((v) => ({
      phase,
      pose,
      cue: state,
      lineKey: pickLine(role, state, t, settings.userName, v.lineKey),
      revision: v.revision + 1,
      speech: v.speech + 1,
    }));
  }
  function speak(cue: LineState, pose = visit.pose) {
    setBubble(true);
    setVisit((v) => ({
      ...v,
      cue,
      pose,
      lineKey: pickLine(role, cue, t, settings.userName, v.lineKey),
      speech: v.speech + 1,
    }));
  }
  function next() {
    if (visit.phase === "arrive") {
      begin("reading");
      return;
    }
    const index = cycle.findIndex(({ state }) => state === visit.phase);
    const upcoming = cycle[(index + 1) % cycle.length].state;
    if (writing && upcoming === "tauntCenter") {
      setPendingCenter(true);
      begin(cycle[(index + 2) % cycle.length].state);
    } else begin(upcoming);
  }
  useLayoutEffect(() => {
    if (writing && visit.pose === "center") {
      setPendingCenter(true);
      speak("reading", "reading");
    }
    if (!writing && !blocked && pendingCenter) {
      setPendingCenter(false);
      begin("tauntCenter");
    }
  }, [writing, blocked, pendingCenter, visit.pose]);
  const phaseMs =
    visit.phase === "arrive"
      ? companionStates.entranceMs + companionStates.arrivalHoldMs
      : (cycle.find(({ state }) => state === visit.phase)?.durationMs ??
        cycle[0].durationMs);
  const visitMs =
    visit.pose === "center"
      ? companionStates.centerMs
      : visit.pose === "quidditch"
        ? companionStates.quidditchMs
        : 0;
  usePausableTimeout(String(visit.revision), phaseMs, blocked, next);
  usePausableTimeout(visit.revision + ":" + visit.pose, visitMs, blocked, () =>
    speak("returned", "reading"),
  );
  usePausableTimeout(
    String(visit.speech),
    companionStates.speechMs,
    blocked,
    () => setBubble(false),
  );

  return {
    ...visit,
    line: formatLine(visit.lineKey, t, settings.userName),
    bubble,
    pendingCenter,
    begin,
    speak,
  };
}
