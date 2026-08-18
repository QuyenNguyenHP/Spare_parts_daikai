import { useState } from "react";

import DrawingLibraryPage from "./pages/DrawingLibraryPage";
import EngineSelectionPage from "./pages/EngineSelectionPage";
import LoginPage from "./pages/LoginPage";
import OrderPage from "./pages/OrderPage";
import RequestDetailsPage from "./pages/RequestDetailsPage";

const SESSION_KEY = "daikai-spare-parts-user";
const CART_KEY = "daikai-spare-parts-cart";

function readSession() {
  try {
    return JSON.parse(window.sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function readCart() {
  try {
    const cart = JSON.parse(window.sessionStorage.getItem(CART_KEY));
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [user, setUser] = useState(readSession);
  const [cart, setCart] = useState(readCart);
  const [page, setPage] = useState("engines");
  const [selectedEngine, setSelectedEngine] = useState(null);

  function updateCart(updater) {
    setCart((current) => {
      const next = updater(current);
      window.sessionStorage.setItem(CART_KEY, JSON.stringify(next));
      return next;
    });
  }

  function handleLogin(authenticatedUser) {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(authenticatedUser));
    setUser(authenticatedUser);
  }

  function handleLogout() {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(CART_KEY);
    setCart([]);
    setPage("engines");
    setSelectedEngine(null);
    setUser(null);
  }

  function handleAddToCart(part) {
    updateCart((current) => {
      const existing = current.find((item) => item.key === part.key);
      if (!existing) return [...current, part];
      return current.map((item) => (
        item.key === part.key ? { ...item, quantity: item.quantity + 1 } : item
      ));
    });
  }

  function handleQuantityChange(key, quantity) {
    updateCart((current) => current.map((item) => (
      item.key === key ? { ...item, quantity: Math.max(1, quantity) } : item
    )));
  }

  function handleRemoveFromCart(key) {
    updateCart((current) => current.filter((item) => item.key !== key));
  }

  function handleOrderComplete() {
    updateCart(() => []);
  }

  function handleEngineSelection(engine) {
    const changingEngine = selectedEngine && selectedEngine.id !== engine.id;
    if (changingEngine && cart.length) {
      const confirmed = window.confirm(
        `Your cart contains parts for ${selectedEngine.name}. Selecting ${engine.name} will clear the cart. Continue?`,
      );
      if (!confirmed) return;
      updateCart(() => []);
    }
    setSelectedEngine(engine);
    setPage("library");
  }

  if (!user) return <LoginPage onLogin={handleLogin} />;
  if (page === "engines") {
    return (
      <EngineSelectionPage
        user={user}
        selectedEngine={selectedEngine}
        cartCount={cart.length}
        onOpenCart={() => setPage("order")}
        onLogout={handleLogout}
        onHome={() => setPage("engines")}
        onSelectEngine={handleEngineSelection}
      />
    );
  }
  if (page === "order") {
    return (
      <OrderPage
        user={user}
        engine={selectedEngine}
        cart={cart}
        onBack={() => setPage("library")}
        onLogout={handleLogout}
        onHome={() => setPage("engines")}
        onQuantityChange={handleQuantityChange}
        onRemove={handleRemoveFromCart}
        onProceed={() => setPage("request-details")}
      />
    );
  }
  if (page === "request-details") {
    return (
      <RequestDetailsPage
        user={user}
        engine={selectedEngine}
        cart={cart}
        onBack={() => setPage("order")}
        onLogout={handleLogout}
        onHome={() => setPage("engines")}
        onOrderComplete={handleOrderComplete}
        onContinue={() => setPage("library")}
      />
    );
  }
  return (
    <DrawingLibraryPage
      user={user}
      engine={selectedEngine}
      cartCount={cart.length}
      onAddToCart={handleAddToCart}
      onOpenCart={() => setPage("order")}
      onBackToEngines={() => setPage("engines")}
      onLogout={handleLogout}
      onHome={() => setPage("engines")}
    />
  );
}
