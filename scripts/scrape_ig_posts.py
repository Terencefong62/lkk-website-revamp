#!/usr/bin/env python3
"""Fetch Instagram post captions via in-browser API calls and export CSV."""

import csv
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

USERNAME = "leekumkeeglobal"
OUTPUT = Path("/workspace/output/leekumkeeglobal_ig_posts.csv")
DOC_ID = "7950326061742207"


def parse_node(node: dict) -> dict:
    caption_edges = node.get("edge_media_to_caption", {}).get("edges", [])
    caption = caption_edges[0]["node"]["text"] if caption_edges else ""
    taken_at = node.get("taken_at_timestamp")
    posted_at = ""
    if taken_at:
        posted_at = datetime.fromtimestamp(int(taken_at), tz=timezone.utc).isoformat()
    is_video = bool(node.get("is_video"))
    typename = node.get("__typename", "")
    post_type = "reel" if typename == "GraphVideo" and is_video else ("video" if is_video else "photo")
    shortcode = node["shortcode"]
    likes = node.get("edge_liked_by", {}).get("count", node.get("like_count", ""))
    comments = node.get("edge_media_to_comment", {}).get("count", node.get("comment_count", ""))
    return {
        "post_id": shortcode,
        "post_url": f"https://www.instagram.com/p/{shortcode}/",
        "post_type": post_type,
        "caption": caption,
        "posted_at": posted_at,
        "likes": likes,
        "comments_count": comments,
    }


def browser_fetch(page, url: str, method: str = "GET", params: dict | None = None) -> dict:
    params_json = json.dumps(params or {})
    result = page.evaluate(
        """async ({ url, method, params }) => {
            const headers = {
                'X-IG-App-ID': '936619743392459',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': '*/*',
            };
            let fetchUrl = url;
            const options = { method: 'GET', headers, credentials: 'include' };
            if (params && Object.keys(params).length) {
                const qs = new URLSearchParams(params);
                fetchUrl = url + (url.includes('?') ? '&' : '?') + qs.toString();
            }
            const resp = await fetch(fetchUrl, options);
            const text = await resp.text();
            return { status: resp.status, text };
        }""",
        {"url": url, "method": method, "params": params},
    )
    if result["status"] != 200:
        raise RuntimeError(f"HTTP {result['status']} for {url}: {result['text'][:300]}")
    return json.loads(result["text"])


def fetch_posts(username: str) -> list[dict]:
    posts: list[dict] = []
    seen: set[str] = set()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            locale="en-US",
        )
        page = context.new_page()
        page.goto(f"https://www.instagram.com/{username}/", wait_until="domcontentloaded", timeout=60000)
        time.sleep(3)

        profile = browser_fetch(
            page,
            f"https://www.instagram.com/api/v1/users/web_profile_info/?username={username}",
        )
        user = profile["data"]["user"]
        media = user["edge_owner_to_timeline_media"]
        total = media["count"]
        print(f"Profile @{username}: {total} posts", flush=True)

        page_info = media.get("page_info", {})
        edges = media.get("edges", [])

        while True:
            for edge in edges:
                shortcode = edge["node"]["shortcode"]
                if shortcode in seen:
                    continue
                seen.add(shortcode)
                posts.append(parse_node(edge["node"]))

            print(f"Collected {len(posts)}/{total}", flush=True)
            if not page_info.get("has_next_page"):
                break

            cursor = page_info.get("end_cursor")
            if not cursor:
                break

            variables = {"id": user["id"], "first": 12, "after": cursor}
            time.sleep(2)
            payload = browser_fetch(
                page,
                "https://www.instagram.com/graphql/query",
                params={
                    "doc_id": DOC_ID,
                    "variables": json.dumps(variables, separators=(",", ":")),
                    "server_timestamps": "true",
                },
            )
            media = payload["data"]["user"]["edge_owner_to_timeline_media"]
            page_info = media.get("page_info", {})
            edges = media.get("edges", [])

        browser.close()

    return posts


def export_csv(posts: list[dict], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "post_id",
        "post_url",
        "post_type",
        "caption",
        "posted_at",
        "likes",
        "comments_count",
    ]
    with output_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(posts)


def main() -> int:
    username = sys.argv[1] if len(sys.argv) > 1 else USERNAME
    output = Path(sys.argv[2] if len(sys.argv) > 2 else OUTPUT)

    posts = fetch_posts(username)
    if not posts:
        print("No posts collected.", file=sys.stderr)
        return 1

    export_csv(posts, output)
    print(f"Exported {len(posts)} posts to {output}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
