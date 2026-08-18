import { useState } from "react";

import AppButton from "../components/AppButton";
import CartItems from "../components/CartItems";
import Footer from "../components/Footer";
import Header from "../components/Header";
import PageBody from "../components/PageBody";
import PageNavigator from "../components/PageNavigator";
import { API_URL } from "../config";

const EMPTY_CUSTOMER = {
  name: "",
  email: "",
  company: "",
  phone: "",
  engineName: "",
  engineSerialNumber: "",
  vesselName: "",
  imoNumber: "",
};

function groupItemsByDrawing(cart, customer) {
  return Object.values(cart.reduce((groups, item) => {
    const group = groups[item.drawingId] ?? {
      drawingId: item.drawingId,
      customer,
      items: [],
    };
    group.items.push({ item: item.item, quantity: item.quantity });
    groups[item.drawingId] = group;
    return groups;
  }, {}));
}

export default function RequestDetailsPage({
  user,
  engine,
  cart,
  onBack,
  onLogout,
  onHome,
  onOrderComplete,
  onContinue,
}) {
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [status, setStatus] = useState({ type: "ready", message: "Complete customer information" });
  const [submitting, setSubmitting] = useState(false);
  const [requestIds, setRequestIds] = useState([]);
  const [emailNotice, setEmailNotice] = useState("");
  const [submittedItems, setSubmittedItems] = useState(null);
  const displayedItems = submittedItems ?? cart;

  function updateCustomer(event) {
    const { name, value } = event.target;
    setCustomer((current) => ({ ...current, [name]: value }));
  }

  async function submitRequest(event) {
    event.preventDefault();
    if (!cart.length || submitting) return;

    setSubmitting(true);
    setRequestIds([]);
    setEmailNotice("");
    setStatus({ type: "loading", message: "Creating parts request..." });
    try {
      const requests = await Promise.all(groupItemsByDrawing(cart, customer).map(async (request) => {
        const response = await fetch(`${API_URL}/requests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.detail ?? `API returned ${response.status}`);
        return result;
      }));

      setSubmittedItems(cart);
      setRequestIds(requests.map((request) => request.requestId));
      const emailSent = requests.every((request) => request.emailDelivery?.status === "sent");
      setEmailNotice(emailSent
        ? "A confirmation email was sent to the customer and the request was sent to sales."
        : "The request was saved, but email could not be sent. Check the backend SMTP configuration.");
      setStatus(emailSent
        ? { type: "success", message: "Parts request and email notifications completed" }
        : { type: "warning", message: "Parts request saved; email notification requires attention" });
      onOrderComplete();
    } catch (error) {
      setStatus({ type: "error", message: error.message ?? "Parts request could not be created" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <Header user={user} title="Customer Request Details" onBack={onBack} backLabel="Back to order" onLogout={onLogout} onHome={onHome} />
      <PageBody
        navigator={(
          <PageNavigator
            currentPage="request-details"
            engine={engine}
            cartCount={displayedItems.length}
            onNavigate={{ library: onContinue, order: cart.length ? onBack : undefined }}
          />
        )}
      >
        <main className="request-details-page">
        <section className="order-hero">
          <p className="eyebrow">Final step</p>
          <h2>Customer and engine information</h2>
          <p>Complete the contact details below. Your selected parts are included with this request.</p>
        </section>

        {requestIds.length > 0 && (
          <section className="order-success" aria-live="polite">
            <strong>Parts request submitted successfully</strong>
            <p>Request ID: {requestIds.join(", ")}</p>
            <p>{emailNotice}</p>
          </section>
        )}

        <form className="request-details-form" onSubmit={submitRequest}>
          <section className="customer-card">
            <div className="section-heading">
              <p className="eyebrow">Customer details</p>
              <h2>Contact information</h2>
            </div>
            <div className="customer-fields">
              <label>
                Name
                <input name="name" value={customer.name} onChange={updateCustomer} autoComplete="name" required maxLength="120" />
              </label>
              <label>
                Email
                <input name="email" type="email" value={customer.email} onChange={updateCustomer} autoComplete="email" required maxLength="254" />
              </label>
              <label>
                Company
                <input name="company" value={customer.company} onChange={updateCustomer} autoComplete="organization" required maxLength="160" />
              </label>
              <label>
                Phone
                <input name="phone" type="tel" value={customer.phone} onChange={updateCustomer} autoComplete="tel" required maxLength="40" />
              </label>
              <label>
                Name of Vessel
                <input name="vesselName" value={customer.vesselName} onChange={updateCustomer} required maxLength="160" />
              </label>
              <label>
                IMO No.
                <input name="imoNumber" value={customer.imoNumber} onChange={updateCustomer} inputMode="numeric" required maxLength="20" />
              </label>
              <label>
                Engine Name
                <input name="engineName" value={customer.engineName} onChange={updateCustomer} required maxLength="160" />
              </label>
              <label>
                Engine S/N
                <input name="engineSerialNumber" value={customer.engineSerialNumber} onChange={updateCustomer} required maxLength="100" placeholder="Enter engine serial number" />
              </label>
            </div>
          </section>

          <section className="request-parts-card">
            <div className="section-heading request-parts-heading">
              <div>
                <p className="eyebrow">Selected parts</p>
                <h2>Request details</h2>
              </div>
              <span>{displayedItems.length} part lines</span>
            </div>
            <CartItems items={displayedItems} readOnly />
          </section>

          <div className="request-form-actions">
            {requestIds.length > 0 ? (
              <AppButton className="gradient-action-button" type="button" onClick={onContinue}>Continue browsing</AppButton>
            ) : (
              <>
                <AppButton basic className="gradient-action-button" type="button" onClick={onBack}>Back to order</AppButton>
                <AppButton className="gradient-action-button" type="submit" disabled={!cart.length || submitting}>
                  {submitting ? "Submitting request..." : "Submit parts request"}
                </AppButton>
              </>
            )}
          </div>
        </form>
        </main>
      </PageBody>
      <Footer status={status} />
    </div>
  );
}
