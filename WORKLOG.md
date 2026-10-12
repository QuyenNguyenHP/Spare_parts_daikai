# Worklog

## 2026-10-12

### Completed today

#### Optional vessels and engines during user registration

- New-user registration starts with no vessels or engines and labels the section as optional.
- Administrators can add vessels without engines and remove all vessel or engine entries before submitting.
- Backend profile validation accepts omitted or empty vessel and engine lists, defaulting them to empty lists.
- Added entries still require their names and identifiers; duplicate IMO and engine serial-number validation remains in place.

#### Login page title

- Changed the login heading from `Interactive Parts Library` to `Spare Part Portal`.

### Files changed

- `backend/main.py`
- `frontend/src/components/UserRegistrationForm.jsx`
- `frontend/src/components/LoginCard.jsx`

### Validation completed

- Five registration checks passed using the project WSL Python environment with settings reads and writes mocked: omitted vessels, empty vessels, omitted engines, empty engines, and complete vessel/engine details.
- `git diff --check` passed for the code changes.
- Confirmed the updated login heading in the source.
- Frontend production build could not run because npm was unavailable in the active Windows and WSL command environments.

## 2026-10-11

### Completed today

#### PDF generation

- Fixed the syntax error in `backend/pdf_service.py` caused by an extra `1` after a `TableStyle` declaration.
- Added a standalone preview command:

  ```bash
  .venv/bin/python backend/pdf_service.py
  ```

  This generates `backend/preview.pdf` without starting FastAPI.
- Added the Daikai logo from `frontend/public/Daikai-logo-Website.png` to the PDF header.
- Added the centered company address, horizontal separator lines, and repeating header on every page.
- Bundled and embedded Roboto Regular and Roboto Bold under `backend/fonts/`.
- Centered the PDF tables and aligned headings/footer text with the table width.
- Added a footer separator and centered page numbers (`Page 1`, `Page 2`, etc.) on every PDF page.
- Added an authenticated-independent PDF preview endpoint so a customer can download a review copy before submitting:

  ```text
  POST /api/requests/preview
  ```

- Added an endpoint for downloading a generated request PDF after submission:

  ```text
  GET /api/requests/pdf/{filename}
  ```

#### Drawing library UI

- Hid `Show hotspots` and `Edit hotspots` from non-administrator users.
- Placed Chapter, Main Item, and Item & Drawing Name on the same desktop row.
- Moved zoom controls into the top-right corner of the drawing viewport.
- Kept responsive single-column controls on small screens.
- Added a reference-manual download button beside the parts search box.
- Reference manuals are selected dynamically by engine model:

  ```text
  backend/data/{MODEL}/{MODEL} Spare Part.pdf
  ```

- Added the reference-manual API:

  ```text
  GET /api/reference-manual?model=DE18
  ```

#### Engine selection

- Optimized `/api/engines` so it no longer reads drawing, hotspot, and parts JSON files merely to build the home page.
- Engine cards are created from `.png` files in:

  ```text
  backend/data/Type_of_engines
  ```

- `6DE18` is currently selectable.
- `6DE20` and `DE33` remain visible but disabled with `Coming soon` because their drawing data is not ready.
- The backend still returns a compatibility `drawingCount` value so an older open frontend session does not incorrectly disable `6DE18`.

#### User administration and customer profiles

- Extended user registration with:
  - Name
  - Email
  - Company
  - Phone
  - Multiple vessels per user
  - A unique IMO number per vessel
  - Multiple engines per vessel
  - A unique serial number per engine
- User profile data is stored inside:

  ```text
  backend/data/admin-settings.json
  ```

- Added validation for duplicate IMO numbers and duplicate engine serial numbers within a user profile.
- Added the authenticated profile endpoint:

  ```text
  GET /api/profile
  ```

- Customer Details now loads Name, Email, Company, and Phone from the signed-in user's profile.
- Vessel and engine fields use editable dropdowns:
  - Selecting a vessel fills its IMO number.
  - The engine list is filtered to the selected vessel.
  - Selecting an engine fills its serial number.
  - Users can still enter all fields manually.
