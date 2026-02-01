#!/usr/bin/env python3
"""Download photos from Google Drive public folder."""
import argparse
import re
import sys
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlencode

from tqdm import tqdm


def extract_folder_id(url_or_id: str) -> str:
    """Extract folder ID from Google Drive URL or raw ID."""
    patterns = [
        r'folders/([a-zA-Z0-9_-]+)',
        r'^([a-zA-Z0-9_-]+)$'
    ]
    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)
    raise ValueError(f"Invalid folder ID or URL: {url_or_id}")


def get_file_list_from_drive(folder_id: str) -> list[dict]:
    """Get file list from Google Drive folder page."""
    url = f"https://drive.google.com/drive/folders/{folder_id}"
    headers = {"User-Agent": "Mozilla/5.0"}

    try:
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        content = resp.text

        # Parse file IDs and names from the page
        # Pattern for file entries in Drive folder page
        files = []

        # Find all file IDs in the page
        id_pattern = r'\["([a-zA-Z0-9_-]{25,})","([^"]+)"'
        matches = re.findall(id_pattern, content)

        seen = set()
        for file_id, name in matches:
            if file_id not in seen and not file_id.startswith(folder_id[:10]):
                seen.add(file_id)
                # Filter image files
                if any(name.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.webp']):
                    files.append({'id': file_id, 'name': name})

        return files
    except Exception as e:
        print(f"Error fetching folder: {e}")
        return []


def download_file(file_id: str, filename: str, output_dir: Path) -> tuple[bool, str]:
    """Download single file from Google Drive."""
    output_path = output_dir / filename

    # Skip if exists
    if output_path.exists() and output_path.stat().st_size > 0:
        return True, filename

    try:
        # Direct download URL
        url = f"https://drive.google.com/uc?export=download&id={file_id}"
        headers = {"User-Agent": "Mozilla/5.0"}

        resp = requests.get(url, headers=headers, stream=True, timeout=60)

        # Handle download warning for large files
        if "download_warning" in resp.text[:1000]:
            # Extract confirm token
            for key, value in resp.cookies.items():
                if key.startswith('download_warning'):
                    url = f"https://drive.google.com/uc?export=download&confirm={value}&id={file_id}"
                    resp = requests.get(url, headers=headers, stream=True, timeout=60)
                    break

        resp.raise_for_status()

        with open(output_path, 'wb') as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)

        return True, filename
    except Exception as e:
        return False, f"{filename}: {e}"


def download_with_gdown_fallback(folder_id: str, output_dir: Path) -> int:
    """Try gdown first, fallback to manual download."""
    import gdown

    output_dir.mkdir(parents=True, exist_ok=True)
    url = f"https://drive.google.com/drive/folders/{folder_id}"

    print(f"Downloading from: {url}")
    print(f"Output: {output_dir}")

    try:
        # Use gdown with remaining_ok to get as many files as possible
        downloaded = gdown.download_folder(url, output=str(output_dir), quiet=False, remaining_ok=True)
        count = len(downloaded) if downloaded else 0
        print(f"\n✓ Downloaded {count} files via gdown")
        return count
    except Exception as e:
        print(f"gdown error: {e}")
        print("Trying manual download...")

        # Get file list
        files = get_file_list_from_drive(folder_id)
        if not files:
            print("Could not get file list")
            return 0

        print(f"Found {len(files)} files")

        success = 0
        errors = 0

        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {
                executor.submit(download_file, f['id'], f['name'], output_dir): f
                for f in files
            }

            with tqdm(total=len(files), desc="Downloading") as pbar:
                for future in as_completed(futures):
                    ok, msg = future.result()
                    if ok:
                        success += 1
                    else:
                        errors += 1
                        tqdm.write(f"  Error: {msg}")
                    pbar.update(1)

        print(f"\n✓ Downloaded: {success}, Errors: {errors}")
        return success


def main():
    parser = argparse.ArgumentParser(description="Download photos from Google Drive")
    parser.add_argument("url", help="Google Drive folder URL or ID")
    parser.add_argument("-o", "--output", default="data/photos", help="Output directory")
    args = parser.parse_args()

    try:
        folder_id = extract_folder_id(args.url)
        print(f"Folder ID: {folder_id}")
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    project_root = Path(__file__).parent.parent
    output_dir = project_root / args.output

    count = download_with_gdown_fallback(folder_id, output_dir)
    sys.exit(0 if count > 0 else 1)


if __name__ == "__main__":
    main()
