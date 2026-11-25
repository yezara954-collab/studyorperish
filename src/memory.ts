import { committed, db, stores } from "./books";

type Anchor = { bookId: string; chapter: number; start: number };
export type Highlight = Anchor & {
  kind: "highlight";
  sentenceId?: string;
  strokeId?: string;
  id: string;
  bookTitle: string;
  chapterTitle: string;
  end: number;
  quote: string;
  note: string;
  createdAt: number;
};
export type Point = [number, number];
export type Ink = Anchor & {
  kind: "ink";
  id: string;
  points: Point[];
  createdAt: number;
};
export type AnchorPoint = { at: number; x: number; y: number; width: number };
export type QuillStroke = Anchor & {
  kind: "quill";
  id: string;
  points: AnchorPoint[];
  color: string;
  fontSize: number;
  createdAt: number;
};
export type Annotation = Highlight | Ink | QuillStroke;
export type Word = {
  w: string;
  entry?: (string | null)[];
  example?: string;
  source?: string;
  review?: { dueAt: number; interval: number; count: number };
};
export type Grade = "remember" | "fuzzy" | "forgot";
export const reviewStatsKey = "study-or-perish:review-stats";
const day = 86_400_000;
const initialStats = { totalReviews: 0, reviewedWords: 0 };
export type ReviewStats = typeof initialStats;

export async function writeAnnotations(
  updates: Annotation[],
  deletions: string[] = [],
) {
  const transaction = (await db).transaction("annotations", "readwrite");
  const store = transaction.objectStore("annotations");
  for (const id of deletions) store.delete(id);
  for (const item of updates) store.put(item, item.id);
  await committed(transaction);
}

// Read-modify-write within one transaction so collecting a word again preserves its schedule.
export async function collectWord(word: Word) {
  const transaction = (await db).transaction("bin", "readwrite");
  const bin = transaction.objectStore("bin");
  const existing = bin.get(word.w);
  existing.onsuccess = () =>
    bin.put(
      {
        ...word,
        entry: word.entry ?? existing.result?.entry,
        review: existing.result?.review,
      },
      word.w,
    );
  await committed(transaction);
}

export async function gradeWord(key: string, grade: Grade, now = Date.now()) {
  const transaction = (await db).transaction(["bin", "state"], "readwrite");
  const bin = transaction.objectStore("bin");
  const state = transaction.objectStore("state");
  const request = bin.get(key);
  request.onsuccess = () => {
    const word = request.result as Word | undefined;
    if (!word || (word.review?.dueAt ?? 0) > now) return;
    const old = word.review;
    const interval =
      grade === "forgot"
        ? 10 / 1440
        : grade === "fuzzy"
          ? 1
          : old && old.interval >= 1
            ? Math.min(365, Math.ceil(old.interval * 2.5))
            : 1;
    bin.put(
      {
        ...word,
        review: {
          interval,
          dueAt: now + interval * day,
          count: (old?.count ?? 0) + 1,
        },
      },
      key,
    );
    const stats = state.get(reviewStatsKey);
    stats.onsuccess = () => {
      const value = (stats.result ?? initialStats) as ReviewStats;
      state.put(
        {
          totalReviews: value.totalReviews + 1,
          reviewedWords: value.reviewedWords + (old?.count ? 0 : 1),
        },
        reviewStatsKey,
      );
    };
  };
  await committed(transaction);
}

// Stage 5 uses completed reviews as an accumulating counter, including repeat sessions.
export async function getReviewProgress() {
  const transaction = (await db).transaction("state");
  const request = transaction.objectStore("state").get(reviewStatsKey);
  await committed(transaction);
  const stats = (request.result ?? initialStats) as ReviewStats;
  return { ...stats, milestones: Math.floor(stats.totalReviews / 100) };
}

type BackupRows = Record<(typeof stores)[number], [string, unknown][]>;
export async function exportBackupJSON() {
  const transaction = (await db).transaction([...stores]);
  const requests = stores.map((name) => {
    const store = transaction.objectStore(name);
    return { name, keys: store.getAllKeys(), values: store.getAll() };
  });
  await committed(transaction);
  return JSON.stringify({
    version: 1,
    exportedAt: Date.now(),
    records: Object.fromEntries(
      requests.map(({ name, keys, values }) => [
        name,
        keys.result.map((key, index) => [key, values.result[index]]),
      ]),
    ),
  });
}

