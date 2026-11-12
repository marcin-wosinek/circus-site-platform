# Template workflow trial

- Date and edition: 12 November 2026; 22 November 2026 Minifesti.
- Reference SVG and brand version: original SVG unavailable at its recorded
  Downloads path; saved brand reference PNG inspected. Original SVG structure
  cannot be reinspected in this run. Brand draft v0.1.0. Templates newly authored,
  not reconstructed from a raster conversion.
- Template version and variants used: v0.3.0 portrait overview and contact
  improvisation workshop example; `../../templates/v03/`.
- Renderer and fonts: ImageMagick 7.1.2-5 MSVG; Barlow Condensed ExtraBold (bundled
  under SIL OFL); system Arial. Details and hashes in `previews/v03/delivery.json`.
- Outputs reviewed: two final-size draft PNGs, populated editable SVG sources,
  two 360px mobile previews, two-image contact sheet.
- What worked: genuine condensed type, large source photos, a quieter date/venue
  hierarchy, separate template and event data, deliberate crop rectangles.
- Manual interventions and why they were needed: inspected all originals before
  choosing crops; selected a two-line title and displayed Corpo Sutil with the
  teacher; shortened address for display, keeping street/number/neighbourhood/city.
- Text fitting or crop failures: Yin Yoga lettering was initially partially
  visible; revised source crop excludes it. MSVG did not render a transformed
  botanical group; replaced it with absolute vector coordinates.
- User feedback and resulting revisions: user rejected v01/v02 as poor and
  requested a fresh template. No user feedback or approval of v03 yet.
- Repeatable rule worth keeping: review two populated examples before extending
  the family; inspect existing text inside source photography; fail on font/text
  errors and preserve earlier versions.
- Campaign-specific exception: top portrait photos occupy more area than the
  bottom photos in the overview; review this visual balance explicitly. No
  landscape or 3/5/6/7/8-workshop variants implemented.
- Next workflow change to try: review these examples with the user, revise the
  layout if needed, then design landscape and additional workshop variants.

Status: draft review checkpoint, not approved for publication. Separate v03
delivery record leaves the older ten-output delivery record untouched.

## Landscape extension

- User feedback: portrait direction accepted; Facebook and Meetup requested.
- Added template variants: Facebook event cover 1920 × 1080, Meetup workshop
  cover 1080 × 608. Template extension version 0.3.1.
- Layout: four photos flank the Facebook central wave; Meetup uses one original
  photo alongside a vertical wave and workshop-first text. No stretching of the
  portrait composition. Existing deliberate crops reused only after inspecting
  the landscape results; featured Meetup photo remains whole.
- Reviewed: both native-size PNGs, both 540px mobile previews and landscape
  contact sheet. Text, accents, hands/supports, dimensions and lack of Facebook
  URLs/QR checked. Width validation passed with the actual fonts.
- Preservation: `--landscape-only` leaves accepted portrait SVGs/PNGs and their
  delivery record intact; landscape has its own delivery record.
- Remaining: landscape user review, other workshop examples, photo permissions
  and destination export checks before publication.

## Complete workshop set

- User requested all relevant workshop files after reviewing the landscape pair.
- Generated four Instagram portrait and four Meetup landscape SVG/PNG pairs,
  mobile previews, channel contact sheets, per-workshop caption/alt-text notes
  and a complete workshop delivery record. Existing event-wide files preserved.
- Adaptations: Dance Lift split into two title lines; its longer subtitle uses
  two lines on Meetup. Featured Thai Yoga/Dance Lift crops preserve the bodies
  and supports; INWARD crop avoids the original's baked-in lettering. Contact
  improvisation keeps its whole source image. Each Instagram includes all four
  workshop photographs, while Meetup shows its featured practice only.
- Validation: eight unique workshop/format combinations, expected dimensions,
  actual-font width checks and visual inspection of both channel contact sheets.
- Together with the existing overview and Facebook cover, v03 has all ten recipe
  outputs. Final review, photo permissions and destination checks remain pending.
