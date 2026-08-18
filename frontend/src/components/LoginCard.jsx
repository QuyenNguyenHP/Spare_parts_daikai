import AppButton from "./AppButton";

export default function LoginCard({
  username,
  password,
  error,
  submitting,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}) {
  return (
    <section className="login-card">
      <div className="login-brand">
        <img src="/Daikai-logo-Website.png" alt="Daikai" />
        <span>Parts Intelligence</span>
      </div>
      <div className="login-intro">
        <p className="login-kicker">Daikai Engineering</p>
        <h1>Interactive Parts Library</h1>
        <p>Sign in to inspect technical drawings, identify callouts and prepare parts requests.</p>
      </div>
      <form className="login-form" onSubmit={onSubmit}>
        <label>
          <span>Username</span>
          <input autoComplete="username" autoFocus name="username" required value={username} onChange={(event) => onUsernameChange(event.target.value)} />
        </label>
        <label>
          <span>Password</span>
          <input autoComplete="current-password" name="password" required type="password" value={password} onChange={(event) => onPasswordChange(event.target.value)} />
        </label>
        <div className="login-error" role="alert" aria-live="polite">{error}</div>
        <AppButton className="login-button" disabled={submitting} type="submit">
          {submitting ? "Signing in..." : "Sign in"}
        </AppButton>
      </form>
      <p className="login-footer">Authorized Daikai personnel only</p>
    </section>
  );
}
