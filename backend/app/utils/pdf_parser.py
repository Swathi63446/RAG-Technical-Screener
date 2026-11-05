"""PDF parsing and text extraction using PyMuPDF."""

import fitz  # PyMuPDF


def extract_text_from_pdf(file_path: str) -> str:
    """Extract all text from a PDF file, page by page."""
    try:
        doc = fitz.open(file_path)
        pages = []
        for page in doc:
            text = page.get_text("text")
            if text.strip():
                pages.append(text)
        doc.close()
        return "\n\n".join(pages)
    except Exception as exc:
        raise ValueError(f"Failed to parse PDF: {exc}") from exc