- Removed the Engine S/N placeholder and added a red required `*` to every customer field label.

#### Password management

- Added `Change password` to the account menu for users and administrators.
- Added a Change Password page with current password, new password, and confirmation fields.
- Added validation for minimum length, incorrect current password, mismatched confirmation, and reusing the current password.
- Added the API:

  ```text
  PUT /api/profile/password
  ```

- Passwords continue to be salted and hashed before being stored in `admin-settings.json`.

#### Saved orders

- Added `Save order` to the Parts Request page.
- Saved drafts are stored per username in:

  ```text
  backend/data/saved-orders.json
  ```

- Saved order data includes the selected engine, parts, quantities, and save time.
- A saved draft is restored automatically after the user signs in again when the current cart is empty.
- Saving again replaces the user's previous draft.
- The saved draft and current cart are cleared after a successful request submission.
- Added APIs:

  ```text
  GET /api/saved-order
  PUT /api/saved-order
  DELETE /api/saved-order
  ```

- Added a success notification popup after an order is saved.
- If saving receives a 401/403 response, the app returns to login while preserving the current cart.

#### Customer PDF downloads

- `Download order PDF` is always visible on Customer Details.
- Before submission, the button validates the customer form and downloads `parts-request-preview.pdf` for review.
- Preview generation does not save a request, send email, clear the cart, or delete a saved order.
- A blocking progress popup appears while the preview PDF is generated.
- After submission, the same action downloads the official stored request PDF.
- The success modal also contains a `Download PDF` button.

### Important current behavior

- FastAPI sessions are stored only in the in-memory `ACTIVE_SESSIONS` dictionary.
- Restarting the backend invalidates existing browser tokens. A stale token causes `403 Forbidden` on `/api/profile`, `/api/saved-order`, and administrator endpoints.
- After restarting the backend, sign out and sign in again.
- React development mode may call effects twice, so two `/api/profile` requests can appear in the backend log. This is expected in development.
- The app preserves the cart when it detects an expired session while saving an order.
- Existing users created before profile support, including the original admin account, may have an empty profile and must enter Customer Details manually.

### Files containing the main changes

- `backend/main.py`
- `backend/admin_store.py`
- `backend/pdf_service.py`
- `backend/fonts/Roboto-Regular.ttf`
- `backend/fonts/Roboto-Bold.ttf`
- `frontend/src/App.jsx`
- `frontend/src/styles.css`
- `frontend/src/components/AccountDropdown.jsx`
- `frontend/src/components/DrawingToolbar.jsx`
- `frontend/src/components/DrawingViewport.jsx`
- `frontend/src/components/PartsSearch.jsx`
- `frontend/src/components/UserRegistrationForm.jsx`
- `frontend/src/pages/AdminPage.jsx`
- `frontend/src/pages/ChangePasswordPage.jsx`
- `frontend/src/pages/DrawingLibraryPage.jsx`
- `frontend/src/pages/EngineSelectionPage.jsx`
- `frontend/src/pages/OrderPage.jsx`
- `frontend/src/pages/RequestDetailsPage.jsx`

### Validation completed

- Backend Python syntax checks passed after each backend change.
- Backend files compile successfully using the project WSL virtual environment.
- PDF preview generation succeeds through `backend/pdf_service.py`.
- A full frontend production build was not run because `npm`/`node` was unavailable in the active Windows and WSL command environments.

### Run the application next time

From the project root in WSL, start the backend:

```bash
.venv/bin/python backend/app.py
```

In another WSL terminal, start the frontend where Node/npm is installed:

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

After source changes, restart the relevant server and use `Ctrl + Shift + R` if the browser still shows an older UI.

### Recommended next work

1. Persist or sign authentication sessions so restarting FastAPI does not invalidate browser tokens.
2. Run `npm run build` once Node/npm is available and fix any build-time JSX or lint issues.
3. Add drawing datasets and reference manuals for `6DE20` and `DE33`, then mark them available.
4. Add an administration editor for updating profiles of existing users after registration.
5. Consider protecting generated request-PDF downloads with authenticated access before deploying outside an internal network.
