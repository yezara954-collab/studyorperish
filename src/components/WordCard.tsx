import React from "react";
import type { ReaderState, ReaderProps } from "../useReader";
type Props = Pick<ReaderProps, "t" | "prefs"> &
  Pick<
    ReaderState,
    "word" | "setWord" | "change" | "saved" | "pronounce" | "collect"
  >;
export function WordCard({
  word,
  setWord,
  t,
  prefs,
  change,
  saved,
  pronounce,
  collect,
}: Props) {
  return (
    <dialog
      open
      aria-label={t("dictionary")}
      onKeyDown={(e) => {
        if (e.key === "Escape") setWord(null);
      }}
    >
      <button className="close" onClick={() => setWord(null)}>
        ×
      </button>
      <small>{t("dictionarySource")}</small>
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
            {prefs.zhDefs ? t("hideChinese") : t("showChinese")}
          </button>
        </>
      ) : (
        <p>
          {word.busy
            ? t("openingDictionary")
            : word.failed
              ? t("dictionaryUnavailable")
              : t("noEntryInTheOfflineEdition")}
        </p>
      )}
      <blockquote>{word.example}</blockquote>
      <button onClick={pronounce}>♫ {t("pronounce")}</button>{" "}
      <button
        className="primary"
        disabled={saved || word.busy}
        onClick={collect}
      >
        {saved ? t("savedInTrashBin") : t("tossIntoTheTrashBin")}
      </button>
    </dialog>
  );
}
