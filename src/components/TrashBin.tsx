import React from "react";
import type { Library } from "../useLibrary";
import { Review } from "./Review";
export function TrashBin(
  props: Pick<Library, "bin" | "t" | "reviewWord" | "reviewProgress" | "prefs">,
) {
  const { bin, t } = props;
  return (
    <>
      {bin.length > 0 && <Review {...props} />}
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
              <small>
                {t("reviewsCompleted")} {w.review?.count ?? 0}
              </small>
            </div>
          ))
        )}
      </section>
    </>
  );
}
