from __future__ import annotations

import json
from pathlib import Path
import re
import shutil
import struct


BACKEND_DIR = Path(__file__).resolve().parent
DATA_DIR = BACKEND_DIR / "data"
DRAWING_ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
MODEL_PATTERN = re.compile(r"^[A-Za-z0-9-]+$")
ITEM_CODE_PATTERN = re.compile(r"^\d+(?:\.\d+)?$")


def read_json(path: Path, default=None):
    if not path.exists():
        if default is not None:
            return default
        raise FileNotFoundError(path)
    with path.open(encoding="utf-8") as json_file:
        return json.load(json_file)


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_suffix(path.suffix + ".tmp")
    with temporary_path.open("w", encoding="utf-8") as json_file:
        json.dump(data, json_file, indent=2, ensure_ascii=True)
        json_file.write("\n")
    temporary_path.replace(path)


def png_size(path: Path) -> tuple[int, int]:
    with path.open("rb") as image_file:
        header = image_file.read(24)
    if header[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"Expected a PNG image: {path}")
    return struct.unpack(">II", header[16:24])


def validate_drawing_id(drawing_id: str) -> str:
    if not DRAWING_ID_PATTERN.fullmatch(drawing_id):
        raise ValueError("Drawing ID must use lowercase letters, numbers, and single hyphens.")
    return drawing_id


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    if not slug:
        raise ValueError(f"Cannot create a slug from: {value}")
    return slug


def item_directory_path(model: str, chapter: int, item_code: str, title: str) -> Path:
    normalized_model = model.upper()
    folder_item_code = item_code.zfill(2) if "." not in item_code else item_code
    return (
        DATA_DIR
        / normalized_model
        / f"Chapter{chapter}"
        / f"Item{folder_item_code}-{slugify(title)}"
    )


def drawing_metadata_path(drawing_id: str) -> Path:
    validate_drawing_id(drawing_id)
    for metadata_path in DATA_DIR.glob("*/Chapter*/Item*/drawing.json"):
        if read_json(metadata_path).get("id") == drawing_id:
            return metadata_path
    raise FileNotFoundError(f"Drawing metadata not found: {drawing_id}")


def drawing_directory(drawing_id: str) -> Path:
    return drawing_metadata_path(drawing_id).parent


def hotspots_path(drawing_id: str) -> Path:
    return drawing_directory(drawing_id) / "hotspots.json"


def parts_path(drawing_id: str) -> Path:
    return drawing_directory(drawing_id) / "parts.json"


def load_parts(drawing_id: str) -> dict[str, dict]:
    return read_json(parts_path(drawing_id), {})


def load_parts_catalog(model: str) -> dict:
    return read_json(DATA_DIR / model.upper() / "parts-catalog.json", {"parts": []})


def load_drawing(drawing_id: str) -> dict:
    return read_json(drawing_metadata_path(drawing_id))


def load_hotspots(drawing_id: str) -> dict:
    return read_json(hotspots_path(drawing_id), {"drawingId": drawing_id, "hotspots": []})


def drawing_image_path(drawing_id: str) -> Path:
    metadata = load_drawing(drawing_id)
    directory = drawing_directory(drawing_id)
    image_path = directory / metadata["imageFilename"]
    if image_path.is_file():
        return image_path

    image_candidates = list(directory.glob("*.png"))
    if len(image_candidates) == 1:
        return image_candidates[0]
    raise FileNotFoundError(image_path)


def list_drawings() -> list[dict]:
    drawings = []
    for metadata_path in sorted(DATA_DIR.glob("*/Chapter*/Item*/drawing.json")):
        metadata = read_json(metadata_path)
        hotspots = read_json(metadata_path.parent / "hotspots.json", {"hotspots": []})
        parts = read_json(metadata_path.parent / "parts.json", {})
        drawings.append(
            {
                **metadata,
                "hotspotCount": len(hotspots["hotspots"]),
                "partCount": len(parts),
            }
        )
    return drawings


def register_drawing(
    model: str,
    chapter: int,
    item_code: str,
    title: str,
    image_source: Path,
    expected_items: list[str] | None = None,
    ocr_profile: str = "generic",
    replace: bool = False,
) -> dict:
    if not MODEL_PATTERN.fullmatch(model):
        raise ValueError("Model must use letters, numbers, and hyphens.")
    if chapter < 1:
        raise ValueError("Chapter must be a positive integer.")
    if not ITEM_CODE_PATTERN.fullmatch(item_code):
        raise ValueError("Item must be a number or decimal variant such as 12.1.")

    normalized_model = model.upper()
    folder_item_code = item_code.zfill(2) if "." not in item_code else item_code
    title_slug = slugify(title)
    drawing_id = slugify(
        f"{normalized_model}-chapter{chapter}-item{folder_item_code}-{title_slug}"
    )
    validate_drawing_id(drawing_id)
    source = image_source.resolve()
    if not source.is_file():
        raise FileNotFoundError(source)

    target_directory = item_directory_path(normalized_model, chapter, item_code, title)
    metadata_path = target_directory / "drawing.json"
    if metadata_path.exists() and not replace:
        raise FileExistsError(f"Drawing already exists: {drawing_id}")

    width, height = png_size(source)
    target_directory.mkdir(parents=True, exist_ok=True)
    placeholder = target_directory / ".gitkeep"
    if placeholder.exists():
        placeholder.unlink()
    image_filename = source.name
    target_image = target_directory / image_filename
    if source != target_image.resolve():
        shutil.copy2(source, target_image)

    metadata = {
        "id": drawing_id,
        "model": normalized_model,
        "chapter": chapter,
        "item": item_code,
        "title": title,
        "imageFilename": image_filename,
        "width": width,
        "height": height,
        "expectedItems": expected_items or [],
        "ocrProfile": ocr_profile,
    }
    write_json(metadata_path, metadata)
    if not hotspots_path(drawing_id).exists() or replace:
        write_json(hotspots_path(drawing_id), {"drawingId": drawing_id, "hotspots": []})
    if not parts_path(drawing_id).exists():
        write_json(parts_path(drawing_id), {})
    return metadata
