import React from "react";
import { useReader, type ReaderProps } from "./useReader";
import { useQuill } from "./useQuill";
import { quill } from "./config";
import { sentencesOf } from "./sentences";
import type { Annotation, Highlight, Ink, QuillStroke } from "./memory";
import { WordCard } from "./components/WordCard";
type Props = ReaderProps & {
  annotations: Annotation[];
  changeAnnotations: (
    updates: Annotation[],
    deletions?: string[],
  ) => Promise<void>;
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
  const latest = current.reduce<Annotation | undefined>(
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
        if (entries.length) void props.changeAnnotations(entries);
      } else if (points.length) {
        void props.changeAnnotations([
          {
            ...anchor,
            kind: "quill",
            id: strokeId,
            start: points[0].at,
            points,
            color: prefs.inkColor,
            fontSize: prefs.size,
          },
        ]);
      }
    },
  });
  function undo() {
    if (!latest) return;
    const ids =
      latest.kind === "highlight" && latest.strokeId
        ? current
            .filter(
              (item) =>
                item.kind === "highlight" && item.strokeId === latest.strokeId,
            )
            .map((item) => item.id)
        : [latest.id];
    void props.changeAnnotations([], ids);
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
                onClick={() => open(match)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") open(match);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  open(match);
                }}
                onPointerDown={() => {
                  timer.current = setTimeout(() => open(match), 500);
                }}
                onPointerMove={() => clearTimeout(timer.current)}
                onPointerUp={() => clearTimeout(timer.current)}
                onPointerCancel={() => clearTimeout(timer.current)}
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
        <button disabled={!latest} onClick={undo}>
          {t("undoStroke")}
        </button>
      </div>
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
        <div className="passage-layout" data-writing={writing}>
          <div
            ref={box}
            className="passage"
            data-paged={!scroll}
            style={
              {
                "--reader-size": prefs.size + "px",
                "--reader-line": prefs.line,
                "--quill-cursor": `url("${quill.image}") ${quill.cursorHotspot.join(" ")}, url("${quill.cursorFallback}") ${quill.cursorHotspot.join(" ")}`,
              } as React.CSSProperties
            }
            {...tools.handlers}
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
          />
          <img
            className="quill-sprite"
            aria-hidden="true"
            alt=""
            draggable={false}
            ref={tools.sprite}
            src={quill.image}
            style={
              {
                "--quill-size": quill.spriteSize + "px",
                "--quill-hotspot-x": quill.spriteHotspot[0] + "px",
                "--quill-hotspot-y": quill.spriteHotspot[1] + "px",
                "--quill-fade": quill.fadeMs + "ms",
              } as React.CSSProperties
            }
          />
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
