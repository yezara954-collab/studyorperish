import React, { useEffect, useRef, useState } from "react";
import { focus } from "../config";
import type { Translate } from "../i18n";
import { minute } from "../focusTimer";
import { reminder, useFocusTimer } from "../useFocusTimer";

function Mandrake() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      className="focus-art focus-mandrake"
    >
      <g className="focus-leaves">
        <path
          d="M24 23Q24 7 34 6Q32 17 24 21Q21 9 12 8Q12 18 24 22Z"
          className="focus-leaf-fill"
        />
      </g>
      <path
        d="M13 28Q12 16 24 18Q36 17 35 28L31 38H17Z"
        className="focus-root-fill"
      />
      <path
        d="M17 24q2 2 4 0m6 0q2 2 4 0m-10 5q3-2 6 0"
        className="focus-face"
      />
      <path d="M15 24l-3 6m21-6 3 6" className="focus-tears" />
      <circle cx="24" cy="29" r="3" className="focus-cry" />
      <path d="M12 32h24l-3 12H15Z" className="focus-pot-fill" />
      <path d="M10 30h28v4H10Z" className="focus-pot-fill" />
    </svg>
  );
}
function Howler() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      className="focus-art focus-howler"
    >
      <path
        d="M16 14q-8-4-2-10m12 10q6-4 0-9m8 9q7-4 3-8"
        className="focus-smoke"
      />
      <g className="focus-envelope">
        <rect x="5" y="16" width="38" height="25" rx="3" />
        <path
          d="m6 19 18 13 18-13M6 39l13-11m23 11L29 28"
          className="focus-fold"
        />
        <circle cx="24" cy="31" r="4" className="focus-seal" />
      </g>
    </svg>
  );
}

function FocusDialog({
  label,
  className = "",
  close,
  children,
}: {
  label: string;
  className?: string;
  close?: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`focus-dialog ${className}`}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        close?.();
      }}
    >
      {children}
    </dialog>
  );
}

function clock(ms: number) {
  const seconds = Math.ceil(ms / 1000);
  const mins = Math.floor(seconds / 60);
  return `${String(mins).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

type Props = {
  t: Translate;
  opened: boolean;
  setOpened: (opened: boolean) => void;
  sound: boolean;
  vibration: boolean;
  preferencesReady: boolean;
};
export function FocusTimer({
  t,
  opened,
  setOpened,
  sound,
  vibration,
  preferencesReady,
}: Props) {
  const { session, left, ready, busy, error, act } = useFocusTimer(
    sound,
    vibration,
    t,
    preferencesReady,
  );
  const [duration, setDuration] = useState<string>(
    String(focus.defaultMinutes),
  );
  const [custom, setCustom] = useState(false);
  const close = () => setOpened(false);
  if (session?.status === "alert") {
    const rest = session.kind === "rest";
    const id = session.id;
    function choose(type: "again" | "rest" | "extend" | "done") {
      void act({ type, id }).then((ok) => {
        if (ok) close();
      });
    }
    return (
      <FocusDialog
        key={session.id}
        label={t(rest ? "focusRestLabel" : "focusTimeUp")}
        className={rest ? "" : "focus-unfold"}
      >
        {!rest && (
          <div className="focus-finished-art" data-focus-state="alert">
            <Howler />
            <Mandrake />
          </div>
        )}
        <h2>{t(rest ? "focusRestLabel" : "focusTimeUp")}</h2>
        <p lang="en">{reminder(session)}</p>
        <div className="memory-tools">
          {rest ? (
            <button
              className="primary"
              disabled={busy}
              onClick={() => choose("again")}
            >
              {t("focusContinue")}
            </button>
          ) : (
            <>
              <button
                className="primary"
                disabled={busy}
                onClick={() => choose("rest")}
              >
                {t("focusRest")}
              </button>
              <button disabled={busy} onClick={() => choose("extend")}>
                {t("focusExtend")}
              </button>
            </>
          )}
          <button disabled={busy} onClick={() => choose("done")}>
            {t("focusDone")}
          </button>
        </div>
        {error && <p role="alert">{t("focusStorageError")}</p>}
      </FocusDialog>
    );
  }
  const ratio = session ? left / session.durationMs : 1;
  const state =
    session?.kind === "rest"
      ? "sleep"
      : ratio < 0.2
        ? "hot"
        : ratio <= 0.5
          ? "stir"
          : "sleep";
  const label = t(session?.kind === "rest" ? "focusRestLabel" : "focusTimer");
  return (
    <>
      {session && (
        <aside
          className="focus-dock"
          aria-label={label}
          data-focus-state={state}
          data-focus-final={session.kind !== "rest" && left <= minute}
          data-focus-paused={session.status === "paused"}
        >
          <button
            aria-label={`${t("focusMandrake")} · ${t("focusHourglass")}`}
            onClick={() => setOpened(true)}
          >
            <Mandrake />
          </button>
          <button
            aria-label={`${t("focusHowler")} · ${t("focusHourglass")}`}
            onClick={() => setOpened(true)}
          >
            <Howler />
          </button>
        </aside>
      )}
      {opened && (
        <FocusDialog label={label} close={close}>
          <button className="close" aria-label={t("close")} onClick={close}>
            ×
          </button>
          <h2>{label}</h2>
          {session ? (
            <>
              <div className="focus-countdown" role="timer">
                {clock(left)}
              </div>
              <div className="memory-tools">
                <button
                  disabled={busy}
                  onClick={() =>
                    act({
                      type: session.status === "paused" ? "resume" : "pause",
                      id: session.id,
                    })
                  }
                >
                  {t(
                    session.status === "paused" ? "focusResume" : "focusPause",
                  )}
                </button>
                <button
                  disabled={busy}
                  onClick={() => act({ type: "reset", id: session.id })}
                >
                  {t("focusReset")}
                </button>
              </div>
            </>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!ready || busy || !event.currentTarget.reportValidity())
                  return;
                void act({ type: "start", minutes: Number(duration) }).then(
                  (ok) => {
                    if (ok) close();
                  },
                );
              }}
            >
              <div
                className="memory-tools"
                role="group"
                aria-label={t("focusMinutes")}
              >
                {focus.presets.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    aria-pressed={!custom && Number(duration) === minutes}
                    onClick={() => {
                      setCustom(false);
                      setDuration(String(minutes));
                    }}
                  >
                    {minutes}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={custom}
                  onClick={() => setCustom(true)}
                >
                  {t("focusCustom")}
                </button>
              </div>
              {custom && (
                <label className="memory-field">
                  {t("focusMinutes")}
                  <input
                    required
                    type="number"
                    min="1"
                    max={focus.maxMinutes}
                    step="1"
                    inputMode="numeric"
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                  />
                </label>
              )}
              <button className="primary focus-start" disabled={busy || !ready}>
                {t("focusStart")}
              </button>
            </form>
          )}
          {error && <p role="alert">{t("focusStorageError")}</p>}
        </FocusDialog>
      )}
    </>
  );
}
