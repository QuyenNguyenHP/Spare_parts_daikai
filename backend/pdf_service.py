from __future__ import annotations

from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def register_pdf_font() -> tuple[str, str]:
    font_directory = Path("/usr/share/fonts/truetype/dejavu")
    regular_font = font_directory / "DejaVuSans.ttf"
    bold_font = font_directory / "DejaVuSans-Bold.ttf"
    if regular_font.is_file() and bold_font.is_file():
        if "DejaVuSans" not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont("DejaVuSans", regular_font))
            pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", bold_font))
        return "DejaVuSans", "DejaVuSans-Bold"
    return "Helvetica", "Helvetica-Bold"


def pdf_text(value) -> str:
    return escape(str(value or "-"))


def build_parts_request_pdf(request_data: dict) -> bytes:
    regular_font, bold_font = register_pdf_font()
    output = BytesIO()
    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
        title=f"Parts request {request_data['requestId']}",
        author="Daikai Engineering",
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
        textColor=colors.HexColor("#0f6f8f"),
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
    story = [
        Paragraph("DAIKAI ENGINEERING", heading_style),
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
    summary_table = Table(summary_rows, colWidths=[34 * mm, 128 * mm], hAlign="LEFT")
    customer_table = Table(customer_rows, colWidths=[24 * mm, 57 * mm, 24 * mm, 57 * mm], hAlign="LEFT")
    shared_table_style = TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#b8c6d1")),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#e8f3f7")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ])1
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
        hAlign="LEFT",
    )
    parts_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#65d687")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f8f1a")),
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
    document.build(story)
    return output.getvalue()
