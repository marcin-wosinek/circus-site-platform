# Issue #27: implementation brief

This brief is for the session that implements the client's chosen hero
treatment. Read [README.md](README.md) first: it holds the baseline, the
alternatives, the measurements and the references. The design review on the
issue is
<https://github.com/marcin-wosinek/circus-site-platform/issues/27#issuecomment-7016904376>.

Written 2026-11-19. The client decides on 2026-11-20.

## 0. Before you start

1. **Get the decision in writing.** You need two things:
   - which option the client chose: **Recommended**, **A**, **B** or **C**;
   - which of the three `design.md` departures were approved (§ 3).

   If the decision is unclear, stop and ask. Do not pick an option yourself.
2. **Know the scope.** You may change, locally:
   - the shared theme `sites/fusion-circus/fusion-circus/`;
   - the Brussels managed artifacts and `content-publish.json`;
   - `sites/fusion-circus/design.md`;
   - the Brussels README.

   You may not deploy the theme, run `content:apply`, or write to production
   in any other way. `content:plan` is read-only and allowed.
3. **Read these files:** `AGENTS.md`, `sites/fusion-circus/AGENTS.md` (the
   rule against raw hex or px in theme code, and the definition of done),
   `sites/fusion-circus/design.md`, `docs/publish-content.md`,
   `docs/import-production.md` and `sites/brussels.fusion-circus.com/README.md`.
4. **Branch.** Work on `issue-27-mobile-hero-design`. Its preview tooling and
   these docs are untracked; commit them with the work, but keep the
   gitignored `screenshots/` folder out. The uncommitted plugin-version
   changes in `sites/brussels.fusion-circus.com/.wp-env.json` belong to the
   user. Leave them alone and keep them out of your commits.

## 1. Refresh local state and lock baselines

The local site was pulled from production on 2026-11-19.

### The committed homepage artifact is stale

The committed artifact (from 2026-10-22) no longer matches production:

- Production has newer copy in the "What are you looking for?" cards
  ("dance improvisation, somatic movement…" and "relaxing head massage…").
- The Fair Events Events List block no longer has `"timeFilter":"upcoming"`.

Exporting over the artifact without checking would mix the two states. Do
this instead:

1. Before pulling, check whether anything local must be kept. The only local
   additions are the 24 issue #27 preview pages, and the pull replaces them.
   Run `node sites/brussels.fusion-circus.com/design/issue-27/build-previews.mjs --remove`
   if the site stays up without a pull.
2. Run `npm run pull -- brussels.fusion-circus.com --apply`. It needs the
   ignored credentials file and replaces only the local database and
   uploads.
3. Confirm the Events List still lists upcoming events only. Without
   `timeFilter` it may rely on the plugin default. If it now shows past
   events, report that; don't fix it silently.
4. Adopt production as the homepage baseline:
   `npm run content:export -- brussels.fusion-circus.com --key homepage --refresh-baseline`.
   Review the diff (expected: the copy change, the `timeFilter` change, and
   possibly an inline-image refresh).

### Manage the five inner pages

Add these five items to `sites/brussels.fusion-circus.com/content-publish.json`.
Follow the `events-calendar` entry: `type: page`, a `page_path` selector,
`allowedStatuses: ["draft", "publish"]` and `metadata: []`.

| Key | Path | Local ID on 2026-11-19 |
|---|---|---|
| `personalised-bodywork` | `/personalised-bodywork-brussels/` | 313 |
| `thai-yoga-massage` | `/thai-yoga-massage-brussels/` | 331 |
| `kobido-massage` | `/kobido-massage-brussels/` | 343 |
| `massage-gift-vouchers` | `/massage-gift-vouchers/` | 360 |
| `relax-together` | `/relax-together/` | 526 |

The `artifactDir` is `content/pages/<key>`. IDs can change after a pull, so
always select by path.

Export each new key. The first export records its own baseline. Then run
`npm test`, since the configuration changed.

**Commit 1:** "Manage the Brussels service pages and refresh the homepage
baseline". It contains the unchanged baselines only. Optionally run
`npm run content:plan -- brussels.fusion-circus.com` (read-only): every item
should report `unchanged`, or `create` for keys that were never deployed.
Record what it reports.

## 2. Theme: an opt-in "Photo hero" Cover style

All the CSS lives in `sites/fusion-circus/fusion-circus/style.css`, which is
also loaded as the editor stylesheet. Register the style in `functions.php`
next to the button styles:

```php
register_block_style( 'core/cover', array(
	'name'  => 'photo-hero',
	'label' => __( 'Photo hero', 'fusion-circus' ),
) );
```

This produces the class `.wp-block-cover.is-style-photo-hero`. Covers without
the style must render exactly as they do today.

The source of the rules is `previews.css` in this folder. Port only the
chosen option's rules, then:

- Rename the selector:

  | Chosen option | Preview class | Becomes |
  |---|---|---|
  | Recommended | `.fc-hero--rec` | `.is-style-photo-hero` |
  | A | `.fc-hero--stack` | `.is-style-photo-hero` |
  | B | `.fc-hero--scrim` | `.is-style-photo-hero` |
  | C | `.fc-hero--fade` | `.is-style-photo-hero` |

