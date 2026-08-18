import AppButton from "./AppButton";
import AccountDropdown from "./AccountDropdown";
import { ArrowBackIcon, CartIcon } from "./HeaderIcons";

export default function Header({
  user,
  title = "Spare Parts Library",
  cartCount = 0,
  onOpenCart,
  onBack,
  onHome,
  backLabel = "Back to drawings",
  onLogout,
}) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="application-brand">
          <button type="button" className="brand-home-button" onClick={onHome} aria-label="Go to engine selection" title="Engine selection">
            <img src="/Daikai-logo-Website.png" alt="Daikai" />
          </button>
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
              aria-label={backLabel}
              title={backLabel}
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
          <AccountDropdown user={user} onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}
