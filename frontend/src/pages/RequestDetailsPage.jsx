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

function buildRequest(cart, customer) {
  return {
    customer,
    items: cart.map((item) => ({
      drawingId: item.drawingId,
      item: item.item,
      quantity: item.quantity,
    })),
  };
}

export default function RequestDetailsPage({
  user,
  engine,
  cart,
  onBack,
  onAdmin,
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState(0);
  const [submissionTotal, setSubmissionTotal] = useState(0);
  const displayedItems = submittedItems ?? cart;
  const submissionPercentage = submissionTotal
    ? Math.round((submissionProgress / submissionTotal) * 100)
    : 0;

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
    setShowSuccessModal(false);
    setSubmissionProgress(0);
    setStatus({ type: "loading", message: "Creating parts request..." });
    try {
      setSubmissionTotal(1);
      const response = await fetch(`${API_URL}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequest(cart, customer)),
      });
      const request = await response.json().catch(() => ({}));
      setSubmissionProgress(1);
      if (!response.ok) throw new Error(request.detail ?? `API returned ${response.status}`);

      setSubmittedItems(cart);
      setRequestIds([request.requestId]);
      const emailSent = request.emailDelivery?.status === "sent";
      setEmailNotice(emailSent
        ? "A confirmation email was sent to the customer and the request was sent to sales."
        : "The request was saved, but email could not be sent. Check the backend SMTP configuration.");
      setStatus(emailSent
        ? { type: "success", message: "Parts request and email notifications completed" }
        : { type: "warning", message: "Parts request saved; email notification requires attention" });
      setShowSuccessModal(emailSent);
      onOrderComplete();
    } catch (error) {
      setStatus({ type: "error", message: error.message ?? "Parts request could not be created" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <Header user={user} title="Customer Request Details" onBack={onBack} backLabel="Back to order" onAdmin={onAdmin} onLogout={onLogout} onHome={onHome} />
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
      {submitting && (
        <div className="request-progress-modal-backdrop" role="presentation">
          <section className="request-progress-modal" role="status" aria-live="polite" aria-label={`Creating parts request: ${submissionPercentage}% complete`}>
            <span className="request-progress-spinner" aria-hidden="true" />
            <p className="eyebrow">Please wait</p>
            <h2>Creating parts request...</h2>
            <strong className="request-progress-percentage">{submissionPercentage}%</strong>
            <div
              className="request-progress-track"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={submissionPercentage}
            >
              <span style={{ width: `${submissionPercentage}%` }} />
            </div>
            <p>{submissionProgress} of {submissionTotal || 1} request completed</p>
            <small>Generating one PDF file and sending the confirmation email.</small>
          </section>
        </div>
      )}
      {showSuccessModal && (
        <div className="request-success-modal-backdrop" role="presentation">
          <section className="request-success-modal" role="dialog" aria-modal="true" aria-labelledby="request-success-title">
            <span className="request-success-icon" aria-hidden="true">✓</span>
            <p className="eyebrow">Email delivered</p>
            <h2 id="request-success-title">Parts request sent successfully</h2>
            <p>The request PDF was generated and attached to the confirmation emails.</p>
            <div className="request-success-ids">
              <strong>Request ID</strong>
              {requestIds.map((requestId) => <code key={requestId}>{requestId}</code>)}
            </div>
            <div className="request-success-actions">
              <AppButton basic type="button" onClick={() => setShowSuccessModal(false)}>Close</AppButton>
              <AppButton className="gradient-action-button" type="button" onClick={onContinue}>Continue browsing</AppButton>
            </div>
          </section>
        </div>
      )}
      <Footer status={status} />
    </div>
  );
}
