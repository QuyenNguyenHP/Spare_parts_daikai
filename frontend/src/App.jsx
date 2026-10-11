import { useEffect, useState } from "react";

import AdminPage from "./pages/AdminPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import DrawingLibraryPage from "./pages/DrawingLibraryPage";
import EngineSelectionPage from "./pages/EngineSelectionPage";
import LoginPage from "./pages/LoginPage";
import OrderPage from "./pages/OrderPage";
import RequestDetailsPage from "./pages/RequestDetailsPage";
import { API_URL } from "./config";

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
  const [drawingSelection, setDrawingSelection] = useState(null);

  useEffect(() => {
    if (!user?.token || cart.length) return undefined;
    const controller = new AbortController();
    async function restoreSavedOrder() {
      try {
        const response = await fetch(`${API_URL}/saved-order`, {
          headers: { Authorization: `Bearer ${user.token}` },
          signal: controller.signal,
        });
        if (!response.ok) return;
        const result = await response.json();
        if (!result.order?.items?.length) return;
        setCart(result.order.items);
        window.sessionStorage.setItem(CART_KEY, JSON.stringify(result.order.items));
        if (result.order.engine) setSelectedEngine(result.order.engine);
      } catch (error) {
        if (error.name !== "AbortError") return;
      }
    }
    restoreSavedOrder();
    return () => controller.abort();
  }, [user?.token]);

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

  function handleSessionExpired() {
    window.sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  function handleAddToCart(part) {
    updateCart((current) => {
      const existing = current.find((item) => item.key === part.key);
      if (!existing) return [...current, part];
      return current.map((item) => (
        item.key === part.key ? { ...item, quantity: item.quantity + part.quantity } : item
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

  async function saveCurrentOrder() {
    const response = await fetch(`${API_URL}/saved-order`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.token}`,
      },
      body: JSON.stringify({ engine: selectedEngine, items: cart }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
      handleSessionExpired();
      throw new Error("Your session expired. Sign in again; your current cart has been kept.");
    }
    if (!response.ok) throw new Error(result.detail ?? "Order could not be saved");
    return result;
  }

  async function handleOrderComplete() {
    try {
      await fetch(`${API_URL}/saved-order`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.token}` },
      });
    } finally {
      updateCart(() => []);
    }
  }

  function openDrawingFromCart(item) {
    setDrawingSelection({ drawingId: item.drawingId, item: item.item });
    setPage("library");
  }

  function openDrawingLibrary() {
    setDrawingSelection(null);
    setPage("library");
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
    openDrawingLibrary();
  }

  if (!user) return <LoginPage onLogin={handleLogin} />;
  const openAdmin = user.role === "Administrator" ? () => setPage("admin") : undefined;
  const openChangePassword = () => setPage("change-password");
  if (page === "change-password") {
    return (
      <ChangePasswordPage
        user={user}
        onBack={() => setPage("engines")}
        onAdmin={openAdmin}
        onChangePassword={openChangePassword}
        onLogout={handleLogout}
        onHome={() => setPage("engines")}
      />
    );
  }
  if (page === "admin" && user.role === "Administrator") {
    return (
      <AdminPage
        user={user}
        onBack={() => setPage("engines")}
        onChangePassword={openChangePassword}
        onLogout={handleLogout}
        onHome={() => setPage("engines")}
      />
    );
  }
  if (page === "engines") {
    return (
      <EngineSelectionPage
        user={user}
        selectedEngine={selectedEngine}
        cartCount={cart.length}
        onOpenCart={() => setPage("order")}
        onAdmin={openAdmin}
        onChangePassword={openChangePassword}
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
        onBack={openDrawingLibrary}
        onLogout={handleLogout}
        onAdmin={openAdmin}
        onChangePassword={openChangePassword}
        onHome={() => setPage("engines")}
        onQuantityChange={handleQuantityChange}
        onRemove={handleRemoveFromCart}
        onOpenDrawing={openDrawingFromCart}
        onSaveOrder={saveCurrentOrder}
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
        onAdmin={openAdmin}
        onChangePassword={openChangePassword}
        onLogout={handleLogout}
        onHome={() => setPage("engines")}
        onOrderComplete={handleOrderComplete}
        onContinue={openDrawingLibrary}
      />
    );
  }
  return (
    <DrawingLibraryPage
      user={user}
      engine={selectedEngine}
      cartCount={cart.length}
      initialSelection={drawingSelection}
      onAddToCart={handleAddToCart}
      onOpenCart={() => setPage("order")}
      onBackToEngines={() => setPage("engines")}
      onLogout={handleLogout}
      onAdmin={openAdmin}
      onChangePassword={openChangePassword}
      onHome={() => setPage("engines")}
    />
  );
}
