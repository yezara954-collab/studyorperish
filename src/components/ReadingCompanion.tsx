import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Translate } from "../i18n";
import type { Word } from "../memory";
import {
  type CompanionSettings,
  type CompanionPreview,
  type CompanionPosition,
  type Role,
} from "../companions/types";
import { companionStates, faceFor, stageLayout } from "../companions/states";
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
  temporarilyHidden: boolean;
  onPositionChange: (position: CompanionPosition) => void;
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
  temporarilyHidden,
  onPositionChange,
  compact,
}: Omit<Props, "role" | "children"> & {
  role: Role;
  compact: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!compact) setExpanded(false);
  }, [compact]);
  const pause = blocked || alarm || dragging || temporarilyHidden;
  const actor = useCompanion(
    role,
    settings,
    t,
    pause,
    writing,
    temporarilyHidden,
  );
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
  const hidden =
    temporarilyHidden || (!writing && (drawing || blocked || alarm));
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
  const avatar = compact && !expanded && size === "corner";
  const canDrag =
    !writing && !hidden && !avatar && pose !== "arrive" && pose !== "quidditch";
  useEffect(() => {
    const element = anchor.current;
    const body = element?.querySelector("button");
    if (!element || !body || writing || hidden || size !== "corner") return;
    let frame = 0;
    const clear = () => {
      cancelAnimationFrame(frame);
      element.dataset.near = "false";
    };
    const track = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = body.getBoundingClientRect();
        const dx = Math.max(
          rect.left - event.clientX,
          0,
          event.clientX - rect.right,
        );
        const dy = Math.max(
          rect.top - event.clientY,
          0,
          event.clientY - rect.bottom,
        );
        element.dataset.near = String(
          Math.hypot(dx, dy) <= stageLayout.nearRadius,
        );
      });
    };
    window.addEventListener("pointerdown", track, { passive: true });
    window.addEventListener("pointermove", track, { passive: true });
    const release = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") clear();
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", clear);
    document.documentElement.addEventListener("pointerleave", clear);
    window.addEventListener("blur", clear);
    return () => {
      clear();
      window.removeEventListener("pointerdown", track);
      window.removeEventListener("pointermove", track);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", clear);
      document.documentElement.removeEventListener("pointerleave", clear);
      window.removeEventListener("blur", clear);
    };
  }, [writing, hidden, size]);
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

  function finish(event: React.PointerEvent<HTMLButtonElement>, drop: boolean) {
    const touch = drag.current;
    if (!touch || touch.id !== event.pointerId) return;
    drag.current = null;
    if (!touch.moved) return;
    suppress.current = true;
    setDragging(false);
    anchor.current?.style.removeProperty("--companion-drag-x");
    anchor.current?.style.removeProperty("--companion-drag-y");
    if (drop) {
      const area = anchor.current?.parentElement?.getBoundingClientRect();
      if (area) {
        const isLeft = event.clientX < area.left + area.width / 2;
        const isTop = event.clientY < area.top + area.height / 2;
        onPositionChange(
          isLeft
            ? isTop
              ? "topLeft"
              : "bottomLeft"
            : isTop
              ? "top"
              : "bottom",
        );
      }
    }
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
        data-avatar={avatar}
      >
        <CenterStage
          role={role}
          t={t}
          pose={pose}
          cue={docked ? "reading" : actor.cue}
          face={docked ? "reading" : face}
          size={size}
          quiet={writing}
          moving={dragging}
          layoutKey={settings.position + ":" + settings.scale + ":" + avatar}
          preview={settings.preview && actor.revision === previewRevision}
          showDialogue={
            !avatar &&
            !hidden &&
            (actor.bubble || pose === "arrive") &&
            !writing &&
            !blocked &&
            !alarm
          }
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
            "aria-label": avatar
              ? t("companionExpand").replace("{name}", t(role.displayName))
              : t(role.displayName),
            "aria-expanded": compact && size === "corner" ? !avatar : undefined,
            tabIndex: hidden || writing ? -1 : 0,
            ...{ "data-draggable": canDrag },
            onClick: () => {
              if (suppress.current) {
                suppress.current = false;
                return;
              }
              if (hidden || writing || actor.pose === "arrive") return;
              if (avatar) {
                setExpanded(true);
                actor.replay();
              } else if (isQuiz && quiz) {
                setAnswer(true);
                actor.speak("praise");
              } else if (actor.pose !== "center") actor.replay();
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
            onPointerUp: (event) => finish(event, true),
            onPointerCancel: (event) => finish(event, false),
            onLostPointerCapture: (event) => finish(event, false),
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
  temporarilyHidden,
  onPositionChange,
  t,
  preview,
  onPreviewApplied,
}: Props) {
  const page = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(
    () => innerWidth <= stageLayout.compactWidth,
  );
  useLayoutEffect(() => {
    const element = page.current,
      passage = element?.querySelector(".passage-layout");
    if (!element || !passage || !role) return;
    let frame = 0;
    const update = () => {
      const wrap = element.getBoundingClientRect(),
        rect = passage.getBoundingClientRect();
      const top = Math.max(0, rect.top),
        bottom = Math.min(innerHeight, rect.bottom);
      element.style.setProperty(
        "--companion-area-x",
        rect.left - wrap.left + "px",
      );
      element.style.setProperty("--companion-area-y", top - wrap.top + "px");
      element.style.setProperty("--companion-area-width", rect.width + "px");
      element.style.setProperty(
        "--companion-visible-area",
        Math.max(0, bottom - top) + "px",
      );
      setCompact(Math.min(innerWidth, rect.width) <= stageLayout.compactWidth);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    observer.observe(passage);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [role]);
  return (
    <section className="companion-zone">
      <div
        className="companion-page"
        data-companion={Boolean(role)}
        data-position={settings.position}
        ref={page}
        style={
          {
            ...centerStageVariables,
            "--corner-scale": stageLayout.scales[settings.scale],
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
            onPreviewApplied={onPreviewApplied}
            temporarilyHidden={temporarilyHidden}
            onPositionChange={onPositionChange}
            compact={compact}
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
