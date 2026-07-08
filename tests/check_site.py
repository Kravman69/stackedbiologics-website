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
DISCLAIMER_PAGE = "disclaimer.html"
ALL_SHIPPED_PAGES = ALL_CONTENT_PAGES + [DISCLAIMER_PAGE]

# Full RUO phrases required on the consolidated disclaimer page
REQUIRED_PHRASES_FULL = [
    "research use only",
    "not for human consumption",
    "not a drug",
    "not a cosmetic",
    "not a dietary supplement",
]

# Short RUO signal required on every content page (footer line)
REQUIRED_PHRASES_FOOTER = [
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
    r"\bunit-?dose\b",
    r"\bencapsulated\s+solid\b",
    r"\boral-?format\b",
    r"\boral\s+capsules?\b",
    r"\bconsumer\s+oral\b",
]

# Known-good chemical identifiers that must appear on the matching page
COMPOUND_IDENTITY_FACTS = {
    "retatrutide.html": [
        "2381089-83-2",
        "C221H342N46O68",  # checked after stripping tags
        "4731",
    ],
    "enclomiphene.html": ["15690-57-0", "C26H28ClNO"],
    "bpc-157.html": ["137525-51-0", "C62H98N16O22", "1419"],
    "ghk-cu.html": ["49557-75-7"],
}

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


def check_required_phrases() -> list[str]:
    """Full RUO on disclaimer; footer-level RUO phrases on every content page."""
    errors = []
    disc = ROOT / DISCLAIMER_PAGE
    if not disc.is_file():
        errors.append(f"MISSING file: {DISCLAIMER_PAGE}")
    else:
        text = strip_tags(read(disc)).lower()
        for phrase in REQUIRED_PHRASES_FULL:
            if phrase not in text:
                errors.append(f"{DISCLAIMER_PAGE}: missing required phrase: {phrase!r}")

    for name in ALL_CONTENT_PAGES:
        path = ROOT / name
        if not path.is_file():
            errors.append(f"MISSING file: {name}")
            continue
        html = read(path)
        text = strip_tags(html).lower()
        for phrase in REQUIRED_PHRASES_FOOTER:
            if phrase not in text:
                errors.append(f"{name}: missing footer/RUO phrase: {phrase!r}")
        # Must link to consolidated disclaimer
        if "disclaimer.html" not in html:
            errors.append(f"{name}: missing link to disclaimer.html")
        # Must not reintroduce full-page RUO banner markup
        if 'class="ruo-banner"' in html or "class='ruo-banner'" in html:
            errors.append(f"{name}: still has ruo-banner (should be consolidated)")
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


def check_compound_facts() -> list[str]:
    """Assert researched CAS / formula / MW strings appear in shipped HTML (tag-stripped)."""
    errors = []
    for name, facts in COMPOUND_IDENTITY_FACTS.items():
        path = ROOT / name
        if not path.is_file():
            errors.append(f"MISSING compound page for facts: {name}")
            continue
        # Collapse sub/sup tags so C221H342... matches C<sub>221</sub>H<sub>...
        raw = read(path)
        collapsed = re.sub(r"</?(?:sub|sup)>", "", raw, flags=re.I)
        text = strip_tags(collapsed)
        for fact in facts:
            if fact not in text and fact not in collapsed:
                errors.append(f"{name}: missing researched identity fact {fact!r}")
        # Guard against previously invented retatrutide formula
        if name == "retatrutide.html" and "C187H281N43O60" in collapsed.replace("</sub>", "").replace("<sub>", ""):
            flat = re.sub(r"<[^>]+>", "", collapsed)
            if "C187H281N43O60" in flat.replace(" ", ""):
                errors.append(f"{name}: contains incorrect formula C187H281N43O60")
    return errors


