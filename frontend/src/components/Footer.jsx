export default function Footer({ status }) {
  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src="/Daikai-logo-Website.png" alt="Daikai" />
          <div>
            <strong>Daikai Engineering</strong>
            <small>Interactive Parts Drawing Library</small>
          </div>
        </div>
        <div className={`footer-status ${status.type}`}>
          <span className="status-dot" />
          {status.message}
        </div>
        <p>Copyright {new Date().getFullYear()} Daikai. Internal use only.</p>
      </div>
    </footer>
  );
}
