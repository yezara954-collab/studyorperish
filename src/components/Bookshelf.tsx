import { AppModal } from "./AppModal";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import type { Book } from "../books";
import { isImportedBook, shelfRules } from "../bookshelfStorage";
import { bookCompleted, bookRewardKey } from "../cards/storage";
import { illustrations } from "../config";
import type { Translate } from "../i18n";
import type { Library } from "../useLibrary";
import { Icon } from "./Icons";
import "./bookshelf.css";
import { ShelfScene, shelfAsset, bindings } from "./ShelfScene";

const extractionMs = 800;
const longPressMs = 500;
const dragThreshold = 9;
const paletteSize = 8;
const rewardKeys = new WeakMap<Book, string>();
const statuses = ["unread", "reading", "finished"] as const;
type Status = (typeof statuses)[number];
const statusNames = {
  unread: "shelfUnread",
  reading: "shelfReading",
  finished: "shelfFinished",
} as const;

type ShelfProps = Pick<
  Library,
  | "books"
  | "shelfPositions"
  | "cardLedger"
  | "ready"
  | "setNotice"
  | "setModal"
  | "ordered"
  | "open"
  | "t"
  | "sort"
  | "setSort"
  | "prefs"
  | "renameBook"
  | "rebuildBook"
  | "deleteBook"
  | "moveBook"
>;

function titleHash(title: string) {
  let value = 2166136261;
  for (const symbol of title)
    value = Math.imul(value ^ symbol.codePointAt(0)!, 16777619);
  return value >>> 0;
}

function bookSpine(book: Book) {
  const hash = titleHash(book.title);
  return {
    "--spine-leather": `var(--spine-palette-${hash % paletteSize})`,
    "--spine-height": `${82 + ((hash >>> 8) % 13)}%`,
    "--spine-skin": `url(${shelfAsset("spine-texture-"+bindings[hash%8]+".webp")})`,
    "--spine-width": Math.min(100,78+Math.log2(1+book.chapters.length)*4)+"%",
    "--spine-weight":
      1 + Math.min(0.52, Math.log2(Math.max(1, book.chapters.length)) * 0.09),
  } as CSSProperties;
}

type Press = {
  id: string;
  index: number;
  pointer: number;
  x: number;
  y: number;
  target: HTMLButtonElement;
  timeout: number;
  dragging: boolean;
  menu: boolean;
};

