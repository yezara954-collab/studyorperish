import { samples } from "./catalog";
export type Book = {
  id: string;
  title: string;
  author: string;
  art: number;
  chapters: { title: string; text: string }[];
};
export const starters: Book[] = samples.map(
  ([title, author, a, b, c, d], i) => ({
    id: "original" + i,
    title,
    author,
    art: i,
    chapters: [
      { title: a, text: b },
      { title: c, text: d },
    ],
  }),
);
export const stores = [
  "books",
  "state",
  "bin",
  "strokes",
  "highlights",
] as const;
export const db = new Promise<IDBDatabase>((resolve, reject) => {
  const r = indexedDB.open("vesper-archive", 3);
  r.onupgradeneeded = () => {
    for (const name of stores) {
      if (!r.result.objectStoreNames.contains(name))
        r.result.createObjectStore(name);
    }
    if (r.result.objectStoreNames.contains("annotations")) {
      const transaction = r.transaction!;
      const request = transaction.objectStore("annotations").openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const target =
            cursor.value.kind === "highlight" ? "highlights" : "strokes";
          transaction.objectStore(target).put(cursor.value, cursor.key);
          cursor.continue();
        } else {
          r.result.deleteObjectStore("annotations");
        }
      };
    }
  };
  r.onsuccess = () => {
    r.result.onversionchange = () => r.result.close();
    resolve(r.result);
  };
  r.onerror = () => reject(r.error);
});
export async function read(store: string, key?: string) {
  const t = (await db).transaction(store).objectStore(store);
  return new Promise<any>((res, rej) => {
    const r = key ? t.get(key) : t.getAll();
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function save(store: string, key: string, value: any) {
  const t = (await db).transaction(store, "readwrite");
  t.objectStore(store).put(value, key);
  await committed(t);
}
export function committed(t: IDBTransaction) {
  return new Promise<void>((r, j) => {
    t.oncomplete = () => r();
    t.onerror = () => j(t.error);
    t.onabort = () => j(t.error);
  });
}
