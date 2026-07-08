# Stacked Biologics website

Static marketing / catalog site for **Stacked Biologics**, a chemical supply company offering **research chemicals and peptides for laboratory use only (RUO)**.

**Domain:** [www.stackedbiologics.com](https://www.stackedbiologics.com) (GitHub Pages via `CNAME`)

## Positioning

- Research Use Only materials for qualified laboratory investigators
- **Not** for human consumption
- **Not** a drug, cosmetic, dietary supplement, or veterinary medicine
- No human dosing, wellness, beauty, or clinical-treatment marketing

## Structure

```
index.html              Home + catalog + compliance
retatrutide.html        Compound identity page
enclomiphene.html
bpc-157.html
ghk-cu.html
assets/styles.css       Self-contained design system (no CDN required for core look)
assets/app.js           Mobile nav
assets/fonts/           Self-hosted Inter variable font
favicon.svg
CNAME                   GitHub Pages custom domain
robots.txt / sitemap.xml
tests/check_site.py     Compliance + link + identity-field checks
```

Legacy `*_info.html` paths redirect to the new compound URLs.

## Local preview

```bash
python3 -m http.server 8080
# open http://127.0.0.1:8080/
```

## Tests

```bash
python3 tests/check_site.py
```

Walks shipped HTML for RUO language, forbidden human-use marketing patterns, compound identity fields, and resolvable internal links.

## Brand

Navy (`#0a1421`) + gold (`#c9a227`) palette retained from prior site; layout/token patterns informed by the Docutise marketing site design system (structure only—not product copy).
