import { useEffect, useState } from "react";

import AppButton from "../components/AppButton";
import Footer from "../components/Footer";
import Header from "../components/Header";
import UserRegistrationForm from "../components/UserRegistrationForm";
import { API_URL } from "../config";

export default function AdminPage({ user, onBack, onChangePassword, onLogout, onHome }) {
  const [settings, setSettings] = useState({ users: [], recipients: [], smtp: {} });
  const [newRecipient, setNewRecipient] = useState("");
  const [status, setStatus] = useState({ type: "loading", message: "Loading administration settings..." });

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.token}`,
        ...options.headers,
      },
    });
    const result = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.detail ?? "Administration request failed");
    return result;
  }

  async function loadSettings() {
    try {
      const result = await apiRequest("/admin/settings");
      setSettings({
        ...result,
        users: result.users.map((item) => ({ ...item, password: "" })),
      });
      setStatus({ type: "ready", message: "Administration settings loaded" });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function updateUserRow(username, field, value) {
    setSettings((current) => ({
      ...current,
      users: current.users.map((item) => item.username === username ? { ...item, [field]: value } : item),
    }));
  }

  async function saveUser(account) {
    setStatus({ type: "loading", message: `Saving ${account.username}...` });
    try {
      await apiRequest(`/admin/users/${encodeURIComponent(account.username)}`, {
        method: "PUT",
        body: JSON.stringify({
          role: account.role,
          active: account.active,
          password: account.password || null,
        }),
      });
      await loadSettings();
      setStatus({ type: "success", message: `${account.username} updated` });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  }

  async function deleteUser(username) {
    if (!window.confirm(`Delete user ${username}?`)) return;
    try {
      await apiRequest(`/admin/users/${encodeURIComponent(username)}`, { method: "DELETE" });
      await loadSettings();
      setStatus({ type: "success", message: `${username} deleted` });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  }

  async function createUser(newUser) {
    try {
      await apiRequest("/admin/users", { method: "POST", body: JSON.stringify(newUser) });
      await loadSettings();
      setStatus({ type: "success", message: "User created" });
      return true;
    } catch (error) {
      setStatus({ type: "error", message: error.message });
      return false;
    }
  }

  async function addRecipient(event) {
    event.preventDefault();
    try {
      await apiRequest("/admin/recipients", {
        method: "POST",
        body: JSON.stringify({ email: newRecipient }),
      });
      setNewRecipient("");
      await loadSettings();
      setStatus({ type: "success", message: "Order recipient added" });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  }

  async function deleteRecipient(email) {
    try {
      await apiRequest(`/admin/recipients/${encodeURIComponent(email)}`, { method: "DELETE" });
      await loadSettings();
      setStatus({ type: "success", message: "Order recipient removed" });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  }

  return (
    <div className="app-shell">
      <Header user={user} title="Administration" onBack={onBack} backLabel="Back" onChangePassword={onChangePassword} onLogout={onLogout} onHome={onHome} />
      <main className="admin-page">
        <section className="admin-heading">
          <p className="eyebrow">System administration</p>
          <h2>Users, roles and order email</h2>
          <p>Manage access to the spare-parts application and the team members who receive submitted requests.</p>
        </section>

        <section className="admin-card">
          <div className="admin-section-heading">
            <div><p className="eyebrow">Access control</p><h2>Users and roles</h2></div>
            <span>{settings.users.length} users</span>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Username</th><th>Role</th><th>Status</th><th>New password</th><th>Actions</th></tr></thead>
              <tbody>
                {settings.users.map((account) => (
                  <tr key={account.username}>
                    <td><strong>{account.username}</strong></td>
                    <td>
                      <select value={account.role} onChange={(event) => updateUserRow(account.username, "role", event.target.value)}>
                        <option>Administrator</option><option>User</option>
                      </select>
                    </td>
                    <td><label className="admin-active-toggle"><input type="checkbox" checked={account.active} onChange={(event) => updateUserRow(account.username, "active", event.target.checked)} /> Active</label></td>
                    <td><input type="password" value={account.password} placeholder="Leave unchanged" minLength="8" onChange={(event) => updateUserRow(account.username, "password", event.target.value)} /></td>
                    <td className="admin-actions">
                      <AppButton basic onClick={() => saveUser(account)}>Save</AppButton>
                      <AppButton basic onClick={() => deleteUser(account.username)} disabled={account.username === user.username}>Delete</AppButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <UserRegistrationForm onCreate={createUser} />
        </section>

        <section className="admin-card">
          <div className="admin-section-heading">
            <div><p className="eyebrow">Order delivery</p><h2>Recipient emails</h2></div>
            <span className={settings.smtp.configured ? "smtp-ready" : "smtp-warning"}>{settings.smtp.configured ? "SMTP configured" : "SMTP not configured"}</span>
          </div>
          {!settings.smtp.configured && <p className="admin-warning">Add SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD and SMTP_FROM_EMAIL to the backend environment to enable delivery.</p>}
          <ul className="recipient-list">
            {settings.recipients.map((email) => <li key={email}><span>{email}</span><button type="button" onClick={() => deleteRecipient(email)} disabled={settings.recipients.length === 1}>Remove</button></li>)}
          </ul>
          <form className="admin-inline-form" onSubmit={addRecipient}>
            <input required type="email" placeholder="orders@daikai.com" value={newRecipient} onChange={(event) => setNewRecipient(event.target.value)} />
            <AppButton className="gradient-action-button" type="submit">Add recipient</AppButton>
          </form>
        </section>
      </main>
      <Footer status={status} />
    </div>
  );
}
