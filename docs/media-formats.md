# Media formats

Status: draft catalogue, version 0.2.0.

These shared presets describe the output canvas and its content. A site's
[brand kit](brand-kits.md) supplies voice, colours, typography, and approved
assets. A campaign brief supplies verified facts. Future top-level skills
should combine these three inputs using the stable format IDs below.

Source: [Graphics dimensions](https://docs.google.com/document/d/14A9x4oL8E2MGg6mEYitx4o51q2Km0tmESiKGyf83Scg/edit),
read on 2026-11-10. Meetup and Facebook dimensions and content rules below transcribe selected formats from that document;
they are project presets, not independently verified current platform limits.
Check destination requirements before final delivery. Do not silently change a
preset when a platform changes: record the discrepancy and revise it explicitly.

## Catalogue

Dimensions are width × height in pixels. “Required” means included in the image;
“optional” means the brief may request it. “Unspecified” does not mean prohibited
or required. Link restrictions apply to visible URLs in the image, not to
accompanying post text or publishing metadata.

| Format ID | Destination | Canvas | Required | Optional | Prohibited |
| --- | --- | --- | --- | --- | --- |
| `meetup-cover` | Meetup | 1080 × 608 | Unspecified | Unspecified | Unspecified |
| `facebook-event-cover` | Facebook Event | 1920 × 1080 | Event name, visuals | Logo, dates | QR code, link |
| `instagram-feed-portrait` | Instagram feed | 1080 × 1350 (4:5) | Unspecified | Unspecified | Unspecified |
| `instagram-feed-tall` | Instagram feed | 1080 × 1440 (3:4) | Unspecified | Unspecified | Unspecified |
| `instagram-feed-square` | Instagram feed | 1080 × 1080 (1:1) | Unspecified | Unspecified | Unspecified |
| `instagram-feed-landscape` | Instagram feed | 1080 × 566 (approximately 1.91:1) | Unspecified | Unspecified | Unspecified |
| `instagram-story` | Instagram Story | 1080 × 1920 (9:16) | Unspecified | Unspecified | Unspecified |
| `instagram-reel-cover` | Instagram Reel cover | 1080 × 1920 (9:16) | Unspecified | Unspecified | Unspecified |

### Instagram composition and margins

These Instagram canvases are project export presets added on 2026-11-12.
References: [Instagram photo resolution](https://help.instagram.com/1631821640426723)
and [Meta Instagram Stories design requirements](https://www.facebook.com/business/help/2222978001316177).
The official pages were rate-limited or login-gated during this update, so
recheck destination requirements before delivery, especially for ads or a
scheduling tool. These presets do not define paid-ad specifications.

For event promotion, default to `instagram-feed-portrait` for the feed and
`instagram-story` for Stories. Use the same canvas dimensions for every slide
in a carousel. Resolve required content from the brief before final delivery.

Keep text, logos, dates, and other essential content inside these minimum
margins, measured inward from each canvas edge:

| Formats | Left | Right | Top | Bottom |
| --- | --- | --- | --- | --- |
| All Instagram feed presets | 65 px | 65 px | 65 px | 65 px |
| Instagram Story and Reel cover | 65 px | 65 px | 270 px | 672 px |

These are project composition rules, not guaranteed platform safe areas.
The side margins round 6% of the 1080 px width up to 65 px. For the 9:16
canvases, the top and bottom reserves conservatively round 14% and 35% of
1920 px up to 270 px and 672 px to allow for interface overlays. Backgrounds
and decorative imagery should extend to the edges; the margins do not require
a blank border. Honour larger brand clear-space requirements where applicable.

Preview Stories with their interface overlays. Check a Reel cover in the full
screen, feed, and profile-grid previews and reposition essential content for
their different crops; these margins alone do not guarantee crop safety.

The source also contains an empty **Event banner** heading. Reserve
`event-banner` as unresolved; do not infer its dimensions. Meetup content rules also need definition
before a reusable template can be considered complete. A specific brief may
resolve these for a one-off draft; record that decision without presenting it
as a source rule.

## Composition contract for future skills

The following workflow is proposed by this repository, beyond the source's
canvas and content rules:

1. Accept a site ID, format ID, language, purpose, verified campaign facts, and
   requested optional elements. Read the complete brand README, tokens, and
   relevant asset guidance. Explicit user instructions take precedence; record
   any requested deviation from the preset.
2. Resolve the format's required fields before producing a final asset. Missing
   facts or assets may be visibly marked in a prototype, but prevent final
   delivery. Do not invent event details, dates, or a logo.
3. Reuse approved logo masters with their proportions and clear-space rules.
   Resolve actual fonts from the kit and record the font used; a system font
   stack is not a portable font asset. Record licensing and availability where
   supplied, and disclose substitutions. Never regenerate logos or lettering
   as part of an AI-generated background.
4. Compose exact text and logos as separate elements over imagery. Adapt the
   layout to each canvas rather than stretching a finished graphic. Keep
   required elements readable and avoid cropping them. Use the brand's voice
   for text, including captions; the format controls what appears on the image.
5. Deliver a final-size raster preview, editable composition where available,
   and accompanying caption and alt text when appropriate. PNG is the proposed
   default for graphics with text; use JPEG for photographic backgrounds when
   appropriate and accepted by the destination. File type, byte limits, and
   safe areas beyond those above remain delivery-time decisions. Apply the
   Instagram margins above when composing those presets.
6. Inspect exact dimensions, required/forbidden elements, factual accuracy,
   spelling, font rendering, contrast, crop, and mobile readability.
   Generation does not authorize publication.

Alongside each deliverable record: site ID, brand version, format ID and
catalogue version, actual dimensions and file type, brief/fact sources,
asset paths and provenance, fonts used, optional elements selected, deviations,
unresolved decisions, and draft/review status. This is a documentation contract,
not an implemented metadata schema or generation command.

## First application: Ahora que hacemos

Use [its brand kit](../sites/ahoraquehacemos.com/brand/README.md) for expression.
The current JPEG logo is a work-in-progress reference, not an approved master.
Formats with optional logos can omit it. Prototypes using the reference logo
must remain labelled as drafts pending approval of a logo master. The kit currently specifies system
font stacks; record the resolved fonts when creating reproducible compositions.

## Remaining decisions

- Define content rules for Meetup.
- Define the purpose, dimensions, and content of Event banner.
- Confirm export constraints and destination-specific safe areas during the
  first real delivery.
- Add other social formats only when a brief establishes their requirements.

No shared generation skill, renderer, theme mapping, or publishing automation
is introduced by this catalogue.
