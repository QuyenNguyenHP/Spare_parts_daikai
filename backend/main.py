from datetime import datetime, timezone
from pathlib import Path
import re
import secrets

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, ConfigDict, Field


# The project-local file is the application's explicit runtime configuration.
# Override stale SMTP variables that may still be exported in the launch shell.
load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=True)

try:
    from .admin_store import (
        VALID_ROLES,
        authenticate_user,
        find_user,
        get_recipient_emails,
        hash_password,
        load_admin_settings,
        public_user,
        save_admin_settings,
    )
    from .email_service import EmailSettings, send_request_emails
    from .pdf_service import build_parts_request_pdf
    from .storage import (
        DATA_DIR,
        drawing_image_path,
        hotspots_path,
        list_drawings,
        load_drawing,
        load_hotspots,
        load_parts_catalog,
        load_parts,
        read_json,
        parts_path,
        write_json,
    )
except ImportError:  # Direct execution from the backend directory.
    from admin_store import (
        VALID_ROLES,
        authenticate_user,
        find_user,
        get_recipient_emails,
        hash_password,
        load_admin_settings,
        public_user,
        save_admin_settings,
    )
    from email_service import EmailSettings, send_request_emails
    from pdf_service import build_parts_request_pdf
    from storage import (
        DATA_DIR,
        drawing_image_path,
        hotspots_path,
        list_drawings,
        load_drawing,
        load_hotspots,
        load_parts_catalog,
        load_parts,
        read_json,
        parts_path,
        write_json,
    )


app = FastAPI(
    title="Interactive Parts Drawings API",
    description="Drawing library, hotspot lookup, and parts-request API.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ENGINE_IMAGE_DIR = DATA_DIR / "Type_of_engines"
SAVED_ORDERS_PATH = DATA_DIR / "saved-orders.json"
ACTIVE_SESSIONS: dict[str, str] = {}
EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


def engine_model_from_name(name: str) -> str:
    if (DATA_DIR / name).is_dir():
        return name
    if name.startswith("6") and (DATA_DIR / name[1:]).is_dir():
        return name[1:]
    return name


def request_id_component(value: str, max_length: int) -> str:
    normalized = re.sub(r"[^A-Za-z0-9]+", "-", value.strip()).strip("-").upper()
    return (normalized or "UNKNOWN")[:max_length].rstrip("-")


def build_request_id(customer: "CustomerInformation", created_at: datetime) -> str:
    vessel = request_id_component(customer.vessel_name, 48)
    imo = request_id_component(customer.imo_number, 24)
    engine_serial = request_id_component(customer.engine_serial_number, 40)
    request_date = created_at.strftime("%Y%m%d")
    return f"{vessel}-{imo}-{engine_serial}-{request_date}"


class RequestItem(BaseModel):
    drawing_id: str | None = Field(default=None, alias="drawingId")
    item: str
    quantity: int = Field(default=1, ge=1)


class CustomerInformation(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=254, pattern=EMAIL_PATTERN)
    company: str = Field(min_length=1, max_length=160)
    phone: str = Field(min_length=1, max_length=40)
    engine_name: str = Field(alias="engineName", min_length=1, max_length=160)
    engine_serial_number: str = Field(alias="engineSerialNumber", min_length=1, max_length=100)
    vessel_name: str = Field(alias="vesselName", min_length=1, max_length=160)
    imo_number: str = Field(alias="imoNumber", min_length=1, max_length=20)


class PartsRequest(BaseModel):
    # Kept optional for compatibility with the former single-drawing payload.
    drawing_id: str | None = Field(default=None, alias="drawingId")
    customer: CustomerInformation
    items: list[RequestItem] = Field(min_length=1)


class LoginCredentials(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=200)


class PasswordChange(BaseModel):
    current_password: str = Field(alias="currentPassword", min_length=1, max_length=200)
    new_password: str = Field(alias="newPassword", min_length=8, max_length=200)


class SavedOrderPayload(BaseModel):
    engine: dict | None = None
    items: list[dict] = Field(min_length=1)


class UserEngine(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=160)
    serial_number: str = Field(alias="serialNumber", min_length=1, max_length=100)


class UserVessel(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=160)
    imo_number: str = Field(alias="imoNumber", min_length=1, max_length=20)
    engines: list[UserEngine] = Field(min_length=1)


class UserProfile(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=254, pattern=EMAIL_PATTERN)
    company: str = Field(min_length=1, max_length=160)
    phone: str = Field(min_length=1, max_length=40)
    vessels: list[UserVessel] = Field(min_length=1)


class AdminUserCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    username: str = Field(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9._-]+$")
    password: str = Field(min_length=8, max_length=200)
    role: str = "User"
    profile: UserProfile


class AdminUserUpdate(BaseModel):
    password: str | None = Field(default=None, min_length=8, max_length=200)
    role: str
    active: bool


class RecipientCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: str = Field(min_length=3, max_length=254, pattern=EMAIL_PATTERN)


class HotspotPosition(BaseModel):
    item: str = Field(min_length=1, max_length=20)
    left: float = Field(ge=0, le=100)
    top: float = Field(ge=0, le=100)
    width: float = Field(default=2, gt=0, le=100)
    height: float = Field(default=1.5, gt=0, le=100)
    confidence: float | None = Field(default=None, ge=0, le=100)
    source: str | None = None


class HotspotUpdate(BaseModel):
    hotspots: list[HotspotPosition]


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "drawingCount": len(list_drawings())}