// Import merges by ID after validation. Call before mounting the UI or reload after import.
export async function importBackupJSON(json: string) {
  const data = JSON.parse(json);
  if (data?.version !== 1 || !data.records)
    throw new Error("Unsupported backup");
  const rows = data.records as BackupRows;
  for (const name of stores) {
    if (
      !Array.isArray(rows[name]) ||
      !rows[name].every(
        (row) =>
          Array.isArray(row) &&
          row.length === 2 &&
          typeof row[0] === "string" &&
          row[1] &&
          typeof row[1] === "object" &&
          !Array.isArray(row[1]) &&
          validBackupRecord(name, row[0], row[1]),
      )
    )
      throw new Error("Invalid backup");
  }
  const transaction = (await db).transaction([...stores], "readwrite");
  for (const name of stores) {
    const store = transaction.objectStore(name);
    for (const [key, value] of rows[name]) store.put(value, key);
  }
  await committed(transaction);
}

function validBackupRecord(store: keyof BackupRows, key: string, record: any) {
  const nonnegative = (n: unknown) =>
    typeof n === "number" && Number.isInteger(n) && n >= 0;
  const strings = (...values: unknown[]) =>
    values.every((value) => typeof value === "string");
  if (store === "books")
    return (
      record.id === key &&
      strings(record.title, record.author) &&
      nonnegative(record.art) &&
      Array.isArray(record.chapters) &&
      record.chapters.length > 0 &&
      record.chapters.every(
        (chapter: any) => chapter && strings(chapter.title, chapter.text),
      )
    );
  if (store === "bin")
    return (
      record.w === key &&
      strings(record.w) &&
      (record.entry == null ||
        (Array.isArray(record.entry) &&
          record.entry.every(
            (field: any) => field === null || typeof field === "string",
          ))) &&
      (record.example == null || strings(record.example)) &&
      (record.source == null || strings(record.source)) &&
      (!record.review ||
        (nonnegative(record.review.count) &&
          Number.isFinite(record.review.dueAt) &&
          Number.isFinite(record.review.interval) &&
          record.review.interval > 0))
    );
  if (store === "annotations") {
    if (
      record.id !== key ||
      !strings(record.bookId) ||
      ![record.chapter, record.start, record.createdAt].every(nonnegative)
    )
      return false;
    return record.kind === "highlight"
      ? strings(
          record.bookTitle,
          record.chapterTitle,
          record.quote,
          record.note,
        ) &&
          nonnegative(record.end) &&
          record.end > record.start
      : record.kind === "quill"
        ? ["brown", "black", "blue", "red"].includes(record.color) &&
          Number.isFinite(record.fontSize) &&
          record.fontSize > 0 &&
          Array.isArray(record.points) &&
          record.points.length > 0 &&
          record.points.every(
            (point: any) =>
              point &&
              nonnegative(point.at) &&
              [point.x, point.y, point.width].every(Number.isFinite) &&
              point.width > 0,
          )
        : record.kind === "ink" &&
          Array.isArray(record.points) &&
          record.points.length > 0 &&
          record.points.every(
            (point: any) =>
              Array.isArray(point) &&
              point.length === 2 &&
              point.every(
                (v: any) => typeof v === "number" && v >= 0 && v <= 1,
              ),
          );
  }
  if (key === reviewStatsKey)
    return (
      nonnegative(record.totalReviews) && nonnegative(record.reviewedWords)
    );
  if (key === "prefs")
    return (
      [undefined, "en", "zh"].includes(record.lang) &&
      [undefined, "page", "scroll"].includes(record.mode) &&
      (record.size === undefined || (record.size >= 16 && record.size <= 32)) &&
      (record.line === undefined ||
        (record.line >= 1.3 && record.line <= 2.3)) &&
      (record.zhDefs === undefined || typeof record.zhDefs === "boolean") &&
      (record.fingerInk === undefined ||
        typeof record.fingerInk === "boolean") &&
      (record.leftHand === undefined || typeof record.leftHand === "boolean") &&
      [undefined, "brown", "black", "blue", "red"].includes(record.inkColor)
    );
  return nonnegative(record.ch) && nonnegative(record.offset);
}
