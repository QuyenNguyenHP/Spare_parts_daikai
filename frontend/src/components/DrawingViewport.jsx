import { assetUrl, DEFAULT_ZOOM } from "../config";

export default function DrawingViewport({
  drawing,
  loading = false,
  zoom,
  hotspotsVisible,
  editing,
  selectedItem,
  selectedHotspotIndex,
  onAddHotspot,
  onHotspotClick,
  onHotspotPointerDown,
  onHotspotPointerMove,
  onHotspotPointerUp,
}) {
  if (!drawing) {
    return (
      <div className="drawing-loading" role={loading ? "status" : undefined} aria-live={loading ? "polite" : undefined}>
        {loading ? (
          <>
            <span className="loading-spinner" aria-hidden="true" />
            <span>Loading drawing...</span>
          </>
        ) : "Select or register a drawing to begin."}
      </div>
    );
  }

  return (
    <div
      className="drawing-viewport"
      style={{ aspectRatio: `${drawing.width} / ${drawing.height * (DEFAULT_ZOOM / 100)}` }}
    >
      <div
        className={`drawing ${hotspotsVisible ? "show-hotspots" : ""} ${editing ? "editing" : ""}`}
        style={{ width: `${zoom}%`, "--zoom-factor": zoom / 100 }}
        onDoubleClick={onAddHotspot}
      >
        <img src={assetUrl(drawing.imageUrl)} alt={`${drawing.title} technical drawing`} draggable="false" />
        {drawing.hotspots.map((hotspot, index) => (
          <button
            key={`${hotspot.item}-${index}`}
            className={`hotspot ${selectedItem === hotspot.item ? "active" : ""} ${selectedHotspotIndex === index ? "editing-selected" : ""}`}
            style={{
              left: `${hotspot.left}%`,
              top: `${hotspot.top}%`,
              width: `${hotspot.width ?? 2}%`,
              height: `${hotspot.height ?? 1.5}%`,
            }}
            onClick={() => onHotspotClick(hotspot.item, index)}
            onPointerDown={(event) => onHotspotPointerDown(event, index)}
            onPointerMove={(event) => onHotspotPointerMove(event, index)}
            onPointerUp={onHotspotPointerUp}
            onPointerCancel={onHotspotPointerUp}
            aria-label={`Show item ${hotspot.item}, ${hotspot.part?.name ?? "part name unavailable"}`}
            aria-pressed={selectedItem === hotspot.item}
            data-tooltip={hotspot.part?.name ?? "Part name unavailable"}
          >
            <span>{hotspot.item}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
