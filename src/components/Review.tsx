import React, { useEffect, useState } from "react";
import type { Word, Grade } from "../memory";
import type { Library } from "../useLibrary";

type Props = Pick<
  Library,
  "t" | "bin" | "prefs" | "reviewWord" | "reviewProgress"
>;

function Card({
  word,
  t,
  prefs,
  reviewWord,
}: Pick<Props, "t" | "prefs" | "reviewWord"> & { word: Word }) {
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  async function grade(value: Grade) {
    setBusy(true);
    try {
      await reviewWord(word.w, value);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="memory-card">
      <h3>{word.w}</h3>
      {revealed ? (
        <>
          <p className="defs">
            {word.entry?.[2] || t("noEntryInTheOfflineEdition")}
          </p>
          {prefs.zhDefs && word.entry?.[3] && (
            <p className="defs">{word.entry[3]}</p>
          )}
          {word.example && <blockquote>{word.example}</blockquote>}
          <div className="memory-tools">
            {(["remember", "fuzzy", "forgot"] as const).map((value) => (
              <button disabled={busy} key={value} onClick={() => grade(value)}>
                {t(value)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <button className="primary" onClick={() => setRevealed(true)}>
          {t("revealAnswer")}
        </button>
      )}
    </div>
  );
}

export function Review(props: Props) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);
  const due = props.bin
    .filter((word) => (word.review?.dueAt ?? 0) <= now)
    .sort((a, b) => (a.review?.dueAt ?? 0) - (b.review?.dueAt ?? 0));
  return (
    <section className="memory-stack">
      <h2>{props.t("reviewWords")}</h2>
      <p role="status">
        {props.t("dueNow")} {due.length} · {props.t("reviewsCompleted")}{" "}
        {props.reviewProgress.totalReviews}
      </p>
      {due[0] ? (
        <Card key={due[0].w} word={due[0]} {...props} />
      ) : (
        <p>{props.t("nothingDue")}</p>
      )}
    </section>
  );
}
