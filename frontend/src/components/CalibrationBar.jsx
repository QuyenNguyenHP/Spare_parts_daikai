import AppButton from "./AppButton";

export default function CalibrationBar({ selected, saving, onDelete, onSave }) {
  return (
    <div className="calibration-bar">
      <p>Drag a hotspot to align it. Double-click the drawing to add a missing item.</p>
      <AppButton tone="danger" className="toolbar-button danger" onClick={onDelete} disabled={!selected}>
        Delete selected
      </AppButton>
      <AppButton className="toolbar-button save" onClick={onSave} disabled={saving}>
        {saving ? "Saving..." : "Save positions"}
      </AppButton>
    </div>
  );
}
