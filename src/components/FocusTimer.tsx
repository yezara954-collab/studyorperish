import React, { useEffect, useRef, useState } from "react";
import { focus, type FocusPartner } from "../config";
import type { Translate } from "../i18n";
import { minute } from "../focusTimer";
import { unlockFocusAudio } from "../focusAudio";
import { reminder, useFocusTimer } from "../useFocusTimer";
import { useFocusAlarm } from "../useFocusAlarm";
import { FocusCompanion } from "./FocusCompanion";

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
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

type Props = {
  t: Translate;
  lang: string;
  opened: boolean;
  setOpened: (opened: boolean) => void;
  sound: boolean;
  vibration: boolean;
  shake: boolean;
  preferencesReady: boolean;
  preference: FocusPartner;
  selectPartner: (partner: FocusPartner) => void;
  reading: boolean;
  header: React.ReactNode;
  children: React.ReactNode;
};

type Duration = { value: string; custom: boolean };

function FocusTimerPanel({
  t,
  preference,
  selectPartner,
  start,
  preview,
  ready,
  duration,
  setDuration,
}: Pick<Props, "t" | "preference" | "selectPartner"> & {
  start: (duration: number) => void;
  preview: () => void;
  ready: boolean;
  duration: Duration;
  setDuration: (duration: Duration) => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (ready && event.currentTarget.reportValidity())
          start(Number(duration.value));
      }}
    >
      <fieldset className="focus-partners">
        <legend>{t("focusPartner")}</legend>
        {(Object.keys(focus.partners) as FocusPartner[]).map((partner) => (
          <button
            type="button"
            key={partner}
            aria-pressed={partner === preference}
            onClick={() => selectPartner(partner)}
          >
            <FocusCompanion partner={partner} />
            <span>{t(focus.partners[partner].name)}</span>
          </button>
        ))}
      </fieldset>
      <div className="memory-tools" role="group" aria-label={t("focusMinutes")}>
        {focus.presets.map((minutes) => (
          <button
            key={minutes}
            type="button"
            aria-pressed={
              !duration.custom && Number(duration.value) === minutes
            }
            onClick={() =>
              setDuration({ custom: false, value: String(minutes) })
            }
          >
            {minutes}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={duration.custom}
          onClick={() => setDuration({ ...duration, custom: true })}
        >
          {t("focusCustom")}
        </button>
      </div>
      {duration.custom && (
        <label className="memory-field">
          {t("focusMinutes")}
          <input
            required
            type="number"
            min="1"
            max={focus.maxMinutes}
            step="1"
            inputMode="numeric"
            value={duration.value}
            onChange={(event) =>
              setDuration({ ...duration, value: event.target.value })
            }
          />
        </label>
      )}
      <div className="memory-tools">
        <button className="primary" disabled={!ready}>
          {t("focusStart")}
        </button>
        <button type="button" onClick={preview}>
          {t("focusPreview")}
        </button>
      </div>
    </form>
  );
}

export function FocusTimer({
  t,
  lang,
  opened,
  setOpened,
  sound,
  vibration,
  shake,
  preferencesReady,
  preference,
  selectPartner,
  reading,
  header,
  children,
}: Props) {
  const { session, left, ready, busy, error, act } = useFocusTimer(
    sound,
    t,
    lang,
  );
  const [duration, setDuration] = useState<Duration>({
    value: String(focus.defaultMinutes),
    custom: false,
  });
  const [preview, setPreview] = useState<FocusPartner | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [settling, setSettling] = useState(false);
  const delay = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(delay.current), []);

  const partner = session
    ? (session.partner ?? focus.defaultPartner)
    : preference;
  const isAlert = session?.status === "alert";
  const rest = session?.kind === "rest";
  const alert = isAlert
    ? {
        id: session.id,
        partner,
        rest,
        anger: session.anger,
        line: reminder(session, t),
        preview: false,
      }
    : preview
      ? {
          id: "preview:" + preview,
          partner: preview,
          rest: false,
          anger: session?.anger ?? 0,
          line: t(
            (preview === "howler" ? focus.howlerLines : focus.mandrakeLines)[
              session?.anger ?? 0
            ],
          ),
          preview: true,
        }
      : null;
  const { beat, replaySound } = useFocusAlarm(
    alert,
    lang,
    sound,
    vibration,
    preferencesReady && !settling,
  );
  const shaking = Boolean(shake && beat && alert && !alert.rest && !settling);
  const close = () => setOpened(false);
  const ratio = session ? left / session.durationMs : 1;
  const state = rest
    ? "sleep"
    : ratio < 0.2
      ? "hot"
      : ratio <= 0.5
        ? "stir"
        : "sleep";
  const compact = collapsed || !reading;
  const label = t(rest ? "focusRestLabel" : "focusTimer");
  const { animation } = focus;
  const motion = {
    "--focus-shake-distance": animation.shakePx[alert?.anger ?? 0] + "px",
    "--focus-shake-period": animation.shakeMs + "ms",
    "--focus-mouth-period": animation.mouthMs + "ms",
    "--focus-mouth-beats": animation.mouthBeats,
    "--focus-settle-time": animation.settleMs + "ms",
  } as React.CSSProperties;

  function showPreview() {
    if (sound) unlockFocusAudio(partner, lang);
    setPreview(partner);
  }

  function dismissPreview() {
    setPreview(null);
  }

  function choose(type: "again" | "rest" | "extend" | "done") {
    if (!isAlert || !session || settling || busy) return;
    const id = session.id;
    setSettling(true);
    // Commit on the click so audio activation and the next timestamp stay tied to it.
    const changed = act({ type, id });
    delay.current = window.setTimeout(
      () => {
        void changed.then((ok) => {
          if (ok) {
            close();
            setPreview(null);
          }
          setClosingAlert(null);
          setSettling(false);
        });
      },
      rest ? 0 : animation.settleMs,
    );
    setClosingAlert(alert);
  }

  const [closingAlert, setClosingAlert] = useState<typeof alert>(null);
  const visibleAlert = closingAlert ?? alert;

  return (
    <div className="focus-frame" style={motion}>
      <div className="focus-stage" data-focus-shaking={shaking}>
        {header}
        <div
          className="focus-layout"
          data-focus-rail={
            session ? (compact ? "compact" : "expanded") : undefined
          }
        >
          <div className="focus-content">{children}</div>
          {session && (
            <aside
              className="focus-rail"
              aria-label={label}
              data-focus-state={state}
              data-focus-final={!rest && left <= minute}
              data-focus-paused={session.status === "paused"}
            >
              {compact ? (
                <button
                  className="focus-tab"
                  onClick={() =>
                    reading ? setCollapsed(false) : setOpened(true)
                  }
                  aria-label={t("focusExpand")}
                >
                  {clock(left)}
                </button>
              ) : (
                <>
                  <button
                    className="focus-collapse"
                    aria-label={t("focusHide")}
                    onClick={() => setCollapsed(true)}
                  >
                    −
                  </button>
                  <div className="focus-rail-art" aria-hidden="true">
                    {!visibleAlert && <FocusCompanion partner={partner} />}
                  </div>
                  <span>
                    {t(rest ? "focusRestLabel" : focus.partners[partner].name)}
                  </span>
                  <div className="focus-countdown" role="timer">
                    {clock(left)}
                  </div>
                  <div className="focus-rail-actions">
                    <button
                      disabled={busy || isAlert}
                      onClick={() =>
                        act({
                          type:
                            session.status === "paused" ? "resume" : "pause",
                          id: session.id,
                        })
                      }
                    >
                      {t(
                        session.status === "paused"
                          ? "focusResume"
                          : "focusPause",
                      )}
                    </button>
                    <button
                      disabled={busy || isAlert}
                      onClick={() => act({ type: "reset", id: session.id })}
                    >
                      {t("focusDone")}
                    </button>
                  </div>
                </>
              )}
            </aside>
          )}
        </div>
      </div>
      {visibleAlert && (
        <FocusDialog
          key={visibleAlert.id}
          label={t(
            visibleAlert.preview
              ? "focusPreview"
              : visibleAlert.rest
                ? "focusRestLabel"
                : "focusTimeUp",
          )}
          className={visibleAlert.rest ? "" : "focus-alarm"}
          close={visibleAlert.preview ? dismissPreview : undefined}
        >
          <div
            className="focus-alarm-scene"
            data-focus-state={settling ? "settling" : "alert"}
            data-focus-beat={beat && !settling}
            data-focus-shaking={shaking}
            data-focus-anger={visibleAlert.anger}
            data-focus-partner={visibleAlert.partner}
          >
            {!visibleAlert.rest && (
              <FocusCompanion partner={visibleAlert.partner} alert />
            )}
            <h2 lang={lang}>{visibleAlert.line}</h2>
          </div>
          <div className="memory-tools">
            {visibleAlert.preview ? (
              <button className="primary" onClick={dismissPreview}>
                {t("close")}
              </button>
            ) : (
              <>
                <button
                  className="primary"
                  disabled={busy || settling}
                  onClick={() => choose(visibleAlert.rest ? "again" : "rest")}
                >
                  {t(visibleAlert.rest ? "focusContinue" : "focusRest")}
                </button>
                {!visibleAlert.rest && (
                  <button
                    disabled={busy || settling}
                    onClick={() => choose("extend")}
                  >
                    {t("focusExtend")}
                  </button>
                )}
                <button
                  disabled={busy || settling}
                  onClick={() => choose("done")}
                >
                  {t("focusDone")}
                </button>
              </>
            )}
            {sound && !settling && (
              <button
                onClick={() => {
                  unlockFocusAudio(visibleAlert.partner, lang);
                  replaySound();
                }}
              >
                {t("focusPlaySound")}
              </button>
            )}
          </div>
          {error && <p role="alert">{t("focusStorageError")}</p>}
        </FocusDialog>
      )}
      {opened && !visibleAlert && (
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
                <button onClick={showPreview}>{t("focusPreview")}</button>
              </div>
            </>
          ) : (
            <FocusTimerPanel
              t={t}
              preference={preference}
              duration={duration}
              setDuration={setDuration}
              selectPartner={selectPartner}
              ready={ready && preferencesReady && !busy}
              preview={showPreview}
              start={(duration) => {
                setCollapsed(false);
                void act({
                  type: "start",
                  minutes: duration,
                  partner: preference,
                }).then((ok) => {
                  if (ok) close();
                });
              }}
            />
          )}
          {error && <p role="alert">{t("focusStorageError")}</p>}
        </FocusDialog>
      )}
    </div>
  );
}
