import React, { useEffect, useRef, useState } from "react";
import type { Translate } from "../i18n";
import type { Word } from "../memory";
import {
  type CompanionSettings,
  type CompanionPreview,
  type Role,
} from "../companions/types";
import { companionStates, faceFor } from "../companions/states";
import { useCompanion } from "../companions/useCompanion";
import { CenterStage, centerStageVariables } from "./CenterStage";

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
  preview?: CompanionPreview;
  onPreviewApplied?: () => void;
};

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
  onPreviewApplied,
}: Omit<Props, "role" | "children" | "rail"> & {
  role: Role;
}) {
  const [dragging, setDragging] = useState(false);
  const pause = blocked || alarm || dragging;
  const actor = useCompanion(role, settings, t, pause, writing);
  const anchor = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const suppress = useRef(false);
  const appliedPreview = useRef(0);
  const [previewRevision, setPreviewRevision] = useState<number>();
  const lastAlarm = useRef(false);
  const [quiz, setQuiz] = useState<Word>();
  const [answer, setAnswer] = useState(false);

  useEffect(() => {
    if (!preview || preview.id === appliedPreview.current || pause || drawing)
      return;
    appliedPreview.current = preview.id;
    setPreviewRevision(actor.revision + 1);
    actor.begin(preview.cue);
    onPreviewApplied?.();
  }, [preview, pause, drawing]);

  useEffect(() => {
    if (alarm && !lastAlarm.current && !settings.focus)
      actor.speak("breakReminder");
    lastAlarm.current = alarm;
  }, [alarm, settings.focus]);

  const isQuiz = role.centerBehavior === "quiz" && actor.pose === "center";
  useEffect(() => {
    setAnswer(false);
    setQuiz(
      isQuiz && words.length >= companionStates.quizMinimum
        ? words[Math.floor(Math.random() * words.length)]
        : undefined,
    );
  }, [isQuiz, actor.revision, words]);

  const face = actor.cue === "dragged" ? role.dragFace : faceFor[actor.cue];
  const hidden = !writing && (drawing || blocked || alarm);
  const docked =
    writing &&
    (actor.pose === "center" ||
      actor.pose === "arrive" ||
      actor.pose === "quidditch");
  const pose = docked ? "reading" : actor.pose;
  const size =
    pose === "arrive" ? "hero" : pose === "center" ? "center" : "corner";
  const readyToLand = !pause && !writing && pose === "arrive";
  const land = useRef(actor.begin);
  land.current = actor.begin;
  useEffect(() => {
    if (!readyToLand) return;
    const click = () => land.current("clicked");
    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, [readyToLand]);
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
        data-pose={pose}
        data-stage-size={size}
        data-center-pending={actor.pendingCenter}
        data-state={actor.cue}
        data-dragging={dragging}
      >
        <CenterStage
          role={role}
          t={t}
          pose={pose}
          cue={docked ? "reading" : actor.cue}
          face={docked ? "reading" : face}
          size={size}
          quiet={writing}
          preview={settings.preview && actor.revision === previewRevision}
          showDialogue={actor.bubble && !writing && !blocked && !alarm}
          dialogue={
            <>
              <p>{isQuiz && !quiz ? hint : actor.line}</p>
              {isQuiz && quiz && !dragging && (
                <>
                  <p>{hint}</p>
                  {!answer && <small>{t("companionAnswer")}</small>}
                </>
              )}
            </>
          }
          bodyProps={{
            title: role.personality.map(t).join(" · "),
            "aria-label": t(role.displayName),
            tabIndex: hidden || writing ? -1 : 0,
            ...{ "data-draggable": canDrag },
            onClick: () => {
              if (suppress.current) {
                suppress.current = false;
                return;
              }
              if (
                hidden ||
                writing ||
                settings.focus ||
                actor.pose === "arrive"
              )
                return;
              if (isQuiz && quiz) {
                setAnswer(true);
                actor.speak("praise");
              } else if (actor.pose !== "center") actor.speak("praise");
            },
            onPointerDown: (event) => {
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
            },
            onPointerMove: (event) => {
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
            },
            onPointerUp: finish,
            onPointerCancel: finish,
            onLostPointerCapture: finish,
            onDragStart: (event) => event.preventDefault(),
          }}
        />
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
  preview,
  onPreviewApplied,
}: Props) {
  const page = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = page.current;
    const article = element?.querySelector("article");
    if (!element || !article || !role) return;
    let frame = 0;
    const update = () => {
      const wrap = element.getBoundingClientRect(),
        rect = article.getBoundingClientRect();
      const top = Math.max(0, rect.top),
        bottom = Math.min(innerHeight, rect.bottom);
      const visible = bottom - top;
      const middle =
        visible > 0 ? (top + bottom) / 2 : (rect.top + rect.bottom) / 2;
      element.style.setProperty(
        "--companion-page-middle",
        middle - wrap.top + "px",
      );
      element.style.setProperty(
        "--companion-visible-area",
        Math.max(0, visible) + "px",
      );
      element.style.setProperty(
        "--companion-page-x",
        (rect.left + rect.right) / 2 - wrap.left + "px",
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    observer.observe(article);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [role, rail, settings.position]);
  return (
    <section className="companion-zone">
      <div
        className="companion-page"
        data-companion={Boolean(role)}
        data-companion-side={rail ? "left" : "right"}
        data-position={settings.position}
        ref={page}
        style={centerStageVariables}
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
            onPreviewApplied={onPreviewApplied}
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
