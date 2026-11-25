import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { save, Book } from "./books";
import site from "./site.json";
import type { Translate as T } from "./i18n";
const shards = new Map<string, Promise<any>>();
async function lookup(w: string) {
  const k = w[0];
  if (!shards.has(k))
    shards.set(
      k,
      fetch(site.dictionaryPath + k + ".json")
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
export type ReaderProps = {
  book: Book;
  t: T;
  initial: any;
  prefs: any;
  setPrefs: any;
  add: any;
  onBack: any;
};
export function useReader({
  book,
  t,
  initial,
  prefs,
  setPrefs,
  add,
  onBack,
}: ReaderProps) {
  const [ch, setChapter] = useState(initial?.ch || 0),
    [offset, setOffset] = useState(initial?.offset || 0),
    [word, setWord] = useState<any>(null),
    [format, setFormat] = useState(false),
    [saved, setSaved] = useState(false),
    [error, setError] = useState("");
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
    setOffset(o);
    save("state", book.id, { ch: c, offset: o }).catch(() =>
      setError(t("progressCouldNotBeSaved")),
    );
  }
  function go(c: number, o = 0) {
    setChapter(c);
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
    setWord({ w, example, busy: true });
    setSaved(false);
    setError("");
    try {
      let [base, entry] = await lookup(w);
      if (n === token.current) setWord({ w, example, base, entry });
    } catch {
      if (n === token.current) setWord({ w, example, failed: true });
    }
  }
  const change = (k: string, v: any) => setPrefs({ ...prefs, [k]: v });
  function pronounce() {
    if (!window.speechSynthesis) {
      setError(t("speechUnavailableOnThisDevice"));
      return;
    }
    const u = new SpeechSynthesisUtterance(word.w);
    u.lang = "en-US";
    u.onerror = () => setError(t("englishVoiceUnavailable"));
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }
  async function collect() {
    try {
      await add(word);
      setSaved(true);
    } catch {
      setError(t("couldNotSaveWord"));
    }
  }
  return {
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
    setWord,
    saved,
    pronounce,
    collect,
    persist,
  };
}
export type ReaderState = ReturnType<typeof useReader>;
