import React from "react";
import { companionIds, roles } from "../companions";
import { companionStates } from "../companions/states";
import {
  lineStates,
  companionScales,
  type CompanionSettings as Settings,
  type LineState,
} from "../companions/types";
import type { Translate } from "../i18n";

export function CompanionSettings({
  settings,
  change,
  hidden,
  t,
}: {
  settings: Settings;
  change: (value: Settings) => void;
  hidden: boolean;
  t: Translate;
}) {
  return (
    <fieldset className="companion-settings">
      <legend>{t("companionSection")}</legend>
      <label>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(event) =>
            change({ ...settings, enabled: event.target.checked })
          }
        />{" "}
        {t("companionEnabled")}
      </label>
      <label>
        {t("companionMode")}{" "}
        <select
          value={settings.mode}
          onChange={(event) =>
            change({
              ...settings,
              mode: event.target.value as Settings["mode"],
            })
          }
        >
          <option value="rotate">{t("companionRotate")}</option>
          <option value="fixed">{t("companionFixed")}</option>
        </select>
      </label>
      {settings.mode === "fixed" && (
        <label>
          {t("companionSection")}{" "}
          <select
            value={settings.fixed}
            onChange={(event) =>
              change({
                ...settings,
                fixed: event.target.value as Settings["fixed"],
              })
            }
          >
            {companionIds.map((id) => (
              <option key={id} value={id}>
                {t(roles[id].displayName)}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        {t("companionPosition")}{" "}
        <select
          value={settings.position}
          onChange={(event) =>
            change({
              ...settings,
              position: event.target.value as Settings["position"],
            })
          }
        >
          <option value="top">{t("companionTop")}</option>
          <option value="bottom">{t("companionBottom")}</option>
          <option value="topLeft">{t("companionTopLeft")}</option>
          <option value="bottomLeft">{t("companionBottomLeft")}</option>
        </select>
      </label>
      <label>
        {t("companionScale")}{" "}
        <select
          aria-label={t("companionScale")}
          value={settings.scale}
          onChange={(event) =>
            change({
              ...settings,
              scale: event.target.value as Settings["scale"],
            })
          }
        >
          {companionScales.map((scale) => (
            <option key={scale} value={scale}>
              {t(scale)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={!settings.enabled}
        onClick={() =>
          change({
            ...settings,
            hiddenUntil: hidden ? 0 : Date.now() + companionStates.hideMs,
          })
        }
      >
        {t(hidden ? "companionShow" : "companionHide")}
      </button>
      <label>
        <input
          type="checkbox"
          checked={settings.focus}
          onChange={(event) =>
            change({ ...settings, focus: event.target.checked })
          }
        />{" "}
        {t("companionFocus")}
      </label>
      <label>
        {t("companionUser")}{" "}
        <input
          type="text"
          maxLength={companionStates.nameLimit}
          value={settings.userName}
          onChange={(event) =>
            change({ ...settings, userName: event.target.value })
          }
        />
      </label>
    </fieldset>
  );
}

export function CompanionDeveloper({
  settings,
  change,
  available,
  preview,
  t,
}: {
  settings: Settings;
  change: (value: Settings) => void;
  available: boolean;
  preview: (cue: LineState) => void;
  t: Translate;
}) {
  const [selected, setSelected] = React.useState<LineState>("reading");
  const options = settings.focus
    ? (["reading", "sleeping"] as const)
    : lineStates;
  const cue = options.some((value) => value === selected)
    ? selected
    : "reading";
  return (
    <fieldset className="companion-settings">
      <legend>{t("developerPreview")}</legend>
      <label>
        <input
          type="checkbox"
          checked={settings.preview}
          onChange={(event) =>
            change({ ...settings, preview: event.target.checked })
          }
        />{" "}
        {t("developerPreviewEnable")}
      </label>
      {settings.preview && (
        <>
          <label>
            {t("companionPreviewState")}{" "}
            <select
              aria-label={t("companionPreviewState")}
              value={cue}
              disabled={!available}
              onChange={(event) => setSelected(event.target.value as LineState)}
            >
              {options.map((item) => (
                <option key={item} value={item}>
                  {t(`companionState_${item}`)}
                </option>
              ))}
            </select>
          </label>
          <button disabled={!available} onClick={() => preview(cue)}>
            {t("companionPreview")}
          </button>
          {!available && <small>{t("developerPreviewOpenBook")}</small>}
        </>
      )}
    </fieldset>
  );
}
