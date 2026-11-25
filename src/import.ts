import { unzipSync, strFromU8 } from "fflate";
import type { Book } from "./books";
function split(text: string, title: string) {
  const out: Book["chapters"] = [];
  let name = title,
    lines: string[] = [];
  function flush() {
    const text = lines.join("\n").trim();
    if (text) out.push({ title: name, text });
    lines = [];
  }
  for (const l of text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")) {
    if (
      l.length < 120 &&
      /^\s*(?:(?:chapter|book|part)\s+(?:\d+|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten|[a-z]+teen|twenty)\b|第[零〇一二三四五六七八九十百千万\d]+[章节卷]|prologue\b|epilogue\b)/i.test(
        l,
      )
    ) {
      flush();
      name = l.trim();
    } else lines.push(l);
  }
  flush();
  return out;
}
export async function importBook(file: File, art: number): Promise<Book> {
  let title = file.name.replace(/\.[^.]+$/, ""),
    author = "",
    chapters: Book["chapters"] = [];
  if (/\.txt$/i.test(file.name)) chapters = split(await file.text(), title);
  else if (/\.epub$/i.test(file.name)) {
    const z = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const xml = (path: string) =>
      new DOMParser().parseFromString(strFromU8(z[path]), "application/xml");
    const op = xml("META-INF/container.xml")
      .getElementsByTagNameNS("*", "rootfile")[0]
      .getAttribute("full-path")!;
    const pkg = xml(op);
    title = pkg.getElementsByTagNameNS("*", "title")[0]?.textContent || title;
    author = pkg.getElementsByTagNameNS("*", "creator")[0]?.textContent || "";
    const items = [...pkg.getElementsByTagNameNS("*", "item")];
    for (const ref of pkg.getElementsByTagNameNS("*", "itemref")) {
      const item = items.find((i) => i.id === ref.getAttribute("idref"));
      if (!item) continue;
      const path = decodeURIComponent(
        new URL(
          item.getAttribute("href")!,
          "https://book/" + op,
        ).pathname.slice(1),
      );
      if (!z[path]) continue;
      const doc = xml(path);
      doc.querySelectorAll("script,style,nav").forEach((n) => n.remove());
      doc
        .querySelectorAll("p,div,br,h1,h2,h3,li")
        .forEach((n) => n.after("\n"));
      const heading =
        doc.querySelector("h1,h2,h3")?.textContent?.trim() || title;
      const body = doc.getElementsByTagNameNS("*", "body")[0];
      if (body?.textContent?.trim())
        chapters.push(...split(body.textContent, heading));
    }
  }
  if (!chapters.length) throw Error();
  return { id: crypto.randomUUID(), title, author, chapters, art };
}
