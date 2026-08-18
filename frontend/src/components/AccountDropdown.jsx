import { useEffect, useRef, useState } from "react";

function MenuIcon({ children }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;
}

export default function AccountDropdown({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const initial = user.username.slice(0, 1).toUpperCase();

  useEffect(() => {
    if (!open) return undefined;

    function closeOnOutsideClick(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="account-dropdown" ref={rootRef}>
      <button
        type="button"
        className="account-avatar-button"
        aria-label={`Open account menu for ${user.username}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{initial}</span>
        <i aria-hidden="true" />
      </button>

      {open && (
        <div className="account-popover" role="menu">
          <div className="account-summary">
            <span className="account-summary-avatar">{initial}<i aria-hidden="true" /></span>
            <span>
              <strong>{user.username}</strong>
              <small>{user.role}</small>
            </span>
          </div>

          <div className="account-menu-section">
            <div className="account-info-row">
              <MenuIcon><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c.5-4 2.7-6 6.5-6s6 2 6.5 6" /></MenuIcon>
              <span>Signed in as <strong>{user.username}</strong></span>
            </div>
            <div className="account-info-row">
              <MenuIcon><path d="M12 3 4.5 6v5c0 4.8 2.9 8.1 7.5 10 4.6-1.9 7.5-5.2 7.5-10V6L12 3Z" /><path d="m9 12 2 2 4-4" /></MenuIcon>
              <span>Role <strong>{user.role}</strong></span>
            </div>
          </div>

          <div className="account-menu-footer">
            <button type="button" role="menuitem" onClick={onLogout}>
              <MenuIcon><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" /></MenuIcon>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
