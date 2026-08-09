# WordPress block-theme project

Custom WordPress **block theme** for this website, built as a **child theme of
Twenty Twenty-Five** and developed locally with **wp-env**. No build step, no
bundler — plain `theme.json`, HTML templates, and PHP patterns, live-mounted
into Docker. There is no designer on the team, so the workflow is deliberately
constrained: all design decisions live as tokens in `theme.json`, layout work
happens at the pattern level, and every locked design decision is recorded in
`design.md`.

Replace `<slug>` below with the theme slug for this site (lowercase, one word,
e.g. the domain without TLD). The theme directory name **is** the slug.

## Repository layout

```
.
├── AGENTS.md             # this file
├── CLAUDE.md              # symlink to AGENTS.md for Claude Code
├── design.md             # locked design system record (narrative; theme.json is canonical)
├── .wp-env.json          # local environment definition
├── bin/                  # local operational helpers (including REST content publishing)
├── import/               # gitignored staging area for production DB dump + uploads
└── <slug>/               # the theme (directory name = theme slug)
    ├── style.css         # theme header (Template: twentytwentyfive) + hand-written CSS
    ├── functions.php     # enqueue style.css (block themes don't load it automatically)
    ├── theme.json        # design tokens + default styles — THE design system
    ├── templates/        # full-page templates (HTML), override parent by filename
    ├── parts/            # header/footer template parts (HTML, flat — no subfolders)
    ├── patterns/         # theme-owned patterns (PHP), the layout source of truth
    ├── styles/           # optional style variations (JSON)
    └── assets/           # fonts (self-hosted woff2), images (logo etc.)
```

## Bootstrapping an empty repo

If this repo doesn't contain the structure above yet, create it in this order,
one commit per step:

1. **Init**: `.gitignore` with `node_modules/`, `import/`, `.DS_Store`, and
   `.env.wp-rest`.
2. **Scaffold the child theme** `<slug>/`:
   - `style.css` header — the `Template: twentytwentyfive` line is what makes
     it a child theme:
     ```css
     /*
     Theme Name: <Name>
     Theme URI: https://<domain>
     Description: Child theme of Twenty Twenty-Five for <domain>
     Template: twentytwentyfive
     Version: 0.1.0
     Requires at least: 6.7
     Requires PHP: 7.4
     Text Domain: <slug>
     */
     ```
   - `theme.json` starting as
     `{ "$schema": "https://schemas.wp.org/trunk/theme.json", "version": 3, "settings": {}, "styles": {} }`
   - `functions.php` that enqueues `get_stylesheet_uri()` on
     `wp_enqueue_scripts` (versioned with `wp_get_theme()->get('Version')`).
