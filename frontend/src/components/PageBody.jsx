export default function PageBody({ children, navigator }) {
  return (
    <div className="page-layout">
      {navigator}
      <div className="app-body">{children}</div>
    </div>
  );
}