@app.get("/api/parts/search")
def search_parts(
    q: str = "",
    engine: str = "DE18",
    chapter: int | None = Query(default=None, ge=1),
    item: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
) -> dict:
    catalog = load_parts_catalog(engine)
    query = q.strip().lower()
    searchable_fields = ("partCode", "drawingName", "partNo", "partName", "item")
    matches = []

    for part in catalog["parts"]:
        if chapter is not None and part["chapter"] != chapter:
            continue
        if item is not None and part["item"] != item:
            continue
        if query and not any(query in str(part[field]).lower() for field in searchable_fields):
            continue
        matches.append(part)
        if len(matches) == limit:
            break

    return {"count": len(matches), "parts": matches}


@app.get("/api/reference-manual")
def download_reference_manual(model: str = "DE18") -> FileResponse:
    normalized_model = model.strip().upper()
    if not re.fullmatch(r"[A-Z0-9-]+", normalized_model):
        raise HTTPException(status_code=400, detail="Invalid engine model")
    manual_path = DATA_DIR / normalized_model / f"{normalized_model} Spare Part.pdf"
    if not manual_path.is_file():
        raise HTTPException(status_code=404, detail="Reference manual was not found")
    return FileResponse(
        manual_path,
        media_type="application/pdf",
        filename=manual_path.name,
    )


@app.post("/api/login")
def login(credentials: LoginCredentials) -> dict:
    authenticated_user = authenticate_user(credentials.username, credentials.password)
    if not authenticated_user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = secrets.token_urlsafe(32)
    ACTIVE_SESSIONS[token] = authenticated_user["username"]
    return {"user": {**authenticated_user, "token": token}}


def require_authenticated_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Sign-in required")
    token = authorization.removeprefix("Bearer ").strip()
    username = ACTIVE_SESSIONS.get(token)
    user = find_user(username) if username else None
    if not user or not user.get("active", True):
        raise HTTPException(status_code=403, detail="The session is no longer valid")
    return user


def require_administrator(user: dict = Depends(require_authenticated_user)) -> dict:
    if user["role"] != "Administrator":
        raise HTTPException(status_code=403, detail="Administrator access required")
    return public_user(user)


@app.get("/api/profile")
def get_current_profile(user: dict = Depends(require_authenticated_user)) -> dict:
    return user.get("profile", {})


