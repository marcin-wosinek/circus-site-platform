# lamutable.es — theme project guide

The Lamutable website lives directly in the Circus Site Platform repository. It
is not a Git submodule.

Custom WordPress block theme for lamutable.es, built as a **child theme of Twenty
Twenty-Five** and developed locally with **wp-env**. There is no designer on the
team, so the workflow below is deliberately constrained: all design decisions
live as tokens in `theme.json`, and layout work happens at the pattern level.

## Why a child theme of Twenty Twenty-Five

- Twenty Twenty-Five ships with WordPress core, is well designed, and keeps
  receiving fixes — we inherit hundreds of small correct decisions (line
  heights, content widths, block gaps) for free.
- A block child theme is cheap: our `theme.json` **merges on top of** the
  parent's, our `templates/*.html` and `parts/*.html` **override by filename**,
  and our `patterns/*.php` are **additive**. We only maintain what we change.
- If we ever outgrow it, converting to a standalone theme is mostly copying
  the parent files we still rely on.

## Prerequisites

- Node.js (LTS) — wp-env runs via `npx`, no global install needed
- Docker Desktop (wp-env runs WordPress in containers)

## Repository layout

```
.
├── .wp-env.json          # local environment definition
├── README.md             # this guide
└── lamutable/            # the theme (directory name = theme slug)
    ├── style.css         # theme header (declares the parent via Template:)
    ├── theme.json        # design tokens + default styles (the design system)
    ├── templates/        # full-page templates (HTML), override parent by name
    ├── parts/            # header/footer template parts (HTML, no subfolders!)
    ├── patterns/         # theme-owned patterns (PHP)
    └── styles/           # style variations (JSON) — alternate palettes/fonts
```

Minimum viable theme files:

`lamutable/style.css`:

```css
/*
Theme Name: Lamutable
Theme URI: https://lamutable.es
Description: Child theme of Twenty Twenty-Five for lamutable.es
Template: twentytwentyfive
Version: 0.1.0
Requires at least: 6.7
Requires PHP: 7.4
Text Domain: lamutable
*/
```

`lamutable/theme.json` starts as `{ "$schema": "https://schemas.wp.org/trunk/theme.json", "version": 3, "settings": {}, "styles": {} }`
and grows from there. Version 3 requires WordPress ≥ 6.6 — fine for us.

## Local environment (wp-env)

`.wp-env.json` at the repo root:

```json
{
  "core": null,
  "port": 9790,
  "testsEnvironment": false,
  "themes": ["./lamutable"],
  "config": {
    "WP_DEBUG": true,
    "SCRIPT_DEBUG": true,
    "WP_DEVELOPMENT_MODE": "theme"
  },
  "mappings": {
    "wp-content/uploads": "./import/uploads",
    "wp-content/import": "./import/db"
  }
}
```

`"core": null` means "latest stable WordPress", which already bundles Twenty
Twenty-Five, so the parent theme needs no extra install step.

### Commands

Run shared lifecycle commands from the platform repository root:

```sh
npm run start -- lamutable.es
npm run stop -- lamutable.es
npm run update -- lamutable.es
```

The development site runs at <http://localhost:9790> with the default wp-env
login `admin` / `password`. The separate wp-env test environment is disabled.
Theme files are mounted live, so edits only require a browser reload. There is
no build step.

If the theme isn't active after start:
`npx wp-env run cli wp theme activate lamutable`

## Design workflow (no designer)

The system that keeps the result coherent without a designer:

### 1. Tokens first — everything is a preset in `theme.json`

- **Colors:** one brand color, one accent, 3–4 neutrals — defined once in
  `settings.color.palette`. Borrow values from a proven palette (Radix,
  Tailwind) rather than picking hex codes by eye.
- **Typography:** at most two fonts. Define the scale in
  `settings.typography.fontSizes` using a modular scale (1.25 ratio is safe);
  prefer `fluid: true` sizes.
- **Spacing:** define `settings.spacing.spacingSizes` as a scale and use only
  those steps.

