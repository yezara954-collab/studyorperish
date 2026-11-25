import React from "react";
import { companionIds, roles } from "../companions";
import { companionStates } from "../companions/states";
import type { CompanionSettings as Settings } from "../companions/types";
import type { Translate } from "../i18n";

export function CompanionSettings({
  settings,
  change,
  t,
}: {
  settings: Settings;
  change: (value: Settings) => void;
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
        </select>
      </label>
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
