import { dockSides, type DockPreferences } from "./readerDockGeometry";
import { useViewportVariables } from "./visualViewport";
import { AppModal, ConfirmProvider } from "./components/AppModal";
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
import { BottomNavigation, SiteMasthead, useTouchTabs } from "./components/AppNavigation";
import { Bookshelf } from "./components/Bookshelf";
import { TrashBin } from "./components/TrashBin";
import { useLibrary } from "./useLibrary";
import { shelfRules } from "./bookshelfStorage";
import { Cards } from "./cards/Cards";
import { bookCompleted, unopenedBoxes } from "./cards/storage";
import { CardsDeveloper } from "./cards/CardsDeveloper";
import { quill } from "./config";
import { LocalBackup } from "./newspaper/LocalBackup";
import { resetChinesePasses, editionsChangedEvent, listEditions, purgeDeletedEditions, seedEditions } from "./newspaper/storage";
import "./style.css";
import "./shelfDesign.css";
import {StyleGuide} from "./components/StyleGuide";

const dockLabels = {
  bottom: "dockBottom",
  left: "dockLeft",
  right: "dockRight",
  top: "dockTop",
} as const;

const Newspaper = React.lazy(() => import("./newspaper/Newspaper"));

function App() {
  useViewportVariables();
  const library = useLibrary();
  const [companionPreview, setCompanionPreview] =
    React.useState<CompanionPreview>();
  const previewId = React.useRef(0);
  const [timerOpened, setTimerOpened] = React.useState(false);
  const [literaryCount, setLiteraryCount] = React.useState(0);
  const [seeding, setSeeding] = React.useState(false);
  const touchTabs = useTouchTabs();
  React.useEffect(() => {
    let mounted = true;
    function refresh(event?: Event) {
      if ((event as CustomEvent<{ published: boolean }> | undefined)?.detail?.published &&
          !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const button = document.querySelector<HTMLElement>("[data-literary-shelf]");
        if (button) {
          const styles = getComputedStyle(button);
          const peak = styles.getPropertyValue("--literary-nav-bounce").trim();
          button.animate?.([{ transform: "scale(1)" }, { transform: `scale(${peak})` }, { transform: "scale(1)" }],
            { duration: Number.parseFloat(styles.getPropertyValue("--literary-nav-time")), easing: "ease-out" });
        }
      }
      void purgeDeletedEditions().then(listEditions).then((items) => {
        if (mounted) setLiteraryCount(items.filter((item) => item.issue && item.deletedAt === undefined).length);
      }).catch(() => {});
    }
    refresh();
    window.addEventListener(editionsChangedEvent, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      mounted = false;
      window.removeEventListener(editionsChangedEvent, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const {
    view,
    bin,
    book,
    t,
    pos,
    prefs,
    setPrefs,
    collectWord,
    setModal,
    nav,
    modal,
    busy,
    ingest,
    notice,
    setNotice,
  } = library;
  React.useEffect(() => {
    document.documentElement.dataset.navigation = prefs.mode;
    document.documentElement.dataset.performance = String(prefs.performanceMode);
  }, [prefs.mode, prefs.performanceMode]);
  const activeRole = useCompanionRole(book?.id, prefs.companion, library.ready);
  const speaker = roles.draco;
  const companionHidden = useCompanionHidden(prefs.companion.hiddenUntil);
  const unopened = React.useMemo(() => unopenedBoxes(library.cardLedger).length, [library.cardLedger]);
  function closeModal() {
    if (modal !== "import" || library.clearImport()) setModal("");
  }
  const importStatus = library.importProgress;
  const progressText = importStatus?.stage === "pages"
    ? t("importPages")
        .replace("{done}", String(importStatus.done))
        .replace("{total}", String(importStatus.total))
    : importStatus
      ? t(({
          reading: "importReading",
          extracting: "importExtracting",
          chapters: "importChapters",
          saving: "importSaving",
        } as const)[importStatus.stage])
      : "";
  const menu = {
    t,
    active: modal === "settings" ? "settings" : view,
    counts: { bin: bin.length, cards: unopened, newspaper: literaryCount },
    choose: (id: string) => id === "settings" ? setModal("settings") : nav(id),
  };
  return (
    <ConfirmProvider t={t}>
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
        header={<SiteMasthead {...menu} touch={touchTabs || (!book && view==="shelf")} />}
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
            onBack={library.closeBook}
            onTimer={() => setTimerOpened(true)}
            bookFinished={(key) => bookCompleted(library.cardLedger, key)}
            onBookFinished={(earned) => void library.cardsChanged(earned)}
            onCardError={library.cardError}
            companionRole={activeRole}
            companionWords={bin}
            companionHidden={companionHidden}
            companionBlocked={Boolean(modal) || timerOpened}
            onCompanionPreviewApplied={() => setCompanionPreview(undefined)}
            companionPreview={
              prefs.companion.preview ? companionPreview : undefined
            }
          />
        ) : view === "newspaper" ? (
          <React.Suspense fallback={<main className="desk">{t("paperLoading")}</main>}>
            <Newspaper
              books={library.books}
              username={prefs.companion.userName}
              lang={prefs.lang}
              t={t}
              moving={prefs.paperPhotoMotion && !prefs.performanceMode}
              navigation={prefs.mode}
              performanceOverlay={prefs.performanceOverlay}
              performanceMode={prefs.performanceMode}
              onNotice={setNotice}
              inkPrefs={prefs}
              setInkPreference={(key, value) => setPrefs({ ...prefs, [key]: value })}
              sound={prefs.focusSound}
            />
          </React.Suspense>
        ) : view === "shelf" ? (
          <Bookshelf {...library} />
        ) : view === "bin" ? (
          <TrashBin {...library} />
        ) : view === "notebook" ? (
          <Notebook {...library} />
        ) : (
          <Cards
            t={t}
            lang={prefs.lang}
            ledger={library.cardLedger}
            onChange={library.cardsChanged}
            onNotice={setNotice}
            saveWord={library.collectCardWord}
            sound={prefs.focusSound}
            vibration={prefs.focusVibration}
            performanceMode={prefs.performanceMode}
          />
        )}
      </FocusTimer>
      {(touchTabs || view==="shelf") && !book && <BottomNavigation {...menu} />}
      {modal && (
        <AppModal
          key={modal}
          t={t}
          close={closeModal}
          blocked={modal === "import" && importStatus?.stage === "saving"}
          className={modal === "confirm" ? "switch-confirmation-dialog" : undefined}
          aria-label={modal === "settings" ? t("settings") : modal === "about" ? t("about") : undefined}
          aria-labelledby={modal === "confirm" ? "switch-confirmation-title" : modal === "import" ? "import-title" : undefined}
          style={modal === "confirm" ? centerStageVariables : undefined}
        >
            {modal === "import" ? (
              <>
                <h2 id="import-title">{t("importABook")}</h2>
                <p>{t("importFormats")}</p>
                {library.books.length >= shelfRules.capacity && <p>{t("shelfFull")}</p>}
                <label className="file">
                  {t("chooseBookFile")}
                  <input
                    disabled={busy || !library.ready || library.books.length >= shelfRules.capacity}
                    type="file"
                    accept=".txt,.epub,.pdf,.docx,.doc"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      void ingest(file);
                    }}
                  />
                </label>
                {importStatus && (
                  <div className="book-import-progress">
                    <progress max={100} value={importStatus.percent} aria-label={t("importProgress")} />
                    <output>{progressText} · {importStatus.percent}%</output>
                  </div>
                )}
                {library.importError && <p className="book-import-error" role="alert">{t(library.importError)}</p>}
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
                <label className="memory-field">
                  <span><input type="checkbox" checked={prefs.paperPhotoMotion}
                    onChange={(event) => setPrefs({ ...prefs, paperPhotoMotion: event.target.checked })} />
                    {" "}{t("paperPhotoMotion")}
                  </span>
                </label>
                <label className="setting">
                  {t("dockPosition")}
                  <select value={prefs.dock.position}
                    onChange={(event) => {
                      const position = event.currentTarget.value as DockPreferences["position"];
                      setPrefs({ ...prefs, dock: { ...prefs.dock, position } });
                    }}>
                    {dockSides.map((side) => <option key={side} value={side}>{t(dockLabels[side])}</option>)}
                    {prefs.dock.point && <option value="custom">{t("dockCustom")}</option>}
                  </select>
                </label>
                <label className="setting">
                  <span>{t("dockAutoCollapse")}</span>
                  <input type="checkbox" checked={prefs.dock.autoCollapse}
                    onChange={(event) => setPrefs({ ...prefs, dock: { ...prefs.dock, autoCollapse: event.currentTarget.checked } })} />
                </label>
                <label className="setting">
                  {t("navigationMode")}
                  <select value={prefs.mode}
                    onChange={(event) => setPrefs({ ...prefs, mode: event.target.value === "page" ? "page" : "scroll" })}>
                    <option value="page">{t("pageTurnMode")}</option>
                    <option value="scroll">{t("scroll")}</option>
                  </select>
                </label>
                <label className="setting">
                  <span>{t("performanceMode")}</span>
                  <input type="checkbox" checked={prefs.performanceMode}
                    onChange={(event) => setPrefs({ ...prefs, performanceMode: event.target.checked })} />
                </label>
                <label className="setting">
                  {t("reviewDailyLimit")}
                  <input type="number" min={1} step={1} inputMode="numeric"
                    defaultValue={prefs.reviewDailyLimit}
                    onChange={(event) => {
                      const limit = event.currentTarget.valueAsNumber;
                      if (Number.isSafeInteger(limit) && limit > 0) setPrefs({ ...prefs, reviewDailyLimit: limit });
                    }}
                    onBlur={(event) => { event.currentTarget.value = String(prefs.reviewDailyLimit); }}
                  />
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
                >
                  <label className="setting">
                    <span>{t("inkPerformanceOverlay")}</span>
                    <input type="checkbox" checked={prefs.performanceOverlay}
                      onChange={(event) => setPrefs({ ...prefs, performanceOverlay: event.target.checked })} />
                  </label>
                  <button onClick={() => setModal("styleGuide")}>{t("styleGuide")}</button>
                  <CardsDeveloper
                    t={t}
                    onChange={library.cardsChanged}
                    onNotice={setNotice}
                  />
                  <button type="button" onClick={() => void resetChinesePasses()
                    .then(() => setNotice(t("paperPassesReset")))
                    .catch(() => setNotice(t("paperSaveFailed")))}>
                    {t("paperResetPasses")}
                  </button>
                  <button type="button" disabled={seeding} onClick={() => {
                    setSeeding(true);
                    const samples = [
                      { title: t("literarySampleTitle1"), body: t("literarySampleBody1") },
                      { title: t("literarySampleTitle2"), body: t("literarySampleBody2") },
                      { title: t("literarySampleTitle3"), body: t("literarySampleBody3") },
                    ];
                    void seedEditions(library.books, prefs.companion.userName.trim() || t("paperUnknownAuthor"), samples)
                      .then(() => setNotice(t("literarySeedDone")))
                      .catch(() => setNotice(t("paperSaveFailed")))
                      .finally(() => setSeeding(false));
                  }}>{t("literarySeed")}</button>
                </CompanionDeveloper>
                <LocalBackup t={t} onNotice={setNotice} />
                <button onClick={() => setModal("about")}>{t("about")}</button>
              </>
            ) : modal === "styleGuide" ? (<StyleGuide t={t} back={()=>setModal("settings")}/>) : modal === "about" ? (
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
        </AppModal>
      )}
      {library.cardNotice > 0 && (
        <button key={library.cardNotice} className="notice cards-arrival" role="status" onClick={library.dismissCardNotice}>
          {t("cardsArrived")} ×
        </button>
      )}
      {notice && (
        <button className="notice" role="status" onClick={() => setNotice("")}>
          {notice} ×
        </button>
      )}
    </ConfirmProvider>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
if (import.meta.env.PROD && "serviceWorker" in navigator)
  navigator.serviceWorker.register("./sw.js").catch(() => {});
