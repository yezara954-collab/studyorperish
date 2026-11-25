import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import type { Translate } from "../i18n";
import { messages } from "../i18n";
import type { Word } from "../memory";
import { playCardAudio, unlockCardAudio } from "./audio";
import { CardBack, CardFace, rarityLabels, RevealLight } from "./CardFace";
import {
  cardRules,
  cards,
  cardsById,
  rarities,
  series,
  type Card,
  type Rarity,
} from "./config";
import {
  collectedCards,
  exportCards,
  importCards,
  openEnvelope,
  prepareEnvelope,
  unopenedBoxes,
  type CardLedger,
} from "./storage";

const seriesLabels = {
  A: "cardsSeriesA",
  B: "cardsSeriesB",
  C: "cardsSeriesC",
  D: "cardsSeriesD",
  L: "cardsSeriesL",
} as const;

function EnvelopeArt() {
  return (
    <span className="cards-envelope" aria-hidden="true">
      <span className="cards-envelope-flap" />
      <span className="cards-envelope-seal">
        <span>✦</span>
      </span>
    </span>
  );
}

type Scene = { kind: "box" | "card"; id: string };
type Props = {
  t: Translate;
  lang: string;
  ledger: CardLedger;
  onChange: () => void;
  onNotice: (message: string) => void;
  saveWord: (word: Word) => Promise<void>;
  sound: boolean;
};

