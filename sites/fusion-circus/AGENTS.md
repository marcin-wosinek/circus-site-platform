# Fusion Circus theme

`fusion-circus/` is a WordPress **block theme**, a child theme of Twenty
Twenty-Five, shared by `brussels.fusion-circus.com` and
`valencia.fusion-circus.com`. There is no build step: plain `theme.json`, HTML
templates, and PHP patterns, live-mounted into those sites' wp-env
environments. Run and preview it through a site with the platform commands
(`npm run start -- brussels.fusion-circus.com`); see the site READMEs.

```
.
├── design.md             # locked design system record (narrative; theme.json is canonical)
└── fusion-circus/        # the theme (directory name = theme slug)
    ├── style.css         # theme header (Template: twentytwentyfive) + hand-written CSS
    ├── functions.php     # enqueues style.css and registers theme features
    ├── theme.json        # design tokens + default styles — THE design system
    ├── templates/        # full-page templates (HTML), override parent by filename
    ├── parts/            # header/footer template parts (HTML, flat — no subfolders)
    ├── patterns/         # theme-owned patterns (PHP), the layout source of truth
    ├── blocks/           # theme-owned dynamic blocks
    └── assets/           # fonts (self-hosted woff2), images, editor scripts
```

## Design rules

### Tokens first — everything is a preset in `theme.json`

- `settings.*` = what the editor UI offers; `styles.*` = default appearance
  (element and per-block styles) without user action.
- Fonts are self-hosted latin-subset variable woff2 in `assets/fonts/`,
  registered via `fontFace` in `theme.json` — no runtime Google Fonts request.
- Use only the steps of the spacing and font-size scales.

**Hard rule: no raw hex or px values in templates, patterns, or hand-written
CSS.** Everything references a preset (`var:preset|color|accent`,
`var:preset|spacing|lg`; in CSS `var(--wp--preset--color--accent)`). If the
preset doesn't exist, add it to `theme.json` first. If a pattern needs a
one-off value, the token scale is wrong — fix the scale.

### `design.md` is the design memory

`theme.json` is canonical (WordPress reads it); `design.md` is the narrative
companion — genre, macrostructure, per-section decisions and their rationale,
rejected alternatives, motion stance. **Read `design.md` before any design
work; after locking a decision, record it there with the date.** Templates and
patterns defer to it; amend it intentionally, never drift from it silently.

### Use Hallmark for design decisions

The `hallmark` skill is vendored in `.agents/skills/hallmark/` (linked from
`.claude/skills/hallmark`, pinned in `skills-lock.json`). Use it for new
pages/sections, `hallmark audit` for punch lists, and
`hallmark study <url|screenshot>` to extract DNA from a reference. Persist its
output as tokens and `design.md` entries, never only in chat.

**Never put Hallmark pre-emit critique comments into code**, such as
`<!-- Hallmark · pre-emit critique: P5 H4 E5 S5 R5 V4 -->`. They confuse the
WordPress block parser; keep critiques out of all templates, parts, patterns,
and other emitted block markup.

### Build pages from patterns

Every reusable section is one PHP file in `patterns/` with the standard header
(`Title:`, `Slug: fusion-circus/<name>`, `Categories:`). Dynamic URLs via
`home_url()`/`esc_url`, translatable strings via `esc_html_e()` /
`esc_attr_e()` with the `fusion-circus` text domain. Template parts and
templates stay thin and reference the patterns.

### Iterate visually, in small steps

Change one token or one pattern → reload → judge → adjust. Always check
~375 px width (and 320 px for chrome) as well as desktop — no horizontal
scroll allowed. Use browser screenshots to verify, don't guess.

Alternate palettes/pairings may go in `styles/*.json` for comparison in the
Site Editor, but the palette in `design.md` is the locked default.

## Gotchas (read before debugging "my change does nothing")

1. **User customizations override theme files.** Style hierarchy: core →
   parent `theme.json` → child `theme.json` → **Site Editor changes saved in
   the DB**. Anything styled through the Site Editor UI silently wins over
   later file edits. Persist every decision into `theme.json`/files, then
   reset the customization (Styles → revisions).
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
7. **Pattern cache**: if pattern edits don't show up, confirm the site's
   `.wp-env.json` sets `WP_DEVELOPMENT_MODE: "theme"`.

## Definition of "done" for a change

- Renders correctly on the frontend at desktop **and** ~375 px, no horizontal
  scroll.
- Site Editor reflects it (tokens visible in Styles UI, patterns in the
  inserter).
- Zero raw colors/sizes introduced; everything traces to a preset.
- Works without manual Site Editor tweaks saved in the database.
- The decision is recorded in `design.md` if it locks anything new.

## References

- Theme structure: <https://developer.wordpress.org/themes/block-themes/theme-structure/>
- theme.json living reference: <https://developer.wordpress.org/block-editor/reference-guides/theme-json-reference/theme-json-living/>
- Pattern directory (layout inspiration): <https://wordpress.org/patterns/>
