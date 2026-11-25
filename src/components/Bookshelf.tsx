import React from "react";
import type { Library } from "../useLibrary";
import { illustrations } from "../config";
import { Icon } from "./Icons";
export function Bookshelf({
  books,
  ready,
  setNotice,
  setModal,
  ordered,
  open,
  t,
  sort,
  setSort,
}: Pick<
  Library,
  "books" | "ready" | "setNotice" | "setModal" | "ordered" | "open" | "t" | "sort" | "setSort"
>) {
  return (
    <>
      <div className="tools">
        <div className="sectionTitle">
          <Icon name="shelf" />
          <h2>{t("myCollection")}</h2>
          <span>{books.length}</span>
        </div>
        <button
          className="primary"
          disabled={!ready}
          onClick={() => {
            setNotice("");
            setModal("import");
          }}
        >
          <Icon name="plus" />
          {t("importBook")}
        </button>
      </div>
      <div className="shelf">
        <div className="grid">
          {ordered.map((b) => (
            <button className="volume" key={b.id} onClick={() => open(b)}>
              <div className={"cover c" + (b.art % 3)}>
                <div className="frame">
                  <div className="stars">· ✦ ·</div>
                  <strong>{b.title}</strong>
                  <illustrations.Cover type={b.art} />
                  <div className="author">
                    {b.author || t("privateCollection")}
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
                  {b.chapters.length} {t("chapters")}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="bottom">
        <span>
          <Icon name="book" /> {books.length} {t("volumesOnShelf")}
        </span>
        <label>
          {t("sortBy")}{" "}
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="added">{t("shelfOrder")}</option>
            <option value="title">{t("title")}</option>
          </select>
        </label>
      </div>
    </>
  );
}
