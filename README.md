# Stacked Biologics website

Static marketing / catalog site for **Stacked Biologics**, a chemical supply company offering **research chemicals and peptides for laboratory use only (RUO)**.

**Domain:** [www.stackedbiologics.com](https://www.stackedbiologics.com) (GitHub Pages via `CNAME`)

## Positioning

- Research chemicals focused on identity data (CAS, formula, form, storage, literature context)
- Research Use Only framing via a single [disclaimer](disclaimer.html) page and shared footer
- **Not** for human consumption; not marketed as a drug, cosmetic, dietary supplement, or veterinary medicine

## Structure

```
index.html              Home + catalog + standards
disclaimer.html         Consolidated RUO / legal notice
retatrutide.html        Compound identity page
enclomiphene.html
bpc-157.html
ghk-cu.html
assets/styles.css       Self-contained design system (no CDN required for core look)
assets/app.js           Mobile nav
assets/fonts/           Self-hosted Inter variable font
assets/brand/           Optimized logo marks + decorative molecule SVGs
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

Walks shipped HTML for RUO language (disclaimer page + footer), forbidden human-use marketing patterns, compound identity fields, brand assets, and resolvable internal links.

## Brand

Navy (`#0a1421`) + gold (`#c9a227`) palette from the Stacked Biologics logos. Header/footer use a cropped geometric mark (`assets/brand/logo-mark.png`); hero surfaces a larger mark. Decorative chemical-structure backgrounds use gold linework on navy (`assets/brand/molecule-*.svg`).
