from __future__ import annotations

from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Indenter, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def register_pdf_font() -> tuple[str, str]:
    font_directory = Path(__file__).resolve().parent / "fonts"
    for font_name in ("Roboto", "Roboto-Bold"):
        filename = "Roboto-Regular.ttf" if font_name == "Roboto" else "Roboto-Bold.ttf"
        if font_name not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont(font_name, str(font_directory / filename)))
    pdfmetrics.registerFontFamily("Roboto", normal="Roboto", bold="Roboto-Bold")
    return "Roboto", "Roboto-Bold"


def pdf_text(value) -> str:
    return escape(str(value or "-"))


def draw_company_header(canvas, document) -> None:
    """Repeat the company letterhead and page footer on every page."""
    regular_font, bold_font = register_pdf_font()
    logo_path = Path(__file__).resolve().parent.parent / "frontend" / "public" / "Daikai-logo-Website.png"
    logo = ImageReader(str(logo_path))
    image_width, image_height = logo.getSize()
    page_width, page_height = document.pagesize
    logo_width = 32 * mm
    logo_height = logo_width * image_height / image_width
    left = document.leftMargin
    right = page_width - document.rightMargin
    rule_top = page_height - 20 * mm
    rule_bottom = rule_top - 5 * mm
    address = (
        "128 PIONEER ROAD SINGAPORE 639586 TEL: 6863 2856   "
        "FAX: 6863 2876 CO REG NO.:199205302W"
    )
    canvas.saveState()
    try:
        canvas.drawImage(
            logo,
            (page_width - logo_width) / 2,
            page_height - 11 * mm - logo_height,
            width=logo_width,
            height=logo_height,
            mask="auto",
        )
        canvas.setStrokeColor(colors.HexColor("#808080"))
        canvas.setLineWidth(0.5)
        canvas.line(left, rule_top, right, rule_top)
        canvas.line(left, rule_bottom, right, rule_bottom)
        font_size = min(8.5, (right - left - 4) / pdfmetrics.stringWidth(address, bold_font, 1))
        canvas.setFont(bold_font, font_size)
        canvas.setFillColor(colors.HexColor("#808080"))
        canvas.drawCentredString((left + right) / 2, rule_bottom + 4, address)
        canvas.setStrokeColor(colors.HexColor("#b0b0b0"))
        canvas.line(left, 12 * mm, right, 12 * mm)
        canvas.setFont(regular_font, 8)
        canvas.setFillColor(colors.HexColor("#707070"))
        canvas.drawCentredString(page_width / 2, 7.5 * mm, f"Page {canvas.getPageNumber()}")
    finally:
        canvas.restoreState()


