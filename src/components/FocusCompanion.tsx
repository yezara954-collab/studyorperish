import React from "react";
import { focus, type FocusPartner } from "../config";

function Mandrake() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className="focus-art focus-mandrake"
    >
      <ellipse className="focus-pot-shadow" cx="60" cy="111" rx="36" ry="5" />
      <g className="focus-mandrake-body">
        <g className="focus-leaves">
          <path
            className="focus-leaf-fill"
            d="M61 49C47 39 29 37 26 16C41 15 52 23 58 34C58 16 70 9 86 8C88 29 75 38 64 44L64 54Z"
          />
          <path className="focus-face" d="M60 47L39 25m23 22 15-27" />
        </g>
        <path
          className="focus-root-fill"
          d="M36 68C26 55 43 41 59 42C80 40 95 57 84 72L75 96L65 104L60 92L49 99Z"
        />
        <path
          className="focus-face focus-sleep-face"
          d="M44 57q4 4 8 0m15 0q4 4 8 0M55 68q5 3 10 0"
        />
        <path className="focus-face focus-cry" d="M44 57l8-2m15 0 8 2" />
        <ellipse
          cx="60"
          cy="70"
          rx="10"
          ry="13"
          className="focus-mouth focus-cry"
        />
        <path d="M46 60l-8 16m34-16 9 16" className="focus-tears" />
      </g>
      <g className="focus-pot">
        <path className="focus-pot-fill" d="M27 81h66L84 109H36Z" />
        <path className="focus-pot-rim" d="M23 74h74v10H23Z" />
      </g>
    </svg>
  );
}
function Howler() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className="focus-art focus-howler"
    >
      <g className="focus-smoke">
        <path d="M31 38q-14-9-1-25m31 25q10-12 0-23m27 23q14-10 6-21" />
      </g>
      <g className="focus-envelope">
        <path
          className="focus-mouth focus-envelope-interior"
          d="M12 47h96v53H12z"
        />
        <g className="focus-lower-lip">
          <path d="M11 51l49 34 49-34v52H11z" />
          <path className="focus-fold" d="M12 101l30-28m66 28L78 73" />
        </g>
        <g className="focus-upper-lip">
          <path d="M11 48h98L60 83z" />
          <circle cx="60" cy="77" r="7" className="focus-seal" />
        </g>
      </g>
    </svg>
  );
}

export function FocusCompanion({
  partner,
  alert = false,
}: {
  partner: FocusPartner;
  alert?: boolean;
}) {
  const asset = focus.partners[partner];
  const path = (alert && asset.alertImage) || asset.image;
  if (path)
    return <img className="focus-art" src={path} alt="" aria-hidden="true" />;
  return partner === "howler" ? <Howler /> : <Mandrake />;
}
