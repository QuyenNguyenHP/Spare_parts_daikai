import { useEffect, useId, useMemo, useRef, useState } from "react";

function drawingLabel(drawing) {
  return `Item ${drawing.item} - ${drawing.title}`;
}

export default function DrawingDropdown({ drawings, value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const menuId = useId();
  const selectedDrawing = drawings.find((drawing) => drawing.id === value);
  const filteredDrawings = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return drawings;
    return drawings.filter((drawing) => drawingLabel(drawing).toLocaleLowerCase().includes(normalizedQuery));
  }, [drawings, query]);

  useEffect(() => {
    if (!open) return undefined;
    searchRef.current?.focus();

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

  function selectDrawing(id) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="drawing-dropdown" ref={rootRef}>
      <button
        type="button"
        className="drawing-dropdown-trigger"
        aria-haspopup="listbox"
        aria-labelledby="drawing-picker-label"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selectedDrawing ? drawingLabel(selectedDrawing) : "No drawings"}</span>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" /></svg>
      </button>

      {open && (
        <div className="drawing-dropdown-popover">
          <div className="drawing-dropdown-search">
            <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="5.5" /><path d="m13 13 4 4" /></svg>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && filteredDrawings.length) selectDrawing(filteredDrawings[0].id);
              }}
              placeholder="Search item or drawing name"
              aria-label="Search item or drawing name"
            />
          </div>
          <div id={menuId} className="drawing-dropdown-menu" role="listbox" aria-label="Assembly drawings">
            {filteredDrawings.map((drawing) => {
              const selected = drawing.id === value;
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`drawing-dropdown-option ${selected ? "selected" : ""}`}
                  key={drawing.id}
                  onClick={() => selectDrawing(drawing.id)}
                >
                  <strong>Item {drawing.item} · {drawing.title}</strong>
                  {selected && <span className="drawing-dropdown-check" aria-hidden="true">✓</span>}
                </button>
              );
            })}
            {!filteredDrawings.length && <p className="drawing-dropdown-empty">No matching drawings</p>}
          </div>
        </div>
      )}
    </div>
  );
}