def build_parts_request_pdf(request_data: dict) -> bytes:
    regular_font, bold_font = register_pdf_font()
    output = BytesIO()
    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=28 * mm,
        bottomMargin=15 * mm,
        title=f"Parts request {request_data['requestId']}",
        author="Daikai Engineering Pte Ltd.",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "RequestTitle",
        parent=styles["Title"],
        fontName=bold_font,
        fontSize=18,
        leading=23,
        textColor=colors.HexColor("#0f3d63"),
        spaceAfter=5 * mm,
    )
    heading_style = ParagraphStyle(
        "RequestHeading",
        parent=styles["Heading2"],
        fontName=bold_font,
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#0f3d63"),
        spaceBefore=4 * mm,
        spaceAfter=2 * mm,
    )
    body_style = ParagraphStyle(
        "RequestBody",
        parent=styles["BodyText"],
        fontName=regular_font,
        fontSize=8.5,
        leading=12,
    )
    bold_body_style = ParagraphStyle("RequestBodyBold", parent=body_style, fontName=bold_font)

    customer = request_data["customer"]
    # SimpleDocTemplate's frame has 6 pt of padding on each side.
    # Give all body content the same centered 162 mm width as the tables.
    content_indent = (document.width - 12 - 162 * mm) / 2
    story = [
        Indenter(left=content_indent, right=content_indent),
        Paragraph("SPARE PARTS REQUEST", title_style),
    ]
    summary_rows = [
        [Paragraph("Request ID", bold_body_style), Paragraph(pdf_text(request_data["requestId"]), body_style)],
        [Paragraph("Created at", bold_body_style), Paragraph(pdf_text(request_data["createdAt"]), body_style)],
        [Paragraph("Reference drawing", bold_body_style), Paragraph(pdf_text(request_data["drawingTitle"]), body_style)],
    ]
    customer_rows = [
        [Paragraph("Customer", bold_body_style), Paragraph(pdf_text(customer["name"]), body_style), Paragraph("Company", bold_body_style), Paragraph(pdf_text(customer["company"]), body_style)],
        [Paragraph("Email", bold_body_style), Paragraph(pdf_text(customer["email"]), body_style), Paragraph("Phone", bold_body_style), Paragraph(pdf_text(customer["phone"]), body_style)],
        [Paragraph("Vessel", bold_body_style), Paragraph(pdf_text(customer["vesselName"]), body_style), Paragraph("IMO No.", bold_body_style), Paragraph(pdf_text(customer["imoNumber"]), body_style)],
        [Paragraph("Engine", bold_body_style), Paragraph(pdf_text(customer["engineName"]), body_style), Paragraph("Engine S/N", bold_body_style), Paragraph(pdf_text(customer["engineSerialNumber"]), body_style)],
    ]
    summary_table = Table(summary_rows, colWidths=[34 * mm, 128 * mm], hAlign="CENTER")
    customer_table = Table(customer_rows, colWidths=[24 * mm, 57 * mm, 24 * mm, 57 * mm], hAlign="CENTER")
    shared_table_style = TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#a0a1a0")),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#e8f3f7")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ])
    summary_table.setStyle(shared_table_style)
    customer_table.setStyle(TableStyle([
        *shared_table_style.getCommands(),
        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#e8f3f7")),
    ]))
    story.extend([
        summary_table,
        Paragraph("CUSTOMER AND ENGINE INFORMATION", heading_style),
        customer_table,
        Paragraph("REQUESTED PARTS", heading_style),
    ])

    parts_rows = [[
        Paragraph("No.", bold_body_style),
        Paragraph("Parts code", bold_body_style),
        Paragraph("Name of parts", bold_body_style),
        Paragraph("Item", bold_body_style),
        Paragraph("Reference drawing", bold_body_style),
        Paragraph("Qty", bold_body_style),
    ]]
    for index, item in enumerate(request_data["items"], start=1):
        reference_drawing = (
            item.get("drawingLabel")
            or item.get("drawingTitle")
            or request_data.get("drawingTitle")
        )
        parts_rows.append([
            Paragraph(str(index), body_style),
            Paragraph(pdf_text(item["partNumber"]), body_style),
            Paragraph(pdf_text(item["name"]), body_style),
            Paragraph(pdf_text(item["item"]), body_style),
            Paragraph(pdf_text(reference_drawing), body_style),
            Paragraph(pdf_text(item["quantity"]), body_style),
        ])
    parts_table = Table(
        parts_rows,
        colWidths=[10 * mm, 30 * mm, 52 * mm, 14 * mm, 44 * mm, 12 * mm],
        repeatRows=1,
        hAlign="CENTER",
    )
    parts_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#a0a1a0")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8f3f7")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f4f7f9")]),
    ]))
    story.extend([
        parts_table,
        Spacer(1, 8 * mm),
        Paragraph("This document was generated automatically by the Daikai Spare Parts system.", body_style),
    ])
    document.build(story, onFirstPage=draw_company_header, onLaterPages=draw_company_header)
    return output.getvalue()


if __name__ == "__main__":
    import argparse
    from datetime import datetime, timezone

    parser = argparse.ArgumentParser(description="Generate a sample parts-request PDF without starting the backend.")
    parser.add_argument("--output", type=Path, default=Path(__file__).with_name("preview.pdf"))
    args = parser.parse_args()
    sample_request = {
        "requestId": "PREVIEW-001",
        "createdAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "drawingTitle": "DE18 - Chapter 2 - Exhaust valve",
        "customer": {
            "name": "Sample Customer",
            "company": "Example Marine & Engineering",
            "email": "customer@example.com",
            "phone": "+65 0000 0000",
            "vesselName": "DEMO VESSEL",
            "imoNumber": "1234567",
            "engineName": "DE18",
            "engineSerialNumber": "DE18-SAMPLE-001",
        },
        "items": [
            {"partNumber": "DE18-17001", "name": "Exhaust valve assembly", "item": "01", "quantity": 2},
            {"partNumber": "DE18-17002", "name": "Valve seat ring", "item": "02", "quantity": 4},
            {"partNumber": "DE18-17003", "name": "Gasket & sealing ring set for exhaust valve housing", "item": "03", "quantity": 6},
        ],
    }
    args.output.write_bytes(build_parts_request_pdf(sample_request))
    print(f"Preview PDF saved to: {args.output.resolve()}")
