import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MessageKey, Translate } from "../i18n";
import { deviceUsesTouchTabs } from "../navigation";
import { Icon, Sigil } from "./Icons";
import "./appNavigation.css";
import {shelfAsset} from "./ShelfScene";

const sections = [
  { id: "shelf", icon: "shelf", name: "bookshelf", short: "navShelf" },
  {
    id: "bin",
    icon: "bin",
    name: "trashBin",
    short: "navWords",
    badge: "navWordCount",
  },
  { id: "notebook", icon: "notebook", name: "notebook", short: "navNotebook" },
  {
    id: "cards",
    icon: "cards",
    name: "cardsNav",
    short: "cardsNav",
    badge: "cardsUnopenedCount",
  },
  {
    id: "newspaper",
    icon: "newspaper",
    name: "literaryNav",
    short: "navReflections",
    badge: "literaryCount",
  },
  { id: "settings", icon: "settings", name: "settings", short: "settings" },
] as const satisfies readonly {
  id: string;
  icon: string;
  name: MessageKey;
  short: MessageKey;
  badge?: MessageKey;
}[];

type Section = (typeof sections)[number];
type Props = {
  t: Translate;
  active: string;
  counts: Partial<Record<Section["id"], number>>;
  choose: (id: Section["id"]) => void;
};

export function useTouchTabs() {
  const [touch, setTouch] = useState(deviceUsesTouchTabs);
  useEffect(() => {
    const media = matchMedia("(hover: none) and (pointer: coarse)");
    const update = () => setTouch(deviceUsesTouchTabs());
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return touch;
}

function Label({
  item,
  count,
  touch,
  t,
}: {
  item: Section;
  count: number;
  touch?: boolean;
  t: Translate;
}) {
  return (
    <>
      {touch ? <img className="tab-art" alt="" src={shelfAsset("icon-"+({bin:"words",newspaper:"writing"}[item.id as string] ?? item.id)+".svg")}/> : <Icon name={item.icon} />}
      <span className="nav-entry-label">
        {t(touch ? item.short : item.name)}
      </span>
      {count > 0 && (
        <span className="nav-count" aria-hidden="true">
          {touch && count > 999 ? "999+" : count}
        </span>
      )}
    </>
  );
}

function Link({
  item,
  t,
  active,
  counts,
  choose,
  touch,
}: Props & { item: Section; touch?: boolean }) {
  const count = counts[item.id] ?? 0;
  const name = t(touch ? item.short : item.name);
  const fullName = touch && item.id === "newspaper" ? t(item.name) : name;
  const badge =
    count && "badge" in item
      ? t(item.badge).replace("{count}", String(count))
      : "";
  return (
    <button
      type="button"
      className="nav-entry"
      aria-current={active === item.id ? "page" : undefined}
      aria-label={badge ? `${name} · ${badge}` : name}
      title={fullName}
      data-literary-shelf={item.id === "newspaper" ? "" : undefined}
      onClick={() => choose(item.id)}
    >
      <Label item={item} count={count} touch={touch} t={t} />
    </button>
  );
}

export function BottomNavigation(props: Props) {
  return (
    <nav className="bottom-navigation" aria-label={props.t("navPrimary")}>
      {sections.map((item) => (
        <Link key={item.id} {...props} item={item} touch />
      ))}
    </nav>
  );
}

export function SiteMasthead({ touch, ...props }: Props & { touch: boolean }) {
  return (
    <header className="site-masthead" data-touch={touch}>
      <div className="mast">
        <div className="brand">
          {!touch && <Sigil />}
          <span>{props.t("brand")}</span>
        </div>
        {!touch && <DesktopNavigation {...props} />}
      </div>
    </header>
  );
}

function DesktopNavigation(props: Props) {
  const { counts, t, active, choose } = props;
  const nav = useRef<HTMLElement>(null);
  const probe = useRef<HTMLDivElement>(null);
  const more = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const hidden = sections.slice(visible);
  const foldedActive = hidden.some((item) => item.id === active);
  useLayoutEffect(() => {
    const node = nav.current!;
    const metrics = probe.current!;
    function measure() {
      const widths = Array.from(
        metrics.children,
        (element) => element.getBoundingClientRect().width,
      );
      const gap = Number.parseFloat(getComputedStyle(metrics).columnGap) || 0;
      const allowed = Math.floor(node.getBoundingClientRect().width);
      if (
        widths
          .slice(0, sections.length)
          .reduce((sum, width) => sum + width, 0) +
          gap * (sections.length - 1) <=
        allowed
      ) {
        setVisible(sections.length);
        return;
      }
      let used = widths[sections.length];
      let count = 0;
      while (count < sections.length && used + widths[count] + gap <= allowed) {
        used += widths[count] + gap;
        count++;
      }
      setVisible(count);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    observer.observe(metrics);
    for (const item of metrics.children) observer.observe(item);
    measure();
    return () => observer.disconnect();
  }, [t("brand"), t("navMore"), counts.bin, counts.cards, counts.newspaper]);

  useEffect(() => {
    if (!expanded) return;
    function outside(event: PointerEvent) {
      if (!nav.current?.contains(event.target as Node)) setExpanded(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExpanded(false);
        more.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [expanded]);

  return (
    <nav className="desktop-navigation" ref={nav} aria-label={t("navPrimary")}>
      <div className="nav-probe" ref={probe} aria-hidden="true">
        {sections.map((item) => (
          <span key={item.id} className="nav-entry">
            <Label item={item} count={counts[item.id] ?? 0} t={t} />
          </span>
        ))}
        <span className="nav-entry">
          <Icon name="more" />
          {t("navMore")}
        </span>
      </div>
      {sections.slice(0, visible).map((item) => (
        <Link key={item.id} {...props} item={item} />
      ))}
      {hidden.length > 0 && (
        <div className="nav-overflow">
          <button
            ref={more}
            type="button"
            className="nav-entry nav-more"
            aria-expanded={expanded}
            aria-controls={expanded ? "nav-overflow-links" : undefined}
            data-folded-active={foldedActive}
            data-literary-shelf={
              hidden.some((item) => item.id === "newspaper") ? "" : undefined
            }
            onClick={() => setExpanded(!expanded)}
          >
            <Icon name="more" />
            {t("navMore")}
          </button>
          {expanded && (
            <div className="nav-overflow-links" id="nav-overflow-links">
              {hidden.map((item) => (
                <Link
                  key={item.id}
                  {...props}
                  item={item}
                  choose={(id) => {
                    setExpanded(false);
                    more.current?.focus();
                    choose(id);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
