import Stack from "@mui/material/Stack";

import AppButton from "./AppButton";

export default function DrawingToolbar({
  drawings,
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
  return (
    <div className="drawing-toolbar">
      <div className="drawing-picker">
        <label htmlFor="drawing-select">Assembly drawing</label>
        <select
          id="drawing-select"
          value={drawingId}
          onChange={(event) => onDrawingChange(event.target.value)}
          disabled={!drawings.length}
        >
          {!drawings.length && <option value="">No drawings</option>}
          {drawings.map((drawing) => (
            <option key={drawing.id} value={drawing.id}>
              {drawing.model} Ch.{drawing.chapter} Item {drawing.item} - {drawing.title} ({drawing.hotspotCount})
            </option>
          ))}
        </select>
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
        <AppButton tone="neutral" className={`toolbar-button ${editing ? "active" : ""}`} onClick={onToggleEditing}>
          {editing ? "Finish editing" : "Edit hotspots"}
        </AppButton>
      </Stack>
    </div>
  );
}
