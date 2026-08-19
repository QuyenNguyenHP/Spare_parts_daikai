from __future__ import annotations

import argparse
import csv
from io import StringIO
from pathlib import Path
import re
import shutil
import subprocess

from storage import (
    drawing_metadata_path,
    drawing_image_path,
    hotspots_path,
    list_drawings,
    load_drawing,
    load_parts,
    parts_path,
    png_size,
    write_json,
)


def resolve_tesseract_command() -> str:
    configured = shutil.which("tesseract")
    if configured:
        return configured

    common_windows_path = Path("C:/Program Files/Tesseract-OCR/tesseract.exe")
    if common_windows_path.is_file():
        return str(common_windows_path)

    raise FileNotFoundError(
        "Tesseract OCR executable was not found. Install Tesseract or add it to PATH."
    )


def normalize_item(raw_text: str, expected_items: set[str], profile: str) -> str | None:
    text = raw_text.strip().upper()
    if len(text) > 8 or not re.fullmatch(r"[A-Z0-9]+(?:\.[A-Z0-9]+)?", text):
        return None

    if text in expected_items:
        return text

    # Letters are accepted only when explicitly listed, otherwise drawing labels
    # and section markers would create many false hotspots.
    if not text.isdigit():
        return None

    if profile == "de18":
        if len(text) == 3 and text.startswith("0"):
            candidate = str(500 + int(text))
            return candidate if not expected_items or candidate in expected_items else None
        value = int(text)
        candidates = [str(value - 400)] if 900 <= value <= 930 else [str(value)]
        if 200 <= value <= 230:
            candidates.append(str(value + 300))
    else:
        candidates = [str(int(text))]

    for candidate in candidates:
        if not expected_items or candidate in expected_items:
            return candidate
    return None


