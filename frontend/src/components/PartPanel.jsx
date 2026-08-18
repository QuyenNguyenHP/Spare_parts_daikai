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
          <div className="part-code-row">
            <span className="part-field-label">Parts code</span>
            <strong className="part-primary-value">{selectedPart.partNumber}</strong>
          </div>
          <p className="part-field-label part-name-label">Name of parts</p>
          <h2 className="part-primary-value">{selectedPart.name}</h2>
          <dl className="part-details">
            <div>
              <dt>Drawing</dt>
              <dd className="drawing-reference">
                <span>Chapter {drawing.chapter} / Item {drawing.item}</span>
                <span>{drawing.title}</span>
              </dd>
            </div>
            <div><dt>Number</dt><dd>{selectedItem}</dd></div>
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
            } : {
              color: "#07111f",
              background: "linear-gradient(90deg, var(--cyan), var(--blue))",
              boxShadow: "0 13px 30px rgba(47, 117, 221, .28)",
              "&:hover": {
                background: "linear-gradient(90deg, #67e8f9, #3b82f6)",
                boxShadow: "0 16px 34px rgba(47, 117, 221, .38)",
              },
            }}
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
