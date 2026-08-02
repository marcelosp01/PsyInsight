from fpdf import FPDF

from app.schemas import DocumentTypeOut


def _write_line(pdf: FPDF, height: float, text: str, align: str = "L") -> None:
    """multi_cell with width=0 derives the available width from the current
    cursor x position; explicitly reset x to the left margin first so it
    always spans the full effective page width instead of shrinking to zero."""
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(pdf.epw, height, text, align=align)


def render_document_pdf(document_type: DocumentTypeOut, values: dict[str, str]) -> bytes:
    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 16)
    _write_line(pdf, 10, document_type.name, align="C")
    pdf.set_font("Helvetica", "I", 10)
    _write_line(pdf, 6, f"{document_type.article} da Resolução CFP nº 06/2019", align="C")
    pdf.ln(4)

    for field in document_type.fields:
        value = (values.get(field.key) or "").strip()
        if not value:
            continue
        if field.kind != "prose":
            pdf.set_font("Helvetica", "B", 12)
            _write_line(pdf, 8, field.label)
        pdf.set_font("Helvetica", "", 11)
        _write_line(pdf, 6, value)
        pdf.ln(3)

    output = pdf.output()
    return bytes(output)
