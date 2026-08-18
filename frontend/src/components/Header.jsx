import AppButton from "./AppButton";
import { ArrowBackIcon, CartIcon } from "./HeaderIcons";

export default function Header({
  user,
  title = "Spare Parts Library",
  cartCount = 0,
  onOpenCart,
  onBack,
  onLogout,
}) {
  return (
    <header className="topbar">
      <div className="application-brand">
        <img src="/Daikai-logo-Website.png" alt="Daikai" />
        <div>
          <p className="eyebrow">Daikai Engineering</p>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="topbar-actions">
        {onBack && (
          <AppButton
            basic
            className="header-icon-button"
            sx={{ width: "42px", minWidth: "42px", padding: 0 }}
            onClick={onBack}
            aria-label="Back to drawings"
            title="Back to drawings"
          >
            <ArrowBackIcon fontSize="small" />
          </AppButton>
        )}
        {onOpenCart && (
          <AppButton
            basic
            className="header-icon-button cart-button"
            sx={{ width: "42px", minWidth: "42px", padding: 0 }}
            onClick={onOpenCart}
            aria-label={`Open parts cart with ${cartCount} items`}
            title="Open parts cart"
          >
            <CartIcon fontSize="small" />
            {cartCount > 0 && <span>{cartCount}</span>}
          </AppButton>
        )}
        <div className="user-chip">
          <span>{user.username.slice(0, 1).toUpperCase()}</span>
          <div><small>{user.role}</small><strong>{user.username}</strong></div>
        </div>
        <AppButton tone="neutral" className="logout-button" onClick={onLogout}>Logout</AppButton>
      </div>
    </header>
  );
}
