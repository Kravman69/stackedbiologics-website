#!/usr/bin/env python3
"""
Static compliance and structure checks against shipped HTML.

Drives real files under the site root (not mocks). Exit 0 only if all gates pass.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

COMPOUND_PAGES = [
    "retatrutide.html",
    "enclomiphene.html",
    "bpc-157.html",
    "ghk-cu.html",
]

ALL_CONTENT_PAGES = ["index.html"] + COMPOUND_PAGES

# Required RUO / non-human framing (case-insensitive substring)
REQUIRED_PHRASES = [
    "research use only",
    "not for human consumption",
    "not a drug",
    "not a cosmetic",
    "not a dietary supplement",
]

# Forbidden human-use marketing patterns (case-insensitive)
FORBIDDEN_PATTERNS = [
    r"\bfacial\s+serum\b",
    r"\bapply\s+to\s+(your\s+)?skin\b",
    r"\bfor\s+a\s+person\s+weighing\b",
    r"\bpersonal\s+protein\b",
    r"\btitration\s+table\b",
    r"\bpatients?\b",
    r"\bdose\s+for\s+humans?\b",
    r"\banti-?aging\s+serum\b",
    r"\btake\s+\d+\s*(mg|mcg|ml)\s+(daily|per\s+day)\b",
    r"\bwellness\s+supplement\b",
    r"\bdietary\s+advice\b",
]

# Identity field labels / markers expected on each compound page
IDENTITY_MARKERS = [
    r"chemical\s+class",
    r"\bCAS\b",
    r"(molecular\s+formula|formula)",
    r"(approximate\s+MW|molecular\s+weight|\bMW\b)",
    r"(research\s+material\s+form|form\s+supplied)",
    r"storage",
    r"(research\s+context|research\s+summary)",
    r"(disclaimer|research\s+use\s+only)",
]


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def strip_tags(html: str) -> str:
    text = re.sub(r"(?is)<script[^>]*>.*?</script>", " ", html)
    text = re.sub(r"(?is)<style[^>]*>.*?</style>", " ", text)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text)


def check_required_phrases(pages: list[str]) -> list[str]:
    errors = []
    for name in pages:
        path = ROOT / name
        if not path.is_file():
            errors.append(f"MISSING file: {name}")
            continue
        text = strip_tags(read(path)).lower()
        for phrase in REQUIRED_PHRASES:
            if phrase not in text:
                errors.append(f"{name}: missing required phrase: {phrase!r}")
    return errors


def check_forbidden(pages: list[str]) -> list[str]:
    errors = []
    for name in pages:
        path = ROOT / name
        if not path.is_file():
            continue
        text = strip_tags(read(path))
        for pat in FORBIDDEN_PATTERNS:
            if re.search(pat, text, re.I):
                errors.append(f"{name}: forbidden pattern matched: {pat}")
    return errors


def check_identity(pages: list[str]) -> list[str]:
    errors = []
    for name in pages:
        path = ROOT / name
        if not path.is_file():
            errors.append(f"MISSING compound page: {name}")
            continue
        text = strip_tags(read(path))
        for pat in IDENTITY_MARKERS:
            if not re.search(pat, text, re.I):
                errors.append(f"{name}: missing identity marker matching /{pat}/")
    return errors


def check_assets() -> list[str]:
    errors = []
    for rel in [
        "assets/styles.css",
        "assets/app.js",
        "assets/fonts/Inter-roman.var.woff2",
        "favicon.svg",
        "CNAME",
        "stacked_logo_dark_bg.jpg",
    ]:
        if not (ROOT / rel).is_file():
            errors.append(f"MISSING asset: {rel}")
    css = read(ROOT / "assets/styles.css") if (ROOT / "assets/styles.css").is_file() else ""
    if "cdn." in css.lower() or "fonts.googleapis" in css.lower():
        errors.append("assets/styles.css appears to depend on external CDN URLs")
    # Core pages must not require tailwind CDN
    for name in ALL_CONTENT_PAGES:
        html = read(ROOT / name) if (ROOT / name).is_file() else ""
        if "cdn.tailwindcss.com" in html or "cdnjs.cloudflare.com" in html:
            errors.append(f"{name}: still references CDN for core styling/icons")
        if 'href="assets/styles.css"' not in html and "href='assets/styles.css'" not in html:
            errors.append(f"{name}: does not link local assets/styles.css")
    return errors


def check_internal_links() -> list[str]:
    errors = []
    href_re = re.compile(r"""href=["']([^"'#]+)["']""", re.I)
    for name in ALL_CONTENT_PAGES:
        path = ROOT / name
        if not path.is_file():
            continue
        html = read(path)
        for href in href_re.findall(html):
            if href.startswith(("http://", "https://", "mailto:", "data:")):
                continue
            target = (path.parent / href).resolve()
            try:
                target.relative_to(ROOT.resolve())
            except ValueError:
                errors.append(f"{name}: link escapes site root: {href}")
                continue
            if not target.is_file():
                errors.append(f"{name}: broken internal link: {href}")
    return errors


def check_no_docutise_copy() -> list[str]:
    errors = []
    for name in ALL_CONTENT_PAGES:
        text = strip_tags(read(ROOT / name)).lower()
        if "docutise" in text or "loan file" in text or "local-first document" in text:
            errors.append(f"{name}: appears to contain Docutise product copy")
    return errors


def main() -> int:
    all_errors: list[str] = []
    sections = [
        ("required RUO phrases", check_required_phrases(ALL_CONTENT_PAGES)),
        ("forbidden human-use patterns", check_forbidden(ALL_CONTENT_PAGES)),
        ("compound identity fields", check_identity(COMPOUND_PAGES)),
        ("assets / no CDN core", check_assets()),
        ("internal links", check_internal_links()),
        ("no Docutise copy", check_no_docutise_copy()),
    ]

    print(f"Site root: {ROOT}")
    print(f"Pages: {', '.join(ALL_CONTENT_PAGES)}")
    print()

    for title, errs in sections:
        if errs:
            print(f"FAIL  {title} ({len(errs)})")
            for e in errs:
                print(f"  - {e}")
            all_errors.extend(errs)
        else:
            print(f"PASS  {title}")

    print()
    if all_errors:
        print(f"RESULT: FAIL ({len(all_errors)} issue(s))")
        return 1
    print("RESULT: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
