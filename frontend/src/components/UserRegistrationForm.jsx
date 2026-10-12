import { useState } from "react";

import AppButton from "./AppButton";

const EMPTY_ENGINE = { name: "", serialNumber: "" };
const EMPTY_VESSEL = { name: "", imoNumber: "" };

function emptyUser() {
  return {
    username: "",
    password: "",
    role: "User",
    profile: {
      name: "",
      email: "",
      company: "",
      phone: "",
      vessels: [],
    },
  };
}

export default function UserRegistrationForm({ onCreate }) {
  const [account, setAccount] = useState(emptyUser);
  const [submitting, setSubmitting] = useState(false);

  function updateAccount(field, value) {
    setAccount((current) => ({ ...current, [field]: value }));
  }

  function updateProfile(field, value) {
    setAccount((current) => ({
      ...current,
      profile: { ...current.profile, [field]: value },
    }));
  }

  function updateVessel(vesselIndex, field, value) {
    setAccount((current) => ({
      ...current,
      profile: {
        ...current.profile,
        vessels: current.profile.vessels.map((vessel, index) => (
          index === vesselIndex ? { ...vessel, [field]: value } : vessel
        )),
      },
    }));
  }

  function updateEngine(vesselIndex, engineIndex, field, value) {
    setAccount((current) => ({
      ...current,
      profile: {
        ...current.profile,
        vessels: current.profile.vessels.map((vessel, index) => (
          index === vesselIndex
            ? {
              ...vessel,
              engines: vessel.engines.map((engine, itemIndex) => (
                itemIndex === engineIndex ? { ...engine, [field]: value } : engine
              )),
            }
            : vessel
        )),
      },
    }));
  }

  function addVessel() {
    setAccount((current) => ({
      ...current,
      profile: {
        ...current.profile,
        vessels: [...current.profile.vessels, { ...EMPTY_VESSEL, engines: [] }],
      },
    }));
  }

  function removeVessel(vesselIndex) {
    setAccount((current) => ({
      ...current,
      profile: {
        ...current.profile,
        vessels: current.profile.vessels.filter((_, index) => index !== vesselIndex),
      },
    }));
  }

  function addEngine(vesselIndex) {
    setAccount((current) => ({
      ...current,
      profile: {
        ...current.profile,
        vessels: current.profile.vessels.map((vessel, index) => (
          index === vesselIndex
            ? { ...vessel, engines: [...vessel.engines, { ...EMPTY_ENGINE }] }
            : vessel
        )),
      },
    }));
  }

  function removeEngine(vesselIndex, engineIndex) {
    setAccount((current) => ({
      ...current,
      profile: {
        ...current.profile,
        vessels: current.profile.vessels.map((vessel, index) => (
          index === vesselIndex
            ? { ...vessel, engines: vessel.engines.filter((_, itemIndex) => itemIndex !== engineIndex) }
            : vessel
        )),
      },
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const created = await onCreate(account);
      if (created) setAccount(emptyUser());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="admin-registration-form" onSubmit={submit}>
      <div className="admin-registration-section">
        <h3>Account and contact information</h3>
        <div className="admin-registration-grid">
          <label>Username *<input required value={account.username} onChange={(event) => updateAccount("username", event.target.value)} /></label>
          <label>Password *<input required type="password" minLength="8" value={account.password} onChange={(event) => updateAccount("password", event.target.value)} /></label>
          <label>Role *<select value={account.role} onChange={(event) => updateAccount("role", event.target.value)}><option>User</option><option>Administrator</option></select></label>
          <label>Name *<input required value={account.profile.name} onChange={(event) => updateProfile("name", event.target.value)} /></label>
          <label>Email *<input required type="email" value={account.profile.email} onChange={(event) => updateProfile("email", event.target.value)} /></label>
          <label>Company *<input required value={account.profile.company} onChange={(event) => updateProfile("company", event.target.value)} /></label>
          <label>Phone *<input required type="tel" value={account.profile.phone} onChange={(event) => updateProfile("phone", event.target.value)} /></label>
        </div>
      </div>

      <div className="admin-registration-section">
        <div className="admin-registration-heading">
          <div><h3>Vessels and engines (optional)</h3><p>You can create a user without vessels or engines. If added, each vessel requires a unique IMO number and each engine requires a unique S/N.</p></div>
          <AppButton basic type="button" onClick={addVessel}>Add vessel</AppButton>
        </div>
        <div className="registered-vessels">
          {account.profile.vessels.map((vessel, vesselIndex) => (
            <section className="registered-vessel" key={vesselIndex}>
              <div className="registered-vessel-heading">
                <strong>Vessel {vesselIndex + 1}</strong>
                <button type="button" onClick={() => removeVessel(vesselIndex)}>Remove vessel</button>
              </div>
              <div className="admin-registration-grid vessel-fields">
                <label>Name of Vessel *<input required value={vessel.name} onChange={(event) => updateVessel(vesselIndex, "name", event.target.value)} /></label>
                <label>IMO No. *<input required value={vessel.imoNumber} onChange={(event) => updateVessel(vesselIndex, "imoNumber", event.target.value)} /></label>
              </div>
              <div className="registered-engines">
                {vessel.engines.map((engine, engineIndex) => (
                  <div className="registered-engine" key={engineIndex}>
                    <label>Engine Name *<input required value={engine.name} onChange={(event) => updateEngine(vesselIndex, engineIndex, "name", event.target.value)} /></label>
                    <label>Engine S/N *<input required value={engine.serialNumber} onChange={(event) => updateEngine(vesselIndex, engineIndex, "serialNumber", event.target.value)} /></label>
                    <button type="button" onClick={() => removeEngine(vesselIndex, engineIndex)}>Remove</button>
                  </div>
                ))}
              </div>
              <AppButton basic type="button" onClick={() => addEngine(vesselIndex)}>Add engine</AppButton>
            </section>
          ))}
        </div>
      </div>
      <div className="admin-registration-actions">
        <AppButton className="gradient-action-button" type="submit" disabled={submitting}>{submitting ? "Creating user..." : "Add user"}</AppButton>
      </div>
    </form>
  );
}
