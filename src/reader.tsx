import React from "react";
import { useReader, type ReaderProps } from "./useReader";
import { WordCard } from "./components/WordCard";
export function Reader(props: ReaderProps) {
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
  return (
    <main className="reader">
      <div className="readerbar">
        <button onClick={onBack}>‹ {t("bookshelf")}</button>
        <button onClick={() => setFormat(!format)}>Aa · {t("readingSettings")}</button>
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
        <div
          ref={box}
          className="passage"
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
                  role="button"
                  tabIndex={0}
                  key={m.index}
                  data-at={m.index}
                  onClick={() => open(m)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") open(m);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    open(m);
                  }}
                  onPointerDown={() =>
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