export function Cards({
  t,
  lang,
  ledger,
  onChange,
  onNotice,
  saveWord,
  sound,
}: Props) {
  const [filter, setFilter] = useState<Rarity | "all">("all");
  const [scene, setScene] = useState<Scene>();
  const [busy, setBusy] = useState(false);
  const collection = useRef<HTMLElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  const boxes = useMemo(() => unopenedBoxes(ledger), [ledger]);
  const owned = useMemo(() => collectedCards(ledger), [ledger]);
  const next = boxes[0];
  const progress = Object.keys(ledger.reviews).length % cardRules.reviewsPerBox;

  async function selectBox(id: string) {
    if (pending.current) return;
    if (sound) unlockCardAudio();
    pending.current = true;
    setBusy(true);
    try {
      const { result } = await prepareEnvelope(id);
      if (result) setScene({ kind: "box", id: result });
      else onNotice(t("cardsSaveFailed"));
      onChange();
    } catch {
      onNotice(t("cardsSaveFailed"));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function download() {
    const url = URL.createObjectURL(
      new Blob([exportCards(ledger)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "sealed-cards-backup.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function restore(file: File) {
    try {
      await importCards(await file.text());
      onChange();
      onNotice(t("cardsImported"));
    } catch {
      onNotice(t("cardsImportFailed"));
    }
  }

  return (
    <div className="cards-room">
      <section
        className="cards-inventory"
        aria-labelledby="cards-inventory-title"
      >
        <div className="cards-section-heading">
          <div>
            <h2 id="cards-inventory-title">{t("cardsInventory")}</h2>
            <span className="cards-count">
              {t("cardsUnopenedCount").replace("{count}", String(boxes.length))}
            </span>
          </div>
          <div className="cards-review">
            <label htmlFor="cards-review-meter">{t("cardsReviews")}</label>
            <div>
              <progress
                id="cards-review-meter"
                value={progress}
                max={cardRules.reviewsPerBox}
              />
              <span>
                {progress}/{cardRules.reviewsPerBox}
              </span>
            </div>
            <small>{t("cardsReviewRule")}</small>
          </div>
        </div>
        {boxes.length ? (
          <div className="cards-envelope-list">
            {boxes.map(([id, box], index) => (
              <button
                key={id}
                className="cards-envelope-button"
                onClick={() => void selectBox(id)}
                disabled={busy || (Boolean(next?.[1].cardId) && id !== next[0])}
                aria-label={
                  t(box.cardId ? "cardsContinue" : "cardsEnvelope") +
                  " " +
                  (index + 1)
                }
              >
                <EnvelopeArt />
                <span>{t(box.cardId ? "cardsContinue" : "cardsEnvelope")}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="cards-empty">{t("cardsEmpty")}</p>
        )}
      </section>
      <section
        ref={collection}
        className="cards-collection"
        aria-labelledby="cards-collection-title"
      >
        <div className="cards-section-heading">
          <div>
            <h2 id="cards-collection-title">{t("cardsCollection")}</h2>
            <span className="cards-count">
              {t("cardsProgress")
                .replace("{count}", String(owned.size))
                .replace("{total}", String(cards.length))}
            </span>
          </div>
          <select
            aria-label={t("cardsFilter")}
            value={filter}
            onChange={(event) => setFilter(event.target.value as typeof filter)}
          >
            <option value="all">{t("cardsAllRarities")}</option>
            {rarities.map((rarity) => (
              <option key={rarity} value={rarity}>
                {t(rarityLabels[rarity])}
              </option>
            ))}
          </select>
        </div>
        {series.map((group) => {
          const pool = cards.filter(
            (card) =>
              card.series === group &&
              (filter === "all" || card.rarity === filter),
          );
          if (!pool.length) return null;
          return (
            <section key={group} className="cards-series">
              <h3>{t(seriesLabels[group])}</h3>
              <div className="cards-grid">
                {pool.map((card) => {
                  const item = owned.get(card.id);
                  return (
                    <button
                      key={card.id}
                      className="cards-tile"
                      data-owned={Boolean(item)}
                      aria-label={
                        item
                          ? t(card.title)
                          : `#${card.id} · ${t("cardsLocked")}`
                      }
                      onClick={() => setScene({ kind: "card", id: card.id })}
                    >
                      {item ? <CardFace card={card} t={t} /> : <CardBack />}
                      <span className="cards-tile-number">#{card.id}</span>
                      {item && item.count > 1 && (
                        <span className="cards-tile-copies">×{item.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </section>
      <details className="cards-backup">
        <summary>{t("cardsBackup")}</summary>
        <div>
          <button onClick={download}>{t("cardsExport")}</button>
          <button onClick={() => importInput.current?.click()}>
            {t("cardsImport")}
          </button>
          <input
            ref={importInput}
            type="file"
            hidden
            accept=".json,application/json"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void restore(file);
            }}
          />
        </div>
      </details>
      {scene && (
        <CardDialog
          key={scene.kind + ":" + scene.id}
          scene={scene}
          t={t}
          lang={lang}
          owned={owned}
          sound={sound}
          saveWord={saveWord}
          hasNext={Boolean(next)}
          onChange={onChange}
          close={() => setScene(undefined)}
          next={() => {
            if (next) void selectBox(next[0]);
          }}
          openCollection={() => {
            setScene(undefined);
            setFilter("all");
            requestAnimationFrame(() =>
              collection.current?.scrollIntoView({ block: "start" }),
            );
          }}
        />
      )}
    </div>
  );
}

type Stage = "sealed" | "cracked" | "rising" | "suspense" | "flip" | "revealed";
const stages: Stage[] = [
  "sealed",
  "cracked",
  "rising",
  "suspense",
  "flip",
  "revealed",
];

function CardDialog({
  scene,
  t,
  lang,
  owned,
  close,
  next,
  hasNext,
  openCollection,
  onChange,
  saveWord,
  sound,
}: {
  scene: Scene;
  t: Translate;
  lang: string;
  owned: ReturnType<typeof collectedCards>;
  close: () => void;
  next: () => void;
  hasNext: boolean;
  openCollection: () => void;
  onChange: () => void;
  saveWord: Props["saveWord"];
  sound: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const definitionId = useId();
  const definitionPanel = useRef<HTMLElement>(null);
  const [stage, setStage] = useState<Stage>("sealed");
  const [drawn, setDrawn] = useState<Card>();
  const [error, setError] = useState("");
  const [definition, setDefinition] = useState(false);
  const [saved, setSaved] = useState(false);
  const [working, setWorking] = useState(false);
  const [reduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const locked = useRef(false);
  const swipe = useRef<{ id: number; x: number; y: number } | undefined>(
    undefined,
  );
  const isBox = scene.kind === "box";
  const packCard = isBox ? drawn : cardsById.get(scene.id);
  const revealed = !isBox || stage === "revealed";
  const ownedCopy = packCard ? owned.get(packCard.id) : undefined;
  const faceUp = Boolean(
    packCard &&
    (isBox ? stages.indexOf(stage) >= stages.indexOf("flip") : ownedCopy),
  );
  const timing = cardRules.animation;
  const flipMs = timing.flipMs[packCard?.rarity ?? "common"];

  useLayoutEffect(() => {
    const node = dialog.current!;
    if (node.showModal) node.showModal();
    else node.setAttribute("open", "");
    return () => {
      if (node.open) node.close?.();
    };
  }, []);

  useLayoutEffect(() => {
    if (definition)
      definitionPanel.current?.scrollIntoView({ block: "nearest" });
  }, [definition]);

  useEffect(() => {
    if (!isBox || !drawn) return;
    const advance = (next: Stage, delay: number) =>
      setTimeout(() => {
        if (next === "flip" && sound) void playCardAudio("reveal");
        setStage(next);
      }, delay);
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (stage === "cracked")
      timer = advance(
        reduced ? "flip" : "rising",
        reduced ? timing.reducedMs : timing.breakMs,
      );
    else if (stage === "rising") timer = advance("suspense", timing.riseMs);
    else if (stage === "suspense") timer = advance("flip", timing.suspenseMs);
    else if (stage === "flip")
      timer = advance("revealed", reduced ? timing.reducedMs : flipMs);
    return () => clearTimeout(timer);
  }, [stage, isBox, drawn, reduced, flipMs, timing, sound]);

  async function tear() {
    if (locked.current) return;
    locked.current = true;
    setWorking(true);
    setError("");
    if (sound) unlockCardAudio();
    try {
      const { result } = await openEnvelope(scene.id);
      const card = result && cardsById.get(result);
      if (!card) {
        onChange();
        throw new Error("Envelope unavailable");
      }
      setDrawn(card);
      setStage("cracked");
      if (sound) void playCardAudio("tear");
      onChange();
    } catch {
      setError(t("cardsSaveFailed"));
      locked.current = false;
    } finally {
      setWorking(false);
    }
  }

  function finishSwipe(event: PointerEvent<HTMLButtonElement>) {
    const point = swipe.current;
    swipe.current = undefined;
    if (
      point?.id === event.pointerId &&
      Math.hypot(event.clientX - point.x, event.clientY - point.y) >=
        timing.swipeDistance
    )
      void tear();
  }

  async function storeWord() {
    if (!packCard || working) return;
    setWorking(true);
    setError("");
    const [english, chinese] = messages[packCard.meaning];
    try {
      await saveWord({
        w: packCard.word,
        entry: [null, null, english, chinese],
        source: t(packCard.title),
      });
      setSaved(true);
    } catch {
      setError(t("couldNotSaveWord"));
    } finally {
      setWorking(false);
    }
  }

  const title =
    revealed && faceUp && packCard
      ? t(packCard.title)
      : t(
          isBox
            ? stage === "sealed"
              ? "cardsEnvelope"
              : "cardsOpening"
            : "cardsLocked",
        );
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className="cards-dialog"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      style={
        {
          "--cards-crack-time": `${timing.breakMs}ms`,
          "--cards-rise-time": `${timing.riseMs}ms`,
          "--cards-flip-time": `${flipMs}ms`,
          "--cards-reduced-time": `${timing.reducedMs}ms`,
        } as CSSProperties
      }
    >
      <button className="close" aria-label={t("close")} onClick={close}>
        ×
      </button>
      <h2 id={titleId} aria-live="polite">
        {title}
      </h2>
      <div className="cards-display" data-opening={isBox} data-stage={stage}>
        {isBox && stage === "sealed" && (
          <button
            className="cards-tear"
            aria-label={t("cardsTear")}
            disabled={working}
            onClick={() => void tear()}
            onPointerDown={(event) => {
              if (
                !event.isPrimary ||
                event.button !== 0 ||
                event.pointerType === "mouse"
              )
                return;
              swipe.current = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerUp={finishSwipe}
            onPointerCancel={() => {
              swipe.current = undefined;
            }}
          >
            <EnvelopeArt />
            <span>{t("cardsTear")}</span>
          </button>
        )}
        {isBox && stage !== "sealed" && (
          <div className="cards-opening-envelope">
            <EnvelopeArt />
          </div>
        )}
        {isBox && faceUp && packCard && (
          <RevealLight rarity={packCard.rarity} />
        )}
        {(!isBox || stage !== "sealed") && (
          <div className="cards-display-card">
            <div className="cards-flip" data-front={faceUp}>
              <div className="cards-display-back">
                <CardBack />
              </div>
              {faceUp && packCard && (
                <div className="cards-display-front">
                  <CardFace
                    card={packCard}
                    t={t}
                    active
                    animated={revealed}
                    interactive={revealed}
                    onWord={
                      revealed
                        ? () => setDefinition((previous) => !previous)
                        : undefined
                    }
                    wordExpanded={definition}
                    wordPanel={definitionId}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {isBox && stage === "sealed" && (
        <p className="cards-tear-hint">{t("cardsTearHint")}</p>
      )}
      {revealed && packCard && (
        <div className="cards-details">
          <p>
            {t(seriesLabels[packCard.series])} ·{" "}
            {t(rarityLabels[packCard.rarity])}
          </p>
          {ownedCopy && (
            <dl>
              <div>
                <dt>{t("cardsAcquired")}</dt>
                <dd>{new Date(ownedCopy.first).toLocaleString(lang)}</dd>
              </div>
              <div>
                <dt>{t("cardsCopies")}</dt>
                <dd>×{ownedCopy.count}</dd>
              </div>
            </dl>
          )}
          {definition && faceUp && (
            <section
              id={definitionId}
              ref={definitionPanel}
              className="cards-definition"
              aria-label={t("cardsWord")}
            >
              <strong lang="en">{packCard.word}</strong>
              <p>{t(packCard.meaning)}</p>
              <button
                disabled={saved || working}
                onClick={() => void storeWord()}
              >
                {t(saved ? "savedInTrashBin" : "tossIntoTheTrashBin")}
              </button>
            </section>
          )}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {isBox && revealed && (
        <div className="cards-actions">
          {hasNext && <button onClick={next}>{t("cardsAnother")}</button>}
          <button onClick={openCollection}>{t("cardsViewCollection")}</button>
        </div>
      )}
    </dialog>
  );
}
