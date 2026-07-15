#!/usr/bin/env python3
"""Scrape Instagram profile post captions and export to CSV."""

from __future__ import annotations

import csv
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

DEFAULT_PROFILE = "leekumkeeglobal"
DEFAULT_USER_ID = "251599156"
DEFAULT_OUTPUT = Path("/workspace/output/leekumkeeglobal_ig_posts.csv")
REQUEST_DELAY_SECONDS = 4.0
PAGE_SIZE = 12


def create_session(username: str) -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/121.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
            "X-IG-App-ID": "936619743392459",
            "Referer": f"https://www.instagram.com/{username}/",
        }
    )
    response = session.get(f"https://www.instagram.com/{username}/", timeout=30)
    response.raise_for_status()
    csrf_token = session.cookies.get("csrftoken")
    if csrf_token:
        session.headers["X-CSRFToken"] = csrf_token
    return session


def get_user_id(session: requests.Session, username: str, fallback_user_id: str | None) -> str:
    if fallback_user_id:
        return fallback_user_id

    for attempt in range(3):
        response = session.get(
            f"https://www.instagram.com/api/v1/users/web_profile_info/?username={username}",
            timeout=30,
        )
        if response.status_code == 200:
            return response.json()["data"]["user"]["id"]

        if response.status_code == 429:
            wait = 45 * (attempt + 1)
            print(f"Rate limited while resolving user id; waiting {wait}s...")
            time.sleep(wait)
            continue

        response.raise_for_status()

    raise RuntimeError(f"Unable to resolve Instagram user id for {username}")


def caption_from_item(item: dict[str, Any]) -> str:
    caption = item.get("caption")
    if isinstance(caption, dict):
        return caption.get("text") or ""
    if isinstance(caption, str):
        return caption
    return ""


def timestamp_from_item(item: dict[str, Any]) -> str:
    for key in ("taken_at", "device_timestamp", "created_at"):
        value = item.get(key)
        if value:
            try:
                return datetime.fromtimestamp(int(value), tz=timezone.utc).isoformat()
            except (TypeError, ValueError):
                pass
    return ""


def media_type_from_item(item: dict[str, Any]) -> str:
    if item.get("media_type") == 2 or item.get("video_versions"):
        return "video"
    if item.get("carousel_media"):
        return "carousel"
    return "photo"


def post_url(item: dict[str, Any]) -> str:
    code = item.get("code") or item.get("shortcode")
    if code:
        return f"https://www.instagram.com/p/{code}/"
    return ""


def normalize_item(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "post_id": item.get("pk") or item.get("id") or "",
        "shortcode": item.get("code") or item.get("shortcode") or "",
        "post_url": post_url(item),
        "timestamp": timestamp_from_item(item),
        "caption": caption_from_item(item),
        "media_type": media_type_from_item(item),
        "like_count": item.get("like_count", ""),
        "comment_count": item.get("comment_count", ""),
    }


def fetch_posts(session: requests.Session, user_id: str) -> list[dict[str, Any]]:
    posts: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    max_id: str | None = None
    page = 0

    while True:
        page += 1
        params: dict[str, Any] = {"count": PAGE_SIZE}
        if max_id:
            params["max_id"] = max_id

        for attempt in range(8):
            response = session.get(
                f"https://www.instagram.com/api/v1/feed/user/{user_id}/",
                params=params,
                timeout=30,
            )
            if response.status_code == 200:
                break
            if response.status_code in {401, 429}:
                wait = 45 * (attempt + 1)
                print(
                    f"Rate limited on page {page} (HTTP {response.status_code}); "
                    f"waiting {wait}s..."
                )
                time.sleep(wait)
                continue
            response.raise_for_status()
        else:
            raise RuntimeError(f"Unable to fetch page {page} for user {user_id}")

        payload = response.json()
        items = payload.get("items") or []
        new_items = 0

        for item in items:
            post_id = str(item.get("pk") or item.get("id") or "")
            if not post_id or post_id in seen_ids:
                continue
            seen_ids.add(post_id)
            posts.append(normalize_item(item))
            new_items += 1

        print(
            f"Page {page}: fetched {len(items)} items "
            f"({new_items} new, {len(posts)} total so far)"
        )

        if not payload.get("more_available"):
            break

        next_max_id = payload.get("next_max_id")
        if not next_max_id or next_max_id == max_id or new_items == 0:
            break

        max_id = str(next_max_id)
        time.sleep(REQUEST_DELAY_SECONDS)

    return posts


def write_csv(rows: list[dict[str, Any]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "post_id",
        "shortcode",
        "post_url",
        "timestamp",
        "caption",
        "media_type",
        "like_count",
        "comment_count",
    ]
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in fieldnames})


def main() -> int:
    username = DEFAULT_PROFILE
    output_path = DEFAULT_OUTPUT
    user_id_override = DEFAULT_USER_ID

    args = sys.argv[1:]
    positional: list[str] = []
    index = 0
    while index < len(args):
        arg = args[index]
        if arg == "--user-id" and index + 1 < len(args):
            user_id_override = args[index + 1]
            index += 2
            continue
        positional.append(arg)
        index += 1

    if positional:
        username = positional[0]
    if len(positional) > 1:
        output_path = Path(positional[1])

    print(f"Scraping Instagram posts for @{username} ...")
    session = create_session(username)
    user_id = get_user_id(session, username, user_id_override)
    print(f"Resolved user id: {user_id}")

    posts = fetch_posts(session, user_id)
    write_csv(posts, output_path)

    with_caption = sum(1 for post in posts if post.get("caption"))
    print(
        f"Saved {len(posts)} posts ({with_caption} with captions) "
        f"to {output_path}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
