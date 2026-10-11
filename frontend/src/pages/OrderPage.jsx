import { useEffect, useState } from "react";

import AppButton from "../components/AppButton";
import CartItems from "../components/CartItems";
import Footer from "../components/Footer";
import Header from "../components/Header";
import PageBody from "../components/PageBody";
import PageNavigator from "../components/PageNavigator";

export default function OrderPage({
  user,
  engine,
  cart,
  onBack,
  onAdmin,
  onChangePassword,
  onLogout,
  onHome,
  onQuantityChange,
  onRemove,
  onOpenDrawing,
  onSaveOrder,
  onProceed,
}) {
  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  const [status, setStatus] = useState({ type: "ready", message: "Review parts request" });
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState("");

  useEffect(() => {
    if (!savedNotice) return undefined;
    const timeout = window.setTimeout(() => setSavedNotice(""), 4500);
    return () => window.clearTimeout(timeout);
  }, [savedNotice]);

  async function saveOrder() {
    if (!cart.length || saving) return;
    setSaving(true);
    setStatus({ type: "loading", message: "Saving order..." });
    try {
      const result = await onSaveOrder();
      const savedTime = new Date(result.savedAt).toLocaleString();
      setStatus({ type: "success", message: `Order saved at ${savedTime}` });
      setSavedNotice(savedTime);
    } catch (error) {
      setStatus({ type: "error", message: error.message ?? "Order could not be saved" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <Header user={user} title="Parts Request Order" onBack={onBack} onAdmin={onAdmin} onChangePassword={onChangePassword} onLogout={onLogout} onHome={onHome} />
      <PageBody
        navigator={(
          <PageNavigator
            currentPage="order"
            engine={engine}
            cartCount={cart.length}
            onNavigate={{ library: onBack, "request-details": cart.length ? onProceed : undefined }}
          />
        )}
      >
        <main className="order-page">
          <section className="order-hero">
            <p className="eyebrow">Parts request</p>
            <h2>Review and place order</h2>
            <p>Confirm the requested quantities before creating the parts request.</p>
          </section>
          <div className="order-layout">
            <section className="cart-card">
              <CartItems
                items={cart}
                onQuantityChange={onQuantityChange}
                onRemove={onRemove}
                onOpenDrawing={onOpenDrawing}
              />
            </section>
            <aside className="order-summary">
              <p className="eyebrow">Order summary</p>
              <dl>
                <div><dt>Part lines</dt><dd>{cart.length}</dd></div>
                <div><dt>Total units</dt><dd>{totalUnits}</dd></div>
                <div><dt>Drawings</dt><dd>{new Set(cart.map((item) => item.drawingId)).size}</dd></div>
              </dl>
              <div className="order-summary-actions">
                <AppButton basic className="save-order-button" onClick={saveOrder} disabled={!cart.length || saving}>
                  {saving ? "Saving..." : "Save order"}
                </AppButton>
                <AppButton basic className="place-order-button gradient-action-button" onClick={onProceed} disabled={!cart.length}>
                  Place parts request
                </AppButton>
                <AppButton basic className="continue-button gradient-action-button" onClick={onBack}>
                  Continue browsing
                </AppButton>
              </div>
            </aside>
          </div>
        </main>
      </PageBody>
      {savedNotice && (
        <div className="order-save-notification" role="status" aria-live="polite">
          <span className="order-save-notification-icon" aria-hidden="true">✓</span>
          <div>
            <strong>Order saved successfully</strong>
            <small>Saved at {savedNotice}. You can safely continue later.</small>
          </div>
          <button type="button" aria-label="Close notification" onClick={() => setSavedNotice("")}>×</button>
        </div>
      )}
      <Footer status={status} />
    </div>
  );
}
