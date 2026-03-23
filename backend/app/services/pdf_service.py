import fitz  # PyMuPDF
from fastapi import HTTPException


def extract_text_from_pdf(file_path: str) -> str:
    """Extract all text from a PDF file using PyMuPDF."""
    try:
        doc = fitz.open(file_path)
        text = "\n".join(page.get_text() for page in doc)
        doc.close()
        if not text.strip():
            raise HTTPException(
                status_code=422,
                detail="Could not extract text from PDF. The file may be scanned or image-based.",
            )
        return text
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Could not extract text from PDF: {str(e)}",
        )
