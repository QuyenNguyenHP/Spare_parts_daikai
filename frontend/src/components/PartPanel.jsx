import { useEffect, useState } from "react";

import AppButton from "./AppButton";

export default function PartPanel({ drawing, selectedItem, selectedPart, onAddToCart }) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setAdded(false);
  }, [drawing?.id, selectedItem]);

  function handleAddToCart() {
    onAddToCart();
    setAdded(true);
  }

  return (
    <aside className={`part-panel ${selectedPart ? "has-selection" : ""}`} aria-live="polite">
      <p className="eyebrow">Selected part</p>
      {selectedPart ? (
        <>
          <div className="item-badge">Item {selectedItem}</div>
          <h2>{selectedPart.name}</h2>
          <dl className="part-details">
            <div><dt>Drawing</dt><dd>{drawing.model} / {drawing.chapter} / {drawing.item}</dd></div>
            <div><dt>Parts code</dt><dd>{selectedPart.partNumber}</dd></div>
            <div><dt>Quantity</dt><dd>{selectedPart.quantity}</dd></div>
          </dl>
          <p className="part-note">
            {selectedPart.note ?? "This item is ready to add to a parts request."}
          </p>
          <AppButton
            className={`request-button ${added ? "added" : ""}`}
            onClick={handleAddToCart}
            disabled={added}
            sx={added ? {
              "&.Mui-disabled": {
                color: "#d1fae5",
                background: "linear-gradient(135deg, #059669, #047857)",
                boxShadow: "0 13px 30px rgba(5, 150, 105, 0.24)",
              },
            } : undefined}
          >
            {added && <span className="added-check" aria-hidden="true" />}
            {added ? "Added to Parts Request" : "Add to Parts Request"}
          </AppButton>
        </>
      ) : (
        <div className="empty-state">
          <p>Select a highlighted part number on the active drawing to see its details.</p>
        </div>
      )}
    </aside>
  );
}
