import { committed, db, read } from "../books";
import { cardRules, cards, cardsById, rarities } from "./config";

export const cardsStateKey = "study-or-perish:cards";
export const chapterProgressPrefix = cardsStateKey + ":coverage:";
type Interval = [number, number];
export type Envelope = {
  earnedAt: number;
  cardId?: string;
  openedAt?: number;
};
export type CardLedger = {
  version: 1;
  reviews: Record<string, number>;
  boxes: Record<string, Envelope>;
};

export const emptyLedger: CardLedger = { version: 1, reviews: {}, boxes: {} };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

const positiveTime = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const chapterKeyPattern = /^chapter:\d+:\d+:[\da-f]{16}$/;
const reviewBoxPattern = /^reviews:[1-9]\d*$/;
const dayWordPattern = /^\d{4}-\d{2}-\d{2}:.+$/u;

export function validCardLedger(value: unknown): value is CardLedger {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !isRecord(value.reviews) ||
    !isRecord(value.boxes)
  )
    return false;

  const reviews = Object.entries(value.reviews);
  if (
    !reviews.every(
      ([key, time]) => dayWordPattern.test(key) && positiveTime(time),
    )
  )
    return false;

  const milestones = Math.floor(reviews.length / cardRules.reviewsPerBox);
  const boxes = Object.entries(value.boxes);
  return (
    boxes.filter(([key]) => reviewBoxPattern.test(key)).length === milestones &&
    boxes.every(
      ([key, box]) =>
        (chapterKeyPattern.test(key) ||
          (reviewBoxPattern.test(key) &&
            Number(key.slice("reviews:".length)) <= milestones)) &&
        isRecord(box) &&
        positiveTime(box.earnedAt) &&
        (box.cardId === undefined ||
          (typeof box.cardId === "string" && cardsById.has(box.cardId))) &&
        (box.openedAt === undefined ||
          (box.cardId !== undefined && positiveTime(box.openedAt))),
    )
  );
}

export function validChapterProgress(key: string, value: unknown) {
  return (
    chapterKeyPattern.test(key.slice(chapterProgressPrefix.length)) &&
    isRecord(value) &&
    Array.isArray(value.ranges) &&
    value.ranges.every(
      (pair) =>
        Array.isArray(pair) &&
        pair.length === 2 &&
        Number.isSafeInteger(pair[0]) &&
        Number.isSafeInteger(pair[1]) &&
        pair[0] >= 0 &&
        pair[1] > pair[0],
    )
  );
}

export async function loadCards(): Promise<CardLedger> {
  return (await read("state", cardsStateKey)) ?? emptyLedger;
}

