# Minifesti · 22 noviembre 2026 · Event Kit v01

Status: complete local draft, pending user approval. Created 16 November 2026.

Open [index.html](index.html) for the five bundles. Each contains WhatsApp
1080 × 1920 and Instagram 1080 × 1350 PNGs, matching Spanish copy in `.txt`
files, and self-contained editable SVGs. Plain-text files contain only the copy
to paste. [Contact sheet](contact-sheet.png), [email drafts](email-drafts.md),
[suggested alt text](alt-text.md), and [manifest](manifest.json) accompany them.

## Sources and design

- Scope: [Event Kit brief](../../event-kit.md), superseding the older Facebook
  and Meetup deliverable list for this pilot.
- Facts: [event.json](../../event.json), confirmed edition brief and programme.
- Brand: La Mutable **0.1.2, draft**, resolved from the current brand kit;
  event.json's older 0.1.0 reference is preserved as historical input.
- Event-kit accent: **#E85E14**, requested 16 November 2026, replacing
  burgundy in the ten SVG/PNG deliverables and preview links. The shared brand
  palette and earlier compositions remain unchanged.
- Formats: shared media catalogue 0.3.1; these are project export presets.
- Artwork: existing v03 populated overview, workshop and WhatsApp SVGs, with
  original embedded photographs and existing crop decisions. Earlier versions
  are untouched. No new photographs or generated people were introduced.
- Supplied sand/orange 9:16 template inspected; cream-wave v03 selected to
  maintain a consistent set across both channels.
- General WhatsApp adaptation: existing editable overview placed on a taller
  cream canvas, with a separate invitation and registration prompt.
- Workshop WhatsApp adaptation: year added; contact improvisation labels
  translated to Spanish. Proper names Dance Lift, INWARD and Yin Yoga retained.
- Instagram: registration prompt added; footer address and logo adjusted to
  the catalogue's 65 px bottom margin.
- Fonts: bundled Barlow Condensed ExtraBold (SIL OFL 1.1) and local macOS Arial
  (not redistributed). Renderer and source composition hashes: manifest.json.
- Photo provenance and original crop records remain in `../../sources/` and
  `../../previews/v03/`. Null focal points in event.json remain unresolved;
  reused crops are draft choices, not an approval of those focal points.

## Booking and copy verification

Read-only HTTP GET of the [Spanish event page](https://lamutable.es/fair-events/minifesti-la-mutable-22-de-noviembre/)
on 16 November 2026 succeeded. Confirmed date, programme, venue and the signup
form at `#inscripcion`. Every copy file links directly to that anchor. No form
was submitted and no payment or ticket availability was tested.

Prices are intentionally omitted: the page describes advance and event-day
conditions, and its Early Bird deadline has passed. Copy directs participants
to current prices and conditions. No unsupported accessibility, availability or
therapeutic claims are included. Teaching languages remain distinct from the
Spanish promotional language. WhatsApp copy is one continuous line with single
asterisk emphasis, the full booking URL, and only the permitted date/location
emoji. Workshop copy independently includes teacher, date, time and full venue.

## Checks and remaining review

- Verified 10 PNG dimensions, 10 matching copy files and 10 editable SVGs.
- Renderer measured explicit single-line text; existing inherited title layouts
  were preserved and checked visually.
- Reviewed all ten outputs together at mobile scale for spelling, hierarchy,
  photo visibility and text fit. Existing contain crops remain unchanged.
- `npm test`: 96 passed, 0 failed.
- User visual approval and photo-use permission confirmation remain pending.
- Preview actual WhatsApp/Instagram uploads for interface overlays, compression
  and cropping before distribution. No in-app upload checks were performed.

## Manual handoff

Once approved, forward the matching image and copy by subject and channel.
Suggested email subjects and bodies are in email-drafts.md. Instagram URLs in
captions may need to be copied into the recipient's bio or another suitable
link surface; recipients should check their own posting flow.

No messages were sent, nothing was published, and production was not modified.
After distribution, record whether recipients could save the correct image,
copy its text and publish without manual fixes, as requested by the pilot brief.

## Reproduction

From the repository root:

```sh
node sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/event-kit/build-v01.mjs
```

Requires ImageMagick and the existing v03 fontconfig and fonts. The command
refuses to overwrite v01. For revisions, copy the edition-specific assembly
script to a new version and change its output directory; preserve reviewed
deliveries. Review notes and the contact sheet are handoff artifacts added
after the rendering run.
