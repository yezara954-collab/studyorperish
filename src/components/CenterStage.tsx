import React, { useRef } from "react";
import { useSpeechPlacement } from "../companions/useSpeechPlacement";
import type { Translate } from "../i18n";
import {
  companionStates,
  stageLayout,
  stageSizes,
  type StageSize,
} from "../companions/states";
import type { Expression, LineState, Role } from "../companions/types";

export const centerStageVariables = {
  "--center-hero-art": stageSizes.hero.art,
  "--center-center-art": stageSizes.center.art,
  "--corner-landscape-art": stageSizes.corner.art,
  "--corner-portrait-art": stageSizes.corner.portrait,
  "--corner-avatar-art": stageSizes.corner.avatar,
  "--center-confirm-width": stageLayout.confirmWidth,
  "--center-confirm-art": stageLayout.confirmArt,
  "--center-confirm-offset": stageLayout.confirmOffset,
  "--center-confirm-action": stageLayout.confirmActionSize,
  "--center-quiet-scale": stageLayout.quietScale,
  "--center-quiet-opacity": stageLayout.quietOpacity,
  "--center-near-opacity": stageLayout.nearOpacity,
  "--center-safe-margin": stageLayout.safePadding + "px",
  "--center-tail-half": stageLayout.tailHalf + "px",
  "--center-tail-length": stageLayout.bubbleGap + "px",
  "--corner-height-limit": stageLayout.cornerHeightLimit,
  "--center-arc-x": stageLayout.arcStartX,
  "--center-arc-y": stageLayout.arcStartY,
  "--center-arc-crest": stageLayout.arcCrestY,
  "--center-arc-over-x": stageLayout.arcOvershootX,
  "--center-arc-over-y": stageLayout.arcOvershootY,
  "--center-entrance-time": companionStates.entranceMs + "ms",
  "--center-fade-time": companionStates.fadeMs + "ms",
  "--companion-motion": companionStates.motionMs + "ms",
} as React.CSSProperties;

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

export function CenterStage({
  role,
  pose,
  cue,
  face,
  size,
  t,
  dialogue,
  showDialogue = true,
  preview = false,
  quiet = false,
  moving = false,
  layoutKey = "",
  bodyProps,
}: {
  role: Role;
  pose: string;
  cue: LineState;
  face: Expression;
  size: StageSize;
  t: Translate;
  dialogue?: React.ReactNode;
  showDialogue?: boolean;
  preview?: boolean;
  quiet?: boolean;
  moving?: boolean;
  layoutKey?: string;
  bodyProps?: React.ComponentPropsWithoutRef<"button">;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const character = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  useSpeechPlacement(
    stage,
    character,
    bubble,
    size,
    pose,
    showDialogue && Boolean(dialogue),
    moving,
    layoutKey,
  );
  const image =
    role.animation[cue] ?? role.expressionSprites[face] ?? role.sprite;
  const art = image ? (
    <img src={image} alt="" draggable={false} />
  ) : (
    <Sketch pose={pose} face={face} />
  );
  return (
    <div
      ref={stage}
      className="center-stage companion-motion"
      data-pose={pose}
      style={
        {
          "--center-dialogue-font": stageSizes[size].text,
        } as React.CSSProperties
      }
      data-role={role.id}
      data-size={size}
      data-quiet={quiet}
    >
      <div className="center-stage-character">
        <div ref={character} className="center-stage-anchor">
          {bodyProps ? (
            <button
              {...bodyProps}
              type="button"
              className="companion-body center-stage-art"
            >
              {art}
            </button>
          ) : (
            <div className="center-stage-art" aria-hidden="true">
              {art}
            </div>
          )}
        </div>
        {preview && (
          <span className="companion-face-label">
            {t(("companionFace_" + face) as Parameters<Translate>[0])}
          </span>
        )}
      </div>
      {dialogue && (
        <div
          ref={bubble}
          className="companion-bubble"
          data-visible={showDialogue}
          aria-hidden={!showDialogue}
          aria-live="polite"
        >
          {dialogue}
        </div>
      )}
    </div>
  );
}