function localDateKey(now: number) {
  const date = new Date(now);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function tidyWord(word: string) {
  return word.normalize("NFKC").trim().toLowerCase().replaceAll("’", "'");
}

function grantReviewBoxes(ledger: CardLedger, now: number) {
  const count = Math.floor(
    Object.keys(ledger.reviews).length / cardRules.reviewsPerBox,
  );
  let granted = false;
  for (let milestone = 1; milestone <= count; milestone += 1) {
    const key = `reviews:${milestone}`;
    if (ledger.boxes[key]) continue;
    ledger.boxes[key] = { earnedAt: now };
    granted = true;
  }
  return granted;
}

// Called inside the same transaction that confirms the word's review grade.
export function recordReviewReward(
  state: IDBObjectStore,
  word: string,
  now: number,
  report: (ledger: CardLedger, granted: boolean) => void,
) {
  const normalized = tidyWord(word);
  if (!normalized) return;
  const request = state.get(cardsStateKey);
  request.onsuccess = () => {
    const ledger = (request.result ?? {
      version: 1,
      reviews: {},
      boxes: {},
    }) as CardLedger;
    const key = localDateKey(now) + ":" + normalized;
    if (Object.hasOwn(ledger.reviews, key)) return;
    ledger.reviews[key] = now;
    const granted = grantReviewBoxes(ledger, now);
    state.put(ledger, cardsStateKey);
    report(ledger, granted);
  };
}

// Content and chapter order give a stable identity across repeated imports.
export function chapterBoxKey(chapter: number, text: string) {
  const content = text;
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let i = 0; i < content.length; i += 1) {
    const code = content.charCodeAt(i);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  const hex = (value: number) => (value >>> 0).toString(16).padStart(8, "0");
  return `chapter:${chapter}:${content.length}:${hex(first)}${hex(second)}`;
}

function mergeRanges(ranges: Interval[], text: string): Interval[] {
  const result: Interval[] = [];
  for (const [start, end] of ranges.sort((a, b) => a[0] - b[0])) {
    const previous = result.at(-1);
    if (
      previous &&
      (start <= previous[1] || !text.slice(previous[1], start).trim())
    )
      previous[1] = Math.max(previous[1], end);
    else result.push([start, end]);
  }
  return result;
}

export async function recordChapterProgress(
  key: string,
  text: string,
  seen: Interval,
  finish: boolean,
) {
  const transaction = (await db).transaction("state", "readwrite");
  const state = transaction.objectStore("state");
  const saved = state.get(cardsStateKey);
  let result = { complete: false, granted: false };
  saved.onsuccess = () => {
    const ledger = (saved.result ?? {
      version: 1,
      reviews: {},
      boxes: {},
    }) as CardLedger;
    if (ledger.boxes[key]) {
      result = { complete: true, granted: false };
      return;
    }
    const progressKey = chapterProgressPrefix + key;
    const previous = state.get(progressKey);
    previous.onsuccess = () => {
      const ranges = mergeRanges(
        [...(previous.result?.ranges ?? []), seen],
        text,
      );
      const coverage = ranges[0];
      if (
        finish &&
        ranges.length === 1 &&
        !text.slice(0, coverage[0]).trim() &&
        !text.slice(coverage[1]).trim()
      ) {
        ledger.boxes[key] = { earnedAt: Date.now() };
        state.put(ledger, cardsStateKey);
        state.delete(progressKey);
        result = { complete: true, granted: true };
      } else state.put({ ranges }, progressKey);
    };
  };
  await committed(transaction);
  return result;
}

export function unopenedBoxes(ledger: CardLedger) {
  return Object.entries(ledger.boxes)
    .filter(([, box]) => box.openedAt === undefined)
    .sort(
      (a, b) =>
        Number(Boolean(b[1].cardId)) - Number(Boolean(a[1].cardId)) ||
        a[1].earnedAt - b[1].earnedAt,
    );
}

export function collectedCards(ledger: CardLedger) {
  const collected = new Map<string, { first: number; count: number }>();
  for (const box of Object.values(ledger.boxes)) {
    if (!box.cardId || box.openedAt === undefined) continue;
    const previous = collected.get(box.cardId);
    collected.set(box.cardId, {
      first: Math.min(previous?.first ?? box.openedAt, box.openedAt),
      count: (previous?.count ?? 0) + 1,
    });
  }
  return collected;
}

export function drawCard(ledger: CardLedger, random = Math.random) {
  const total = rarities.reduce(
    (sum, rarity) => sum + cardRules.odds[rarity],
    0,
  );
  let roll = random() * total;
  const rarity =
    rarities.find((value) => (roll -= cardRules.odds[value]) < 0) ??
    rarities[0];
  const pool = cards.filter((card) => card.rarity === rarity);
  const owned = collectedCards(ledger);
  const unseen = pool.filter((card) => !owned.has(card.id));
  const eligible = unseen.length ? unseen : pool;
  return eligible[Math.floor(random() * eligible.length)].id;
}

async function updateCards<T>(change: (ledger: CardLedger) => T) {
  const transaction = (await db).transaction("state", "readwrite");
  const state = transaction.objectStore("state");
  const saved = state.get(cardsStateKey);
  let result: T | undefined;
  let ledger: CardLedger = emptyLedger;
  saved.onsuccess = () => {
    ledger = saved.result ?? { version: 1, reviews: {}, boxes: {} };
    result = change(ledger);
    if (result !== undefined) state.put(ledger, cardsStateKey);
  };
  await committed(transaction);
  return { result, ledger };
}

export function prepareEnvelope(id: string) {
  return updateCards((ledger) => {
    if (
      !Object.hasOwn(ledger.boxes, id) ||
      ledger.boxes[id].openedAt !== undefined
    )
      return;
    const pending = unopenedBoxes(ledger).find(([, box]) => box.cardId);
    // Resume a previously prepared envelope before allocating another draw.
    const target = pending?.[0] ?? id;
    const box = ledger.boxes[target];
    box.cardId ??= drawCard(ledger);
    return target;
  });
}

export function openEnvelope(id: string) {
  return updateCards((ledger) => {
    const box = Object.hasOwn(ledger.boxes, id) ? ledger.boxes[id] : undefined;
    if (!box?.cardId || box.openedAt !== undefined) return;
    box.openedAt = Date.now();
    return box.cardId;
  });
}

export function exportCards(ledger: CardLedger) {
  return JSON.stringify(
    { type: "study-or-perish:cards", exportedAt: Date.now(), ledger },
    null,
    2,
  );
}

export function mergeCards(local: CardLedger, incoming: CardLedger) {
  for (const [key, time] of Object.entries(incoming.reviews))
    local.reviews[key] = Math.min(local.reviews[key] ?? time, time);
  for (const [key, box] of Object.entries(incoming.boxes)) {
    const current = local.boxes[key];
    if (!current) local.boxes[key] = box;
    else if (current.openedAt === undefined && box.openedAt !== undefined) {
      current.cardId ??= box.cardId;
      current.openedAt = box.openedAt;
    } else if (current.openedAt === undefined) current.cardId ??= box.cardId;
  }
  grantReviewBoxes(local, Date.now());
  return local;
}

export async function importCards(json: string) {
  const backup: unknown = JSON.parse(json);
  if (
    !isRecord(backup) ||
    backup.type !== "study-or-perish:cards" ||
    !validCardLedger(backup.ledger)
  )
    throw new Error("Invalid card backup");

  const incoming = backup.ledger;
  return (await updateCards((ledger) => mergeCards(ledger, incoming))).ledger;
}
