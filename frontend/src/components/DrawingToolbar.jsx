import Stack from "@mui/material/Stack";

import AppButton from "./AppButton";
import ChapterDropdown from "./ChapterDropdown";
import DrawingDropdown from "./DrawingDropdown";
import MainItemDropdown from "./MainItemDropdown";

export default function DrawingToolbar({
  drawings,
  chapters: availableChapters = [],
  drawingId,
  onDrawingChange,
  hotspotsVisible,
  onHotspotsVisibleChange,
  canEditHotspots,
  editing,
  onToggleEditing,
}) {
  const chapters = availableChapters.length
    ? availableChapters.map((chapter) => chapter.chapter)
    : [...new Set(drawings.map((drawing) => drawing.chapter))].sort((a, b) => Number(a) - Number(b));
  const selectedDrawing = drawings.find((drawing) => drawing.id === drawingId);
  const selectedChapter = selectedDrawing?.chapter ?? chapters[0] ?? "";
  const selectedChapterManifest = availableChapters.find((chapter) => chapter.chapter === selectedChapter);
  const chapterDrawings = drawings.filter((drawing) => drawing.chapter === selectedChapter);
  const mainItems = (selectedChapterManifest?.items ?? [])
    .filter((item) => !item.item.includes("."))
    .filter((item) => chapterDrawings.some((drawing) => drawing.item === item.item || drawing.item.startsWith(`${item.item}.`)));
  const selectedMainItem = selectedDrawing?.item.split(".")[0] ?? "";
  const mainItemDrawings = chapterDrawings.filter((drawing) => (
    drawing.item === selectedMainItem || drawing.item.startsWith(`${selectedMainItem}.`)
  ));

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
          <span id="main-item-picker-label" className="drawing-picker-label">Main item</span>
          <MainItemDropdown
            items={mainItems}
            value={selectedMainItem}
            onChange={(item) => {
              const firstDrawing = chapterDrawings.find((drawing) => drawing.item === item || drawing.item.startsWith(`${item}.`));
              if (firstDrawing) onDrawingChange(firstDrawing.id);
            }}
            disabled={!mainItems.length}
          />
        </div>
        <div className="drawing-picker item-picker">
          <span id="drawing-picker-label" className="drawing-picker-label">Item &amp; drawing name</span>
          <DrawingDropdown
            value={drawingId}
            drawings={mainItemDrawings}
            onChange={onDrawingChange}
            disabled={!chapterDrawings.length}
          />
        </div>
      </div>

      {canEditHotspots && (
        <Stack direction="row" spacing={1.5} className="toolbar-actions">
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
      )}
    </div>
  );
}
