export type Book = {
  id: string;
  title: string;
  author: string;
  art: number;
  chapters: { title: string; text: string }[];
};
const samples = [
  [
    "The Midnight Herbarium",
    "Elinor Vale",
    "The Night Garden",
    "At dusk, the garden gate opened without a sound. Beneath the arch, a silver fern unfolded one leaf at a time. I set the lantern beside its roots and opened my notebook.",
    "The Glass House",
    "The glass was warm beneath my palm. Beyond it, a small white flower turned slowly toward the moon.",
  ],
  [
    "A Celestial Atlas",
    "Aurelia Finch",
    "The Northern Sky",
    "When the last candle went out, the stars appeared above the tower. A brass compass lay open on the table. Its needle pointed toward a constellation missing from every chart.",
    "The Lost Star",
    "I traced the empty patch of sky with a finger. Somewhere beyond the clouds a small light answered.",
  ],
  [
    "The Book of Moths",
    "Silas Wren",
    "A Visitor at the Window",
    "A pale moth rested on the window frame. Its wings carried a pattern like the branches of a winter tree. I lifted the curtain and waited for the visitor to stir.",
    "Wings of Amber",
    "By morning the moth had vanished. A single grain of amber dust remained upon the sill.",
  ],
];
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
