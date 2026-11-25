import React, { useState } from "react";
import type { Highlight } from "../memory";
import type { Library } from "../useLibrary";

type Props = Pick<
  Library,
  | "annotations"
  | "t"
  | "jumpToHighlight"
  | "saveAnnotation"
  | "deleteAnnotation"
>;

function Entry({ item, library }: { item: Highlight; library: Props }) {
  const { t, jumpToHighlight, saveAnnotation, deleteAnnotation } = library;
  const [note, setNote] = useState(item.note);
  const [confirm, setConfirm] = useState(false);
  return (
    <section className="memory-card">
      <button className="notebook-quote" onClick={() => jumpToHighlight(item)}>
        {item.quote}
      </button>
      <small>
        {item.bookTitle} · {item.chapterTitle} ·{" "}
        {new Date(item.createdAt).toLocaleString(document.documentElement.lang)}
      </small>
      <label className="memory-field">
        {t("personalNote")}
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <div className="memory-tools">
        <button
          disabled={note === item.note}
          onClick={() => saveAnnotation({ ...item, note })}
        >
          {t("saveNote")}
        </button>
        <button
          onClick={() =>
            confirm ? deleteAnnotation(item.id) : setConfirm(true)
          }
        >
          {t(confirm ? "confirmDelete" : "deleteHighlight")}
        </button>
        {confirm && (
          <button onClick={() => setConfirm(false)}>{t("cancelAction")}</button>
        )}
      </div>
    </section>
  );
}

export function Notebook(library: Props) {
  const [filter, setFilter] = useState("");
  const entries = library.annotations
    .filter((item): item is Highlight => item.kind === "highlight")
    .sort((a, b) => b.createdAt - a.createdAt);
  const books = new Map(entries.map((item) => [item.bookId, item.bookTitle]));
  const visible = entries.filter(
    (item) => !filter || item.bookId === filter || !books.has(filter),
  );
  return (
    <section className="memory-stack">
      <label>
        {library.t("filterBook")}{" "}
        <select
          value={books.has(filter) ? filter : ""}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="">{library.t("allBooks")}</option>
          {[...books].map(([id, title]) => (
            <option key={id} value={id}>
              {title}
            </option>
          ))}
        </select>
      </label>
      {visible.length ? (
        visible.map((item) => (
          <Entry key={item.id} item={item} library={library} />
        ))
      ) : (
        <p>{library.t("emptyNotebook")}</p>
      )}
    </section>
  );
}