def run_ocr(image_path, page_mode: int, expected_items: set[str], profile: str) -> list[dict]:
    whitelist = "".join(
        sorted({character for item in expected_items for character in item})
    ) or "0123456789"
    tesseract_command = resolve_tesseract_command()
    result = subprocess.run(
        [
            tesseract_command,
            str(image_path),
            "stdout",
            "--psm",
            str(page_mode),
            "-c",
            f"tessedit_char_whitelist={whitelist}",
            "tsv",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    rows = []
    for row in csv.DictReader(StringIO(result.stdout), delimiter="\t"):
        item = normalize_item(row.get("text", ""), expected_items, profile)
        confidence = float(row.get("conf", -1))
        if item is None or confidence < 20:
            continue
        rows.append(
            {
                "item": item,
                "confidence": confidence,
                "left": int(row["left"]),
                "top": int(row["top"]),
                "width": int(row["width"]),
                "height": int(row["height"]),
            }
        )
    return rows


def merge_detections(
    detections: list[dict],
    image_width: int,
    image_height: int,
    fallback_anchors: dict[str, list[int]],
) -> list[dict]:
    merged: dict[str, list[dict]] = {}
    for detection in sorted(detections, key=lambda row: row["confidence"], reverse=True):
        center_x = detection["left"] + detection["width"] / 2
        center_y = detection["top"] + detection["height"] / 2
        item_positions = merged.setdefault(detection["item"], [])
        if any(
            abs(center_x - position["pixelX"]) < 32
            and abs(center_y - position["pixelY"]) < 24
            for position in item_positions
        ):
            continue
        item_positions.append(
            {
                "item": detection["item"],
                "left": round(center_x / image_width * 100, 3),
                "top": round(center_y / image_height * 100, 3),
                "width": round((detection["width"] + 14) / image_width * 100, 3),
                "height": round((detection["height"] + 10) / image_height * 100, 3),
                "confidence": round(detection["confidence"], 1),
                "pixelX": round(center_x),
                "pixelY": round(center_y),
            }
        )

    for item, anchor in fallback_anchors.items():
        center_x, center_y = anchor
        merged[item] = [
            {
                "item": item,
                "left": round(center_x / image_width * 100, 3),
                "top": round(center_y / image_height * 100, 3),
                "width": round(115 / image_width * 100, 3),
                "height": round(60 / image_height * 100, 3),
                "confidence": 100.0,
                "source": "fallback",
            }
        ]

    hotspots = []
    for positions in merged.values():
        positions.sort(key=lambda position: (position.get("pixelY", 0), position.get("pixelX", 0)))
        for position in positions:
            position.pop("pixelX", None)
            position.pop("pixelY", None)
            hotspots.append(position)
    return hotspots


def update_part_catalog(drawing_id: str, hotspots: list[dict], write: bool) -> None:
    parts = load_parts(drawing_id)
    for item in {hotspot["item"] for hotspot in hotspots}:
        parts.setdefault(
            item,
            {
                "partNumber": f"TBD-{item}",
                "name": f"PART {item}",
                "quantity": 1,
                "note": "OCR-created placeholder. Add the exact parts-PDF mapping.",
            },
        )
    if write:
        write_json(parts_path(drawing_id), parts)


def detect_drawing(
    drawing_id: str,
    write: bool,
    expected_override: list[str] | None = None,
) -> tuple[int, set[str], set[str]]:
    metadata = load_drawing(drawing_id)
    image_path = drawing_image_path(drawing_id)
    image_width, image_height = png_size(image_path)
    expected_values = (
        expected_override if expected_override is not None else metadata.get("expectedItems", [])
    )
    normalized_expected = list(
        dict.fromkeys(str(item).strip().upper() for item in expected_values if str(item).strip())
    )
    expected_items = set(normalized_expected)
    profile = metadata.get("ocrProfile", "generic")
    detections = []
    for page_mode in (6, 11, 12):
        detections.extend(run_ocr(image_path, page_mode, expected_items, profile))

    hotspots = merge_detections(
        detections,
        image_width,
        image_height,
        metadata.get("fallbackAnchors", {}),
    )
    update_part_catalog(drawing_id, hotspots, write)
    if write:
        write_json(hotspots_path(drawing_id), {"drawingId": drawing_id, "hotspots": hotspots})
        if expected_override is not None:
            metadata["expectedItems"] = normalized_expected
            write_json(drawing_metadata_path(drawing_id), metadata)
    detected_items = {hotspot["item"] for hotspot in hotspots}
    return len(hotspots), detected_items, expected_items


def main() -> None:
    parser = argparse.ArgumentParser(description="Detect item-number hotspots for registered drawings.")
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument("--drawing", help="Registered drawing ID")
    target.add_argument("--all", action="store_true", help="Process every registered drawing")
    parser.add_argument("--write", action="store_true", help="Save hotspot and part data")
    parser.add_argument(
        "--items",
        help="Comma-separated expected item numbers; filters OCR and is saved with --write",
    )
    args = parser.parse_args()

    if args.all and args.items:
        parser.error("--items can only be used with one --drawing")
    expected_override = None
    if args.items is not None:
        expected_override = [item.strip().upper() for item in args.items.split(",") if item.strip()]
        if not expected_override:
            parser.error("--items must contain at least one item number")
        invalid_items = [
            item
            for item in expected_override
            if not re.fullmatch(r"[A-Z0-9]+(?:\.[A-Z0-9]+)?", item)
        ]
        if invalid_items:
            parser.error(f"invalid item labels: {', '.join(invalid_items)}")

    drawing_ids = [drawing["id"] for drawing in list_drawings()] if args.all else [args.drawing]
    if not drawing_ids:
        raise SystemExit("No drawings are registered.")
    for drawing_id in drawing_ids:
        hotspot_count, detected_items, expected_items = detect_drawing(
            drawing_id,
            args.write,
            expected_override,
        )
        action = "saved" if args.write else "previewed"
        print(f"{drawing_id}: {action} {hotspot_count} hotspots for {len(detected_items)} items.")
        missing_items = expected_items - detected_items
        if missing_items:
            ordered = sorted(missing_items, key=lambda item: (len(item), item))
            print(f"Missing expected items: {', '.join(ordered)}")


if __name__ == "__main__":
    main()
