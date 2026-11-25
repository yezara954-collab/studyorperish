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
const db = new Promise<IDBDatabase>((resolve, reject) => {
  const r = indexedDB.open("vesper-archive", 1);
  r.onupgradeneeded = () => {
    for (const n of ["books", "state", "bin"]) r.result.createObjectStore(n);
  };
  r.onsuccess = () => resolve(r.result);
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
  await new Promise<void>((r, j) => {
    t.oncomplete = () => r();
    t.onerror = () => j(t.error);
    t.onabort = () => j(t.error);
  });
}
