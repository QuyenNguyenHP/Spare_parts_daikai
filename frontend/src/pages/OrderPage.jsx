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
  onLogout,
  onHome,
  onQuantityChange,
  onRemove,
  onProceed,
}) {
  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="app-shell">
      <Header user={user} title="Parts Request Order" onBack={onBack} onLogout={onLogout} onHome={onHome} />
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
      <Footer status={{ type: "ready", message: "Review parts request" }} />
    </div>
  );
}
