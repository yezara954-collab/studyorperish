import { useCallback, useEffect, useRef, useState } from "react";
import { focus } from "./config";
import {
  emptyFocus,
  remaining,
  updateFocus,
  type FocusAction,
  type FocusSession,
} from "./focusTimer";
import { unlockFocusAudio } from "./focusAudio";
import { type Translate } from "./i18n";

export function reminder(
  session: Extract<FocusSession, { status: "alert" }>,
  t: Translate,
) {
  return t(
    session.kind === "rest"
      ? "focusRestFinished"
      : (session.partner ?? focus.defaultPartner) === "howler"
        ? focus.howlerLines[session.anger]
        : focus.mandrakeLines[session.anger],
  );
}

function requestNotifications() {
  try {
    if ("Notification" in window && Notification.permission === "default")
      void Notification.requestPermission().catch(() => {});
  } catch {
    // Permission and availability vary by browser and installation.
  }
}

async function notify(title: string, body: string, id: string) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted")
      return;
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration?.showNotification) {
      await registration.showNotification(title, {
        body,
        tag: "study-timer:" + id,
        silent: true,
      });
    } else {
      const notification = new Notification(title, {
        body,
        tag: "study-timer:" + id,
        silent: true,
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  } catch {
    // The alert persists until the user can view the page.
  }
}

export function useFocusTimer(sound: boolean, t: Translate, lang: string) {
  const [data, setData] = useState(emptyFocus);
  const [now, setNow] = useState(Date.now);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const channel = useRef<BroadcastChannel | null>(null);
  const sequence = useRef(0);
  const settings = useRef({ sound, t });
  settings.current = { sound, t };

  const sync = useCallback(async (action?: FocusAction) => {
    const revision = ++sequence.current;
    try {
      const result = await updateFocus(action);
      const session = result.data.session;
      if (result.changed) {
        channel.current?.postMessage("updated");
        if (document.hidden && session?.status === "alert")
          void notify(
            settings.current.t("focusTimer"),
            reminder(session, settings.current.t),
            session.id,
          );
      }
      if (sequence.current === revision) {
        setData(result.data);
        setNow(Date.now());
        setReady(true);
        setError(false);
      }
      return result.changed;
    } catch {
      if (sequence.current === revision) setError(true);
      return false;
    }
  }, []);

  useEffect(() => {
    if (typeof BroadcastChannel === "function") {
      channel.current = new BroadcastChannel("study-or-perish:focus");
      channel.current.onmessage = () => {
        void sync();
      };
    }
    const refresh = () => {
      void sync();
    };
    refresh();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      channel.current?.close();
      channel.current = null;
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [sync]);

  const session = data.session;
  useEffect(() => {
    if (session?.status !== "running") return;
    let tick: number;
    const update = () => {
      const time = Date.now();
      setNow(time);
      const left = remaining(session, time);
      if (left === 0) void sync({ type: "advance", id: session.id });
      else
        tick = window.setTimeout(
          update,
          document.hidden ? left : Math.min(left, left % 1000 || 1000),
        );
    };
    const wake = () => {
      window.clearTimeout(tick);
      update();
    };
    update();
    document.addEventListener("visibilitychange", wake);
    return () => {
      window.clearTimeout(tick);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [session, sync]);

  async function act(action: FocusAction) {
    if (!ready || busy) return false;
    if (["start", "again", "extend", "resume", "rest"].includes(action.type)) {
      if (settings.current.sound)
        unlockFocusAudio(
          action.type === "start"
            ? action.partner
            : (session?.partner ?? focus.defaultPartner),
          lang,
        );
      if (action.type === "start") requestNotifications();
    }
    setBusy(true);
    try {
      return await sync(action);
    } finally {
      setBusy(false);
    }
  }
  return {
    session,
    left: session ? remaining(session, now) : 0,
    ready,
    busy,
    error,
    act,
  };
}
