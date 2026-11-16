import React from "react";

const DIACRITICS = ["ă", "â", "î", "ș", "ț"] as const;

export function RomanianDiacriticsBar({
  onInsert,
}: {
  onInsert: (ch: string) => void;
}) {
  return (
    <div className="diacritics-bar no-print" aria-label="Romanian characters">
      <span className="small muted-inline">Romanian letters:</span>
      {DIACRITICS.map((ch) => (
        <button
          key={ch}
          type="button"
          className="chip-btn"
          onMouseDown={(e) => {
            e.preventDefault();
            onInsert(ch);
          }}
        >
          {ch}
        </button>
      ))}
    </div>
  );
}
