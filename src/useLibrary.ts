import { useState, useEffect } from "react";
import { starters, Book, read, save } from "./books";
import { importBook } from "./import";
import { sigilPaths } from "./config";
import site from "./site.json";
import { translator } from "./i18n";
const defaultPrefs = {
  lang: "en",
  size: 20,
  line: 1.75,
  mode: "page",
  zhDefs: false,
};
export function useLibrary() {
  const [books, setBooks] = useState<Book[]>(starters),
    [bin, setBin] = useState<any[]>([]),
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
        setBooks([...starters, ...imported]);
        setBin(await read("bin"));
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
    save("state", "prefs", p).catch(() => setNotice(t("settingsCouldNotBeSaved")));
  }
  async function open(b: Book) {
    try {
      setPosition(await read("state", b.id));
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
  async function collectWord(word: { w: string }) {
    if (!book) return;
    await save("bin", word.w, { ...word, source: book.title });
    setBin(await read("bin"));
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
    setBook,
    setModal,
    setNotice,
    setSort,
  };
}
export type Library = ReturnType<typeof useLibrary>;
