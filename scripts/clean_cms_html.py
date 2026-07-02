#!/usr/bin/env python3
"""
Strip presentation-only HTML from legacy CMS exports so a new CMS can apply its own styles.

Removes:
  - inline style attributes (font-size, margin, padding, line-height, text-align, color, etc.)
  - empty span/font wrappers left after style removal
  - redundant br tags used only for spacing
  - trailing non-breaking spaces and whitespace inside block elements
  - empty style/class attributes

Preserves:
  - semantic tags (p, h1-h6, strong, em, a, ul, ol, li, table, etc.)
  - link hrefs and other non-presentation attributes
"""

from __future__ import annotations

import argparse
import re
import sys
from html import unescape
from html.parser import HTMLParser
from io import StringIO

PRESENTATION_PROPERTIES = {
    "font-size",
    "font-family",
    "font-weight",
    "font-style",
    "line-height",
    "letter-spacing",
    "word-spacing",
    "color",
    "background",
    "background-color",
    "margin",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "padding",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "text-align",
    "text-indent",
    "text-decoration",
    "vertical-align",
    "white-space",
    "width",
    "height",
    "min-width",
    "min-height",
    "max-width",
    "max-height",
}

UNWRAP_TAGS = {"span", "font"}


def strip_presentation_from_style(style: str) -> str:
    if not style.strip():
        return ""
    kept: list[str] = []
    for part in style.split(";"):
        part = part.strip()
        if not part or ":" not in part:
            continue
        prop, _value = part.split(":", 1)
        if prop.strip().lower() not in PRESENTATION_PROPERTIES:
            kept.append(part)
    return "; ".join(kept)


def normalize_text(text: str) -> str:
    # Decode entities, collapse accidental spacing artifacts from legacy editors.
    text = unescape(text)
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    return text


def trim_block_inner(text: str) -> str:
    return text.strip()


class HtmlCleaner(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self.out = StringIO()
        self._skip_depth = 0
        self._unwrap_stack: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self._skip_depth:
            self._skip_depth += 1
            return

        tag = tag.lower()
        attr_map = {k.lower(): (v or "") for k, v in attrs}

        if tag in UNWRAP_TAGS:
            style = strip_presentation_from_style(attr_map.get("style", ""))
            if not style and not any(k for k in attr_map if k not in {"style", "class", "id"}):
                self._unwrap_stack.append(tag)
                return

        if tag == "br":
            # Drop br tags that were used purely for vertical spacing in legacy content.
            return

        cleaned_attrs: list[tuple[str, str]] = []
        for key, value in attrs:
            key_lower = key.lower()
            if key_lower == "style":
                cleaned_style = strip_presentation_from_style(value or "")
                if cleaned_style:
                    cleaned_attrs.append((key, cleaned_style))
            elif key_lower in {"class", "id"}:
                continue
            else:
                cleaned_attrs.append((key, value or ""))

        self.out.write(f"<{tag}")
        for key, value in cleaned_attrs:
            self.out.write(f' {key}="{value}"')
        self.out.write(">")

    def handle_endtag(self, tag: str) -> None:
        if self._skip_depth:
            self._skip_depth -= 1
            return

        tag = tag.lower()
        if self._unwrap_stack and self._unwrap_stack[-1] == tag:
            self._unwrap_stack.pop()
            return

        if tag == "br":
            return

        self.out.write(f"</{tag}>")

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        self.out.write(normalize_text(data))

    def handle_entityref(self, name: str) -> None:
        if self._skip_depth:
            return
        self.out.write(unescape(f"&{name};"))

    def handle_charref(self, name: str) -> None:
        if self._skip_depth:
            return
        self.out.write(unescape(f"&#{name};"))


def promote_section_headings(html: str) -> str:
    """
    Convert legacy section headings like:
      <p><strong>1. Title</strong></p>
    into:
      <h2>1. Title</h2>
    """
    pattern = re.compile(
        r"<p>\s*<strong>\s*(\d+\.\s[^<]+?)\s*</strong>\s*</p>",
        re.IGNORECASE | re.DOTALL,
    )
    return pattern.sub(r"<h2>\1</h2>", html)


def collapse_blank_lines(html: str) -> str:
    html = re.sub(r"\n{3,}", "\n\n", html)
    return html.strip() + "\n"


def trim_trailing_space_before_close_tags(html: str) -> str:
    return re.sub(r"[ \t\u00a0]+(?=</(?:p|h[1-6]|li|td|th)>)", "", html)


def clean_html(raw: str) -> str:
    parser = HtmlCleaner()
    parser.feed(raw)
    parser.close()
    cleaned = parser.out.getvalue()
    cleaned = promote_section_headings(cleaned)
    cleaned = trim_trailing_space_before_close_tags(cleaned)
    cleaned = collapse_blank_lines(cleaned)
    return cleaned


def main() -> int:
    arg_parser = argparse.ArgumentParser(description=__doc__)
    arg_parser.add_argument("input", help="Input HTML file")
    arg_parser.add_argument(
        "-o",
        "--output",
        help="Output file (default: stdout)",
    )
    args = arg_parser.parse_args()

    with open(args.input, encoding="utf-8") as f:
        raw = f.read()

    cleaned = clean_html(raw)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(cleaned)
    else:
        sys.stdout.write(cleaned)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