- Drop these preview-only parts:
  - the `margin-block-start` fix, which existed only because of the preview
    `<style>` block;
  - the `.fc-hero--focus-*` classes and every `object-position: var(--fc-hero-focus)`
    override. Focal points move to the native Cover attribute (see below);
  - the Outline-button emulation, if departure 3 was approved, because the
    content changes instead (§ 3).
- Use `@media (max-width: 781.98px)` and `@media (min-width: 782px)`, the
  theme's existing header breakpoints.
- Use tokens only: `var(--wp--preset--color--paper|ink|accent-deep|accent-ink|card|scrim)`,
  `var(--wp--preset--spacing--md|lg)`, `color-mix()` of tokens. Literals are
  allowed only for ratios such as `3 / 2` and gradient stop percentages. If
  the gradient needs a new colour, add a `settings.custom` token in
  `theme.json` instead of hard-coding it.
- Keep the `!important` declarations on `min-height`, `aspect-ratio` and
  `padding` that defeat the Cover's inline styles, but keep them to a
  minimum. For colour, prefer removing per-block colours from the hero
  content (§ 3) over `!important` battles with WordPress's
  `has-*-color` classes, which are themselves `!important`.
- Bump the theme `Version` in `style.css` to `0.1.5`.

### Rule summary per option (mobile is below 782px)

**Recommended**
- *Mobile:* the Cover becomes a flex column with no padding and no minimum
  height. The image is static, full width, 3:2, at the focal point. The
  overlay is hidden. The text sits in the inner container on `paper`, padded
  `lg` vertically and `md` horizontally. Body text is `ink`, the H1 is
  `accent-deep`.
- *From 782px:* the overlay runs a 90° gradient: (`scrim` mixed 25% with
  `ink`) at 0%, then `scrim` at 45%, then transparent at 80%. The H1 and all
  copy are `accent-ink`. The layout stays as it is today.

**A**
- *Mobile:* the same as Recommended.
- *Desktop:* unchanged. Tell the client in the PR that desktop keeps its 12
  AA failures.

**B**
- *All widths:* the same desktop gradient and `accent-ink` text as
  Recommended.
- *Mobile:* the content aligns to the bottom, with `padding-top: 70vw`, no
  minimum height and no fixed aspect ratio. The gradient runs at 180°:
  transparent at 0%, `ink` at 30% opacity at 20%, `scrim` at 45%, then
  (`scrim` mixed 30% with `ink`) at 100%. Known weakness: the subject gets
  hidden on the long-copy pages.

**C**
- *Mobile:* the Cover is a block with `padding-top: 82vw`. The image and
  overlay are absolute, pinned to the top and `100vw` tall. The overlay fades
  from transparent at 55% to `paper` at 100%. The text colours are as in A.
- *Desktop:* unchanged, as in A.

### Outline buttons

- **Recommended or B:** on the scrim (from 782px for Recommended, all widths
  for B), restyle Ghost and Outline buttons in the hero as the on-photo
  button: `card` fill, `ink` label. That matches the locked rule "Ghost
  never on photos".
- **A, C, and Recommended on mobile:** the paper ground is fine for Ghost as
  it is.

### Focal points

Use the native Cover `focalPoint` attribute. It sets the image's inline
`object-position`, so the mobile crop follows it automatically, and editors
can drag it in the Cover's focal-point picker.

| Page | `focalPoint` |
|---|---|
| homepage | `{"x":0.62,"y":0.5}` (was 0.39, 0.64) |
| personalised-bodywork | `{"x":0.75,"y":0.4}` (was unset) |
| thai-yoga-massage | `{"x":0.66,"y":0.5}` (was unset) |
| kobido-massage | `{"x":0.75,"y":0.45}` (was 0.49, 0.66) |
| massage-gift-vouchers | `{"x":0.74,"y":0.45}` (was unset) |
| relax-together | `{"x":0.68,"y":0.7}` (was 0.44, 0.69) |

The focal point also changes the desktop crop, which the previews did not
test. Check 1280 × 900 and 768 × 1024 after applying it. If a desktop
subject slides under the text column, tell the user and offer these options:
- keep one compromise point;
- add a mobile-only override through a CSS custom property set by a small
  block-style option.

Don't build the override unasked.

## 3. Content edits (local, then export)

Apply them to the six pages' **first Cover block only**. Leave everything
else on each page untouched: other sections, text, links and templates.

1. Add the block style: `className` `is-style-photo-hero`.
2. Set `focalPoint` from the table above.
3. Remove the homepage's mobile-only state styles: the `"@mobile"` keys
   inside the hero's group, heading, paragraph and buttons. They produce the
   partial violet box the issue reports.
4. **Recommended or B only:** remove the per-block text colours inside the
   hero so the style owns colour. These are `textColor`, `style.color.text`,
   link colours, and the matching `has-*-color` / `has-text-color` classes
   and inline `color:` in the saved HTML. Known instances:
   - H1 `accent-deep` on all six pages;
   - paragraphs in `accent-ink` (bodywork, thai);
   - `#302575` (kobido);
   - `accent-2-deep` (vouchers, relax);
   - `ink` (relax, home);
   - `card` (home, under `@mobile`).

   **For A or C:** keep the content colours, because desktop stays as it is,
   and override them on mobile in CSS, as the preview does.
