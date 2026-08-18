export default function CartItems({ items, onQuantityChange, onRemove }) {
  if (!items.length) {
    return (
      <div className="cart-empty">
        <span>0</span>
        <h2>Your parts cart is empty</h2>
        <p>Return to the drawing library and select the parts you want to request.</p>
      </div>
    );
  }

  return (
    <div className="cart-table-wrap">
      <table className="cart-table">
        <thead>
          <tr>
            <th>Drawing / Item</th>
            <th>Parts code</th>
            <th>Name of parts</th>
            <th>Quantity</th>
            <th><span className="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.key}>
              <td data-label="Drawing / Item">
                <strong>Item {item.item}</strong>
                <small>{item.drawingLabel}</small>
              </td>
              <td data-label="Parts code"><code>{item.partNumber}</code></td>
              <td data-label="Name of parts">{item.name}</td>
              <td data-label="Quantity">
                <input
                  className="cart-quantity"
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(event) => onQuantityChange(item.key, Number(event.target.value) || 1)}
                  aria-label={`Quantity for item ${item.item}`}
                />
              </td>
              <td className="cart-remove-cell">
                <button
                  type="button"
                  className="cart-remove-button"
                  onClick={() => onRemove(item.key)}
                  aria-label={`Remove item ${item.item}`}
                  title={`Remove item ${item.item}`}
                >
                  -
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
