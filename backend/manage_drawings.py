from __future__ import annotations

import argparse
from pathlib import Path
import re

from storage import (
    DATA_DIR,
    item_directory_path,
    list_drawings,
    read_json,
    register_drawing,
)


def parse_items(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def chapter_manifest(model: str, chapter: int) -> dict:
    path = DATA_DIR / model.upper() / f"Chapter{chapter}" / "chapter.json"
    return read_json(path)


def manifest_title(model: str, chapter: int, item_code: str, fallback: str | None = None) -> str:
    try:
        manifest = chapter_manifest(model, chapter)
    except FileNotFoundError:
        if fallback:
            return fallback
        raise SystemExit(f"Chapter manifest was not found for {model} Chapter {chapter}.") from None

    for item in manifest["items"]:
        if item["item"] == item_code:
            return item["titleEn"]
    if fallback:
        return fallback
    raise SystemExit(f"Item {item_code} was not found in the chapter manifest.")


def add_drawing(args) -> None:
    title = args.title or manifest_title(args.model, args.chapter, args.item)
    try:
        metadata = register_drawing(
            model=args.model,
            chapter=args.chapter,
            item_code=args.item,
            title=title,
            image_source=args.image,
            expected_items=parse_items(args.items),
            ocr_profile=args.ocr_profile,
            replace=args.replace,
        )
    except FileExistsError as error:
        print(f"{error}. Nothing was changed.")
        print("Run OCR next, or add --replace only when replacing this drawing.")
        return
    print(f"Added {metadata['id']}: {metadata['title']}")


def import_directory(args) -> None:
    image_directory = args.directory.resolve()
    image_paths = sorted(image_directory.glob("*.png"))
    if not image_paths:
        raise SystemExit(f"No PNG files found in {image_directory}")

    added = 0
    for image_path in image_paths:
        match = re.fullmatch(r"(?P<item>\d+(?:\.\d+)?)[-_ ]+(?P<title>.+)", image_path.stem)
        if not match:
            print(f"Skipped filename without item prefix: {image_path.name}")
            continue
        item_code = match.group("item")
        filename_title = match.group("title").replace("-", " ").replace("_", " ").title()
        title = manifest_title(args.model, args.chapter, item_code, filename_title)
        try:
            metadata = register_drawing(
                model=args.model,
                chapter=args.chapter,
                item_code=item_code,
                title=title,
                image_source=image_path,
                expected_items=parse_items(args.items),
                ocr_profile=args.ocr_profile,
                replace=args.replace,
            )
            added += 1
            print(f"Added {metadata['id']}")
        except FileExistsError:
            print(f"Skipped existing item: {item_code}")
    print(f"Imported {added} of {len(image_paths)} PNG files.")


def scaffold_chapter(args) -> None:
    manifest = chapter_manifest(args.model, args.chapter)
    created = 0
    for item in manifest["items"]:
        directory = item_directory_path(
            manifest["model"],
            manifest["chapter"],
            item["item"],
            item["titleEn"],
        )
        if not directory.exists():
            directory.mkdir(parents=True)
            created += 1
        if not any(directory.iterdir()):
            (directory / ".gitkeep").touch()
    print(f"Scaffolded {len(manifest['items'])} item directories ({created} created).")


def show_drawings(_args) -> None:
    drawings = list_drawings()
    if not drawings:
        print("No drawings registered.")
        return
    for drawing in drawings:
        location = f"{drawing['model']} Ch.{drawing['chapter']} Item {drawing['item']}"
        print(f"{location:<24} {drawing['hotspotCount']:>4} hotspots  {drawing['title']}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Manage the drawing library.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    add_parser = subparsers.add_parser("add", help="Add one PNG drawing")
    add_parser.add_argument("--model", required=True)
    add_parser.add_argument("--chapter", required=True, type=int)
    add_parser.add_argument("--item", required=True)
    add_parser.add_argument("--title", help="Defaults to the English title in chapter.json")
    add_parser.add_argument("--image", required=True, type=Path)
    add_parser.add_argument("--items", help="Comma-separated expected item numbers")
    add_parser.add_argument("--ocr-profile", choices=("generic", "de18"), default="generic")
    add_parser.add_argument("--replace", action="store_true")
    add_parser.set_defaults(handler=add_drawing)

    import_parser = subparsers.add_parser("import-dir", help="Import every PNG in a directory")
    import_parser.add_argument("directory", type=Path)
    import_parser.add_argument("--model", required=True)
    import_parser.add_argument("--chapter", required=True, type=int)
    import_parser.add_argument("--items", help="Expected item numbers shared by all imported drawings")
    import_parser.add_argument("--ocr-profile", choices=("generic", "de18"), default="generic")
    import_parser.add_argument("--replace", action="store_true")
    import_parser.set_defaults(handler=import_directory)

    list_parser = subparsers.add_parser("list", help="List registered drawings")
    list_parser.set_defaults(handler=show_drawings)

    scaffold_parser = subparsers.add_parser("scaffold", help="Create item directories from chapter.json")
    scaffold_parser.add_argument("--model", required=True)
    scaffold_parser.add_argument("--chapter", required=True, type=int)
    scaffold_parser.set_defaults(handler=scaffold_chapter)

    args = parser.parse_args()
    args.handler(args)


if __name__ == "__main__":
    main()
