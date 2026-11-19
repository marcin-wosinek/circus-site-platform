# Issue #27: mobile hero design review

Design preparation for
[issue #27](https://github.com/marcin-wosinek/circus-site-platform/issues/27):
the photographic hero (the first Cover block) on six Brussels pages. This
directory holds **preview-only** tooling and the review record. It doesn't
change the shared theme, the managed page artifacts or production.

Status (2026-11-19): three alternatives were compared, and a recommendation is
waiting for design approval. Implementation is not started.

## Pages and baseline

All six heroes use a full-width Cover block, `minHeight: 700px`, content
centred left in a 500px column, and no overlay (`dimRatio: 0`). The
photographs are panoramic (about 2.3–2.4:1) with the subject in the right half.

| Key | URL | Image (attachment) | Current focal point | Subject (x, y) | Main problems seen |
|---|---|---|---|---|---|
| home | `/` | 302, dance studio, 1971×798 | 39% 64% | 62% 50% (dancers) | Mobile: a partial violet box (a mobile-only group background) covers part of the photo, leaving a hard edge. The outlined button's `#cf1c72` label is unreadable inside that box. |
| bodywork | `/personalised-bodywork-brussels/` | 315, head massage, 1916×821 | none (50% 50%) | 75% 40% | Mobile: long copy hides the photo, and the practitioner and client are cropped out. The magenta H1 on the dark photo is 1.6:1 on desktop. |
| thai | `/thai-yoga-massage-brussels/` | 332, floor session, 1916×821 | none | 66% 50% | Mobile: the subject is reduced to a knee. The magenta H1 on the dark photo is 1.6:1. |
| kobido | `/kobido-massage-brussels/` | 344, facial massage, 1916×821 | 49% 66% | 75% 45% | Mobile: the faces are outside the crop. Custom `#302575` text runs over the photo. |
| vouchers | `/massage-gift-vouchers/` | 629, voucher in envelope, 1902×827 | none | 74% 45% | Mobile: the voucher is cut at the edge, and the text sits on a busy shadow pattern. |
| relax | `/relax-together/` | 527, couple session, 1918×820 | 44% 69% | 68% 70% | Mobile: the text and buttons sit on top of both people. |

Text contrast was measured against the real pixels behind each element (the
2nd-percentile, or near-worst, pixel, using `contrast.mjs`). On the current
pages, **30 of 60 mobile, 17 of 30 tablet and 12 of 30 desktop** hero text
elements fail WCAG AA.

## Alternatives

Each alternative is built from the page's own Cover block, photo, copy, links
and theme colour tokens. Only a class name is added to the Cover, plus a
preview stylesheet (`previews.css`). The homepage's mobile-only `@mobile`
state styles (the partial box) are removed in every preview. Below 782px is
the theme's existing header breakpoint.

- **A — Image above text (`stack`).** Below 782px the photo becomes a 3:2
  band, cropped at a per-page focal point. The copy follows on a solid
  `paper` ground in `ink`, with the H1 in `accent-deep`. Desktop is unchanged.
- **B — Full-image gradient (`scrim`).** At every width, a continuous
  duotone gradient based on the `scrim` token runs behind white copy: left to
  right on desktop, bottom to top on mobile. There is no bounded box. Outline
  buttons become the theme's white on-photo button.
- **C — Mobile composition (`fade`).** Below 782px the hero shows a square
  crop at the per-page focal point that fades into `paper`. The copy starts on
  the fade. Desktop is unchanged.
- **Recommended (`rec`).** A below 782px, plus B's left gradient at 782px
  and up.

### Results

| | Mobile AA failures (60) | Tablet 768 (30) | Desktop 1280 (30) | Lowest ratio | Subject at 360/390 |
|---|---|---|---|---|---|
| Before | 30 | 17 | 12 | 1.0 | Often lost |
| A | 0 | 0 | 12 | 1.58 (desktop, unchanged) | Visible on all six |
| B | 1 | 0 | 0 | 4.09 | Lost under long copy (bodywork, thai, kobido) and zoomed heavily |
| C | 0 | 0 | 12 | 3.12 (large headings on the fade) | Mostly visible; the square crop cuts wide subjects (relax, home) |
| **Recommended** | **0** | **0** | **0** | **4.75** | **Visible on all six** |

The lowest recommended ratio, 4.75:1, is the existing white button label on
magenta.

Trade-offs:

- **Image visibility.** A gives the widest crop (3:2 shows about 60% of each
  panorama), so every subject stays recognisable. C keeps more height but a
  narrower window. B must cover the full text height, so on the long-copy
  service pages the photo is zoomed to a fragment and covered.
- **Readability.** A and C put text on a solid or near-solid ground. B
  depends on the gradient, which is reliable only where the copy is short.
- **Vertical space.** A pushes the H1 about 240–260px further down at mobile
  widths (360/390). The full copy is longer than one screen on bodywork and
  kobido either way. C overlaps image and text by about 18vw. B is the
  shortest.
- **Desktop.** A and C leave desktop as it is, but desktop already fails AA
  on every page: the magenta H1 sits on dark photos, and violet text sits on
  bright ones. B's left gradient fixes all 12 failures and matches the
  locked signature move, "duotone magenta→violet scrims over full-bleed
  photos" (`sites/fusion-circus/design.md`).

**Recommendation:** use A on mobile and tablet portrait and B's left gradient
on desktop. This passes AA everywhere and keeps every subject visible. It
produces one consistent rule for all six pages: below 782px, photo above
text; from 782px, the duotone scrim. The only per-page setting is a focal
point.

### Departures from recorded design rules (need sign-off)

- On desktop the H1 becomes white instead of magenta or violet. White is
  needed to reach 3:1 on the scrim. `design.md` reserves headings for violet
  and magenta.
- The scrim gradient becomes a section background on photo heroes.
  `design.md` already allows "duotone scrims over full-bleed photos" but
  limits the *flood* gradient to the header and footer. The scrim used here is
  the `scrim` token, not `flood`.
- The homepage's core **Outline** button with a custom `#cf1c72` (4.17:1 on
  paper) should switch to the theme's **Ghost** style (`accent-deep`, 5.13:1).
  The previews emulate that switch in CSS.

