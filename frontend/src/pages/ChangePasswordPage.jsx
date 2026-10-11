import { useState } from "react";

import AppButton from "../components/AppButton";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { API_URL } from "../config";

export default function ChangePasswordPage({ user, onBack, onAdmin, onLogout, onHome, onChangePassword }) {
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [status, setStatus] = useState({ type: "ready", message: "Enter your current and new password" });
  const [submitting, setSubmitting] = useState(false);

  function updatePassword(event) {
    const { name, value } = event.target;
    setPasswords((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setStatus({ type: "error", message: "New password and confirmation do not match" });
      return;
    }
    setSubmitting(true);
    setStatus({ type: "loading", message: "Changing password..." });
    try {
      const response = await fetch(`${API_URL}/profile/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });
      const result = response.status === 204 ? null : await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.detail ?? "Password could not be changed");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setStatus({ type: "success", message: "Password changed successfully" });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <Header
        user={user}
        title="Change Password"
        onBack={onBack}
        backLabel="Back"
        onAdmin={onAdmin}
        onLogout={onLogout}
        onHome={onHome}
        onChangePassword={onChangePassword}
      />
      <main className="change-password-page">
        <section className="change-password-card">
          <div className="section-heading">
            <p className="eyebrow">Account security</p>
            <h2>Change your password</h2>
            <p>Use at least 8 characters for your new password.</p>
          </div>
          <form className="change-password-form" onSubmit={submit}>
            <label>
              Current password
              <input required autoComplete="current-password" type="password" name="currentPassword" value={passwords.currentPassword} onChange={updatePassword} />
            </label>
            <label>
              New password
              <input required autoComplete="new-password" type="password" name="newPassword" minLength="8" value={passwords.newPassword} onChange={updatePassword} />
            </label>
            <label>
              Confirm new password
              <input required autoComplete="new-password" type="password" name="confirmPassword" minLength="8" value={passwords.confirmPassword} onChange={updatePassword} />
            </label>
            <div className={`change-password-message ${status.type}`} role="status" aria-live="polite">{status.message}</div>
            <div className="change-password-actions">
              <AppButton basic type="button" onClick={onBack}>Cancel</AppButton>
              <AppButton className="gradient-action-button" type="submit" disabled={submitting}>{submitting ? "Changing..." : "Change password"}</AppButton>
            </div>
          </form>
        </section>
      </main>
      <Footer status={status} />
    </div>
  );
}
