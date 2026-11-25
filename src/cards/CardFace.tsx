import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import type { Translate } from "../i18n";
import { cardRules, type Card, type Rarity } from "./config";

export const rarityLabels = {
  common: "cardsRarityCommon",
  rare: "cardsRarityRare",
  legendary: "cardsRarityLegendary",
} as const;

export function CardBack() {
  return (
    <div className="sealed-card-back" aria-hidden="true">
      <span>✦</span>
    </div>
  );
}

export function CardFace({
  card,
  t,
  animated = false,
  interactive = false,
  onWord,
  wordExpanded,
  wordPanel,
  active = true,
}: {
  card: Card;
  t: Translate;
  animated?: boolean;
  interactive?: boolean;
  active?: boolean;
  onWord?: () => void;
  wordExpanded?: boolean;
  wordPanel?: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [motion, setMotion] = useState(false);
  const [tabVisible, setTabVisible] = useState(!document.hidden);

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!animated) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setMotion(!reduced.matches);
      setTabVisible(!document.hidden);
    };
    update();
    document.addEventListener("visibilitychange", update);
    reduced.addEventListener?.("change", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      reduced.removeEventListener?.("change", update);
    };
  }, [animated]);

  const playVideo =
    active &&
    visible &&
    animated &&
    motion &&
    tabVisible &&
    !videoFailed &&
    Boolean(card.video);
  useEffect(() => {
    const video = image.current;
    if (!video || !playVideo) {
      setPlaying(false);
      return;
    }
    video.muted = true;
    void video.play()?.catch(() => setPlaying(false));
    return () => video.pause();
  }, [playVideo]);

  const drag = useRef<
    { id: number; x: number; y: number; size: number } | undefined
  >(undefined);
  function start(event: PointerEvent<HTMLDivElement>) {
    if (
      !interactive ||
      !event.isPrimary ||
      event.button !== 0 ||
      (event.target as HTMLElement).closest("button")
    )
      return;
    const node = event.currentTarget;
    const rect = node.getBoundingClientRect();
    node.setPointerCapture(event.pointerId);
    node.dataset.dragging = "true";
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      size: rect.width,
    };
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const max = cardRules.animation.maxTilt;
    const angle = (distance: number) =>
      Math.max(-max, Math.min(max, (distance / current.size) * 2 * max));
    event.currentTarget.style.setProperty(
      "--cards-tilt-x",
      `${angle(current.y - event.clientY)}deg`,
    );
    event.currentTarget.style.setProperty(
      "--cards-tilt-y",
      `${angle(event.clientX - current.x)}deg`,
    );
  }
  function release(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = undefined;
    const node = event.currentTarget;
    delete node.dataset.dragging;
    node.style.removeProperty("--cards-tilt-x");
    node.style.removeProperty("--cards-tilt-y");
  }
  return (
    <div
      className="sealed-card-face"
      data-rarity={card.rarity}
      data-interactive={interactive}
      data-visible={active && visible}
      ref={frame}
      style={{ "--cards-accent": card.accent } as CSSProperties}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <div className="sealed-card-art">
        <div className="sealed-card-placeholder" aria-hidden="true">
          <i>✦</i>
          <span>✧</span>
          <b>✦</b>
        </div>
        {active && visible && !posterFailed && card.poster && (
          <img
            src={card.poster}
            alt=""
            decoding="async"
            draggable={false}
            onError={() => setPosterFailed(true)}
          />
        )}
        {playVideo && (
          <video
            ref={image}
            src={card.video}
            className="sealed-card-video"
            data-playing={playing}
            onPlaying={() => setPlaying(true)}
            onError={() => {
              setPlaying(false);
              setVideoFailed(true);
            }}
            muted
            playsInline
            loop
            autoPlay
            preload="none"
            aria-hidden="true"
          />
        )}
      </div>
      {card.rarity !== "common" && (
        <span className="sealed-card-glint" aria-hidden="true" />
      )}
      {card.rarity === "legendary" && (
        <div className="sealed-card-stars" aria-hidden="true">
          ✦ · ✧
        </div>
      )}
      <div className="sealed-card-caption">
        <small>{t(rarityLabels[card.rarity])}</small>
        <strong>{t(card.title)}</strong>
        {onWord ? (
          <button
            className="sealed-card-ribbon"
            aria-expanded={wordExpanded}
            aria-controls={wordPanel}
            onClick={onWord}
            lang="en"
          >
            {card.word}
          </button>
        ) : (
          <span className="sealed-card-ribbon" lang="en">
            {card.word}
          </span>
        )}
      </div>
    </div>
  );
}

export function RevealLight({ rarity }: { rarity: Rarity }) {
  const count = cardRules.animation.particles[rarity];
  return (
    <div className="cards-reveal-light" data-rarity={rarity} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i * 2 * Math.PI) / count;
        const spread = 5 + (i % 3) * 1.5;
        return (
          <i
            key={i}
            style={
              {
                "--cards-fly-x": `${Math.cos(angle) * spread}rem`,
                "--cards-fly-y": `${Math.sin(angle) * spread}rem`,
                "--cards-turn": `${i * 37}deg`,
              } as CSSProperties
            }
          >
            {rarity === "legendary" ? "✦" : ""}
          </i>
        );
      })}
    </div>
  );
}