def check_assets() -> list[str]:
    errors = []
    for rel in [
        "assets/styles.css",
        "assets/app.js",
        "assets/fonts/Inter-roman.var.woff2",
        "assets/brand/logo-mark.png",
        "assets/brand/logo-mark-lg.png",
        "assets/brand/molecule-bg.svg",
        "assets/brand/molecule-tile.svg",
        "favicon.svg",
        "CNAME",
        "disclaimer.html",
    ]:
        if not (ROOT / rel).is_file():
            errors.append(f"MISSING asset: {rel}")
    css = read(ROOT / "assets/styles.css") if (ROOT / "assets/styles.css").is_file() else ""
    if "cdn." in css.lower() or "fonts.googleapis" in css.lower():
        errors.append("assets/styles.css appears to depend on external CDN URLs")
    if "molecule" not in css.lower() and "molecule-bg" not in css and "molecule-tile" not in css:
        errors.append("assets/styles.css missing molecule background treatment")
    if "brand/molecule" not in css and "molecule-tile" not in css:
        errors.append("assets/styles.css does not reference brand molecule SVG assets")
    # Core pages must not require tailwind CDN; must use local CSS and brand mark
    for name in ALL_SHIPPED_PAGES:
        html = read(ROOT / name) if (ROOT / name).is_file() else ""
        if "cdn.tailwindcss.com" in html or "cdnjs.cloudflare.com" in html:
            errors.append(f"{name}: still references CDN for core styling/icons")
        if 'href="assets/styles.css"' not in html and "href='assets/styles.css'" not in html:
            errors.append(f"{name}: does not link local assets/styles.css")
        if "assets/brand/logo-mark" not in html:
            errors.append(f"{name}: does not reference assets/brand/logo-mark")
    # Index hero should surface a second brand asset (lg mark)
    index_html = read(ROOT / "index.html") if (ROOT / "index.html").is_file() else ""
    if "logo-mark-lg" not in index_html and "logo-lockup" not in index_html:
        errors.append("index.html: missing secondary brand surface (logo-mark-lg or lockup)")
    return errors


def check_internal_links() -> list[str]:
    errors = []
    href_re = re.compile(r"""href=["']([^"'#]+)["']""", re.I)
    for name in ALL_SHIPPED_PAGES:
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
    for name in ALL_SHIPPED_PAGES:
        path = ROOT / name
        if not path.is_file():
            continue
        text = strip_tags(read(path)).lower()
        if "docutise" in text or "loan file" in text or "local-first document" in text:
            errors.append(f"{name}: appears to contain Docutise product copy")
    return errors


def check_no_heavy_disclaimer_blocks() -> list[str]:
    """Body content should not repeat large disclaimer-box blocks on compound pages."""
    errors = []
    for name in COMPOUND_PAGES:
        html = read(ROOT / name) if (ROOT / name).is_file() else ""
        if 'class="disclaimer-box"' in html or "class='disclaimer-box'" in html:
            errors.append(f"{name}: still has inline disclaimer-box (use disclaimer.html)")
        if 'class="ruo-banner"' in html:
            errors.append(f"{name}: still has ruo-banner")
    # Home should not have full compliance section with disclaimer-box
    index = read(ROOT / "index.html") if (ROOT / "index.html").is_file() else ""
    if 'id="compliance"' in index and 'disclaimer-box' in index:
        errors.append("index.html: still has full #compliance disclaimer-box section")
    # Disclaimer page should own the full box
    disc = read(ROOT / DISCLAIMER_PAGE) if (ROOT / DISCLAIMER_PAGE).is_file() else ""
    if "disclaimer-box" not in disc:
        errors.append(f"{DISCLAIMER_PAGE}: missing disclaimer-box for full legal text")
    return errors


def main() -> int:
    all_errors: list[str] = []
    sections = [
        ("required RUO phrases (disclaimer + footer)", check_required_phrases()),
        ("forbidden human-use patterns", check_forbidden(ALL_SHIPPED_PAGES)),
        ("compound identity fields", check_identity(COMPOUND_PAGES)),
        ("researched CAS/formula/MW facts", check_compound_facts()),
        ("assets / brand / no CDN core", check_assets()),
        ("internal links", check_internal_links()),
        ("no Docutise copy", check_no_docutise_copy()),
        ("consolidated disclaimer placement", check_no_heavy_disclaimer_blocks()),
    ]

    print(f"Site root: {ROOT}")
    print(f"Pages: {', '.join(ALL_SHIPPED_PAGES)}")
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
