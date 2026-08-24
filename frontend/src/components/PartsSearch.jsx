import { useEffect, useState } from "react";

import { API_URL } from "../config";

export default function PartsSearch({ engine, onSelectPart }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setResults([]);
      setStatus("idle");
      return undefined;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setStatus("loading");
      try {
        const params = new URLSearchParams({ q: trimmedQuery, engine: engine?.model ?? "DE18", limit: "20" });
        const response = await fetch(`${API_URL}/parts/search?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const data = await response.json();
        setResults(data.parts);
        setStatus("ready");
      } catch (error) {
        if (error.name !== "AbortError") setStatus("error");
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [engine?.model, query]);

  return (
    <section className="parts-search" aria-label="Parts catalog search">
      <label htmlFor="parts-search-input">Search parts catalog</label>
      <input
        id="parts-search-input"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Part name, part code, or drawing number"
      />
      {status === "loading" && <p className="parts-search-status">Searching...</p>}
      {status === "error" && <p className="parts-search-status error">Parts search is unavailable.</p>}
      {status === "ready" && !results.length && <p className="parts-search-status">No matching parts found.</p>}
      {!!results.length && (
        <ul className="parts-search-results">
          {results.map((part) => (
            <li key={`${part.drawingId}:${part.partNo}`}>
              <button
                type="button"
                onClick={() => onSelectPart(part)}
                title={`${part.partCode} | ${part.partName} | Qty ${part.partQuantity} | Chapter ${part.chapter}, Item ${part.item}: ${part.drawingName} | No. ${part.partNo}`}
              >
                <span><strong>{part.partCode}</strong> | {part.partName} | Qty {part.partQuantity} | Chapter {part.chapter}, Item {part.item}: {part.drawingName} | No. {part.partNo}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
