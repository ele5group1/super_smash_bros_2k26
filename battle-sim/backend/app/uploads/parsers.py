"""Parsers for JSON and CSV uploads with strict RFC 4180 and BOM handling."""

import csv
import io
import json
from typing import Dict, List, Tuple, Any


def parse_json_content(content_bytes: bytes) -> Tuple[Any, List[str]]:
    """Parses UTF-8 JSON content safely."""
    errors = []
    try:
        text = content_bytes.decode("utf-8-sig")
        data = json.loads(text)
        return data, errors
    except UnicodeDecodeError:
        try:
            text = content_bytes.decode("utf-8")
            data = json.loads(text)
            return data, errors
        except Exception as e:
            return None, [f"JSON encoding error: {str(e)}"]
    except Exception as e:
        return None, [f"JSON syntax error: {str(e)}"]


def parse_csv_content(
    content_bytes: bytes,
    filename: str = "file.csv",
) -> Tuple[List[Dict[str, Any]], List[str], List[str]]:
    """
    Parses CSV content according to RFC 4180.
    Handles UTF-8 with optional BOM, CRLF or LF line endings, and quoted multiline cells.
    Returns: (rows, errors, warnings)
    Each row in rows includes '_line_num' (1-indexed, header is line 1).
    """
    errors = []
    warnings = []
    rows = []

    try:
        text = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text = content_bytes.decode("utf-8")
        except Exception as e:
            return [], [f"{filename}: File is not valid UTF-8 text ({str(e)})"], []

    # Use standard library csv.reader
    stream = io.StringIO(text, newline="")
    reader = csv.reader(stream)

    try:
        header_raw = next(reader, None)
    except Exception as e:
        return [], [f"{filename} line 1: CSV read error ({str(e)})"], []

    if not header_raw:
        return [], [f"{filename} line 1: File is empty or missing header"], []

    # Case-insensitive normalized headers
    headers = [h.strip().lower() for h in header_raw]
    current_line = 1

    for row_values in reader:
        # csv.reader line_num accurately reflects multi-line rows
        current_line = reader.line_num

        # Check for empty row
        if not row_values or all(v.strip() == "" for v in row_values):
            warnings.append(f"{filename} line {current_line}: Skipped empty row")
            continue

        if len(row_values) > len(headers):
            warnings.append(
                f"{filename} line {current_line}: Row has {len(row_values)} columns, expected {len(headers)}. Extra columns ignored."
            )
        elif len(row_values) < len(headers):
            errors.append(
                f"{filename} line {current_line}: Missing required columns (expected {len(headers)}, got {len(row_values)})"
            )
            continue

        row_dict: Dict[str, Any] = {"_line_num": current_line}
        for h, v in zip(headers, row_values):
            row_dict[h] = v.strip()

        rows.append(row_dict)

    return rows, errors, warnings
