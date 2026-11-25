import React from "react";
import { useReader, type ReaderProps } from "./useReader";
import { useQuill } from "./useQuill";
import { useAnnotationHistory } from "./useAnnotationHistory";
import { eraserSizes, quill } from "./config";
import { sentencesOf } from "./sentences";
import type { Annotation, Highlight, Ink, QuillStroke } from "./memory";
import { WordCard } from "./components/WordCard";
type Props = ReaderProps & {
  annotations: Annotation[];
  changeAnnotations: (
    updates: Annotation[],
    deletions?: string[],
  ) => Promise<boolean>;
  backLabel: string;
};
export function Reader(props: Props) {
  const state = useReader(props);
  const { book, prefs, t, onBack } = props;
  const {
    ch,
    page,
    pages,
    scroll,
    box,
    timer,
    chapter,
    format,
    setFormat,
    error,
    turn,
    open,
    go,
    change,
    word,
    persist,
  } = state;
  const [writing, setWriting] = React.useState(false);
  const [mode, setMode] = React.useState<"ink" | "highlight">("ink");
  const [erasing, setErasing] = React.useState(false);
  const strokeTool = mode === "ink" && erasing ? "eraser" : mode;
  const eraserSize =
    eraserSizes[prefs.eraserSize as keyof typeof eraserSizes] ??
    eraserSizes.medium;
  const { history, busy, apply } = useAnnotationHistory(
    ch + ":" + mode,
    props.changeAnnotations,
  );
  const nib =
    mode === "highlight"
      ? "var(--color-reading-highlight)"
      : `var(--quill-ink-${prefs.inkColor})`;
  const [cursorUrl, setCursorUrl] = React.useState("");
  React.useEffect(() => {
    if (!writing) return;
    const image = new Image();
    const shade =
      mode === "highlight"
        ? "--color-reading-highlight"
        : "--quill-ink-" + prefs.inkColor;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(image, 0, 0);
      ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue(shade)
        .trim();
      ctx.beginPath();
      ctx.arc(...quill.cursorHotspot, quill.width * 0.7, 0, Math.PI * 2);
      ctx.fill();
      setCursorUrl(canvas.toDataURL());
    };
    image.src = quill.cursorFallback;
    return () => {
      image.onload = null;
    };
  }, [writing, mode, prefs.inkColor]);
  const [flash, setFlash] = React.useState<string | undefined>(
    props.initial?.sentenceId,
  );
  React.useEffect(() => {
    const timeout = setTimeout(() => setFlash(undefined), 1700);
    return () => clearTimeout(timeout);
  }, []);
  const sentences = React.useMemo(
    () => sentencesOf(chapter.text, ch),
    [chapter.text, ch],
  );
  const current = React.useMemo(
    () =>
      props.annotations.filter(
        (item) => item.bookId === book.id && item.chapter === ch,
      ),
    [props.annotations, book.id, ch],
  );
  const highlights = new Set(
    current.flatMap((item) =>
      item.kind === "highlight" ? [item.sentenceId] : [],
    ),
  );
  const strokes = React.useMemo(
    () =>
      current.filter(
        (item): item is Ink | QuillStroke => item.kind !== "highlight",
      ),
    [current],
  );
  const modeItems = current.filter(
    (item) => (item.kind === "highlight") === (mode === "highlight"),
  );
  const latest = modeItems.reduce<Annotation | undefined>(
    (best, item) => (!best || item.createdAt >= best.createdAt ? item : best),
    undefined,
  );
  const start = scroll ? 0 : pages[page];
  const end = scroll
    ? chapter.text.length
    : (pages[page + 1] ?? chapter.text.length);
  const tools = useQuill({
    box,
    enabled: writing,
    paged: !scroll,
    size: prefs.size,
    strokes,
    turn,
    layoutKey: [ch, start, end, prefs.line].join(":"),
    fingerInk: prefs.fingerInk,
    leftHand: prefs.leftHand,
    color: prefs.inkColor,
    strokeTool,
    radius: eraserSize / 2,
    whole: prefs.eraserMode === "whole",
    blocked: busy,
    erase: apply,
    deleteHighlight(id) {
      const before = modeItems.filter(
        (item) => item.kind === "highlight" && item.sentenceId === id,
      );
      if (before.length && window.confirm(t("removeNotebookHighlight")))
        void apply({ before, after: [] });
    },
    commit(ids, points) {
      const anchor = { bookId: book.id, chapter: ch, createdAt: Date.now() };
      const strokeId = crypto.randomUUID();
      if (ids.length) {
        const requested = new Set(ids);
        const entries = sentences
          .filter(
            (sentence) =>
              requested.has(sentence.id) && !highlights.has(sentence.id),
          )
          .map((sentence): Highlight => ({
            ...anchor,
            kind: "highlight",
            id: JSON.stringify([book.id, sentence.id]),
            strokeId,
            bookTitle: book.title,
            chapterTitle: chapter.title,
            sentenceId: sentence.id,
            start: sentence.start,
            end: sentence.end,
            quote: sentence.text,
            note: "",
          }));
        if (entries.length) void apply({ before: [], after: entries });
      } else if (points.length) {
        void apply({
          before: [],
          after: [
            {
              ...anchor,
              kind: "quill",
              id: strokeId,
              start: points[0].at,
              points,
              color: prefs.inkColor,
              fontSize: prefs.size,
            },
          ],
        });
      }
    },
  });
  function undo() {
    const recent = history.undo.at(-1);
    if (recent) {
      void apply(recent, "undo");
      return;
    }
    if (!latest) return;
    const group =
      latest.kind === "highlight" && latest.strokeId
        ? modeItems.filter(
            (item) =>
              item.kind === "highlight" && item.strokeId === latest.strokeId,
          )
        : [latest];
    void apply({ before: [], after: group }, "undo");
  }
  function clearInk() {
    const entries = tools.pageInk();
    if (entries.before.length && window.confirm(t("clearPageInkConfirm")))
      void apply(entries);
  }

  const passage: React.ReactNode[] = [];
  let previousEnd = start;
  for (const sentence of sentences) {
    if (sentence.end <= start) continue;
    if (sentence.start >= end) break;
    const left = Math.max(start, sentence.start),
      right = Math.min(end, sentence.end);
    passage.push(chapter.text.slice(previousEnd, left));
    passage.push(
      <span
        key={sentence.id}
        data-sentence-id={sentence.id}
        data-start={left}
        className={
          highlights.has(sentence.id) ? "reading-highlight" : undefined
        }
        data-located={
          flash === sentence.id && props.initial?.ch === ch ? "true" : undefined
        }
      >
        {Array.from(
          chapter.text
            .slice(left, right)
            .matchAll(/[A-Za-z]+(?:['’-][A-Za-z]+)*|[^A-Za-z]+/g),
          (match) => {
            match.index = left + match.index!;
            if (writing || !/^[a-z]/i.test(match[0])) return match[0];
            return (
              <span
                role="button"
                tabIndex={0}
                key={match.index}
                data-at={match.index}
                onClick={(event) => {
                  clearTimeout(timer.current);
                  if (event.detail > 1 || window.getSelection()?.toString())
                    return;
                  timer.current = setTimeout(() => {
                    if (!window.getSelection()?.toString()) open(match);
                  }, 260);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") open(match);
                }}
              >
                {match[0]}
              </span>
            );
          },
        )}
      </span>,
    );
    previousEnd = right;
  }
  passage.push(chapter.text.slice(previousEnd, end));
  return (
    <main className="reader">
      <div className="readerbar">
        <button onClick={onBack}>‹ {props.backLabel}</button>
        <button onClick={() => setFormat(!format)}>
          Aa · {t("readingSettings")}
        </button>
      </div>
      <div className="memory-tools" role="group" aria-label={t("readingTools")}>
        <button aria-pressed={!writing} onClick={() => setWriting(false)}>
          {t("read")}
        </button>
        <button
          aria-pressed={writing}
          onClick={() => {
            clearTimeout(timer.current);
            state.setWord(null);
            setWriting(true);
          }}
        >
          {t("quillTool")}
        </button>
      </div>
      {writing && (
        <div className="memory-tools" role="group" aria-label={t("quillTool")}>
          <button
            disabled={busy}
            aria-pressed={mode === "ink"}
            onClick={() => setMode("ink")}
          >
            {t("handwritingMode")}
          </button>
          <button
            disabled={busy}
            aria-pressed={mode === "highlight"}
            onClick={() => {
              setMode("highlight");
              setErasing(false);
            }}
          >
            {t("highlightMode")}
          </button>
          {mode === "ink" && (
            <>
              <label>
                {t("inkColor")}{" "}
                <select
                  disabled={busy}
                  value={prefs.inkColor}
                  onClick={() => setErasing(false)}
                  onChange={(event) => {
                    setErasing(false);
                    change("inkColor", event.target.value);
                  }}
                >
                  {quill.colors.map((color) => (
                    <option value={color} key={color}>
                      {t(color)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                disabled={busy}
                aria-pressed={erasing}
                onClick={() => setErasing(!erasing)}
              >
                {t("eraser")}
              </button>
              {erasing && (
                <>
                  <label>
                    {t("eraseMethod")}{" "}
                    <select
                      disabled={busy}
                      value={prefs.eraserMode}
                      onChange={(event) =>
                        change("eraserMode", event.target.value)
                      }
                    >
                      <option value="partial">{t("erasePartial")}</option>
                      <option value="whole">{t("eraseWhole")}</option>
                    </select>
                  </label>
                  <label>
                    {t("eraserSize")}{" "}
                    <select
                      disabled={busy}
                      value={prefs.eraserSize}
                      onChange={(event) =>
                        change("eraserSize", event.target.value)
                      }
                    >
                      {(["small", "medium", "large"] as const).map((size) => (
                        <option value={size} key={size}>
                          {t(size)}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              <button disabled={busy || !strokes.length} onClick={clearInk}>
                {t("clearPageInk")}
              </button>
            </>
          )}
          <button
            disabled={busy || (!latest && !history.undo.length)}
            onClick={undo}
          >
            {t("undoStroke")}
          </button>
          <button
            disabled={busy || !history.redo.length}
            onClick={() => {
              const recent = history.redo.at(-1);
              if (recent) void apply(recent, "redo");
            }}
          >
            {t("redoStroke")}
          </button>
        </div>
      )}
      {format && (
        <section className="options">
          <label>
            {t("typeSize")}{" "}
            <input
              type="range"
              min="16"
              max="32"
              value={prefs.size}
              onChange={(e) => change("size", +e.target.value)}
            />
          </label>
          <label>
            {t("lineSpacing")}{" "}
            <input
              type="range"
              min="1.3"
              max="2.3"
              step=".1"
              value={prefs.line}
              onChange={(e) => change("line", +e.target.value)}
            />
          </label>
          <select
            value={prefs.mode}
            onChange={(e) => change("mode", e.target.value)}
          >
            <option value="page">{t("pages")}</option>
            <option value="scroll">{t("scroll")}</option>
          </select>
        </section>
      )}
      <article>
        <small>{book.title}</small>
        <select
          aria-label={t("chapter")}
          value={ch}
          onChange={(e) => go(+e.target.value)}
        >
          {book.chapters.map((c, i) => (
            <option key={i} value={i}>
              {i + 1}. {c.title}
            </option>
          ))}
        </select>
        <h1>{chapter.title}</h1>
        <div
          className="passage-layout"
          data-writing={writing}
          data-eraser={strokeTool === "eraser"}
          style={
            {
              "--quill-cursor": `url("${cursorUrl || quill.image}") ${quill.cursorHotspot.join(" ")}, url("${quill.cursorFallback}") ${quill.cursorHotspot.join(" ")}`,
              "--quill-tip-color": nib,
              "--quill-tip-size": quill.width * 1.5 + "px",
              "--eraser-size": eraserSize + "px",
            } as React.CSSProperties
          }
        >
          <div
            ref={box}
            className="passage"
            data-paged={!scroll}
            style={
              {
                "--reader-size": prefs.size + "px",
                "--reader-line": prefs.line,
              } as React.CSSProperties
            }
            {...(!writing ? tools.handlers : {})}
            onContextMenu={(event) => {
              if (writing) event.preventDefault();
            }}
            onScroll={() => {
              const b = box.current;
              if (!scroll || !b) return;
              const rect = b.getBoundingClientRect();
              const top = rect.top + 2;
              const first = [
                ...b.querySelectorAll<HTMLElement>("[data-sentence-id]"),
              ].find((span) => span.getBoundingClientRect().bottom > top);
              const caret = document.caretRangeFromPoint?.(
                rect.left + 5,
                rect.top + 8,
              );
              const word =
                caret?.startContainer.parentElement?.closest<HTMLElement>(
                  "[data-at]",
                );
              const next =
                word && b.contains(word)
                  ? Number(word.dataset.at)
                  : Number(first?.dataset.start);
              if (Number.isFinite(next) && next !== state.offset)
                persist(ch, next);
            }}
          >
            <div className="quill-text">{passage}</div>
          </div>
          <canvas
            className="quill-canvas"
            aria-hidden="true"
            ref={tools.saved}
          />
          <canvas
            className="quill-canvas"
            aria-hidden="true"
            ref={tools.live}
            {...(writing ? tools.handlers : {})}
          />
          <div
            className="quill-sprite"
            aria-hidden="true"
            ref={tools.sprite}
            style={
              {
                "--quill-size": quill.spriteSize + "px",
                "--quill-hotspot-x": quill.spriteHotspot[0] + "px",
                "--quill-hotspot-y": quill.spriteHotspot[1] + "px",
                "--quill-fade": quill.fadeMs + "ms",
              } as React.CSSProperties
            }
          >
            <img alt="" draggable={false} src={quill.image} />
          </div>
          <div className="eraser-ring" aria-hidden="true" ref={tools.ring} />
        </div>
        {strokes.some(
          (stroke) => stroke.kind === "quill" && stroke.fontSize !== prefs.size,
        ) && <small role="status">{t("inkMayShift")}</small>}
        <footer>
          <button disabled={!ch && (scroll || !page)} onClick={() => turn(-1)}>
            {t("previous")}
          </button>
          <small>
            {scroll
              ? t("chapter") + " " + (ch + 1)
              : t("page") + " " + (page + 1) + " / " + pages.length}
          </small>
          <button
            disabled={
              ch === book.chapters.length - 1 &&
              (scroll || page === pages.length - 1)
            }
            onClick={() => turn(1)}
          >
            {t("next")}
          </button>
        </footer>
      </article>
      {word && <WordCard {...state} t={t} prefs={prefs} />}
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
    </main>
  );
}
