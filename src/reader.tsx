import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { save, Book } from "./books";
type T = (a: string, b: string) => string;
const shards = new Map<string, Promise<any>>();
async function lookup(w: string) {
  const k = w[0];
  if (!shards.has(k))
    shards.set(
      k,
      fetch("./dict/" + k + ".json")
        .then((r) => r.json())
        .catch((e) => {
          shards.delete(k);
          throw e;
        }),
    );
  const d = await shards.get(k);
  let hit = d[w];
  if (hit?.[4] && d[hit[4]]) return [hit[4], d[hit[4]]];
  for (const s of [
    w,
    w.replace(/ies$/, "y"),
    w.replace(/s$/, ""),
    w.replace(/ed$/, ""),
    w.replace(/ing$/, ""),
  ])
    if (d[s]) return [s, d[s]];
  return [w, null];
}
export function Reader({
  book,
  t,
  initial,
  prefs,
  setPrefs,
  add,
  onBack,
}: {
  book: Book;
  t: T;
  initial: any;
  prefs: any;
  setPrefs: any;
  add: any;
  onBack: any;
}) {
  const [ch, C] = useState(initial?.ch || 0),
    [offset, O] = useState(initial?.offset || 0),
    [word, W] = useState<any>(null),
    [format, F] = useState(false),
    [saved, S] = useState(false),
    [error, E] = useState("");
  const box = useRef<HTMLDivElement>(null),
    token = useRef(0),
    timer = useRef<any>(null);
  const chapter = book.chapters[ch],
    txt = chapter.text,
    words = React.useMemo(
      () =>
        Array.from(txt.matchAll(/[A-Za-z]+(?:['’-][A-Za-z]+)*|[^A-Za-z]+/g)),
      [txt],
    );
  const capacity = Math.max(
    180,
    Math.floor(640 * (18 / prefs.size) ** 2 * (1.7 / prefs.line)),
  );
  const pages = React.useMemo(() => {
    let starts = [0],
      last = 0;
    for (const m of words) {
      if (m.index! - last >= capacity) {
        starts.push(m.index!);
        last = m.index!;
      }
    }
    return starts;
  }, [words, capacity]);
  const page = Math.max(
      0,
      pages.findLastIndex((v) => v <= offset),
    ),
    scroll = prefs.mode === "scroll";
  const anchor = useRef(offset);
  anchor.current = offset;
  useLayoutEffect(() => {
    const b = box.current;
    if (!b) return;
    b.scrollTop = 0;
    if (scroll) {
      const els = [...b.querySelectorAll<HTMLElement>("[data-at]")];
      const el = els.findLast((x) => Number(x.dataset.at) <= anchor.current);
      if (el) b.scrollTop = el.offsetTop - 12;
    }
  }, [ch, scroll, prefs.size, prefs.line, scroll ? -1 : page]);
  function persist(c: number, o: number) {
    O(o);
    save("state", book.id, { ch: c, offset: o }).catch(() =>
      E(t("Progress could not be saved.", "阅读进度保存失败。")),
    );
  }
  function go(c: number, o = 0) {
    C(c);
    persist(c, o);
  }
  function turn(dir: number) {
    if (!scroll && page + dir >= 0 && page + dir < pages.length)
      persist(ch, pages[page + dir]);
    else if (book.chapters[ch + dir])
      go(ch + dir, dir < 0 && !scroll ? book.chapters[ch - 1].text.length : 0);
  }
  async function open(m: RegExpMatchArray) {
    const n = ++token.current,
      w = m[0].toLowerCase().replaceAll("’", "'");
    const before = txt.slice(0, m.index),
      after = txt.slice(m.index);
    const example = (
      before.split(/[.!?。！？\n]/).pop() +
      after.split(/(?<=[.!?。！？])|\n/)[0]
    ).trim();
    W({ w, example, busy: true });
    S(false);
    E("");
    try {
      let [base, entry] = await lookup(w);
      if (n === token.current) W({ w, example, base, entry });
    } catch {
      if (n === token.current) W({ w, example, failed: true });
    }
  }
  const change = (k: string, v: any) => setPrefs({ ...prefs, [k]: v });
  return (
    <main className="reader">
      <div className="readerbar">
        <button onClick={onBack}>‹ {t("Bookshelf", "书架")}</button>
        <button onClick={() => F(!format)}>
          Aa · {t("Reading settings", "阅读设置")}
        </button>
      </div>
      {format && (
        <section className="options">
          <label>
            {t("Type size", "字号")}{" "}
            <input
              type="range"
              min="16"
              max="32"
              value={prefs.size}
              onChange={(e) => change("size", +e.target.value)}
            />
          </label>
          <label>
            {t("Line spacing", "行距")}{" "}
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
            <option value="page">{t("Pages", "翻页")}</option>
            <option value="scroll">{t("Scroll", "滚动")}</option>
          </select>
        </section>
      )}
      <article>
        <small>{book.title}</small>
        <select
          aria-label={t("Chapter", "章节")}
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
          style={{ fontSize: prefs.size, lineHeight: prefs.line }}
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
            {t("Previous", "上一页")}
          </button>
          <small>
            {scroll
              ? t("Chapter", "章节") + " " + (ch + 1)
              : t("Page", "页") + " " + (page + 1) + " / " + pages.length}
          </small>
          <button
            disabled={
              ch === book.chapters.length - 1 &&
              (scroll || page === pages.length - 1)
            }
            onClick={() => turn(1)}
          >
            {t("Next", "下一页")}
          </button>
        </footer>
      </article>
      {word && (
        <dialog
          open
          aria-label={t("Dictionary", "词典")}
          onKeyDown={(e) => {
            if (e.key === "Escape") W(null);
          }}
        >
          <button className="close" onClick={() => W(null)}>
            ×
          </button>
          <small>ECDICT</small>
          <h2>{word.w}</h2>
          {word.entry ? (
            <>
              <i>
                {word.entry[0] && "/" + word.entry[0] + "/"} {word.entry[1]}{" "}
                {word.base !== word.w && " · " + word.base}
              </i>
              <p className="defs">{word.entry[2]}</p>
              {prefs.zhDefs && <p className="defs">{word.entry[3]}</p>}
              <button onClick={() => change("zhDefs", !prefs.zhDefs)}>
                {prefs.zhDefs
                  ? t("Hide Chinese", "隐藏中文")
                  : t("Show Chinese", "显示中文")}
              </button>
            </>
          ) : (
            <p>
              {word.busy
                ? t("Opening dictionary…", "正在查词…")
                : word.failed
                  ? t("Dictionary unavailable.", "词库加载失败。")
                  : t("No entry in the offline edition.", "离线词库未收录。")}
            </p>
          )}
          <blockquote>{word.example}</blockquote>
          <button
            onClick={() => {
              if (!window.speechSynthesis) {
                E(t("Speech unavailable on this device.", "此设备无法发音。"));
                return;
              }
              const u = new SpeechSynthesisUtterance(word.w);
              u.lang = "en-US";
              u.onerror = () =>
                E(t("English voice unavailable.", "英语语音不可用。"));
              speechSynthesis.cancel();
              speechSynthesis.speak(u);
            }}
          >
            ♫ {t("Pronounce", "发音")}
          </button>{" "}
          <button
            className="primary"
            disabled={saved || word.busy}
            onClick={async () => {
              try {
                await add(word);
                S(true);
              } catch {
                E(t("Could not save word.", "单词保存失败。"));
              }
            }}
          >
            {saved
              ? t("Saved in Trash Bin", "已存入垃圾桶")
              : t("Toss into the Trash Bin", "扔进单词垃圾桶")}
          </button>
        </dialog>
      )}
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
    </main>
  );
}
