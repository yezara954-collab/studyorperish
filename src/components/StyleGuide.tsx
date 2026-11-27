import type { CSSProperties } from "react";
import type {Translate} from "../i18n";
import {bindings,shelfAsset} from "./ShelfScene";
export function StyleGuide({t,back}:{t:Translate;back:()=>void}){
 const statuses=["unread","reading","finished"];
 const titles=["guideShort","guideLong","guideChinese"] as const;
 return <div className="folio-guide folio-panel"><h2>{t("styleGuide")}</h2>
 <section><h3>{t("guidePalette")}</h3><div className="folio-swatches">{["night","indigo","gold","paper","wood","ink","danger"].map(key=><code key={key} style={{"--swatch":"var(--folio-"+key+")"} as CSSProperties}>{key}</code>)}</div></section>
 <section><h3>{t("guideControls")}</h3><button className="folio-primary">{t("importBook")}</button> <button className="folio-secondary">{t("cancelAction")}</button> <button className="folio-danger">{t("shelfRemove")}</button> <span className="folio-badge">4</span> <span className="folio-tip">{t("guideShort")}</span></section>
 <div className="folio-panel"><button className="folio-tab" aria-current="page">{t("navShelf")}</button><button className="folio-tab">{t("navWords")}</button></div>
 <section><h3>{t("guideBindings")}</h3><div className="folio-specimens folio-frame">{bindings.flatMap((name,index)=>statuses.map((status,i)=><div key={name+status} className="book-spine" style={{"--spine-skin":`url(${shelfAsset("spine-texture-"+name+".webp")})`,"--spine-leather":"var(--folio-wood)"} as CSSProperties}><span className="book-spine-title">{t(titles[(index+i)%3])}</span><i className="book-ribbon" data-status={status}/></div>))}</div></section>
 <section className="folio-panel"><h3>{t("guideDialog")}</h3><p>{t("shelfRemoveConfirm").replace("{title}",t("guideShort"))}</p><button className="folio-secondary">{t("cancelAction")}</button></section><button onClick={back}>{t("settings")}</button></div>;
}
