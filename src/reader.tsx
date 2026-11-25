import React from "react";
import { useReader, type ReaderProps } from "./useReader";
import { useReadingTools } from "./useReadingTools";
import { MarginInk } from "./components/MarginInk";
import type { Annotation, Highlight, Ink, Point } from "./memory";
import { WordCard } from "./components/WordCard";
type Props = ReaderProps & {
  annotations: Annotation[];
  saveAnnotation: (annotation: Annotation) => void;
  deleteAnnotation: (id: string) => void;
  backLabel: string;
};
export function Reader(props: Props) {
  const state = useReader(props);
  const { book, prefs, t, onBack } = props;
  const {
    ch,
    offset,
    page,
    pages,
    scroll,
    box,
    timer,
    chapter,
    words,
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
  const current = props.annotations.filter(
    (item) => item.bookId === book.id && item.chapter === ch,
  );
  const highlights = current.filter(
    (item): item is Highlight => item.kind === "highlight",
  );
  const railStart = pages[page];
  const railEnd = pages[page + 1] ?? Infinity;
  const strokes = current
    .filter(
      (item): item is Ink =>
        item.kind === "ink" && item.start >= railStart && item.start < railEnd,
    )
    .sort((a, b) => a.createdAt - b.createdAt);
  const tools = useReadingTools(
    chapter.text,
    scroll,
    turn,
    ({ start, end }) => {
      if (highlights.some((item) => item.start === start && item.end === end))
        return;
      props.saveAnnotation({
        id: crypto.randomUUID(),
        kind: "highlight",
        bookId: book.id,
        bookTitle: book.title,
        chapter: ch,
        chapterTitle: chapter.title,
        start,
        end,
        quote: chapter.text.slice(start, end),
        note: "",
        createdAt: Date.now(),
      });
    },
  );
  const ranges = tools.draft ? [...highlights, tools.draft] : highlights;
  const reading = tools.tool === "read";
  function saveStroke(points: Point[]) {
    props.saveAnnotation({
      id: crypto.randomUUID(),
      kind: "ink",
      bookId: book.id,
      chapter: ch,
      start: scroll ? offset : railStart,
      points,
      createdAt: Date.now(),
    });
  }
  function paintSeparator(value: string, start: number) {
    if (!ranges.length) return value;
    const end = start + value.length;
    const bounds = [
      ...new Set([
        start,
        end,
        ...ranges.flatMap((range) =>
          [range.start, range.end].filter(
            (position) => position > start && position < end,
          ),
        ),
      ]),
    ].sort((a, b) => a - b);
    return bounds.slice(0, -1).map((left, index) => {
      const text = chapter.text.slice(left, bounds[index + 1]);
      return ranges.some((range) => range.start <= left && range.end > left) ? (
        <mark key={left} className="reading-highlight">
          {text}
        </mark>
      ) : (
        <React.Fragment key={left}>{text}</React.Fragment>
      );
    });
  }
  return (
    <main className="reader">
      <div className="readerbar">
        <button onClick={onBack}>‹ {props.backLabel}</button>
        <button onClick={() => setFormat(!format)}>
          Aa · {t("readingSettings")}
        </button>
      </div>
      <div className="memory-tools" role="group" aria-label={t("readingTools")}>
        {(["read", "highlight", "ink"] as const).map((tool) => (
          <button
            key={tool}
            aria-pressed={tools.tool === tool}
            onClick={() => {
              clearTimeout(timer.current);
              state.setWord(null);
              tools.setTool(tool);
            }}
          >
            {t(tool)}
          </button>
        ))}
        {tools.tool === "highlight" && (
          <select
            aria-label={t("highlightBoundary")}
            value={tools.boundary}
            onChange={(event) => tools.setBoundary(event.target.value)}
          >
            <option value="word">{t("byWord")}</option>
            <option value="sentence">{t("bySentence")}</option>
          </select>
        )}
        {tools.tool === "ink" && strokes.length > 0 && (
          <button
            onClick={() =>
              props.deleteAnnotation(strokes[strokes.length - 1].id)
            }
          >
            {t("undoInk")}
          </button>
        )}
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
        <div className="passage-layout">
          <div
            ref={box}
            className="passage"
            data-tool={tools.tool}
            data-paged={!scroll}
            {...tools.handlers}
            onPointerMove={(event) => {
              if (
                event.movementX ||
                event.movementY ||
                event.pointerType === "touch"
              )
                clearTimeout(timer.current);
              tools.handlers.onPointerMove(event);
            }}
            style={
              {
                "--reader-size": prefs.size + "px",
                "--reader-line": prefs.line,
              } as React.CSSProperties
            }
            onScroll={() => {
              const b = box.current;
              if (scroll && b) {
                const r = document.caretRangeFromPoint?.(
                  b.getBoundingClientRect().left + 5,
                  b.getBoundingClientRect().top + 8,
                );
                const el =
                  r?.startContainer.parentElement?.closest<HTMLElement>(
                    "[data-at]",
                  );
                if (el) persist(ch, +el.dataset.at!);
              }
            }}
          >
            {words
              .filter(
                (m) =>
                  scroll ||
                  (m.index! >= pages[page] &&
                    m.index! < (pages[page + 1] ?? Infinity)),
              )
              .map((m) =>
                /^[a-z]/i.test(m[0]) ? (
                  <span
                    role={reading ? "button" : undefined}
                    tabIndex={reading ? 0 : undefined}
                    className={
                      ranges.some(
                        (range) =>
                          range.start < m.index! + m[0].length &&
                          range.end > m.index!,
                      )
                        ? "reading-highlight"
                        : undefined
                    }
                    key={m.index}
                    data-at={m.index}
                    data-end={m.index! + m[0].length}
                    onClick={() => reading && open(m)}
                    onKeyDown={(e) => {
                      if (reading && e.key === "Enter") open(m);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (reading) open(m);
                    }}
                    onPointerDown={() =>
                      reading &&
                      (timer.current = setTimeout(() => open(m), 500))
                    }
                    onPointerMove={() => clearTimeout(timer.current)}
                    onPointerUp={() => clearTimeout(timer.current)}
                    onPointerCancel={() => clearTimeout(timer.current)}
                  >
                    {m[0]}
                  </span>
                ) : (
                  m[0]
                ),
              )}
          </div>
          {(tools.tool === "ink" || strokes.length > 0) && (
            <MarginInk
              key={ch + ":" + page}
              enabled={tools.tool === "ink"}
              strokes={strokes}
              label={t("inkMargin")}
              save={saveStroke}
            />
          )}
        </div>
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