@app.put("/api/profile/password", status_code=status.HTTP_204_NO_CONTENT)
def change_current_password(payload: PasswordChange, user: dict = Depends(require_authenticated_user)) -> None:
    if not authenticate_user(user["username"], payload.current_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from the current password")
    settings = load_admin_settings()
    stored_user = next(item for item in settings["users"] if item["username"].lower() == user["username"].lower())
    stored_user["passwordSalt"], stored_user["passwordHash"] = hash_password(payload.new_password)
    save_admin_settings(settings)


@app.get("/api/saved-order")
def get_saved_order(user: dict = Depends(require_authenticated_user)) -> dict:
    orders = read_json(SAVED_ORDERS_PATH, {})
    return {"order": orders.get(user["username"].lower())}


@app.put("/api/saved-order")
def save_order(payload: SavedOrderPayload, user: dict = Depends(require_authenticated_user)) -> dict:
    orders = read_json(SAVED_ORDERS_PATH, {})
    saved_order = {
        "engine": payload.engine,
        "items": payload.items,
        "savedAt": datetime.now(timezone.utc).isoformat(),
    }
    orders[user["username"].lower()] = saved_order
    write_json(SAVED_ORDERS_PATH, orders)
    return saved_order


@app.delete("/api/saved-order", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_order(user: dict = Depends(require_authenticated_user)) -> None:
    orders = read_json(SAVED_ORDERS_PATH, {})
    orders.pop(user["username"].lower(), None)
    write_json(SAVED_ORDERS_PATH, orders)


@app.get("/api/admin/settings")
def get_admin_settings(_: dict = Depends(require_administrator)) -> dict:
    settings = load_admin_settings()
    smtp_settings = EmailSettings.from_environment(get_recipient_emails())
    return {
        "users": [public_user(user) for user in settings["users"]],
        "recipients": settings.get("recipients", []),
        "smtp": {
            "configured": smtp_settings.is_configured(),
            "host": smtp_settings.host,
            "fromEmail": smtp_settings.from_email,
        },
    }


@app.post("/api/admin/users", status_code=status.HTTP_201_CREATED)
def create_admin_user(payload: AdminUserCreate, _: dict = Depends(require_administrator)) -> dict:
    if payload.role not in VALID_ROLES:
        raise HTTPException(status_code=422, detail="Role must be Administrator or User")
    settings = load_admin_settings()
    if any(user["username"].lower() == payload.username.lower() for user in settings["users"]):
        raise HTTPException(status_code=409, detail="Username already exists")
    imo_numbers = [vessel.imo_number.lower() for vessel in payload.profile.vessels]
    if len(imo_numbers) != len(set(imo_numbers)):
        raise HTTPException(status_code=422, detail="Each vessel must have a unique IMO number")
    serial_numbers = [
        engine.serial_number.lower()
        for vessel in payload.profile.vessels
        for engine in vessel.engines
    ]
    if len(serial_numbers) != len(set(serial_numbers)):
        raise HTTPException(status_code=422, detail="Each engine must have a unique serial number")
    salt, password_hash = hash_password(payload.password)
    user = {
        "username": payload.username,
        "role": payload.role,
        "active": True,
        "passwordSalt": salt,
        "passwordHash": password_hash,
        "profile": payload.profile.model_dump(by_alias=True),
    }
    settings["users"].append(user)
    save_admin_settings(settings)
    return public_user(user)


@app.put("/api/admin/users/{username}")
def update_admin_user(username: str, payload: AdminUserUpdate, administrator: dict = Depends(require_administrator)) -> dict:
    if payload.role not in VALID_ROLES:
        raise HTTPException(status_code=422, detail="Role must be Administrator or User")
    settings = load_admin_settings()
    user = next((item for item in settings["users"] if item["username"].lower() == username.lower()), None)
    if not user:
        raise HTTPException(status_code=404, detail="User was not found")
    removing_admin_access = user["role"] == "Administrator" and (payload.role != "Administrator" or not payload.active)
    active_admins = [item for item in settings["users"] if item["role"] == "Administrator" and item.get("active", True)]
    if removing_admin_access and len(active_admins) == 1:
        raise HTTPException(status_code=409, detail="At least one active administrator is required")
    if user["username"] == administrator["username"] and not payload.active:
        raise HTTPException(status_code=409, detail="You cannot deactivate your own account")
    user["role"] = payload.role
    user["active"] = payload.active
    if payload.password:
        user["passwordSalt"], user["passwordHash"] = hash_password(payload.password)
    save_admin_settings(settings)
    return public_user(user)


@app.delete("/api/admin/users/{username}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_user(username: str, administrator: dict = Depends(require_administrator)) -> None:
    settings = load_admin_settings()
    user = next((item for item in settings["users"] if item["username"].lower() == username.lower()), None)
    if not user:
        raise HTTPException(status_code=404, detail="User was not found")
    if user["username"] == administrator["username"]:
        raise HTTPException(status_code=409, detail="You cannot delete your own account")
    if user["role"] == "Administrator" and user.get("active", True):
        active_admins = [item for item in settings["users"] if item["role"] == "Administrator" and item.get("active", True)]
        if len(active_admins) == 1:
            raise HTTPException(status_code=409, detail="At least one active administrator is required")
    settings["users"] = [item for item in settings["users"] if item is not user]
    save_admin_settings(settings)


@app.post("/api/admin/recipients", status_code=status.HTTP_201_CREATED)
def create_recipient(payload: RecipientCreate, _: dict = Depends(require_administrator)) -> dict:
    settings = load_admin_settings()
    recipients = settings.setdefault("recipients", [])
    if any(email.lower() == payload.email.lower() for email in recipients):
        raise HTTPException(status_code=409, detail="Recipient email already exists")
    recipients.append(payload.email.lower())
    save_admin_settings(settings)
    return {"email": payload.email.lower()}


@app.delete("/api/admin/recipients/{email}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipient(email: str, _: dict = Depends(require_administrator)) -> None:
    settings = load_admin_settings()
    recipients = settings.setdefault("recipients", [])
    matching_email = next((item for item in recipients if item.lower() == email.lower()), None)
    if not matching_email:
        raise HTTPException(status_code=404, detail="Recipient email was not found")
    if len(recipients) == 1:
        raise HTTPException(status_code=409, detail="At least one order recipient is required")
    settings["recipients"] = [item for item in recipients if item != matching_email]
    save_admin_settings(settings)


@app.get("/api/drawings")
def get_drawings() -> list[dict]:
    return list_drawings()


@app.get("/api/chapters")
def get_chapters(model: str = "DE18") -> list[dict]:
    model_directory = DATA_DIR / model.upper()
    return [read_json(path) for path in sorted(model_directory.glob("Chapter*/chapter.json"))]


@app.get("/api/engines")
def get_engines() -> list[dict]:
    engines = []
    for image_path in sorted(ENGINE_IMAGE_DIR.glob("*.png")):
        name = image_path.stem.upper()
        model = engine_model_from_name(name)
        available = (DATA_DIR / model).is_dir()
        engines.append({
            "id": name.lower(),
            "name": name,
            "model": model,
            "imageUrl": f"/api/engines/{image_path.name}/image",
            "available": available,
            # Keeps older open frontend sessions compatible without scanning drawings.
            "drawingCount": 1 if available else 0,
        })
    return engines


@app.get("/api/engines/{filename}/image")
def get_engine_image(filename: str):
    if not re.fullmatch(r"[A-Za-z0-9-]+\.png", filename):
        raise HTTPException(status_code=404, detail="Engine image was not found")
    image_path = ENGINE_IMAGE_DIR / filename
    if not image_path.is_file():
        raise HTTPException(status_code=404, detail="Engine image was not found")
    return FileResponse(image_path, media_type="image/png")


@app.get("/api/drawings/{drawing_id}")
def get_drawing(drawing_id: str) -> dict:
    try:
        metadata = load_drawing(drawing_id)
        hotspot_data = load_hotspots(drawing_id)
    except (FileNotFoundError, ValueError):
        raise HTTPException(status_code=404, detail=f"Drawing {drawing_id} was not found") from None

    parts = load_parts(drawing_id)
    hotspots = [
        {
            **hotspot,
            "part": parts.get(
                hotspot["item"],
                {
                    "partNumber": f"TBD-{hotspot['item']}",
                    "name": f"PART {hotspot['item']}",
                    "quantity": 1,
                },
            ),
        }
        for hotspot in hotspot_data["hotspots"]
    ]
    return {
        **metadata,
        "imageUrl": f"/api/drawings/{drawing_id}/image",
        "hotspots": hotspots,
    }


@app.get("/api/drawings/{drawing_id}/image")
def get_drawing_image(drawing_id: str):
    try:
        image_path = drawing_image_path(drawing_id)
    except (FileNotFoundError, ValueError):
        raise HTTPException(status_code=404, detail=f"Drawing {drawing_id} was not found") from None
    return FileResponse(image_path, media_type="image/png")


@app.put("/api/drawings/{drawing_id}/hotspots")
def update_hotspots(
    drawing_id: str,
    update: HotspotUpdate,
    _: dict = Depends(require_administrator),
) -> dict:
    try:
        load_drawing(drawing_id)
        parts = load_parts(drawing_id)
    except (FileNotFoundError, ValueError):
        raise HTTPException(status_code=404, detail=f"Drawing {drawing_id} was not found") from None

    hotspots = [hotspot.model_dump(exclude_none=True) for hotspot in update.hotspots]
    for item in {hotspot["item"] for hotspot in hotspots}:
        parts.setdefault(
            item,
            {
                "partNumber": f"TBD-{item}",
                "name": f"PART {item}",
                "quantity": 1,
                "note": "Manually added hotspot. Add the exact parts-PDF mapping.",
            },
        )
    write_json(hotspots_path(drawing_id), {"drawingId": drawing_id, "hotspots": hotspots})
    write_json(parts_path(drawing_id), parts)
    return {"drawingId": drawing_id, "hotspotCount": len(hotspots)}


@app.get("/api/drawings/{drawing_id}/parts")
def list_parts(drawing_id: str) -> dict[str, dict]:
    try:
        load_drawing(drawing_id)
        return load_parts(drawing_id)
    except (FileNotFoundError, ValueError):
        raise HTTPException(status_code=404, detail=f"Drawing {drawing_id} was not found") from None


@app.get("/api/drawings/{drawing_id}/parts/{item}")
def get_part(drawing_id: str, item: str) -> dict:
    try:
        load_drawing(drawing_id)
        part = load_parts(drawing_id).get(item)
    except (FileNotFoundError, ValueError):
        raise HTTPException(status_code=404, detail=f"Drawing {drawing_id} was not found") from None
    if part is None:
        raise HTTPException(status_code=404, detail=f"Item {item} was not found in {drawing_id}")
    return {"drawingId": drawing_id, "item": item, **part}


def resolve_request_items(parts_request: PartsRequest) -> tuple[list[dict], dict[str, dict]]:
    accepted_items = []
    drawings: dict[str, dict] = {}
    parts_by_drawing: dict[str, dict] = {}
    for request_item in parts_request.items:
        drawing_id = request_item.drawing_id or parts_request.drawing_id
        if not drawing_id:
            raise HTTPException(status_code=422, detail=f"Drawing is required for item {request_item.item}")
        if drawing_id not in drawings:
            try:
                drawings[drawing_id] = load_drawing(drawing_id)
                parts_by_drawing[drawing_id] = load_parts(drawing_id)
            except (FileNotFoundError, ValueError):
                raise HTTPException(status_code=404, detail=f"Drawing {drawing_id} was not found") from None
        drawing = drawings[drawing_id]
        part = parts_by_drawing[drawing_id].get(request_item.item)
        if part is None:
            raise HTTPException(status_code=404, detail=f"Item {request_item.item} was not found in {drawing_id}")
        accepted_items.append({
            "drawingId": drawing_id,
            "drawingTitle": drawing["title"],
            "drawingLabel": f"Chapter {drawing['chapter']} / Item {drawing['item']} - {drawing['title']}",
            "item": request_item.item,
            "quantity": request_item.quantity,
            "partNumber": part["partNumber"],
            "name": part["name"],
        })
    return accepted_items, drawings


@app.post("/api/requests/preview")
def preview_parts_request(parts_request: PartsRequest) -> Response:
    accepted_items, drawings = resolve_request_items(parts_request)
    created_at = datetime.now(timezone.utc)
    drawing_titles = [drawing["title"] for drawing in drawings.values()]
    preview_request = {
        "requestId": f"PREVIEW-{build_request_id(parts_request.customer, created_at)}",
        "drawingTitle": ", ".join(drawing_titles),
        "createdAt": created_at.isoformat(),
        "customer": parts_request.customer.model_dump(by_alias=True),
        "items": accepted_items,
    }
    pdf_content = build_parts_request_pdf(preview_request)
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="parts-request-preview.pdf"'},
    )


@app.get("/api/requests/pdf/{filename}")
def download_request_pdf(filename: str) -> FileResponse:
    if not re.fullmatch(r"[A-Za-z0-9.-]+\.pdf", filename):
        raise HTTPException(status_code=404, detail="Request PDF was not found")
    pdf_path = DATA_DIR / "requests" / filename
    if not pdf_path.is_file():
        raise HTTPException(status_code=404, detail="Request PDF was not found")
    return FileResponse(pdf_path, media_type="application/pdf", filename=filename)


@app.post("/api/requests", status_code=status.HTTP_201_CREATED)
def create_parts_request(parts_request: PartsRequest) -> dict:
    accepted_items, drawings = resolve_request_items(parts_request)

    created_at = datetime.now(timezone.utc)
    request_id = build_request_id(parts_request.customer, created_at)
    pdf_filename = f"{request_id}.pdf"
    drawing_ids = list(drawings)
    drawing_titles = [drawings[drawing_id]["title"] for drawing_id in drawing_ids]
    drawing_record_component = (
        drawing_ids[0].upper() if len(drawing_ids) == 1 else "MULTI-DRAWINGS"
    )
    record_id = (
        f"{request_id}-{drawing_record_component}-"
        f"{created_at.strftime('%H%M%S%f')}"
    )
    stored_pdf_filename = f"{record_id}.pdf"
    created_request = {
        "requestId": request_id,
        "drawingIds": drawing_ids,
        "drawingTitles": drawing_titles,
        "drawingTitle": ", ".join(drawing_titles),
        "createdAt": created_at.isoformat(),
        "customer": parts_request.customer.model_dump(by_alias=True),
        "items": accepted_items,
        "pdfFilename": pdf_filename,
        "storedPdfFilename": stored_pdf_filename,
    }
    pdf_content = build_parts_request_pdf(created_request)
    requests_directory = DATA_DIR / "requests"
    requests_directory.mkdir(parents=True, exist_ok=True)
    (requests_directory / stored_pdf_filename).write_bytes(pdf_content)
    request_json_path = requests_directory / f"{record_id}.json"
    write_json(request_json_path, created_request)
    created_request["emailDelivery"] = send_request_emails(
        created_request,
        get_recipient_emails(),
        pdf_content,
        pdf_filename,
    )
    write_json(request_json_path, created_request)
    return created_request


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