5. **Only if departure 3 was approved:** switch the homepage's second hero
   button ("EXPLORE MASSAGE & BODYWORK") from core Outline with custom
   `#cf1c72` to the theme's **Ghost** style. Remove the custom border and
   text colour.
6. Don't change copy, links, button order, button colours
   (`vivid-purplish-red` stays) or the font sizes typed into the content.
   Empty `<p></p>` blocks in the home and vouchers heroes can stay. Remove
   one only if it causes a visible gap in the new layout, and say so in the
   PR.

### How to edit

Edit through the block editor's data API, not by rewriting saved HTML. That
way WordPress regenerates valid markup. Use the editor UI or Playwright
driving `wp.data`:

- `wp.data.dispatch('core/block-editor').updateBlockAttributes(clientId, {...})`
- then `wp.data.dispatch('core/editor').savePost()`

The local login form is replaced by a plugin. To get a session for
Playwright, mint auth cookies with WP-CLI: `wp_generate_auth_cookie()` for
the first administrator, as `AUTH_COOKIE` and `LOGGED_IN_COOKIE`, valid for
one hour. Don't change any user's password. Delete the cookie file
afterwards.

After saving, reopen each page and confirm it has no invalid blocks: every
block has `isValid !== false`.

Then export all six keys and review the diffs. They should touch only the
first Cover block. **Commit 2:** the theme (style registration, CSS, version
bump) plus the six artifacts.

## 4. Verification

Use the issue #27 capture matrix: the six real URLs at 360 × 800, 390 × 844,
768 × 1024 and 1280 × 900, as viewport and full-page captures, from the
repository root. Example:

```sh
WP_SCREENSHOT_BASE_URL=http://localhost:9794 \
node ~/workspace/fair-event-plugins/scripts/screenshot.js \
  "/relax-together/" 390x844 after-relax-390x844-viewport.png --no-login --viewport
```

- **Captures.** Keep them in
  `sites/brussels.fusion-circus.com/design/issue-27/screenshots/after/`
  (gitignored). The local baseline PNGs are in `screenshots/before/`. If
  that folder has been cleared, the baseline sheets are attached to the
  issue.
- **Contrast.** `contrast.mjs` already measures the real URLs as variant
  `before`. Run it with `VARIANTS=before` and record the result as *after*.
  The target for every element at every viewport: ≥ 4.5:1, or ≥ 3:1 for
  large text. Recommended and B should report 0 failures. A and C should
  report 0 below 782px; their desktop failures are expected and must be
  stated.
- **Overflow, zoom and focus.** `checks.mjs` targets preview URLs and
  `.wp-block-cover.fc-hero`. Point it at the real paths and at
  `.wp-block-cover.is-style-photo-hero` (now `VARIANT=live`), then confirm:
  - no horizontal overflow at the four sizes or at 195 × 422 and 640 × 450;
  - no clipped hero text;
  - visible keyboard focus on the hero buttons.

  The overflow at 180px predates this work and sits outside the hero (§ README).
- **Subject check.** At 360 and 390, check each page's subject by eye
  against the README table.
- **Editor.** The Photo hero style is in the Cover's Styles panel. The editor
  preview matches the front end closely enough, and there are no
  invalid-block warnings.
- **Regression.** A Cover without the style, such as other sections or a new
  Cover, is unchanged.
- **Tests.** `npm test` passes.

## 5. Documentation and PR

- **`sites/fusion-circus/design.md`:** add a dated "Photo hero (2026-11-xx)"
  entry. Cover the option chosen, the breakpoint, the gradient tokens, the
  approved departures and the AA results. Amend the § Notes and § System
  rules the departures touch, intentionally.
- **Brussels README:** add editor guidance. Cover:
  - applying **Styles → Photo hero** to a page's first Cover;
  - setting the focal point on the photo's main subject, and checking 390px
    and desktop previews;
  - not giving hero text its own colours;
  - the managed keys and the export commands for the five new pages.
- **`AGENTS.md`/root README:** no change unless a new command was added.
- **PR:**
  - Open it from `issue-27-mobile-hero-design` against `main`, with
    `Closes #27` only if every acceptance criterion holds.
  - The body covers the chosen approach and why, the focal-point table, the
    contrast before/after summary, and the deployment order. The theme
    (0.1.5) must reach production **before** the page artifacts, otherwise
    hero text loses its colours. Both steps belong to a later, separately
    authorized deployment.
  - Upload before/after evidence with `--upload github --pr <number>` from
    this repository. Confirm the destination repository is
    `marcin-wosinek/circus-site-platform`.
  - Use labelled side-by-side sheets: `montage` is available and
    `README.md § Reproduce` has the pattern. Keep the same URLs, viewports
    and scroll positions as the baseline.
- **Not part of this work:** theme deploy, `content:apply`, any production
  write, and deleting the issue's earlier evidence comments.
