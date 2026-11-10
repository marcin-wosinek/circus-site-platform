# Media formats

Status: draft catalogue, version 0.1.0.

These shared presets describe the output canvas and its content. A site's
[brand kit](brand-kits.md) supplies voice, colours, typography, and approved
assets. A campaign brief supplies verified facts. Future top-level skills
should combine these three inputs using the stable format IDs below.

Source: [Graphics dimensions](https://docs.google.com/document/d/14A9x4oL8E2MGg6mEYitx4o51q2Km0tmESiKGyf83Scg/edit),
read on 2026-11-10. Dimensions and content rules below transcribe that document;
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
| `facebook-event-cover` | Facebook Event | 1920 × 1080 | Event name, visuals | Logo, dates | QR code, link |
| `meetup-cover` | Meetup | 1080 × 608 | Unspecified | Unspecified | Unspecified |
| `whatsapp-group-avatar` | WhatsApp group | Square, at least 600 × 600 | Event name, visuals | Logo, dates | QR code, link |
| `homepage-background` | Home page background | 1206 × 322 | Visuals | None specified | Event name, logo, dates, QR code, link |
| `whatsapp-chat-image` | WhatsApp chat | 1125 × 600 | Visuals, event name, logo, dates | None specified | QR code, link |
| `event-page-image` | Event page | 1200 × 254 | Unspecified | Unspecified | Unspecified |

For `whatsapp-group-avatar`, keep all meaningful content within the centred
inscribed circle; backgrounds may extend to the square edges. Preview the
circular crop and small-size rendering. The source gives no numerical inset;
choose and record a comfortable inner margin in each composition. Use 600 × 600
as the initial working size unless the brief requests a larger square.

For `homepage-background`, compose a visual-only background. Any page heading,
logo, or dates belong in the page's separate content layers. Check the actual
responsive crop and overlaid text before accepting it for a website.

The source also contains an empty **Event banner** heading. Reserve
`event-banner` as unresolved; do not infer its dimensions or merge it with
`event-page-image`. Meetup and event-page content rules also need definition
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
   safe areas beyond those above remain delivery-time decisions.
6. Inspect exact dimensions, required/forbidden elements, factual accuracy,
   spelling, font rendering, contrast, crop, and mobile readability. Review
   the avatar in a circular mask. Generation does not authorize publication.

Alongside each deliverable record: site ID, brand version, format ID and
catalogue version, actual dimensions and file type, brief/fact sources,
asset paths and provenance, fonts used, optional elements selected, deviations,
unresolved decisions, and draft/review status. This is a documentation contract,
not an implemented metadata schema or generation command.

## First application: Ahora que hacemos

Use [its brand kit](../sites/ahoraquehacemos.com/brand/README.md) for expression.
The current JPEG logo is a work-in-progress reference, not an approved master.
Formats with optional logos can omit it; `whatsapp-chat-image` requires an
approved logo for final delivery. A text-name prototype must remain labelled
as a draft with that requirement unresolved. The kit currently specifies system
font stacks; record the resolved fonts when creating reproducible compositions.

## Remaining decisions

- Define content rules for Meetup and the event-page image.
- Define the purpose, dimensions, and content of Event banner.
- Confirm export constraints and destination-specific safe areas during the
  first real delivery.
- Add other social formats only when a brief establishes their requirements.

No shared generation skill, renderer, theme mapping, or publishing automation
is introduced by this catalogue.
