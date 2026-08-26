import Stack from "@mui/material/Stack";

import AppButton from "./AppButton";
import ChapterDropdown from "./ChapterDropdown";
import DrawingDropdown from "./DrawingDropdown";

export default function DrawingToolbar({
  drawings,
  chapters: availableChapters = [],
  drawingId,
  onDrawingChange,
  zoom,
  minZoom,
  maxZoom,
  onZoomOut,
  onZoomIn,
  onZoomReset,
  hotspotsVisible,
  onHotspotsVisibleChange,
  editing,
  onToggleEditing,
}) {
  const chapters = availableChapters.length
    ? availableChapters.map((chapter) => chapter.chapter)
    : [...new Set(drawings.map((drawing) => drawing.chapter))].sort((a, b) => Number(a) - Number(b));
  const selectedDrawing = drawings.find((drawing) => drawing.id === drawingId);
  const selectedChapter = selectedDrawing?.chapter ?? chapters[0] ?? "";
  const chapterDrawings = drawings.filter((drawing) => drawing.chapter === selectedChapter);

  return (
    <div className="drawing-toolbar">
      <div className="drawing-picker-group">
        <div className="drawing-picker chapter-picker">
          <span id="chapter-picker-label" className="drawing-picker-label">Chapter</span>
          <ChapterDropdown
            chapters={chapters}
            value={selectedChapter}
            onChange={(chapter) => {
              const firstDrawing = drawings.find((drawing) => drawing.chapter === chapter);
              if (firstDrawing) onDrawingChange(firstDrawing.id);
            }}
            disabled={!chapters.length}
          />
        </div>
        <div className="drawing-picker item-picker">
          <span id="drawing-picker-label" className="drawing-picker-label">Item &amp; drawing name</span>
          <DrawingDropdown
            value={drawingId}
            drawings={chapterDrawings}
            onChange={onDrawingChange}
            disabled={!chapterDrawings.length}
          />
        </div>
      </div>

      <Stack direction="row" spacing={1.5} className="toolbar-actions">
        <div className="zoom-controls" aria-label="Drawing zoom controls">
          <AppButton basic size="small" type="button" onClick={onZoomOut} disabled={zoom === minZoom} aria-label="Zoom out" title="Zoom out">-</AppButton>
          <AppButton basic size="small" type="button" className="zoom-value" onClick={onZoomReset} title="Reset to default zoom">{zoom}%</AppButton>
          <AppButton basic size="small" type="button" onClick={onZoomIn} disabled={zoom === maxZoom} aria-label="Zoom in" title="Zoom in">+</AppButton>
        </div>
        <label className="visibility-toggle">
          <input
            type="checkbox"
            checked={hotspotsVisible}
            onChange={(event) => onHotspotsVisibleChange(event.target.checked)}
            disabled={editing}
          />
          Show hotspots
        </label>
        <AppButton
          tone="neutral"
          className={`toolbar-button ${editing ? "active" : ""}`}
          onClick={onToggleEditing}
          sx={{
            color: "#07111f",
            background: "linear-gradient(90deg, var(--cyan), var(--blue))",
            boxShadow: "0 10px 24px rgba(47, 117, 221, .24)",
            "&:hover": {
              background: "linear-gradient(90deg, #67e8f9, #3b82f6)",
              boxShadow: "0 13px 28px rgba(47, 117, 221, .34)",
            },
          }}
        >
          {editing ? "Finish editing" : "Edit hotspots"}
        </AppButton>
      </Stack>
    </div>
  );
}
