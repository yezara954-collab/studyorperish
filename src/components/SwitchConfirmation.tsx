import React from "react";

export function SwitchConfirmation({
  title,
  titleId,
  prompt,
  speaker,
  stage,
  detail,
  cancelLabel,
  confirmLabel,
  cancel,
  confirm,
}: {
  title: string;
  titleId?: string;
  prompt: string;
  speaker?: string;
  stage?: (prompt: string) => React.ReactNode;
  detail?: string;
  cancelLabel: string;
  confirmLabel: string;
  cancel: () => void;
  confirm: () => void;
}) {
  return (
    <>
      <h2 id={titleId}>{title}</h2>
      {speaker && <small>{speaker}</small>}
      {stage ? stage(prompt) : <p>{prompt}</p>}
      {detail && <p>{detail}</p>}
      <div className="memory-tools switch-confirmation-actions">
        <button onClick={cancel}>{cancelLabel}</button>
        <button className="primary" onClick={confirm}>
          {confirmLabel}
        </button>
      </div>
    </>
  );
}
