import { useState } from "react";

import DrawingLibraryPage from "./pages/DrawingLibraryPage";
import LoginPage from "./pages/LoginPage";
import OrderPage from "./pages/OrderPage";

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
  const [page, setPage] = useState("library");

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
    setPage("library");
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

  if (!user) return <LoginPage onLogin={handleLogin} />;
  if (page === "order") {
    return (
      <OrderPage
        user={user}
        cart={cart}
        onBack={() => setPage("library")}
        onLogout={handleLogout}
        onQuantityChange={handleQuantityChange}
        onRemove={handleRemoveFromCart}
        onOrderComplete={handleOrderComplete}
      />
    );
  }
  return (
    <DrawingLibraryPage
      user={user}
      cartCount={cart.length}
      onAddToCart={handleAddToCart}
      onOpenCart={() => setPage("order")}
      onLogout={handleLogout}
    />
  );
}