### Other checks (recommended variant)

- No horizontal overflow at 360, 390, 768 or 1280, or at 200% zoom of 390
  and 1280 (195×422, 640×450). Pre-existing overflow at 400% zoom (180px
  wide) comes from page sections outside the hero: the Relax Together FAQ
  accordion icon, and something on Kobido. It is identical on the current
  pages and out of scope here.
- No hero text is clipped at any of those sizes.
- Keyboard focus reaches every hero button with a visible ring (390 and
  1280). Thai and Kobido have no hero buttons.
- All 24 preview pages open in the block editor without invalid-block
  warnings.

## Design references

- NN/g, [Ensure High Contrast for Text Over Images](https://www.nngroup.com/articles/text-over-images/):
  low contrast is the usual failure, and scrims or moving text off the image
  are the fixes.
- Smashing Magazine, Designing Accessible Text Over Images,
  [part 1](https://smashingmagazine.com/2023/08/designing-accessible-text-over-images-part1)
  and [part 2](https://smashingmagazine.com/2023/08/designing-accessible-text-over-images-part2):
  gradient scrims and their limits when text spans the image.
- Material Design (legacy), [Imagery: text protection](https://m1.material.io/style/imagery.html):
  scrims should protect specific text areas without heavily obscuring the
  photo.
- W3C, [Understanding SC 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html),
  and WebAIM, [Contrast and Color Accessibility](https://webaim.org/articles/contrast/):
  text over images must meet 4.5:1, or 3:1 for large text, measured where
  contrast is lowest.

## Reproduce

Requires the running local site (`npm run start -- brussels.fusion-circus.com`,
<http://localhost:9794>) with current production data, plus
`~/workspace/fair-event-plugins` for Playwright and `scripts/screenshot.js`.
Run from the platform root:

```sh
# Create or update 24 local preview pages /issue-27-<stack|scrim|fade|rec>-<key>/
node sites/brussels.fusion-circus.com/design/issue-27/build-previews.mjs
# Contrast per element, as JSON
node sites/brussels.fusion-circus.com/design/issue-27/contrast.mjs > contrast.json
# Overflow, 200% zoom and focus checks (VARIANT=rec by default)
node sites/brussels.fusion-circus.com/design/issue-27/checks.mjs
# Remove all preview pages (only pages carrying the _issue_27_preview marker)
node sites/brussels.fusion-circus.com/design/issue-27/build-previews.mjs --remove
```

The source pages are only read. The preview pages are published locally so
`--no-login` captures work, and a production pull removes them. Screenshots
go to the gitignored `screenshots/` folder. Capture example:

```sh
WP_SCREENSHOT_BASE_URL=http://localhost:9794 \
node ~/workspace/fair-event-plugins/scripts/screenshot.js \
  /issue-27-rec-home/ 390x844 rec-home-390x844-viewport.png --no-login --viewport
```

## After approval (not started)

The full handoff for the implementing session is in
[IMPLEMENTATION.md](IMPLEMENTATION.md). In outline:

1. Move the selected rules into the shared theme as an explicit opt-in block
   style on core/cover (for example, "Photo hero"). Use theme tokens only,
   with a focal-point mechanism that editors can maintain.
2. Update the homepage artifact. Add the five inner pages to
   `content-publish.json` and export unchanged baselines first, then apply
   the style and focal points.
3. Repeat the full capture matrix with the same URLs and viewports, and
   attach the before/after comparison to the PR.
4. Record the locked decisions in `sites/fusion-circus/design.md` and the
   editor guidance in the Brussels README.