3. **`.wp-env.json`** at the repo root:
   ```json
   {
     "core": null,
     "themes": ["./<slug>"],
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
   `"core": null` = latest stable WordPress (bundles Twenty Twenty-Five, so
   the parent needs no install step). `WP_DEVELOPMENT_MODE: "theme"` is
   **required** — without it WordPress caches block patterns and edits to
   `patterns/*.php` silently do nothing.
4. **Import production content** (if migrating an existing site — see below).
5. **Install the Hallmark design skill**: `npx skills add nutlope/hallmark`
   (commit the installed skill, its tool integration/symlink, and
   `skills-lock.json`).
6. **Design system**: run Hallmark on the brief/existing content, persist the
   outcome into `theme.json` (tokens) and `design.md` (rationale). Commit.
7. **Build chrome then pages**: header part → footer part → front page →
   remaining templates. One commit per locked piece, recorded in `design.md`.

## Local environment (wp-env)

Prerequisites: Node.js LTS, Docker Desktop.

| Command | What it does |
|---|---|
| `npx wp-env start` | Start (first run is slow) |
| `npx wp-env stop` | Stop containers, keep data |
| `npx wp-env clean all` | **Reset the database** (see gotchas — you'll want this) |
| `npx wp-env destroy` | Remove everything including volumes |
| `npx wp-env run cli wp <cmd>` | Any WP-CLI command inside the container |

- Dev site: <http://localhost:8888> — login `admin` / `password`
- Test site: <http://localhost:8889> (automated tests only, ignore)
- If the theme isn't active: `npx wp-env run cli wp theme activate <slug>`

Theme files are mounted live — edit locally, reload the browser. Keep the
project build-step-free unless custom JS becomes unavoidable.

## Design workflow (no designer)

### 1. Tokens first — everything is a preset in `theme.json`

- **Colors**: a role-based palette in `settings.color.palette` — 3–4 tinted
  neutrals plus a multi-accent set where **each accent owns one role**
  (primary action, links/hover, one pop moment, sparing tags). Accents never
  blend in gradients. Borrow from a proven palette (Radix, Tailwind, or a
  Hallmark-derived oklch ramp) rather than picking hex by eye.
- **Typography**: at most two fonts, self-hosted (latin-subset variable woff2
  in `assets/fonts/`, registered via `fontFace` in `theme.json` — no runtime
  Google Fonts request). Scale in `settings.typography.fontSizes`, modular
  ratio ~1.25, `fluid: true` on the top steps.
- **Spacing**: a scale in `settings.spacing.spacingSizes`; use only those steps.
- `settings.*` = what the editor UI offers; `styles.*` = default appearance
  (element and per-block styles) without user action.

**Hard rule: no raw hex or px values in templates, patterns, or hand-written
CSS.** Everything references a preset (`var:preset|color|accent`,
`var:preset|spacing|lg`; in CSS `var(--wp--preset--color--accent)`). If the
preset doesn't exist, add it to `theme.json` first. If a pattern needs a
one-off value, the token scale is wrong — fix the scale. This single rule is
what keeps the site looking designed.

### 2. `design.md` is the design memory

`theme.json` is canonical (WordPress reads it); `design.md` is the narrative
companion — genre, macrostructure, per-section decisions and their rationale,
rejected alternatives, motion stance. **Read `design.md` before any design
work; after locking a decision, record it there with the date.** Templates and
patterns defer to it; amend it intentionally, never drift from it silently.

### 3. Use Hallmark for design decisions

Invoke the `hallmark` skill for new pages/sections, `hallmark audit` for
punch lists, `hallmark study <url|screenshot>` to extract DNA from a
reference. Its output gets persisted as tokens + `design.md` entries, never
left only in chat.

### 4. Build pages from patterns

Every reusable section is one PHP file in `patterns/` with the standard header
(`Title:`, `Slug: <slug>/<name>`, `Categories:`). Dynamic URLs via
`home_url()`/`esc_url`, translatable strings via `esc_html_e()` /
`esc_attr_e()` with the `<slug>` text domain. Template parts (`parts/*.html`)
and templates (`templates/*.html`) stay thin and reference the patterns.

### 5. Iterate visually, in small steps

Change one token or one pattern → reload → judge → adjust. Always check
~375 px width (and 320 px for chrome) as well as desktop — no horizontal
scroll allowed. Use browser tooling (screenshots) to verify, don't guess.

Use the repository screenshot helper whenever a visual change is made. It
opens the local wp-env site configured in `screenshot.config.cjs` (currently
`http://localhost:9788`) and saves images under the gitignored `artifacts/`
directory.

```sh
# Start the local WordPress environment when it is not already running.
npx wp-env start

# Desktop screenshot of the home page (1440 px wide).
npm run screenshot

# Desktop screenshot of a route.
npm run screenshot -- /publica-tu-evento

# Mobile screenshot of that route (375 px wide).
npm run screenshot -- /publica-tu-evento --mobile
```

Inspect the generated screenshot before declaring a visual change complete.
Check both desktop and mobile for overflow, clipped content, and unintended
layout changes. To target a different running environment temporarily, set
`PAGE_URL`; do not change `screenshot.config.cjs` unless the project's wp-env
port changes.

### 6. Style variations

Alternate palettes/pairings go in `styles/*.json` for side-by-side comparison
in the Site Editor, but the palette in `design.md` is the locked default.

## AI-assisted content publishing (WordPress REST API)

When a coding agent needs to create, update, or publish editorial content,
use the existing dedicated WordPress `AI Editor` account (with the **Editor**
role or a custom role limited to posts and events).

1. While signed in as that user, generate an Application Password at
   **Users → Profile → Application Passwords**.
2. Store the credentials only in the local repository-root file
   `.env.wp-rest`, which is explicitly gitignored. Use this format:

   ```dotenv
   WP_REST_URL=https://example.com
   WP_REST_USERNAME=AI Editor
   WP_REST_APPLICATION_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
   ```

3. The agent may read that local file to authenticate to the WordPress REST
   API and create, update, and publish only the permitted content. Never put
   these values in tracked files, theme files, commits, command output, or
   database exports.

Use a role with the narrowest practical capabilities. Revoke and regenerate
the Application Password when access is no longer needed or may have been
exposed.

### Publishing an existing HTML page body to WordPress

Use this workflow when asked to put the contents of a local Gutenberg-markup
HTML file onto an existing WordPress page. It is an intentional content
publication workflow: do not change the page title, slug, status, template,
or other page settings unless the request explicitly says to do so.

1. Start the local environment if needed: `npx wp-env start`.
2. Ensure the source file contains valid Gutenberg block markup (for example,
   `<!-- wp:group -->` comments). Preview the exact target first:

   ```sh
   npm run publish:page:dry-run -- <page-slug> <source-file>.html
   ```

   This confirms exactly one matching, already-published page and prints only
   its ID, slug, status and link. It does not write to WordPress.
3. Publish the file as that page's complete `content` field:

   ```sh
   npm run publish:page -- <page-slug> <source-file>.html
   ```

   `bin/publish-page-content.sh` is the required publisher. It reads
   `.env.wp-rest` without `source` (credentials may contain spaces), refuses
   non-Gutenberg files, ambiguous/missing slugs and non-published pages, and
   verifies the returned ID, slug and `publish` status. It changes only
   `content`; never title, slug, template or other page settings. Treat an
   HTTP 401/403 response as an authorization issue; do not fall back to
   another account or method without user direction.
4. Verify the public result with the repository screenshot helper, then
   inspect both images before reporting completion:

   ```sh
   npm run screenshot -- /<page-slug>
   npm run screenshot -- /<page-slug> --mobile
   ```

   Confirm the page has no horizontal overflow and that all expected blocks,
   especially interactive forms, render on desktop and at 375 px. Screenshots
   belong in gitignored `artifacts/` and are not committed.

## Importing production content

To work against a real copy of the live site you need a DB dump and the
`wp-content/uploads` folder. Containers only see directories mapped in
`.wp-env.json` — that's what the `import/` mappings are for. `import/` is
gitignored, local-only, never committed.

```bash
# Database
mkdir -p import/db && cp ~/Downloads/<export>.sql import/db/
npx wp-env run cli wp db reset --yes        # ALWAYS reset first
npx wp-env run cli wp db import wp-content/import/<export>.sql

# Uploads — check archive structure first: years (2026/ etc.) must land
# directly under import/uploads/
unzip -l ~/Downloads/uploads.zip | head
mkdir -p import/uploads && unzip -o ~/Downloads/uploads.zip -d import/uploads

# Verify
npx wp-env run cli wp post list --post_type=post --fields=ID,post_title,post_date
```

Skipping `wp db reset` leaves the fresh install's `ID = 1` default rows
colliding with the dump's — you get a silent mix of old and new data. No URL
search-replace is needed: wp-env's `WP_SITEURL`/`WP_HOME` constants override
the dump's values.

## Gotchas (read before debugging "my change does nothing")

1. **User customizations override theme files.** Style hierarchy: core →
   parent `theme.json` → child `theme.json` → **Site Editor changes saved in
   the DB**. Anything ever styled through the Site Editor UI silently wins
   over later file edits. Use the Site Editor to preview, but persist every
   decision into `theme.json`/files, then reset (`npx wp-env clean all` or
   Styles → revisions).
2. **Selected style variations are stored in the DB too** — editing the JSON
   won't update a site that already picked it; re-select or reset.
3. **`parts/` and `templates/` must be flat** — subdirectories are ignored.
4. **Invalid `theme.json` fails silently** — keep the `$schema` line, lint
   when in doubt.
5. **Overriding a parent template** requires the exact parent filename; copy
   the file from `wp-content/themes/twentytwentyfive/` as the starting point.
6. **Preset CSS var slugs kebab-case digits**: font size `2xl` becomes
   `--wp--preset--font-size--2-xl`, spacing `2xs` →
   `--wp--preset--spacing--2-xs`. Always use the kebab form in hand-written
   CSS — the un-kebabed form fails silently.
7. **Pattern cache**: if pattern edits don't show up, confirm
   `WP_DEVELOPMENT_MODE: "theme"` is set in `.wp-env.json`.

## Definition of "done" for a change

- Renders correctly on the frontend at desktop **and** ~375 px, no horizontal
  scroll.
- Site Editor reflects it (tokens visible in Styles UI, patterns in the
  inserter).
- Zero raw colors/sizes introduced; everything traces to a preset.
- Works on a fresh DB (`npx wp-env clean all`, re-check) — proves nothing
  depends on manual Site Editor tweaks.
- The decision is recorded in `design.md` if it locks anything new.

## References

- Theme structure: <https://developer.wordpress.org/themes/block-themes/theme-structure/>
- theme.json living reference: <https://developer.wordpress.org/block-editor/reference-guides/theme-json-reference/theme-json-living/>
- wp-env: <https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/>
- Pattern directory (layout inspiration): <https://wordpress.org/patterns/>
