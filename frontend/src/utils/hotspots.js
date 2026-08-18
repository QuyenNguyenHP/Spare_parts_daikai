function median(values, fallback) {
  if (!values.length) return fallback;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
  return Math.round(value * 1000) / 1000;
}

export function matchingHotspotSize(hotspots, item) {
  const ocrHotspots = hotspots.filter((hotspot) => (
    hotspot.source !== "manual"
    && Number.isFinite(hotspot.width)
    && Number.isFinite(hotspot.height)
  ));
  const sameItem = ocrHotspots.filter((hotspot) => hotspot.item === item);
  const sameLength = ocrHotspots.filter((hotspot) => hotspot.item.length === item.length);
  const references = sameItem.length ? sameItem : (sameLength.length ? sameLength : ocrHotspots);
  return {
    width: median(references.map((hotspot) => hotspot.width), 2),
    height: median(references.map((hotspot) => hotspot.height), 1.5),
  };
}

export function normalizeManualHotspotSizes(hotspots) {
  return hotspots.map((hotspot) => {
    if (hotspot.source !== "manual") return hotspot;
    return { ...hotspot, ...matchingHotspotSize(hotspots, hotspot.item) };
  });
}
