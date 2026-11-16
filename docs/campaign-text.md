# Campaign text revisions

Campaign images are produced in two stages:

1. **Text.** Prepare one revision with every image label and all channel copy
   for the general event and each workshop. Review it and approve it without
   rendering anything.
2. **Images.** A site's builder renders a new kit from one explicitly chosen,
   approved revision. It places labels and exports copy exactly as approved.

When only the visuals change, rebuild from the same approved revision. When the
wording changes, create a new revision and review it before rendering again.

Campaign wording, labels, and visual bindings stay with the site. The shared
tooling validates, displays, approves, and exports text. It never renders
images, publishes, or sends anything.

## Revision layout

A revision is a directory named after its revision ID, usually in the edition
under `text/`:

```text
editions/2026-11-22/text/
└── v01/
    ├── text.json       reviewed labels and channel copy
    └── approval.json   written by campaign:text:approve; absent until reviewed
```

`text.json` (format version 1):

| Field | Meaning |
| --- | --- |
| `formatVersion` | `1`. Other versions are rejected. |
| `site`, `campaign`, `edition` | Owner identifiers. Builders refuse text for another edition. |
| `language` | Language code. Terminology checks use the effective glossary for this language. |
| `revision` | Must match the directory name, for example `v01`. |
| `basedOn` | Source path, revision, and SHA-256 of the draft or revision it was created from. `null` for the first one. |
| `migration` | Optional. Source and SHA-256 of each file that migrated wording came from. |
| `notes` | Optional reviewer-facing note. |
| `channels` | Ordered channel IDs, for example `["instagram", "whatsapp"]`. |
| `subjects` | Ordered subjects, normally `general` followed by every workshop. |

Each subject has a safe kebab-case `id`, a single-line `title`, and
`labels` and `copy` objects, each keyed by every listed channel:

- `labels.<channel>` maps a label name (such as `date`, `workshop-name` or
  `supporting-1`) to the exact single-line text shown on the image. Labels are
  stored as displayed, including uppercase, so the reviewer reads exactly what
  will be rendered.
- `copy.<channel>` is the exact text to export with that image. Whitespace and
  any trailing line break are preserved byte for byte. Use LF line breaks only.

Validation reports every problem at once. Rejected inputs include unknown keys,
duplicate JSON keys or subject IDs, unsafe IDs, missing channels, missing or
empty labels or copy, multi-line labels, surrounding whitespace in labels, and
control characters.

Alt text, crop notes, and visual review status describe the rendered images, so
they stay with each generated kit rather than in the text revision.

## Commands

All commands run from the repository root, resolve paths against the directory
where you started npm, work offline, and never invoke ImageMagick.

```sh
# Create a new, unapproved revision from a draft or an earlier revision.
npm run campaign:text:create -- --from <draft-or-revision>/text.json --output <edition>/text/v02

# Print every label and channel copy, the SHA-256, approval state and glossary findings.
npm run campaign:text:show -- <edition>/text/v02

# Approve exactly the reviewed bytes.
npm run campaign:text:approve -- <edition>/text/v02 --sha256 <digest from show> --reviewer "<name>"
```

`create` refuses an existing directory, drops any `migration` record, records
`basedOn`, and never copies an approval. Edit the new `text.json` freely
until it is approved. Re-run `show` after each edit, since the hash changes.

Errors exit with status `2` and change nothing.

## Review and approval

1. Run `campaign:text:show` and read every label and copy block in context. Also
   read the brand kit. `show` runs the effective glossary
   (see [Terminology](terminology.md)) across all labels, titles, and copy, and
   lists findings with their location.
2. Approve with the SHA-256 printed by `show`. If the file changed since you
   inspected it, approval is refused.
3. Each glossary finding blocks approval until it is resolved:
   - correct the wording in a new revision, or
   - keep historical wording deliberately with
     `--preserve-terminology <concept> --reason "<why>"`. The exception, its
     reason, and every covered finding are recorded against the approved hash.
     Exceptions for concepts without findings are rejected, and migration
     alone never implies an exception.

`approval.json` records the revision, the SHA-256 of `text.json`, the
reviewer, the timestamp, the findings, and the exceptions. Approval covers the
text only. It does not approve visuals, alt text, photo permissions,
publication, or sending. It provides review provenance and change detection,
not cryptographic proof of identity.

### Invalidation

Builders compare the current `text.json` bytes with the approved hash. Any
change, including whitespace, makes the revision unusable. The builder then
reports that the file was modified after approval. An approved revision is
never re-approved. Either restore the approved bytes (for example from Git) or
create a new revision and review it.

## Changing text

1. `npm run campaign:text:create -- --from <edition>/text/v01/text.json --output <edition>/text/v02`
2. Edit `text/v02/text.json`.
3. `npm run campaign:text:show -- <edition>/text/v02`, review, then approve.
4. Render a new kit with `--text <edition>/text/v02`.

## Visual-only reruns

Change the artwork, bindings, or builder, then render a new kit version from
the same approved revision. Labels and exported copy stay byte-identical across
runs from the same revision, and each kit's `manifest.json` names the revision.

## Image builders

Builders are site-owned. Before creating any output, a builder must call
`requireApprovedRevision` from `scripts/lib/campaign-text.mjs`, then take copy
only from `exportedCopy`. Builders must not reconstruct copy from event facts
or copy it from earlier kits. Where artwork is SVG,
`scripts/lib/svg-text-binding.mjs` places labels into `<text>` elements chosen
by literal `id` or `x`/`y` locators. It XML-escapes text, requires every
`<text>` element to be bound so baseline wording cannot remain unnoticed, and
rejects missing labels, unbound labels, nested markup, and unresolved `{{slot}}`
markers.

Each kit's `manifest.json` records the text path, revision, SHA-256, and the
approval record's path, hash, reviewer, and timestamp.

## Example: Minifesti 22 November

- Text: `sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/text/v01`.
  Migrated verbatim from event kit v07: copy from its `.txt` files, labels from
  its SVGs. Tests verify all ten copy files byte for byte, re-binding every
  label into each v07 SVG, and the email drafts. The revision stays
  unapproved as a historical record.
- Corrected text: `text/v02`, created from v01 with «Contact improvisación»
  and approved. Event kit v08 was rendered from it.
- Bindings: `event-kit/text-bindings.json` maps label names to the v07
  baseline's `<text>` elements.
- Builder:

  ```sh
  node sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/event-kit/build.mjs \
    --text sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/text/v02 --version v09
  ```

  It requires ImageMagick and the campaign's fonts (Barlow Condensed is bundled;
  Arial is read from macOS). It measures every label with the actual font and
  fails on overflow, verifies dimensions, and builds in a hidden staging
  directory that is renamed only after every check passes. It refuses existing
  versions. A failure leaves earlier kits intact and can be rerun safely. PNG
  timestamps are omitted, so reruns are byte-identical.

Historical kits v01–v07 and their builders remain unchanged.
