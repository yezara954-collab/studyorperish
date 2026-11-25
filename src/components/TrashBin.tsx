import React from "react";
import type { Library } from "../useLibrary";
export function TrashBin({ bin, t }: Pick<Library, "bin" | "t">) {
  return (
    <section className="binlist">
      {!bin.length ? (
        <p>{t("yourBinIsEmptyOpenABookAndTapAWordToCollectIt")}</p>
      ) : (
        bin.map((w) => (
          <div key={w.w}>
            <h2>{w.w}</h2>
            <p>{w.entry?.[2]}</p>
            <i>{w.example}</i>
            <small>{w.source}</small>
          </div>
        ))
      )}
    </section>
  );
}
