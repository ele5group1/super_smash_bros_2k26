"""Safe zip archive handling and Zip-Slip protection."""

import io
import os
import zipfile
from typing import Dict, List, Tuple

MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024  # 50 MB
MAX_FILES = 200


def extract_zip_in_memory(
    zip_bytes: bytes,
) -> Tuple[Dict[str, bytes], List[str]]:
    """
    Safely inspects and extracts zip file contents into memory with strict security checks:
    - Rejects path traversal (..)
    - Rejects absolute paths and drive letters
    - Rejects symlinks
    - Rejects nested zip archives
    - Enforces uncompressed total size limit (50 MB) and file count limit (200)
    Returns: (file_dict, errors)
    """
    errors: List[str] = []
    files: Dict[str, bytes] = {}

    try:
        zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
    except Exception as e:
        return {}, [f"Invalid or corrupted zip archive: {str(e)}"]

    infolist = zf.infolist()
    if len(infolist) > MAX_FILES:
        return {}, [f"Zip archive exceeds maximum allowed file count ({len(infolist)} > {MAX_FILES})"]

    total_uncompressed = 0

    for info in infolist:
        name = info.filename

        # Skip directory entries
        if name.endswith("/") or name.endswith("\\"):
            continue

        # Security check: path traversal
        if ".." in name or name.startswith("/") or name.startswith("\\"):
            return {}, [f"Security violation: path traversal or absolute path detected in entry '{name}'"]

        # Security check: drive letters on Windows like C:
        if len(name) >= 2 and name[1] == ":":
            return {}, [f"Security violation: Windows drive letter detected in entry '{name}'"]

        # Security check: symlink attributes
        mode = info.external_attr >> 16
        if mode and (mode & 0o120000) == 0o120000:
            return {}, [f"Security violation: Symlink detected in entry '{name}'"]

        # Security check: nested zip
        if name.lower().endswith(".zip"):
            return {}, [f"Security violation: Nested zip archive detected in entry '{name}'"]

        # Size check
        total_uncompressed += info.file_size
        if total_uncompressed > MAX_UNCOMPRESSED_BYTES:
            return {}, [f"Zip uncompressed size exceeds limit of 50 MB ({total_uncompressed} bytes)"]

        # Read into memory
        try:
            content = zf.read(info)
            # Store with normalized basename or clean relative path
            clean_name = os.path.basename(name)
            files[clean_name] = content
        except Exception as e:
            return {}, [f"Error extracting '{name}': {str(e)}"]

    return files, errors
