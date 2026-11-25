import React from "react";

export function SwitchConfirmation({
  title,
  prompt,
  speaker,
  portrait,
  detail,
  cancelLabel,
  confirmLabel,
  cancel,
  confirm,
}: {
  title: string;
  prompt: string;
  speaker?: string;
  portrait?: React.ReactNode;
  detail?: string;
  cancelLabel: string;
  confirmLabel: string;
  cancel: () => void;
  confirm: () => void;
}) {
  return (
    <>
      <h2>{title}</h2>
      {portrait}
      {speaker && <small>{speaker}</small>}
      <p>{prompt}</p>
      {detail && <p>{detail}</p>}
      <div className="memory-tools">
        <button onClick={cancel}>{cancelLabel}</button>
        <button className="primary" onClick={confirm}>
          {confirmLabel}
        </button>
      </div>
    </>
  );
}