export function Bookshelf({
  books,
  shelfPositions,
  cardLedger,
  ready,
  setNotice,
  setModal,
  ordered,
  open,
  t,
  sort,
  setSort,
  prefs,
  renameBook,
  rebuildBook,
  deleteBook,
  moveBook,
}: ShelfProps) {
  const [menu, setMenu] = useState<Book>();
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [extract, setExtract] = useState<{ book: Book; rect: DOMRect }>();
  const [drag, setDrag] = useState<{ source: number; target: number }>();
  const press = useRef<Press | undefined>(undefined);
  const bypassClick = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const openBook = useRef(open);
  openBook.current = open;
  const board = useRef<HTMLDivElement>(null);
  const shown = ordered.slice(0, shelfRules.capacity);
  const overflow = ordered.slice(shelfRules.capacity);
  const full = books.length >= shelfRules.capacity;
  const manual = sort === "added";
  const progress = useMemo(() => {
    const records = new Map<string, Status>();
    const hasFinished =
      Object.keys(cardLedger.completedBooks ?? {}).length > 0 ||
      Object.keys(cardLedger.boxes).some((key) => key.startsWith("book:"));
    for (const book of books.slice(0, shelfRules.capacity)) {
      const offset = shelfPositions[book.id];
      let status: Status = offset ? "reading" : "unread";
      if (hasFinished) {
        let key = rewardKeys.get(book);
        if (!key) {
          key = bookRewardKey(book);
          rewardKeys.set(book, key);
        }
        if (bookCompleted(cardLedger, key)) status = "finished";
      }
      records.set(book.id, status);
    }
    return records;
  }, [books, cardLedger, shelfPositions]);

  useEffect(() => {
    if (!extract) return;
    const timeout = setTimeout(() => {
      void openBook.current(extract.book);
      setExtract(undefined);
    }, extractionMs);
    const cancel = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExtract(undefined);
    };
    window.addEventListener("keydown", cancel);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("keydown", cancel);
    };
  }, [extract]);

  useEffect(
    () => () => {
      if (press.current) window.clearTimeout(press.current.timeout);
    },
    [],
  );

  function addBook() {
    if (!ready || full) return;
    setNotice("");
    setModal("import");
  }

  function showActions(book: Book, target: HTMLElement) {
    returnFocus.current = target;
    setMenu(book);
  }

  function closeActions() {
    setMenu(undefined);
    requestAnimationFrame(() => {
      if (returnFocus.current?.isConnected) returnFocus.current.focus();
      else
        board.current
          ?.querySelector<HTMLElement>(".book-spine, .shelf-empty-spine")
          ?.focus();
    });
  }

  function startOpening(book: Book, target: HTMLButtonElement) {
    if (!ready || extract) return;
    if (
      prefs.performanceMode ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      void open(book);
      return;
    }
    setExtract({ book, rect: target.getBoundingClientRect() });
  }

  function startPress(
    event: PointerEvent<HTMLButtonElement>,
    book: Book,
    index: number,
  ) {
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      !ready ||
      extract ||
      press.current
    )
      return;
    bypassClick.current = false;
    const target = event.currentTarget;
    const gesture: Press = {
      id: book.id,
      index,
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      target,
      dragging: false,
      menu: false,
      timeout: 0,
    };
    gesture.timeout = window.setTimeout(() => {
      if (press.current !== gesture) return;
      gesture.menu = true;
      bypassClick.current = true;
      showActions(book, target);
    }, longPressMs);
    press.current = gesture;
    target.setPointerCapture(event.pointerId);
  }

  function targetSlot(x: number, y: number) {
    const element = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-shelf-slot]");
    if (!element || !board.current?.contains(element)) return undefined;
    return Math.min(shown.length - 1, Number(element.dataset.shelfSlot));
  }

  function movePress(event: PointerEvent<HTMLButtonElement>) {
    const gesture = press.current;
    if (!gesture || gesture.pointer !== event.pointerId || gesture.menu) return;
    if (!gesture.dragging) {
      if (
        Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <
        dragThreshold
      )
        return;
      window.clearTimeout(gesture.timeout);
      bypassClick.current = true;
      if (!manual) return;
      gesture.dragging = true;
    }
    const target = targetSlot(event.clientX, event.clientY) ?? gesture.index;
    setDrag((last) =>
      last?.target === target ? last : { source: gesture.index, target },
    );
  }

  function endPress(event: PointerEvent<HTMLButtonElement>, cancel = false) {
    const gesture = press.current;
    if (!gesture || gesture.pointer !== event.pointerId) return;
    window.clearTimeout(gesture.timeout);
    press.current = undefined;
    setDrag(undefined);
    if (gesture.dragging && !cancel) {
      const target = targetSlot(event.clientX, event.clientY);
      if (target !== undefined && target !== gesture.index)
        void moveBook(gesture.id, target);
    }
  }

  return (
    <main className="desk bookcase-desk">
      <ShelfScene meter={prefs.performanceOverlay}/>
      <div className="bookcase-toolbar app-action-bar">
        <div className="bookcase-heading">
          <h1>{t("theBookshelf")}</h1>
          <span aria-label={`${shown.length} ${t("volumesOnShelf")}`}>
            {shown.length}/{shelfRules.capacity}
          </span>
        </div>
        <label className="bookcase-sort">
          <span>{t("sortBy")}</span>
          <select
            aria-label={t("sortBy")}
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="added">{t("shelfOrder")}</option>
            <option value="title">{t("title")}</option>
          </select>
        </label>
        <button
          type="button"
          className="primary"
          disabled={!ready || full}
          onClick={addBook}
        >
          <Icon name="plus" /> {t("importBook")}
        </button>
      </div>
      {full && (
        <p className="bookcase-message" role="status">
          {t("shelfFull")}
        </p>
      )}
      {overflow.length > 0 && (
        <button
          type="button"
          className="bookcase-overflow"
          onClick={() => setOverflowOpen(true)}
        >
          {t("shelfManageOverflow").replace("{count}", String(overflow.length))}
        </button>
      )}
      <div className="bookcase" ref={board} data-manual={manual}>
        {Array.from({ length: shelfRules.tiers }, (_, tier) => (
          <div className="bookcase-tier" key={tier} data-shelf-tier={tier + 1}>
            {Array.from({ length: shelfRules.perTier }, (_, column) => {
              const index = tier * shelfRules.perTier + column;
              const book = shown[index];
              const status = book
                ? (progress.get(book.id) ?? "unread")
                : "unread";
              return (
                <div
                  key={index}
                  className="bookcase-slot"
                  data-shelf-slot={index}
                  data-drop={
                    drag?.target === index && drag.source !== index
                      ? "true"
                      : undefined
                  }
                  data-dragging={drag?.source === index ? "true" : undefined}
                  data-extracting={
                    book && extract?.book.id === book.id ? "true" : undefined
                  }
                  style={book ? bookSpine(book) : undefined}
                >
                  {book ? (
                    <div className="bookcase-volume">
                      <button
                        type="button"
                        className="book-spine"
                        title={book.title}
                        aria-label={`${book.title} · ${t(statusNames[status])}`}
                        data-book-id={book.id}
                        onPointerDown={(event) =>
                          startPress(event, book, index)
                        }
                        onPointerMove={movePress}
                        onPointerUp={(event) => endPress(event)}
                        onPointerCancel={(event) => endPress(event, true)}
                        onLostPointerCapture={(event) => endPress(event, true)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          if (press.current?.menu) return;
                          if (press.current) {
                            window.clearTimeout(press.current.timeout);
                            press.current.menu = true;
                          }
                          bypassClick.current = true;
                          showActions(book, event.currentTarget);
                        }}
                        onClick={(event) => {
                          if (bypassClick.current && event.detail > 0) {
                            bypassClick.current = false;
                            return;
                          }
                          startOpening(book, event.currentTarget);
                        }}
                      >
                        <span className="book-spine-title">{book.title}</span>
                        <span
                          className="book-ribbon"
                          data-status={status}
                          aria-hidden="true"
                        />
                      </button>
                      <button
                        type="button"
                        className="book-spine-actions"
                        aria-label={t("shelfBookActions").replace(
                          "{title}",
                          () => book.title,
                        )}
                        onClick={(event) =>
                          showActions(book, event.currentTarget)
                        }
                      >
                        <Icon name="more" />
                      </button>
                    </div>
                  ) : ready && !full && index === shown.length ? (
                    <button
                      type="button"
                      className="shelf-empty-spine"
                      onClick={addBook}
                      aria-label={t("importBook")}
                    >
                      <Icon name="plus" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="bookcase-legend" aria-hidden="true">
        {statuses.map((status) => (
          <span key={status}>
            <i className="book-ribbon" data-status={status} />
            {t(statusNames[status])}
          </span>
        ))}
      </div>
      {menu && (
        <BookActions
          key={menu.id}
          book={menu}
          t={t}
          close={closeActions}
          renameBook={renameBook}
          rebuildBook={rebuildBook}
          deleteBook={deleteBook}
          earlier={
            manual && books.indexOf(menu) > 0
              ? () => moveBook(menu.id, books.indexOf(menu) - 1)
              : undefined
          }
          later={
            manual && books.indexOf(menu) < shown.length - 1
              ? () => moveBook(menu.id, books.indexOf(menu) + 1)
              : undefined
          }
        />
      )}
      {overflowOpen && (
        <ShelfDialog
          title={t("shelfManageOverflow").replace(
            "{count}",
            String(overflow.length),
          )}
          close={() => setOverflowOpen(false)}
          t={t}
        >
          <p>{t("shelfOverflowHelp")}</p>
          <ul className="bookcase-overflow-list">
            {overflow.map((book) => (
              <li key={book.id}>
                <button
                  type="button"
                  onClick={(event) => {
                    setOverflowOpen(false);
                    showActions(book, event.currentTarget);
                  }}
                >
                  {book.title}
                </button>
              </li>
            ))}
          </ul>
        </ShelfDialog>
      )}
      {extract && <ExtractedBook {...extract} t={t} />}
    </main>
  );
}

function ShelfDialog({
  title,
  t,
  close,
  children,
}: {
  title: string;
  t: Translate;
  close: () => void;
  children: React.ReactNode;
}) {
  const heading = useId();
  return (
    <AppModal t={t} close={close} className="shelf-dialog" aria-labelledby={heading}>
      <h2 id={heading}>{title}</h2>
      {children}
    </AppModal>
  );
}

function BookActions({
  book,
  t,
  close,
  renameBook,
  rebuildBook,
  deleteBook,
  earlier,
  later,
}: Pick<ShelfProps, "t" | "renameBook" | "deleteBook" | "rebuildBook"> & {
  book: Book;
  close: () => void;
  earlier?: () => void;
  later?: () => void;
}) {
  const [mode, setMode] = useState<"menu" | "rename" | "delete" | "rebuild">("menu");
  const [name, setName] = useState(book.title);
  const [saving, setSaving] = useState(false);
  const running = useRef(false);
  async function confirm() {
    if (running.current) return;
    running.current = true;
    setSaving(true);
    const ok =
      mode === "rename"
        ? await renameBook(book.id, name)
        : mode === "rebuild" ? await rebuildBook(book.id) : await deleteBook(book.id);
    if (ok) close();
    else {
      setSaving(false);
      running.current = false;
    }
  }
  return (
    <ShelfDialog
      title={book.title}
      t={t}
      close={() => {
        if (!running.current) close();
      }}
    >
      {mode === "menu" ? (
        <div className="shelf-dialog-buttons">
          <button type="button" onClick={() => setMode("rename")}>
            {t("shelfRename")}
          </button>
          {isImportedBook(book.id) && (
            <button type="button" onClick={() => setMode("rebuild")}>
              {t("shelfRebuild")}
            </button>
          )}
          <button type="button" onClick={() => setMode("delete")}>
            {t("shelfRemove")}
          </button>
          {earlier && (
            <button
              type="button"
              onClick={() => {
                earlier();
                close();
              }}
            >
              {t("shelfMoveEarlier")}
            </button>
          )}
          {later && (
            <button
              type="button"
              onClick={() => {
                later();
                close();
              }}
            >
              {t("shelfMoveLater")}
            </button>
          )}
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void confirm();
          }}
        >
          {mode === "rename" ? (
            <label className="shelf-title-field">
              {t("title")}
              <input
                autoFocus
                value={name}
                maxLength={shelfRules.maxName}
                disabled={saving}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          ) : (
            <p>
              {t(mode === "rebuild" ? "shelfRebuildConfirm" : "shelfRemoveConfirm").replace("{title}", () => book.title)}
            </p>
          )}
          <div className="shelf-dialog-buttons">
            <button
              type="button"
              disabled={saving}
              onClick={() => setMode("menu")}
            >
              {t("cancelAction")}
            </button>
            <button
              type="submit"
              disabled={saving || (mode === "rename" && !name.trim())}
              className={mode === "delete" ? "shelf-danger" : "primary"}
            >
              {t(mode === "rename" ? "shelfSaveName" : mode === "rebuild" ? "shelfRebuild" : "shelfRemove")}
            </button>
          </div>
        </form>
      )}
    </ShelfDialog>
  );
}

function ExtractedBook({
  book,
  rect,
  t,
}: {
  book: Book;
  rect: DOMRect;
  t: Translate;
}) {
  const width = Math.min(285, innerWidth * 0.68, innerHeight * 0.54);
  const height = width / 0.755;
  const style = {
    ...bookSpine(book),
    "--extract-time": extractionMs + "ms",
    "--extract-width": width + "px",
    "--extract-height": height + "px",
    "--extract-x": rect.left + rect.width / 2 - innerWidth / 2 + "px",
    "--extract-y": rect.top + rect.height / 2 - innerHeight / 2 + "px",
    "--extract-scale-x": Math.min(0.85, rect.width / (width * 0.38)),
    "--extract-scale-y": Math.min(1, rect.height / height),
  } as CSSProperties;
  return (
    <div className="shelf-extraction" aria-hidden="true" style={style}>
      <div className="shelf-extraction-book cover">
        <span className="shelf-extraction-profile">{book.title}</span>
        <div className="frame">
          <div className="stars">· ✦ ·</div>
          <strong>{book.title}</strong>
          <illustrations.Cover type={book.art} />
          <div className="author">{book.author || t("privateCollection")}</div>
        </div>
      </div>
    </div>
  );
}
