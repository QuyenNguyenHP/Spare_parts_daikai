import { useEffect, useRef, useState } from "react";

import CalibrationBar from "../components/CalibrationBar";
import DrawingToolbar from "../components/DrawingToolbar";
import DrawingViewport from "../components/DrawingViewport";
import Footer from "../components/Footer";
import Header from "../components/Header";
import PageBody from "../components/PageBody";
import PageNavigator from "../components/PageNavigator";
import PartPanel from "../components/PartPanel";
import PartsSearch from "../components/PartsSearch";
import { API_URL, DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from "../config";
import { matchingHotspotSize, normalizeManualHotspotSizes } from "../utils/hotspots";

export default function DrawingLibraryPage({ user, engine, cartCount, onAddToCart, onOpenCart, onBackToEngines, onLogout, onHome }) {
  const [drawings, setDrawings] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [drawingId, setDrawingId] = useState("");
  const [drawing, setDrawing] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [hotspotsVisible, setHotspotsVisible] = useState(false);
  const [status, setStatus] = useState({ type: "loading", message: "Loading drawing library..." });
  const [editing, setEditing] = useState(false);
  const [selectedHotspotIndex, setSelectedHotspotIndex] = useState(null);
  const [savingHotspots, setSavingHotspots] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const dragState = useRef(null);
  const pendingSelectedItem = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadDrawings() {
      try {
        const [drawingsResponse, chaptersResponse] = await Promise.all([
          fetch(`${API_URL}/drawings`, { signal: controller.signal }),
          fetch(`${API_URL}/chapters?model=${encodeURIComponent(engine?.model ?? "DE18")}`, { signal: controller.signal }),
        ]);
        if (!drawingsResponse.ok || !chaptersResponse.ok) throw new Error("API request failed");
        const data = await drawingsResponse.json();
        setChapters(await chaptersResponse.json());
        const engineDrawings = engine ? data.filter((item) => item.model === engine.model) : data;
        setDrawings(engineDrawings);
        if (engineDrawings.length) setDrawingId(engineDrawings[0].id);
        else setStatus({ type: "ready", message: "No drawings registered" });
      } catch (error) {
        if (error.name !== "AbortError") {
          setStatus({ type: "error", message: "Cannot reach the FastAPI server" });
        }
      }
    }
    loadDrawings();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!drawingId) return undefined;
    const controller = new AbortController();
    setDrawing(null);
    setSelectedItem(null);
    setEditing(false);
    setSelectedHotspotIndex(null);
    setZoom(DEFAULT_ZOOM);
    setHotspotsVisible(false);
    setStatus({ type: "loading", message: "Loading drawing..." });

    async function loadDrawing() {
      try {
        const response = await fetch(`${API_URL}/drawings/${drawingId}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const data = await response.json();
        setDrawing({ ...data, hotspots: normalizeManualHotspotSizes(data.hotspots) });
        setSelectedItem(pendingSelectedItem.current);
        pendingSelectedItem.current = null;
        setStatus({ type: "ready", message: "Drawing ready" });
      } catch (error) {
        if (error.name !== "AbortError") {
          setStatus({ type: "error", message: "Drawing could not be loaded" });
        }
      }
    }
    loadDrawing();
    return () => controller.abort();
  }, [drawingId]);

  const selectedHotspot = drawing?.hotspots.find((hotspot) => hotspot.item === selectedItem);
  const selectedPart = selectedHotspot?.part;

  function toggleEditing() {
    setEditing((current) => {
      if (!current) setHotspotsVisible(true);
      else setSelectedHotspotIndex(null);
      return !current;
    });
  }

  function hotspotPointerDown(event, index) {
    if (!editing) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = { pointerId: event.pointerId, index };
    setSelectedHotspotIndex(index);
    setSelectedItem(drawing.hotspots[index].item);
  }

  function hotspotPointerMove(event, index) {
    if (!editing || dragState.current?.pointerId !== event.pointerId) return;
    const bounds = event.currentTarget.parentElement.getBoundingClientRect();
    const left = Math.min(100, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100));
    const top = Math.min(100, Math.max(0, ((event.clientY - bounds.top) / bounds.height) * 100));
    setDrawing((current) => ({
      ...current,
      hotspots: current.hotspots.map((hotspot, hotspotIndex) => (
        hotspotIndex === index
          ? { ...hotspot, left, top, confidence: undefined, source: "manual" }
          : hotspot
      )),
    }));
  }

  function hotspotPointerUp(event) {
    if (dragState.current?.pointerId !== event.pointerId) return;
    dragState.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function addHotspot(event) {
    if (!editing || event.target.closest(".hotspot")) return;
    const item = window.prompt("Enter the missing item label (example: 501 or A)")?.trim().toUpperCase();
    if (!item) return;
    if (!/^[A-Z0-9]+(?:\.[A-Z0-9]+)?$/.test(item)) {
      setStatus({ type: "error", message: "Item label must use letters, digits, or one decimal point" });
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const existingPart = drawing.hotspots.find((hotspot) => hotspot.item === item)?.part;
    const size = matchingHotspotSize(drawing.hotspots, item);
    const newHotspot = {
      item,
      left: ((event.clientX - bounds.left) / bounds.width) * 100,
      top: ((event.clientY - bounds.top) / bounds.height) * 100,
      width: size.width,
      height: size.height,
      source: "manual",
      part: existingPart ?? { partNumber: `TBD-${item}`, name: `PART ${item}`, quantity: 1 },
    };
    const newIndex = drawing.hotspots.length;
    setDrawing((current) => ({ ...current, hotspots: [...current.hotspots, newHotspot] }));
    setSelectedHotspotIndex(newIndex);
    setSelectedItem(item);
    setStatus({ type: "ready", message: `Item ${item} added; save positions when finished` });
  }

  function deleteSelectedHotspot() {
    if (selectedHotspotIndex === null) return;
    const removedItem = drawing.hotspots[selectedHotspotIndex].item;
    setDrawing((current) => ({
      ...current,
      hotspots: current.hotspots.filter((_, index) => index !== selectedHotspotIndex),
    }));
    setSelectedHotspotIndex(null);
    setSelectedItem(null);
    setStatus({ type: "ready", message: `Item ${removedItem} hotspot removed; save to confirm` });
  }

  async function saveHotspots() {
    setSavingHotspots(true);
    setStatus({ type: "loading", message: "Saving hotspot positions..." });
    try {
      const hotspots = drawing.hotspots.map(({ part, ...hotspot }) => hotspot);
      const response = await fetch(`${API_URL}/drawings/${drawingId}/hotspots`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotspots }),
      });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const result = await response.json();
      setStatus({ type: "success", message: `${result.hotspotCount} hotspot positions saved` });
    } catch {
      setStatus({ type: "error", message: "Hotspot positions could not be saved" });
    } finally {
      setSavingHotspots(false);
    }
  }

  function addToCart() {
    if (!selectedPart) return;
    onAddToCart({
      key: `${drawingId}:${selectedItem}`,
      drawingId,
      drawingLabel: `Chapter ${drawing.chapter} / Item ${drawing.item} - ${drawing.title}`,
      item: selectedItem,
      partNumber: selectedPart.partNumber,
      name: selectedPart.name,
      quantity: selectedPart.quantity,
    });
    setStatus({ type: "success", message: `Item ${selectedItem} added to parts cart` });
  }

  function selectSearchResult(part) {
    if (part.drawingId === drawingId) {
      setSelectedItem(part.partNo);
      return;
    }
    pendingSelectedItem.current = part.partNo;
    setDrawingId(part.drawingId);
    setStatus({ type: "ready", message: `Showing ${part.partName} on its drawing` });
  }

  return (
    <div className="app-shell">
      <Header
        user={user}
        title={`${engine?.name ?? "Engine"} Drawing Library`}
        cartCount={cartCount}
        onOpenCart={onOpenCart}
        onBack={onBackToEngines}
        backLabel="Back to engine selection"
        onLogout={onLogout}
        onHome={onHome}
      />
      <PageBody
        navigator={(
          <PageNavigator
            currentPage="library"
            engine={engine}
            cartCount={cartCount}
            onNavigate={{ order: onOpenCart }}
          />
        )}
      >
        <PartsSearch engine={engine} onSelectPart={selectSearchResult} />
        <main className="workspace">
          <div className="drawing-card">
          <DrawingToolbar
            drawings={drawings}
            chapters={chapters}
            drawingId={drawingId}
            onDrawingChange={setDrawingId}
            zoom={zoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            onZoomOut={() => setZoom((current) => Math.max(MIN_ZOOM, current - ZOOM_STEP))}
            onZoomIn={() => setZoom((current) => Math.min(MAX_ZOOM, current + ZOOM_STEP))}
            onZoomReset={() => setZoom(DEFAULT_ZOOM)}
            hotspotsVisible={hotspotsVisible}
            onHotspotsVisibleChange={setHotspotsVisible}
            editing={editing}
            onToggleEditing={toggleEditing}
          />
          {editing && (
            <CalibrationBar
              selected={selectedHotspotIndex !== null}
              saving={savingHotspots}
              onDelete={deleteSelectedHotspot}
              onSave={saveHotspots}
            />
          )}
          <DrawingViewport
            drawing={drawing}
            loading={status.type === "loading"}
            zoom={zoom}
            hotspotsVisible={hotspotsVisible}
            editing={editing}
            selectedItem={selectedItem}
            selectedHotspotIndex={selectedHotspotIndex}
            onAddHotspot={addHotspot}
            onHotspotClick={(item, index) => {
              setSelectedItem(item);
              if (editing) setSelectedHotspotIndex(index);
            }}
            onHotspotPointerDown={hotspotPointerDown}
            onHotspotPointerMove={hotspotPointerMove}
            onHotspotPointerUp={hotspotPointerUp}
          />
          </div>
          <PartPanel
            drawing={drawing}
            selectedItem={selectedItem}
            selectedPart={selectedPart}
            onAddToCart={addToCart}
          />
        </main>
      </PageBody>
      <Footer status={status} />
    </div>
  );
}
