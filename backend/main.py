from datetime import datetime, timezone
import os
import re
import secrets

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field

try:
    from .email_service import send_request_emails
    from .storage import (
        DATA_DIR,
        drawing_image_path,
        hotspots_path,
        list_drawings,
        load_drawing,
        load_hotspots,
        load_parts,
        parts_path,
        write_json,
    )
except ImportError:  # Direct execution from the backend directory.
    from email_service import send_request_emails
    from storage import (
        DATA_DIR,
        drawing_image_path,
        hotspots_path,
        list_drawings,
        load_drawing,
        load_hotspots,
        load_parts,
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


def engine_model_from_name(name: str) -> str:
    if (DATA_DIR / name).is_dir():
        return name
    if name.startswith("6") and (DATA_DIR / name[1:]).is_dir():
        return name[1:]
    return name


class RequestItem(BaseModel):
    item: str
    quantity: int = Field(default=1, ge=1)


class CustomerInformation(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    company: str = Field(min_length=1, max_length=160)
    phone: str = Field(min_length=1, max_length=40)
    engine_name: str = Field(alias="engineName", min_length=1, max_length=160)
    engine_serial_number: str = Field(alias="engineSerialNumber", min_length=1, max_length=100)
    vessel_name: str = Field(alias="vesselName", min_length=1, max_length=160)
    imo_number: str = Field(alias="imoNumber", min_length=1, max_length=20)


class PartsRequest(BaseModel):
    drawing_id: str = Field(alias="drawingId")
    customer: CustomerInformation
    items: list[RequestItem] = Field(min_length=1)


class LoginCredentials(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=200)


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


@app.post("/api/login")
def login(credentials: LoginCredentials) -> dict:
    expected_username = os.getenv("SPARE_PARTS_USERNAME", "admin")
    expected_password = os.getenv("SPARE_PARTS_PASSWORD", "admin123")
    username_matches = secrets.compare_digest(
        credentials.username.strip().encode("utf-8"),
        expected_username.encode("utf-8"),
    )
    password_matches = secrets.compare_digest(
        credentials.password.encode("utf-8"),
        expected_password.encode("utf-8"),
    )
    if not username_matches or not password_matches:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {
        "user": {
            "username": expected_username,
            "role": "Administrator",
        }
    }


@app.get("/api/drawings")
def get_drawings() -> list[dict]:
    return list_drawings()


@app.get("/api/engines")
def get_engines() -> list[dict]:
    drawing_counts: dict[str, int] = {}
    for drawing in list_drawings():
        model = drawing["model"]
        drawing_counts[model] = drawing_counts.get(model, 0) + 1
    engines = []
    for image_path in sorted(ENGINE_IMAGE_DIR.glob("*.png")):
        name = image_path.stem.upper()
        model = engine_model_from_name(name)
        engines.append({
            "id": name.lower(),
            "name": name,
            "model": model,
            "imageUrl": f"/api/engines/{image_path.name}/image",
            "drawingCount": drawing_counts.get(model, 0),
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
def update_hotspots(drawing_id: str, update: HotspotUpdate) -> dict:
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


@app.post("/api/requests", status_code=status.HTTP_201_CREATED)
def create_parts_request(parts_request: PartsRequest) -> dict:
    try:
        drawing = load_drawing(parts_request.drawing_id)
        parts = load_parts(parts_request.drawing_id)
    except (FileNotFoundError, ValueError):
        raise HTTPException(
            status_code=404,
            detail=f"Drawing {parts_request.drawing_id} was not found",
        ) from None
    accepted_items = []

    for request_item in parts_request.items:
        part = parts.get(request_item.item)
        if part is None:
            raise HTTPException(
                status_code=404,
                detail=f"Item {request_item.item} was not found in {parts_request.drawing_id}",
            )
        accepted_items.append(
            {
                "item": request_item.item,
                "quantity": request_item.quantity,
                "partNumber": part["partNumber"],
                "name": part["name"],
            }
        )

    created_at = datetime.now(timezone.utc)
    request_id = f"{parts_request.drawing_id.upper()}-{created_at.strftime('%Y%m%d%H%M%S%f')}"
    created_request = {
        "requestId": request_id,
        "drawingId": parts_request.drawing_id,
        "drawingTitle": drawing["title"],
        "createdAt": created_at.isoformat(),
        "customer": parts_request.customer.model_dump(by_alias=True),
        "items": accepted_items,
    }
    write_json(DATA_DIR / "requests" / f"{request_id}.json", created_request)
    created_request["emailDelivery"] = send_request_emails(created_request)
    write_json(DATA_DIR / "requests" / f"{request_id}.json", created_request)
    return created_request


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
