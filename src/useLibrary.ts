import {
  collectWord as storeWord,
  gradeWord,
  getReviewProgress,
  writeAnnotations,
  type Annotation,
  type Highlight,
  type Word,
  type Grade,
} from "./memory";
import { useState, useEffect } from "react";
import { starters, Book, read, save } from "./books";
import { expandLegacyHighlights } from "./sentences";
import { importBook } from "./import";
import { sigilPaths, focus, type FocusPartner } from "./config";
import site from "./site.json";
import { translator } from "./i18n";
const defaultPrefs = {
  lang: "en",
  size: 20,
  line: 1.75,
  mode: "page",
  zhDefs: false,
  focusSound: true,
  focusPartner: focus.defaultPartner as FocusPartner,
  focusShake: true,
  focusVibration: true,
  fingerInk: false,
  leftHand: false,
  inkColor: "brown",
  eraserSize: "medium",
  eraserMode: "partial",
};
export function useLibrary() {
  const [books, setBooks] = useState<Book[]>(starters),
    [bin, setBin] = useState<Word[]>([]),
    [annotations, setAnnotations] = useState<Annotation[]>([]),
    [reviewProgress, setReviewProgress] = useState({
      totalReviews: 0,
      reviewedWords: 0,
      milestones: 0,
    }),
    [prefs, setPreferences] = useState(defaultPrefs),
    [view, setView] = useState("shelf"),
    [book, setBook] = useState<Book | null>(null),
    [pos, setPosition] = useState<any>({}),
    [modal, setModal] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [sort, setSort] = useState("added"),
    [ready, setReady] = useState(false);
  const zh = prefs.lang === "zh",
    t = translator(prefs.lang);
  useEffect(() => {
    (async () => {
      try {
        const imported = await read("books");
        const allBooks = [...starters, ...imported];
        setBooks(allBooks);
        setBin(await read("bin"));
        const previous: Annotation[] = (
          await Promise.all([read("strokes"), read("highlights")])
        ).flat();
        const expanded = expandLegacyHighlights(previous, allBooks);
        setAnnotations(expanded);
        const changed = expanded.filter((item) => !previous.includes(item));
        if (changed.length)
          await writeAnnotations(changed).catch(() =>
            setNotice(t("annotationSaveFailed")),
          );
        setReviewProgress(await getReviewProgress());
        setPreferences({ ...defaultPrefs, ...(await read("state", "prefs")) });
        setReady(true);
      } catch {
        setNotice(t("storageUnavailable"));
      }
    })();
  }, []);
  useEffect(() => {
    document.title = t("brand");
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon) {
      icon.title = document.title;
      if (site.faviconPath === "./favicon.svg") {
        const svg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg",
        );
        svg.setAttribute("viewBox", "0 0 60 60");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", site.themeColor);
        const title = document.createElementNS(svg.namespaceURI, "title");
        title.textContent = document.title;
        svg.append(title);
        for (const d of sigilPaths) {
          const path = document.createElementNS(svg.namespaceURI, "path");
          path.setAttribute("d", d);
          svg.append(path);
        }
        icon.href =
          "data:image/svg+xml," +
          encodeURIComponent(new XMLSerializer().serializeToString(svg));
      }
    }
    document.documentElement.lang = zh ? "zh-CN" : "en";
  }, [zh]);
  function setPrefs(p: any) {
    setPreferences(p);
    save("state", "prefs", p).catch(() =>
      setNotice(t("settingsCouldNotBeSaved")),
    );
  }
  async function open(
    b: Book,
    target?: {
      ch: number;
      offset: number;
      highlight?: boolean;
      sentenceId?: string;
    },
  ) {
    try {
      setPosition(target ?? (await read("state", b.id)));
      setBook(b);
    } catch {
      setNotice(t("unableToOpenThisBook"));
    }
  }
  async function ingest(f?: File) {
    if (!f) return;
    setBusy(true);
    try {
      const b = await importBook(f, books.length % 3);
      await save("books", b.id, b);
      setBooks((v) => [...v, b]);
      setModal("");
      setView("shelf");
      setNotice(t("bookAddedToYourShelf"));
    } catch {
      setNotice(t("importFailedChooseAReadableTxtOrDrmFreeEpub"));
    } finally {
      setBusy(false);
    }
  }
  async function collectWord(word: Word) {
    if (!book) return;
    await storeWord({ ...word, source: book.title });
    setBin(await read("bin"));
  }
  async function changeAnnotations(
    updates: Annotation[],
    deletions: string[] = [],
  ) {
    try {
      await writeAnnotations(updates, deletions);
      const replaced = new Set([
        ...deletions,
        ...updates.map((item) => item.id),
      ]);
      setAnnotations((values) => [
        ...values.filter((value) => !replaced.has(value.id)),
        ...updates,
      ]);
      return true;
    } catch {
      setNotice(t("annotationSaveFailed"));
      return false;
    }
  }
  const saveAnnotation = (annotation: Annotation) =>
    changeAnnotations([annotation]);
  const deleteAnnotation = (id: string) => changeAnnotations([], [id]);
  function jumpToHighlight(highlight: Highlight) {
    const target = books.find((value) => value.id === highlight.bookId);
    if (target?.chapters[highlight.chapter]) {
      void open(target, {
        ch: highlight.chapter,
        offset: highlight.start,
        highlight: true,
        sentenceId: highlight.sentenceId,
      });
    } else setNotice(t("unableToOpenThisBook"));
  }
  async function reviewWord(key: string, grade: Grade) {
    try {
      await gradeWord(key, grade);
      setBin(await read("bin"));
      setReviewProgress(await getReviewProgress());
    } catch {
      setNotice(t("reviewSaveFailed"));
    }
  }
  function nav(v: string) {
    setBook(null);
    setView(v);
    setNotice("");
  }
  const ordered =
    sort === "title"
      ? [...books].sort((a, b) => a.title.localeCompare(b.title))
      : books;
  return {
    books,
    bin,
    prefs,
    view,
    book,
    pos,
    modal,
    notice,
    busy,
    sort,
    ready,
    t,
    setPrefs,
    open,
    ingest,
    nav,
    ordered,
    collectWord,
    annotations,
    changeAnnotations,
    saveAnnotation,
    deleteAnnotation,
    jumpToHighlight,
    reviewWord,
    reviewProgress,
    setBook,
    setModal,
    setNotice,
    setSort,
  };
}
export type Library = ReturnType<typeof useLibrary>;
