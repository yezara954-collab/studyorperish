import { roles } from "./companions";
import {
  useCompanionRole,
  useCompanionHidden,
  firstLine,
} from "./companions/useCompanion";
import {
  CompanionDeveloper,
  CompanionSettings,
} from "./components/CompanionSettings";
import { CenterStage, centerStageVariables } from "./components/CenterStage";
import type { CompanionPreview } from "./companions/types";
import { SwitchConfirmation } from "./components/SwitchConfirmation";
import { FocusTimer } from "./components/FocusTimer";
import { Notebook } from "./components/Notebook";
import React from "react";
import { createRoot } from "react-dom/client";
import { Reader } from "./reader";
import { Icon, Sigil } from "./components/Icons";
import { Bookshelf } from "./components/Bookshelf";
import { TrashBin } from "./components/TrashBin";
import { useLibrary } from "./useLibrary";
import { illustrations, quill } from "./config";
import "./style.css";

function App() {
  const library = useLibrary();
  const [companionPreview, setCompanionPreview] =
    React.useState<CompanionPreview>();
  const previewId = React.useRef(0);
  const [timerOpened, setTimerOpened] = React.useState(false);
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
  const activeRole = useCompanionRole(book?.id, prefs.companion, library.ready);
  const speaker = roles.draco;
  const companionHidden = useCompanionHidden(prefs.companion.hiddenUntil);
  return (
    <>
      <FocusTimer
        t={t}
        lang={prefs.lang === "zh" ? "zh-CN" : "en-US"}
        opened={timerOpened}
        setOpened={setTimerOpened}
        preferencesReady={library.ready}
        sound={prefs.focusSound}
        vibration={prefs.focusVibration}
        shake={prefs.focusShake}
        preference={prefs.focusPartner}
        selectPartner={(focusPartner) => setPrefs({ ...prefs, focusPartner })}
        reading={Boolean(book)}
        header={
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
        }
      >
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
            onTimer={() => setTimerOpened(true)}
            companionRole={activeRole}
            companionWords={bin}
            companionHidden={companionHidden}
            companionBlocked={Boolean(modal) || timerOpened}
            onCompanionPreviewApplied={() => setCompanionPreview(undefined)}
            companionPreview={
              prefs.companion.preview ? companionPreview : undefined
            }
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
      </FocusTimer>
      {modal && (
        <div className="veil" onClick={() => !busy && setModal("")}>
          <dialog
            open
            className={
              modal === "confirm" ? "switch-confirmation-dialog" : undefined
            }
            aria-labelledby={
              modal === "confirm" ? "switch-confirmation-title" : undefined
            }
            style={modal === "confirm" ? centerStageVariables : undefined}
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
                <div className="memory-field">
                  <label>
                    <input
                      type="checkbox"
                      checked={prefs.focusSound}
                      onChange={(e) =>
                        setPrefs({ ...prefs, focusSound: e.target.checked })
                      }
                    />{" "}
                    {t("focusSound")}
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={prefs.focusVibration}
                      onChange={(e) =>
                        setPrefs({ ...prefs, focusVibration: e.target.checked })
                      }
                    />{" "}
                    {t("focusVibration")}
                  </label>
                </div>
                <label className="memory-field">
                  <span>
                    <input
                      type="checkbox"
                      checked={prefs.focusShake}
                      onChange={(event) =>
                        setPrefs({ ...prefs, focusShake: event.target.checked })
                      }
                    />{" "}
                    {t("focusShake")}
                  </span>
                </label>
                <CompanionSettings
                  hidden={companionHidden}
                  settings={prefs.companion}
                  t={t}
                  change={(companion) => setPrefs({ ...prefs, companion })}
                />
                <CompanionDeveloper
                  settings={prefs.companion}
                  t={t}
                  available={Boolean(activeRole) && !companionHidden}
                  change={(companion) => setPrefs({ ...prefs, companion })}
                  preview={(cue) => {
                    if (!activeRole) return;
                    setCompanionPreview({
                      cue,
                      id: ++previewId.current,
                      role: activeRole.id,
                      focus: prefs.companion.focus,
                    });
                    setModal("");
                  }}
                />
                <button onClick={() => setModal("about")}>{t("about")}</button>
              </>
            ) : modal === "about" ? (
              <>
                <h2>{t("about")}</h2>
                <p>{t("brand")}</p>
              </>
            ) : (
              <SwitchConfirmation
                title={t("confirmTitle")}
                titleId="switch-confirmation-title"
                prompt={firstLine(
                  speaker,
                  "chineseConfirm",
                  t,
                  prefs.companion.userName,
                )}
                speaker={t(speaker.displayName)}
                stage={(prompt) => (
                  <CenterStage
                    role={speaker}
                    pose="confirm"
                    cue="chineseConfirm"
                    face="surprised"
                    size="hero"
                    t={t}
                    dialogue={<p lang="en">{prompt}</p>}
                  />
                )}
                detail={t("confirmBody")}
                cancelLabel={t("keepEnglish")}
                confirmLabel={t("switchChinese")}
                cancel={() => setModal("settings")}
                confirm={() => {
                  setPrefs({ ...prefs, lang: "zh" });
                  setModal("");
                }}
              />
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
