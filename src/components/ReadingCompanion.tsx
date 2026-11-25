import React, { useEffect, useRef, useState } from "react";
import type { Translate } from "../i18n";
import type { Word } from "../memory";
import {
  lineStates,
  type CompanionSettings,
  type Expression,
  type LineState,
  type Role,
} from "../companions/types";
import { companionStates, faceFor } from "../companions/states";
import { useCompanion } from "../companions/useCompanion";

type Preview = { cue: LineState; id: number; role: Role["id"]; focus: boolean };
type Props = {
  role?: Role;
  settings: CompanionSettings;
  words: Word[];
  drawing: boolean;
  writing: boolean;
  blocked: boolean;
  alarm: boolean;
  rail: boolean;
  t: Translate;
  children: React.ReactNode;
};

function Sketch({ pose, face }: { pose: string; face: Expression }) {
  const airborne = pose === "arrive" || pose === "quidditch";
  return (
    <svg viewBox="0 0 96 92" aria-hidden="true" className="companion-sketch">
      <g className="companion-figure">
        {airborne && (
          <g className="companion-broom">
            <path d="M5 76 87 54" />
            <path d="M9 69 1 80l22-2 3-7Z" />
          </g>
        )}
        <path className="companion-robe" d="M28 52Q48 44 66 54l11 29H19z" />
        <path className="companion-scarf" d="M34 49q13 7 28 0l3 8-17 5-15-6z" />
        <ellipse className="companion-skin" cx="48" cy="33" rx="21" ry="20" />
        <path
          className="companion-hair"
          d="M26 32Q20 11 41 9Q63 2 71 26L63 29Q53 20 46 20Q39 28 26 32Z"
        />
        {face === "sleepy" ? (
          <path
            className="companion-face-line"
            d="M36 34q4 4 7 0m10 0q4 4 7 0m-14 7q2 1 4 0"
          />
        ) : (
          <g className="companion-face-line">
            <path d="M38 34h2m16 0h2" />
            <path
              d={
                face === "surprised"
                  ? "M47 41q3-3 5 0q0 4-4 3z"
                  : "M44 42q5 3 10-2"
              }
            />
          </g>
        )}
        {pose === "reading" && (
          <path
            className="companion-book"
            d="M24 64q12-7 24 3q13-10 25-3v18q-13-4-25 3q-12-7-24-3z"
          />
        )}
      </g>
      {pose === "quidditch" && (
        <circle className="companion-ball" cx="82" cy="18" r="6" />
      )}
      {pose === "sleeping" && (
        <path
          className="companion-sleep-mark"
          d="M74 18h8l-8 8h8m4-19h7l-7 7h7"
        />
      )}
    </svg>
  );
}

export function CompanionPortrait({ role }: { role: Role }) {
  const path = role.expressionSprites.surprised ?? role.sprite;
  return (
    <div className="companion-portrait" data-role={role.id} aria-hidden="true">
      {path ? (
        <img src={path} alt="" />
      ) : (
        <Sketch pose="reading" face="surprised" />
      )}
    </div>
  );
}

