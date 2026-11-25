import React from "react";
import { iconPaths, sigilPaths } from "../config";
export function Sigil() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 60 60"
      fill="none"
      stroke="currentColor"
    >
      {sigilPaths.map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
export function Icon({ name }: { name: string }) {
  return (
    <svg
      className="icon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}
