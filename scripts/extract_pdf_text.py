#!/usr/bin/env python3
"""
Extract text from a PDF into a UTF-8 .txt file.

Usage:
  python3 scripts/extract_pdf_text.py /path/to/file.pdf /path/to/output.txt
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def _extract_with_pdfminer(pdf_path: Path) -> str:
    try:
        from pdfminer.high_level import extract_text  # type: ignore
    except Exception as exc:  # pragma: no cover - dependency missing
        raise ImportError("pdfminer.six is not installed") from exc
    return extract_text(str(pdf_path)) or ""


def _extract_with_pypdf(pdf_path: Path) -> str:
    try:
        from pypdf import PdfReader  # type: ignore
    except Exception as exc:  # pragma: no cover - dependency missing
        raise ImportError("pypdf is not installed") from exc

    reader = PdfReader(str(pdf_path))
    chunks: list[str] = []
    for page in reader.pages:
        chunks.append(page.extract_text() or "")
    return "\n".join(chunks)


def extract_text(pdf_path: Path) -> str:
    errors: list[str] = []
    for extractor in (_extract_with_pdfminer, _extract_with_pypdf):
        try:
            return extractor(pdf_path)
        except Exception as exc:
            errors.append(f"{extractor.__name__}: {exc}")
            continue
    raise RuntimeError(
        "No PDF extractor available. Install one of:\n"
        "  pip install pdfminer.six\n"
        "  pip install pypdf\n"
        "\nErrors:\n- " + "\n- ".join(errors)
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract text from a PDF file.")
    parser.add_argument("pdf", type=Path, help="Path to input PDF")
    parser.add_argument("output", type=Path, help="Path to output .txt")
    args = parser.parse_args()

    if not args.pdf.exists():
        print(f"PDF not found: {args.pdf}", file=sys.stderr)
        return 2

    text = extract_text(args.pdf)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(text, encoding="utf-8")
    print(f"Wrote {len(text)} characters to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
