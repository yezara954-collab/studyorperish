import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { starters, Book, read, save } from "./books";
import { importBook } from "./import";
import { Reader } from "./reader";
import { Plate, Flourish } from "./art";
import "./style.css";
function Sigil() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 60 60"
      fill="none"
      stroke="currentColor"
    >
      <path d="M30 2L54 16V44L30 58L6 44V16ZM30 7L49 19V41L30 53L11 41V19Z" />
      <path d="M15 25Q24 24 30 29Q38 24 45 25V39Q36 37 30 43Q23 38 15 39ZM30 29V43M30 15L31 20L36 21L31 22L30 27L29 22L24 21L29 20Z" />
    </svg>
  );
}
function Icon({ name }: { name: string }) {
  const d: Record<string, string> = {
    shelf: "M3 5h4v14H3zM10 4h3v15h-3zM15 6l3-1 4 13-3 1z",
    bin: "M4 6h16M9 6V3h6v3M6 7l1 14h10l1-14M10 10v7M14 10v7",
    settings: "M3 7h7m4 0h7M3 17h11m4 0h3M10 4v6m6 4v6",
    plus: "M12 4v16M4 12h16",
    book: "M2 5q6-2 10 2 5-4 10-2v14q-6-2-10 2-5-4-10-2zM12 7v14",
  };
  return (
    <svg
      className="icon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d={d[name]} />
    </svg>
  );
}
const defaultPrefs = {
  lang: "en",
  size: 20,
  line: 1.75,
  mode: "page",
  zhDefs: false,
};
function App() {
  const [books, B] = useState<Book[]>(starters),
    [bin, G] = useState<any[]>([]),
    [prefs, P] = useState(defaultPrefs),
    [view, V] = useState("shelf"),
    [book, K] = useState<Book | null>(null),
    [pos, A] = useState<any>({}),
    [modal, M] = useState(""),
    [notice, N] = useState(""),
    [busy, Y] = useState(false),
    [sort, U] = useState("added"),
    [ready, R] = useState(false);
  const zh = prefs.lang === "zh",
    t = (a: string, b: string) => (zh ? b : a);
  useEffect(() => {
    (async () => {
      try {
        const imported = await read("books");
        B([...starters, ...imported]);
        G(await read("bin"));
        P({ ...defaultPrefs, ...(await read("state", "prefs")) });
        R(true);
      } catch {
        N("Local storage is unavailable.");
      }
    })();
  }, []);
  useEffect(() => {
    document.documentElement.lang = zh ? "zh-CN" : "en";
  }, [zh]);
  function setPrefs(p: any) {
    P(p);
    save("state", "prefs", p).catch(() =>
      N(t("Settings could not be saved.", "设置保存失败。")),
    );
  }
  async function open(b: Book) {
    try {
      A(await read("state", b.id));
      K(b);
    } catch {
      N(t("Unable to open this book.", "无法打开这本书。"));
    }
  }
  async function ingest(f?: File) {
    if (!f) return;
    Y(true);
    try {
      const b = await importBook(f, books.length % 3);
      await save("books", b.id, b);
      B((v) => [...v, b]);
      M("");
      V("shelf");
      N(t("Book added to your shelf.", "书籍已加入书架。"));
    } catch {
      N(
        t(
          "Import failed. Choose a readable TXT or DRM-free EPUB.",
          "导入失败，请选择可读取的 TXT 或无 DRM 的 EPUB。",
        ),
      );
    } finally {
      Y(false);
    }
  }
  function nav(v: string) {
    K(null);
    V(v);
    N("");
  }
  const ordered =
    sort === "title"
      ? [...books].sort((a, b) => a.title.localeCompare(b.title))
      : books;
  return (
    <>
      <header>
        <div className="mast">
          <div className="brand">
            <Sigil />
            <span>The Vesper Archive</span>
          </div>
          <nav>
            {[
              ["shelf", "shelf", t("Bookshelf", "书架")],
              ["bin", "bin", t("Trash Bin", "单词垃圾桶")],
            ].map(([v, i, s]) => (
              <button
                className={view === v ? "active" : ""}
                key={v}
                onClick={() => nav(v)}
              >
                <Icon name={i} />
                {s}
                {v === "bin" && bin.length > 0 && " · " + bin.length}
              </button>
            ))}
            <button
              aria-label={t("Settings", "设置")}
              onClick={() => M("settings")}
            >
              <Icon name="settings" />
            </button>
          </nav>
        </div>
      </header>
      {book ? (
        <Reader
          key={book.id}
          book={book}
          t={t}
          initial={pos}
          prefs={prefs}
          setPrefs={setPrefs}
          add={async (w: any) => {
            await save("bin", w.w, { ...w, source: book.title });
            G(await read("bin"));
          }}
          onBack={() => K(null)}
        />
      ) : (
        <main className="desk">
          <section className="banner">
            <div>
              <div className="eyebrow">
                <i /> {t("PRIVATE READING ROOM", "私人阅览室")}
              </div>
              <h1>
                {view === "bin"
                  ? t("Word Trash Bin", "单词垃圾桶")
                  : t("The Bookshelf", "藏书架")}
              </h1>
              <p>
                {view === "bin"
                  ? t("Words gathered from your reading.", "阅读时收集的单词。")
                  : t(
                      "Your personal collection of enchanted volumes.",
                      "你的私人魔法藏书。",
                    )}
              </p>
            </div>
            <Flourish />
          </section>
          {view === "shelf" ? (
            <>
              <div className="tools">
                <div className="sectionTitle">
                  <Icon name="shelf" />
                  <h2>{t("My collection", "我的藏书")}</h2>
                  <span>{books.length}</span>
                </div>
                <button
                  className="primary"
                  disabled={!ready}
                  onClick={() => {
                    N("");
                    M("import");
                  }}
                >
                  <Icon name="plus" />
                  {t("Import book", "导入书籍")}
                </button>
              </div>
              <div className="shelf">
                <div className="grid">
                  {ordered.map((b, i) => (
                    <button
                      className="volume"
                      key={b.id}
                      onClick={() => open(b)}
                    >
                      <div className={"cover c" + (b.art % 3)}>
                        <div className="frame">
                          <div className="stars">· ✦ ·</div>
                          <strong>{b.title}</strong>
                          <Plate type={b.art} />
                          <div className="author">
                            {b.author || t("Private collection", "私人藏书")}
                          </div>
                          <div className="corner tl" />
                          <div className="corner tr" />
                          <div className="corner bl" />
                          <div className="corner br" />
                        </div>
                        <i className="clasp" />
                      </div>
                      <div className="caption">
                        <b>{b.title}</b>
                        <span>
                          {b.chapters.length} {t("chapters", "章")}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="bottom">
                <span>
                  <Icon name="book" /> {books.length}{" "}
                  {t("volumes on shelf", "册藏书")}
                </span>
                <label>
                  {t("Sort by", "排序")}{" "}
                  <select value={sort} onChange={(e) => U(e.target.value)}>
                    <option value="added">
                      {t("Shelf order", "书架顺序")}
                    </option>
                    <option value="title">{t("Title", "书名")}</option>
                  </select>
                </label>
              </div>
            </>
          ) : (
            <section className="binlist">
              {!bin.length ? (
                <p>
                  {t(
                    "Your bin is empty. Open a book and tap a word to collect it.",
                    "垃圾桶还是空的。打开书籍并点按单词即可收集。",
                  )}
                </p>
              ) : (
                bin.map((w) => (
                  <div key={w.w}>
                    <h2>{w.w}</h2>
                    <p>{w.entry?.[2]}</p>
                    <i>{w.example}</i>
                    <small>{w.source}</small>
                  </div>
                ))
              )}
            </section>
          )}
        </main>
      )}
      {modal && (
        <div className="veil" onClick={() => !busy && M("")}>
          <dialog
            open
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape" && !busy) M("");
            }}
          >
            <button
              className="close"
              aria-label={t("Close", "关闭")}
              onClick={() => M("")}
            >
              ×
            </button>
            {modal === "import" ? (
              <>
                <h2>{t("Import a book", "导入书籍")}</h2>
                <p>
                  {t(
                    "Choose a TXT or DRM-free EPUB from your device.",
                    "从设备选择 TXT 或无 DRM 的 EPUB 文件。",
                  )}
                </p>
                <label className="file">
                  {busy
                    ? t("Binding your volume…", "正在装订…")
                    : t("Choose book file", "选择书籍文件")}
                  <input
                    disabled={busy}
                    type="file"
                    accept=".txt,.epub"
                    onChange={(e) => ingest(e.target.files?.[0])}
                  />
                </label>
              </>
            ) : modal === "settings" ? (
              <>
                <h2>{t("Settings", "设置")}</h2>
                <label>
                  {t("Interface language", "界面语言")}{" "}
                  <select
                    value={prefs.lang}
                    onChange={(e) =>
                      e.target.value === "zh"
                        ? M("confirm")
                        : setPrefs({ ...prefs, lang: "en" })
                    }
                  >
                    <option value="en">English</option>
                    <option value="zh">中文</option>
                  </select>
                </label>
                <p>
                  <label>
                    <input
                      type="checkbox"
                      checked={prefs.zhDefs}
                      onChange={(e) =>
                        setPrefs({ ...prefs, zhDefs: e.target.checked })
                      }
                    />{" "}
                    {t("Show Chinese definitions", "显示中文释义")}
                  </label>
                </p>
              </>
            ) : (
              <>
                <h2>Switch to Chinese?</h2>
                <p>“Shall we read one more page in English?”</p>
                <p>切换后，界面将显示中文。书籍原文会按原样呈现。</p>
                <button onClick={() => M("settings")}>Keep English</button>{" "}
                <button
                  className="primary"
                  onClick={() => {
                    setPrefs({ ...prefs, lang: "zh" });
                    M("");
                  }}
                >
                  切换中文
                </button>
              </>
            )}
          </dialog>
        </div>
      )}
      {notice && (
        <button className="notice" role="status" onClick={() => N("")}>
          {notice} ×
        </button>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
if (import.meta.env.PROD && "serviceWorker" in navigator)
  navigator.serviceWorker.register("./sw.js").catch(() => {});
