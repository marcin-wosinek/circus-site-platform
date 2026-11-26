# Site brand kits

> **Deprecated.** Brand kits are no longer maintained in this repository. Site
> copy now comes from the client or from the private `event-content-studio`
> repository. Keep this material as read-only reference for existing work
> until it moves there; do not start new work from it.

Keep each site's brand kit in `sites/<site-id>/brand/`. Brand preparation can
precede WordPress setup; having a kit does not register a site in `sites.json`.

Use this small, shared structure:

- `README.md`: entry point, version, approval status, identity, voice, visual
  direction, channel guidance, examples, and review checklist.
- `tokens.json`: machine-readable visual values, with `formatVersion`,
  `brandVersion`, `status`, `colors`, and `typography` fields. This is a proposed
  convention, not an enforced schema or a WordPress theme.json file.
- `assets/`: source references and approved brand assets, clearly distinguished.
- `terminology.json` (optional): project terminology additions, explicit
  overrides of shared terminology, and do-not-translate names. See
  [Terminology](terminology.md).

The prose owns voice and usage rules; tokens own exact colour and font values.
Keep site-specific rules here, rather than copying them into shared skills.
Increment the brand version in both files when changing creative guidance;
change formatVersion only when changing the token structure. Draft guidance
is usable for prototypes but must not be described as approved.

## Future shared skills

Shared canvas sizes and content requirements live in the draft
[Media formats catalogue](media-formats.md). Use its format IDs alongside the
site's brand version; keep logos, font choices, and voice in the brand kit.

Text and image skills should accept a site ID, task brief, destination, and
output requirements. They should read that site's complete brand README and
tokens, then any referenced assets needed for the task. Do not silently use
another site's kit when one is missing. Brand instructions govern expression;
the brief supplies verified event or product facts. Flag missing facts rather
than inventing them. Explicit task instructions take precedence.

Before writing or translating copy, also consult the effective
[terminology](terminology.md) glossary for the site and language with
`npm run terminology:show -- --site <site-id> --language <language>`. Use its
preferred wording and do-not-translate names; flag missing translations for
review instead of presenting new wording as approved. Before rendering or
exporting, check the final copy, captions, alt text, and exact image lettering
with `npm run terminology:check`, then inspect the wording in the final rendered
image. A clean check does not approve unlisted wording.

Keep channel dimensions and publishing mechanics in shared workflows and
check them when producing an asset; keep a brand's channel tone in its kit.
For images, distinguish illustration from documentary photography. Compose
exact text and approved logos separately from generated backgrounds when
accuracy matters. Record the site, brand version, brief, and draft/review status
alongside generated deliverables. Generation does not authorize publishing.

No generation command, skill, or automatic theme integration is introduced
yet. Start with [Ahora que hacemos](../sites/ahoraquehacemos.com/brand/README.md)
and extract shared implementation after a real workflow demonstrates the need.
