import { useEffect, useState } from "react";

import Footer from "../components/Footer";
import Header from "../components/Header";
import { API_URL } from "../config";

export default function EngineSelectionPage({ user, selectedEngine, cartCount, onOpenCart, onLogout, onSelectEngine, onHome }) {
  const [engines, setEngines] = useState([]);
  const [status, setStatus] = useState({ type: "loading", message: "Loading engine types..." });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/engines`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        return response.json();
      })
      .then((data) => {
        setEngines(data);
        setStatus({ type: "ready", message: `${data.length} engine types available` });
      })
      .catch((error) => {
        if (error.name !== "AbortError") setStatus({ type: "error", message: "Engine types could not be loaded" });
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="app-shell">
      <Header user={user} cartCount={cartCount} onOpenCart={onOpenCart} onLogout={onLogout} onHome={onHome} />
      <main className="engine-selection-page">
        <div className="engine-selection-heading">
          <p className="eyebrow">Engine catalogue</p>
          <h2>Select your engine</h2>
          <p>Choose an engine type to open its interactive spare-parts drawings.</p>
        </div>

        <div className="engine-card-grid">
          {engines.map((engine) => {
            const available = engine.drawingCount > 0;
            return (
              <button
                type="button"
                className={`engine-card ${available ? "available" : "unavailable"} ${selectedEngine?.id === engine.id ? "selected" : ""}`}
                key={engine.id}
                onClick={() => available && onSelectEngine(engine)}
                disabled={!available}
              >
                <span className="engine-card-image">
                  <img src={`${API_URL}${engine.imageUrl.replace("/api", "")}`} alt={`${engine.name} engine`} />
                  <small>{selectedEngine?.id === engine.id ? "Current engine" : available ? `${engine.drawingCount} drawings` : "Coming soon"}</small>
                </span>
                <span className="engine-card-content">
                  <span><small>Engine model</small><strong>{engine.name}</strong></span>
                  <span className="engine-card-arrow" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M5 12h13M13 7l5 5-5 5" /></svg>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {status.type === "error" && <p className="engine-selection-error">{status.message}</p>}
      </main>
      <Footer status={status} />
    </div>
  );
}
