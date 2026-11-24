"""Fetch public HistData monthly XAGUSD archives via the provider's free export form."""
from __future__ import annotations

import argparse
import hashlib
import json
import zipfile
from datetime import datetime
from html.parser import HTMLParser
from http.cookiejar import CookieJar
from io import BytesIO
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import HTTPCookieProcessor, Request, build_opener

BASE = "https://www.histdata.com"


class DownloadForm(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_form = False
        self.fields = {}

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "form" and a.get("id") == "file_down":
            if a.get("action") != "/get.php" or a.get("method", "").lower() != "post":
                raise ValueError("The provider changed its public download form")
            self.in_form = True
        elif tag == "input" and self.in_form and a.get("type") == "hidden":
            self.fields[a["name"]] = a["value"]

    def handle_endtag(self, tag):
        if tag == "form":
            self.in_form = False


def source_link(year, month):
    return f"{BASE}/download-free-forex-historical-data/?/ascii/1-minute-bar-quotes/xagusd/{year}/{month}"


def fetch_month(year, month):
    link = source_link(year, month)
    opener = build_opener(HTTPCookieProcessor(CookieJar()))
    client = {"User-Agent": "HarmonexusSilverResearch/1.0"}
    with opener.open(Request(link, headers=client), timeout=20) as result:
        html = result.read(1_000_001)
    if len(html) > 1_000_000:
        raise ValueError("Oversized provider form")
    form = DownloadForm()
    form.feed(html.decode("utf-8", errors="replace"))
    expected = {"date": str(year), "datemonth": f"{year}{month:02}", "platform": "ASCII",
                "timeframe": "M1", "fxpair": "XAGUSD"}
    if not form.fields.get("tk") or any(form.fields.get(k) != v for k, v in expected.items()):
        raise ValueError("Public form unavailable or identity changed")
    req = Request(BASE + "/get.php", data=urlencode({**expected, "tk": form.fields["tk"]}).encode(),
                  headers={**client, "Referer": link})
    with opener.open(req, timeout=30) as result:
        payload = result.read(10_000_001)
    if len(payload) > 10_000_000:
        raise ValueError("Oversized provider response")
    with zipfile.ZipFile(BytesIO(payload)) as archive:
        if f"DAT_ASCII_XAGUSD_M1_{year}{month:02}.csv" not in archive.namelist():
            raise ValueError("Provider ZIP did not match the requested month")
    return payload


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("year", type=int)
    parser.add_argument("months", type=int, nargs="+", choices=tuple(range(1, 13)))
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--refresh-month", type=int, choices=tuple(range(1, 13)))
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    for month in sorted(set(args.months)):
        key = f"{args.year}{month:02}"
        prefix = f"histdata-xagusd-m1-{key}"
        cached = sorted(args.cache.glob(prefix+"*.zip"), key=lambda x: x.stat().st_mtime)
        if cached and month != args.refresh_month:
            payload = cached[-1].read_bytes()
        else:
            payload = fetch_month(args.year, month)
        digest = hashlib.sha256(payload).hexdigest()
        filename = args.cache / f"{prefix}-{digest[:12]}.zip"
        if (not cached or month == args.refresh_month) and not filename.exists():
            filename.write_bytes(payload)
        print(json.dumps({"month": key, "sha256": digest, "bytes": len(payload),
                          "source": source_link(args.year, month), "checkedAt": datetime.now().astimezone().isoformat()}))


if __name__ == "__main__":
    main()
