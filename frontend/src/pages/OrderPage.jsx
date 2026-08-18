import { useState } from "react";

import AppButton from "../components/AppButton";
import CartItems from "../components/CartItems";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { API_URL } from "../config";

function groupItemsByDrawing(cart) {
  return Object.values(cart.reduce((groups, item) => {
    const group = groups[item.drawingId] ?? { drawingId: item.drawingId, items: [] };
    group.items.push({ item: item.item, quantity: item.quantity });
    groups[item.drawingId] = group;
    return groups;
  }, {}));
}

export default function OrderPage({
  user,
  cart,
  onBack,
  onLogout,
  onQuantityChange,
  onRemove,
  onOrderComplete,
}) {
  const [status, setStatus] = useState({ type: "ready", message: "Review parts request" });
  const [submitting, setSubmitting] = useState(false);
  const [requestIds, setRequestIds] = useState([]);
  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  async function placeOrder() {
    if (!cart.length) return;
    setSubmitting(true);
    setRequestIds([]);
    setStatus({ type: "loading", message: "Creating parts request..." });
    try {
      const requests = await Promise.all(groupItemsByDrawing(cart).map(async (group) => {
        const response = await fetch(`${API_URL}/requests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(group),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.detail ?? `API returned ${response.status}`);
        return result;
      }));
      setRequestIds(requests.map((request) => request.requestId));
      setStatus({ type: "success", message: "Parts request created successfully" });
      onOrderComplete();
    } catch (error) {
      setStatus({ type: "error", message: error.message ?? "Parts request could not be created" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <Header user={user} title="Parts Request Order" onBack={onBack} onLogout={onLogout} />
      <main className="order-page">
        <section className="order-hero">
          <p className="eyebrow">Parts request</p>
          <h2>Review and place order</h2>
          <p>Confirm the requested quantities before creating the parts request.</p>
        </section>
        {requestIds.length > 0 && (
          <section className="order-success" aria-live="polite">
            <strong>Request created</strong>
            <p>{requestIds.join(", ")}</p>
          </section>
        )}
        <div className="order-layout">
          <section className="cart-card">
            <CartItems items={cart} onQuantityChange={onQuantityChange} onRemove={onRemove} />
          </section>
          <aside className="order-summary">
            <p className="eyebrow">Order summary</p>
            <dl>
              <div><dt>Part lines</dt><dd>{cart.length}</dd></div>
              <div><dt>Total units</dt><dd>{totalUnits}</dd></div>
              <div><dt>Drawings</dt><dd>{new Set(cart.map((item) => item.drawingId)).size}</dd></div>
            </dl>
            <div className="order-summary-actions">
              <AppButton basic className="place-order-button" onClick={placeOrder} disabled={!cart.length || submitting}>
                {submitting ? "Creating request..." : "Place parts request"}
              </AppButton>
              <AppButton basic className="continue-button" onClick={onBack}>
                Continue browsing
              </AppButton>
            </div>
          </aside>
        </div>
      </main>
      <Footer status={status} />
    </div>
  );
}
