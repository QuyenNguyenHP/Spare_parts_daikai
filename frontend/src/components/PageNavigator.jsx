import AppButton from "./AppButton";
import { assetUrl } from "../config";

const NAV_ITEMS = [
  { id: "library", step: "01", label: "Drawing Library" },
  { id: "order", step: "02", label: "Parts Cart" },
  { id: "request-details", step: "03", label: "Customer Details" },
];

export default function PageNavigator({ currentPage, engine, cartCount = 0, onNavigate }) {
  return (
    <nav className="page-navigator" aria-label="Parts request workflow">
      <div className="navigator-heading">
        <p className="eyebrow">Navigator</p>
        <h2>Request workflow</h2>
      </div>
      {engine && (
        <div className="navigator-engine" aria-label={`Selected engine: ${engine.name}`}>
          <img src={assetUrl(engine.imageUrl)} alt="" />
          <span><small>Selected engine</small><strong>{engine.name}</strong></span>
        </div>
      )}
      <div className="navigator-links">
        {NAV_ITEMS.map((item) => {
          const active = currentPage === item.id;
          const disabled = active || !onNavigate?.[item.id];
          return (
            <AppButton
              basic
              key={item.id}
              className={`navigator-link ${active ? "active" : ""}`}
              onClick={onNavigate?.[item.id]}
              disabled={disabled || active}
              aria-current={active ? "page" : undefined}
            >
              <span>{item.step}</span>
              <strong>{item.label}</strong>
              {item.id === "order" && cartCount > 0 && <small>{cartCount}</small>}
            </AppButton>
          );
        })}
      </div>
      <p className="navigator-note">Follow each step to prepare and submit a complete parts request.</p>
    </nav>
  );
}