function Actor({
  role,
  settings,
  words,
  drawing,
  writing,
  blocked,
  alarm,
  t,
  preview,
}: Omit<Props, "role" | "children" | "rail"> & {
  role: Role;
  preview?: Preview;
}) {
  const [dragging, setDragging] = useState(false);
  const pause = blocked || drawing || alarm || dragging;
  const actor = useCompanion(role, settings, t, pause);
  const anchor = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const suppress = useRef(false);
  const appliedPreview = useRef(0);
  const lastAlarm = useRef(false);
  const [quiz, setQuiz] = useState<Word>();
  const [answer, setAnswer] = useState(false);

  useEffect(() => {
    if (!preview || preview.id === appliedPreview.current || pause) return;
    appliedPreview.current = preview.id;
    actor.begin(preview.cue);
  }, [preview, pause]);

  useEffect(() => {
    if (alarm && !lastAlarm.current && !settings.focus)
      actor.speak("breakReminder");
    lastAlarm.current = alarm;
  }, [alarm, settings.focus]);

  const isQuiz = role.centerBehavior === "quiz" && actor.pose === "center";
  useEffect(() => {
    setAnswer(false);
    setQuiz(
      isQuiz ? words[Math.floor(Math.random() * words.length)] : undefined,
    );
  }, [isQuiz, actor.revision, words]);

  const face = actor.cue === "dragged" ? role.dragFace : faceFor[actor.cue];
  const art =
    role.animation[actor.cue] ?? role.expressionSprites[face] ?? role.sprite;
  const hidden = drawing || blocked || alarm;
  const docked =
    writing &&
    (actor.pose === "center" ||
      actor.pose === "arrive" ||
      actor.pose === "quidditch");
  const canDrag = actor.pose === "center" && !writing && !hidden;
  const definition = quiz?.entry?.[2]?.split("\n")[0]?.trim();
  const hint = quiz
    ? answer
      ? t("companionQuizAnswer").replace(
          "{answer}",
          definition ? quiz.w : quiz.entry?.[3] || quiz.example || quiz.w,
        )
      : definition
        ? t("companionQuizDefinition").replace("{definition}", definition)
        : t("companionQuizWord").replace("{word}", quiz.w)
    : t("companionNoWords");

  function finish(event: React.PointerEvent<HTMLButtonElement>) {
    const touch = drag.current;
    if (!touch || touch.id !== event.pointerId) return;
    drag.current = null;
    if (!touch.moved) return;
    suppress.current = true;
    setDragging(false);
    anchor.current?.style.removeProperty("--companion-drag-x");
    anchor.current?.style.removeProperty("--companion-drag-y");
    actor.speak("returned", "reading");
  }

  return (
    <div
      className="companion-layer"
      aria-hidden={hidden}
      data-hidden={hidden}
      data-frozen={pause}
      data-protected={writing}
    >
      <div
        ref={anchor}
        className="companion-actor"
        data-role={role.id}
        data-pose={docked ? "reading" : actor.pose}
        data-state={actor.cue}
        data-dragging={dragging}
      >
        <div className="companion-motion">
          <button
            type="button"
            className="companion-body"
            title={role.personality.map(t).join(" · ")}
            aria-label={t(role.displayName)}
            tabIndex={hidden || writing ? -1 : 0}
            data-draggable={canDrag}
            onClick={() => {
              if (suppress.current) {
                suppress.current = false;
                return;
              }
              if (hidden || writing || settings.focus) return;
              if (actor.pose === "arrive") actor.begin("clicked");
              else if (isQuiz && quiz) setAnswer(true);
              else if (actor.pose !== "center") actor.speak("praise");
            }}
            onPointerDown={(event) => {
              suppress.current = false;
              if (!canDrag || !event.isPrimary || event.button !== 0) return;
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                moved: false,
              };
            }}
            onPointerMove={(event) => {
              const touch = drag.current;
              if (!touch || touch.id !== event.pointerId) return;
              const x = event.clientX - touch.x,
                y = event.clientY - touch.y;
              if (
                !touch.moved &&
                Math.hypot(x, y) < companionStates.dragThresholdPx
              )
                return;
              if (!touch.moved) {
                touch.moved = true;
                setDragging(true);
                actor.speak("dragged");
              }
              anchor.current?.style.setProperty("--companion-drag-x", x + "px");
              anchor.current?.style.setProperty("--companion-drag-y", y + "px");
            }}
            onPointerUp={finish}
            onPointerCancel={finish}
            onLostPointerCapture={finish}
            onDragStart={(event) => event.preventDefault()}
          >
            {art ? (
              <img src={art} alt="" draggable={false} />
            ) : (
              <Sketch pose={docked ? "reading" : actor.pose} face={face} />
            )}
          </button>
          <span className="companion-face-label">
            {t(("companionFace_" + face) as Parameters<Translate>[0])}
          </span>
          {(actor.bubble || isQuiz) && !docked && (
            <div className="companion-bubble" aria-live="polite">
              <p>{actor.line}</p>
              {isQuiz && !dragging && (
                <>
                  <p>{hint}</p>
                  {quiz && !answer && <small>{t("companionAnswer")}</small>}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReadingCompanion({
  children,
  role,
  settings,
  words,
  drawing,
  writing,
  blocked,
  alarm,
  rail,
  t,
}: Props) {
  const [selected, setSelected] = useState<LineState>("reading");
  const [preview, setPreview] = useState<Preview>();
  const count = useRef(0);
  const cue =
    settings.focus && selected !== "reading" && selected !== "sleeping"
      ? "reading"
      : selected;
  const choices = settings.focus
    ? (["reading", "sleeping"] as const)
    : lineStates;
  return (
    <section className="companion-zone">
      {role && (
        <div className="memory-tools companion-previews">
          <select
            aria-label={t("companionPreviewState")}
            value={cue}
            onChange={(event) => setSelected(event.target.value as LineState)}
          >
            {choices.map((state) => (
              <option key={state} value={state}>
                {t(("companionState_" + state) as Parameters<Translate>[0])}
              </option>
            ))}
          </select>
          <button
            disabled={drawing || blocked || alarm}
            onClick={() =>
              setPreview({
                cue,
                id: ++count.current,
                role: role.id,
                focus: settings.focus,
              })
            }
          >
            {t("companionPreview")}
          </button>
        </div>
      )}
      <div
        className="companion-page"
        data-companion={Boolean(role)}
        data-companion-side={rail ? "left" : "right"}
        data-position={settings.position}
        style={
          {
            "--companion-motion": companionStates.motionMs + "ms",
          } as React.CSSProperties
        }
      >
        {children}
        {role && (
          <Actor
            key={role.id + ":" + settings.focus}
            role={role}
            settings={settings}
            words={words}
            drawing={drawing}
            writing={writing}
            blocked={blocked}
            alarm={alarm}
            t={t}
            preview={
              preview?.role === role.id && preview.focus === settings.focus
                ? preview
                : undefined
            }
          />
        )}
      </div>
    </section>
  );
}