**Hard rule: no raw hex values, no raw px values in templates or patterns.**
If a pattern needs a color or size, it references a preset
(`var:preset|color|accent`, `var:preset|spacing|50`). If the preset doesn't
exist, add it to `theme.json` first. This single rule is what keeps the site
looking designed.

- `settings.*` = what the editor UI offers (presets, toggles)
- `styles.*` = default appearance without user action (element and per-block styles)

### 2. Build pages from patterns

Every reusable section (hero, feature grid, CTA, contact, footer) is a file in
`patterns/`, one pattern per PHP file with the standard header comment
(`Title:`, `Slug: lamutable/<name>`, `Categories:`). Steal *layout* from the
WordPress.org pattern directory or well-designed theme pattern sets, rebuild it
with our tokens. Conventions:

- Slug prefix `lamutable/`, text domain `lamutable`, translatable strings
  through `esc_html_e()` / `esc_attr_e()`.
- A pattern must look right using only presets — if it needs a one-off value,
  the token scale is wrong, fix the scale.

### 3. Iterate visually, in small steps

Change one token or one pattern → reload → judge → adjust. Judging "does this
look off?" is much easier than designing from scratch. Always check ~375 px
width too, not just desktop.

### 4. Explore with style variations

Alternate palettes/font pairings go in `styles/*.json` (same shape as
`theme.json`). Comparing 2–3 variations side by side in the Site Editor
(Appearance → Editor → Styles) is the cheapest way to pick a direction.

## Importing production content

Create the ignored platform-root `.env.import-local/lamutable.es` file with the
site's SSH connection details, then run:

```sh
npm run import -- lamutable.es --apply
```

Production is read-only. The command destructively replaces only Lamutable's
local wp-env database and uploads, preserves a local backup, updates the pinned
plugin sources from production, and reactivates the tracked theme. The
repository theme is not replaced by an import. See
[`../../docs/import-production.md`](../../docs/import-production.md) for the
prerequisites, safeguards, configuration keys, and recovery details.

## Gotchas (read before debugging "my change does nothing")

1. **User customizations override theme files.** The style hierarchy is:
   core defaults → parent theme.json → child theme.json → **user changes saved
   in the Site Editor (stored in the DB)**. If you styled something through the
   Site Editor UI once, later `theme.json` edits to the same thing are
   silently ignored. Fix: Site Editor → Styles → revisions/reset, or nuke the
   DB with `npx wp-env clean all`. Rule of thumb: **use the Site Editor to
   preview, but persist every decision into `theme.json` / template files**,
   then reset the DB customizations.
2. **Selected style variations are stored in the DB too** — editing the JSON
   file won't update a site that already picked it. Re-select it or reset.
3. **Template parts must live flat in `parts/`** — subdirectories are not
   supported (templates in `templates/` likewise).
4. **Invalid `theme.json` fails silently.** A typo or wrong shape means the
   whole file may not apply. The `$schema` line gives editor validation — keep
   it, and check with a JSON linter when in doubt.
5. **Overriding a parent template** requires the exact same filename
   (e.g., `templates/home.html` overrides Twenty Twenty-Five's `home.html`).
   Copy the parent file from
   `wp-content/themes/twentytwentyfive/` as a starting point, don't rewrite
   from scratch.

## Definition of "done" for a change

- Renders correctly on the frontend at desktop **and** ~375 px width.
- Site Editor reflects it (Styles UI shows the tokens, patterns appear in the
  inserter under our categories).
- No raw colors/sizes were introduced; everything traces back to a preset.
- Works on a fresh DB (`npx wp-env clean all`, re-check) — proves nothing
  relies on manual Site Editor tweaks.

## References

- Theme structure: <https://developer.wordpress.org/themes/block-themes/theme-structure/>
- theme.json living reference: <https://developer.wordpress.org/block-editor/reference-guides/theme-json-reference/theme-json-living/>
- Global settings & styles: <https://developer.wordpress.org/themes/global-settings-and-styles/>
- wp-env: <https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/>
- Pattern directory (layout inspiration): <https://wordpress.org/patterns/>
