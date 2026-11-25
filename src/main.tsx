import { Notebook } from "./components/Notebook";
import React from "react";
import { createRoot } from "react-dom/client";
import { Reader } from "./reader";
import { Icon, Sigil } from "./components/Icons";
import { Bookshelf } from "./components/Bookshelf";
import { TrashBin } from "./components/TrashBin";
import { useLibrary } from "./useLibrary";
import { illustrations, companion, quill } from "./config";
import "./style.css";

function App() {
  const library = useLibrary();
  const {
    view,
    bin,
    book,
    t,
    pos,
    prefs,
    setPrefs,
    collectWord,
    setBook,
    setModal,
    nav,
    modal,
    busy,
    ingest,
    notice,
    setNotice,
  } = library;
  return (
    <>
      <header>
        <div className="mast">
          <div className="brand">
            <Sigil />
            <span>{t("brand")}</span>
          </div>
          <nav>
            {[
              ["shelf", "shelf", t("bookshelf")],
              ["bin", "bin", t("trashBin")],
              ["notebook", "notebook", t("notebook")],
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
              aria-label={t("settings")}
              onClick={() => setModal("settings")}
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
          backLabel={t(view === "notebook" ? "notebook" : "bookshelf")}
          annotations={library.annotations}
          changeAnnotations={library.changeAnnotations}
          t={t}
          initial={pos}
          prefs={prefs}
          setPrefs={setPrefs}
          add={collectWord}
          onBack={() => setBook(null)}
        />
      ) : (
        <main className="desk">
          <section className="banner">
            <div>
              <div className="eyebrow">
                <i /> {t("privateReadingRoom")}
              </div>
              <h1>
                {view === "bin"
                  ? t("wordTrashBin")
                  : view === "notebook"
                    ? t("notebook")
                    : t("theBookshelf")}
              </h1>
              <p>
                {view === "bin"
                  ? t("wordsGatheredFromYourReading")
                  : view === "notebook"
                    ? t("notebookSubtitle")
                    : t("yourPersonalCollectionOfEnchantedVolumes")}
              </p>
            </div>
            <illustrations.Banner />
          </section>
          {view === "shelf" ? (
            <Bookshelf {...library} />
          ) : view === "notebook" ? (
            <Notebook {...library} />
          ) : (
            <TrashBin {...library} />
          )}
        </main>
      )}
      {modal && (
        <div className="veil" onClick={() => !busy && setModal("")}>
          <dialog
            open
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape" && !busy) setModal("");
            }}
          >
            <button
              className="close"
              aria-label={t("close")}
              onClick={() => setModal("")}
            >
              ×
            </button>
            {modal === "import" ? (
              <>
                <h2>{t("importABook")}</h2>
                <p>{t("chooseATxtOrDrmFreeEpubFromYourDevice")}</p>
                <label className="file">
                  {busy ? t("bindingYourVolume") : t("chooseBookFile")}
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
                <h2>{t("settings")}</h2>
                <label>
                  {t("interfaceLanguage")}{" "}
                  <select
                    value={prefs.lang}
                    onChange={(e) =>
                      e.target.value === "zh"
                        ? setModal("confirm")
                        : setPrefs({ ...prefs, lang: "en" })
                    }
                  >
                    <option value="en">{t("english")}</option>
                    <option value="zh">{t("chinese")}</option>
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
                    {t("showChineseDefinitions")}
                  </label>
                </p>
                <div className="memory-field">
                  <label>
                    <input
                      type="checkbox"
                      checked={prefs.fingerInk}
                      onChange={(e) =>
                        setPrefs({ ...prefs, fingerInk: e.target.checked })
                      }
                    />{" "}
                    {t("fingerInk")}
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={prefs.leftHand}
                      onChange={(e) =>
                        setPrefs({ ...prefs, leftHand: e.target.checked })
                      }
                    />{" "}
                    {t("leftHand")}
                  </label>
                  <label>
                    {t("inkColor")}{" "}
                    <select
                      value={prefs.inkColor}
                      onChange={(e) =>
                        setPrefs({ ...prefs, inkColor: e.target.value })
                      }
                    >
                      {quill.colors.map((color) => (
                        <option value={color} key={color}>
                          {t(color)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button onClick={() => setModal("about")}>{t("about")}</button>
              </>
            ) : modal === "about" ? (
              <>
                <h2>{t("about")}</h2>
                <p>{t("brand")}</p>
              </>
            ) : (
              <>
                <h2>{t("confirmTitle")}</h2>
                <p>{t(companion.languagePrompt)}</p>
                <p>{t("confirmBody")}</p>
                <button onClick={() => setModal("settings")}>
                  {t("keepEnglish")}
                </button>{" "}
                <button
                  className="primary"
                  onClick={() => {
                    setPrefs({ ...prefs, lang: "zh" });
                    setModal("");
                  }}
                >
                  {t("switchChinese")}
                </button>
              </>
            )}
          </dialog>
        </div>
      )}
      {notice && (
        <button className="notice" role="status" onClick={() => setNotice("")}>
          {notice} ×
        </button>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
if (import.meta.env.PROD && "serviceWorker" in navigator)
  navigator.serviceWorker.register("./sw.js").catch(() => {});
