#!/usr/bin/env python3
"""Recheck saved RSS URLs without changing the curated catalogue."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
MAX_BYTES = 80_000_000


def check_feed(url):
    try:
        request = Request(url, headers={"User-Agent": "EasyListening/1.0 RSS checker"})
        with urlopen(request, timeout=25) as response:
            body = response.read(MAX_BYTES + 1)
            final_url = response.url
        if len(body) > MAX_BYTES:
            raise ValueError("Feed exceeds the 80 MB validation limit")
        root = ET.fromstring(body)
        channel = root.find("channel")
        if root.tag != "rss" or channel is None:
            raise ValueError("Response is not an RSS channel")
        items = channel.findall("item")
        if not items:
            raise ValueError("RSS contains no episodes")
        return {
            "status": "verified",
            "url": final_url,
            "feedTitle": channel.findtext("title"),
            "episodeCount": len(items),
        }
    except Exception as error:
        return {"status": "failed", "url": url, "error": str(error)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, help="Save JSON results to this path")
    args = parser.parse_args()
    feeds = json.loads((ROOT / "src/data/feeds.json").read_text())
    urls = list(dict.fromkeys(show["url"] for show in feeds if show["url"]))
    with ThreadPoolExecutor(max_workers=4) as pool:
        checks = dict(zip(urls, pool.map(check_feed, urls)))
    results = []
    for show in feeds:
        result = checks.get(show["url"], {"status": "unresolved"})
        results.append({"name": show["name"], **result})
        if result["status"] == "failed":
            print(f'{show["name"]}: {result["error"]}', file=sys.stderr)
    counts = {state: sum(r["status"] == state for r in results)
              for state in ("verified", "failed", "unresolved")}
    print(
        f'{counts["verified"]} verified, {counts["failed"]} failed, '
        f'{counts["unresolved"]} unresolved ({len(urls)} unique URLs).'
    )
    if args.report:
        args.report.write_text(json.dumps({
            "checkedAt": datetime.now(timezone.utc).isoformat(),
            "method": "HTTP fetch and complete RSS XML parse; browser CORS and media playback are not checked.",
            "feeds": results,
        }, indent=2, ensure_ascii=False) + "\n")
    return 1 if counts["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
