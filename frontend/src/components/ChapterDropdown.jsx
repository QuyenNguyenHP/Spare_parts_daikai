import { useEffect, useId, useRef, useState } from "react";

export default function ChapterDropdown({ chapters, value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;

    function closeOnOutsideClick(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="drawing-dropdown" ref={rootRef}>
      <button
        type="button"
        className="drawing-dropdown-trigger"
        aria-haspopup="listbox"
        aria-labelledby="chapter-picker-label"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{value !== "" ? `Chapter ${value}` : "No chapters"}</span>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" /></svg>
      </button>

      {open && (
        <div className="drawing-dropdown-popover chapter-dropdown-popover">
          <div id={menuId} className="drawing-dropdown-menu" role="listbox" aria-label="Chapters">
            {chapters.map((chapter) => {
              const selected = chapter === value;
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`drawing-dropdown-option ${selected ? "selected" : ""}`}
                  key={chapter}
                  onClick={() => {
                    onChange(chapter);
                    setOpen(false);
                  }}
                >
                  <strong>Chapter {chapter}</strong>
                  {selected && <span className="drawing-dropdown-check" aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
