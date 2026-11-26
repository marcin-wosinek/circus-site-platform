# Campaign text

> **Deprecated.** Campaign text is no longer produced in this repository. Site
> copy now comes from the client or from the private `event-content-studio`
> repository. Keep this material as read-only reference for existing work
> until it moves there; do not start new work from it.

Campaign images are produced from one text file per edition:

1. **Write the text once.** Put every image label and all channel copy for the
   general event and each workshop in the edition's `text.json`. Check it with
   `campaign:text:show`.
2. **Deliver it as a Google Doc.** Export the text with `campaign:text:doc`,
   upload it to Google Drive as a Google Doc, and share that doc with the
   people who will use the text. Record the link in `googleDoc`.
3. **Tweak on feedback.** When someone gives feedback, edit `text.json` in
   place and bring the Google Doc up to date. Git keeps the history; there is
   no approval step and no new revision.
4. **Render images.** A site's builder renders a new kit from the current
   `text.json`. It places labels and exports copy exactly as written.

Campaign wording, labels, and visual bindings stay with the site. The shared
tooling validates, displays, and exports text. It never renders images,
publishes, or sends anything.

## File layout

Name generated campaign deliverables with the most specific identifying part
first. Personal files start with the person's display name, such as `Marcin`
or `Bart`; shared files start with their intended use, such as `WhatsApp Groups`.
Follow with campaign, edition, and version. For individual images, lead with
the subject and channel before campaign, edition, and version. This applies
to exported filenames and Google Drive document titles. Keep source filenames
such as `text.json` unchanged. Updating this convention alone does not call
for regenerating or renaming existing deliverables.

New editions keep their text at `editions/<edition>/text.json`. Older editions
may keep it in a revision directory such as `text/v02/text.json`; there, edit
the latest one in place rather than adding another directory. Commands accept
the file or the directory that contains it.

`text.json` (format version 1):

| Field | Meaning |
| --- | --- |
| `formatVersion` | `1`. Other versions are rejected. |
| `site`, `campaign`, `edition` | Owner identifiers. Builders refuse text for another edition. |
| `language` | Language code. Terminology checks use the effective glossary for this language. |
| `googleDoc` | Optional. The `https://docs.google.com/document/d/…` link of the delivered doc. |
| `notes` | Optional note for whoever edits the file. |
| `channels` | Ordered channel IDs, for example `["instagram", "whatsapp"]`. |
| `subjects` | Ordered subjects, normally `general` followed by every workshop. |
| `revision`, `basedOn`, `migration` | Optional provenance kept by older revision files. Not needed for new text. |

Each subject has a safe kebab-case `id`, a single-line `title`, and
`labels` and `copy` objects, each keyed by every listed channel:

- `labels.<channel>` maps a label name (such as `date`, `workshop-name` or
  `supporting-1`) to the exact single-line text shown on the image. Labels are
  stored as displayed, including uppercase, so readers see exactly what will
  be rendered.
- `copy.<channel>` is the exact text to export with that image. Whitespace and
  any trailing line break are preserved byte for byte. Use LF line breaks only.
- `senderCopy.<channel>.<sender-id>` (optional) holds a version of that
  channel's copy for one more sender, such as a personal group message from
  another team member. Sender IDs are safe kebab-case IDs, normally the
  edition's `team.json` member IDs. Only listed channels are allowed, and the
  same copy rules apply. Builders still export `copy`; `show` and `doc` list
  each sender's version after it, and terminology checks include them.

Validation reports every problem at once. Rejected inputs include unknown keys,
duplicate JSON keys or subject IDs, unsafe IDs, missing channels, missing or
empty labels or copy, multi-line labels, surrounding whitespace in labels, and
control characters.

Alt text, crop notes, and visual review status describe the rendered images, so
they stay with each generated kit rather than in the text file.

## Commands

All commands run from the repository root, resolve paths against the directory
where you started npm, work offline, and never invoke ImageMagick.

```sh
# Print every label and channel copy, the Google Doc link, and glossary findings.
npm run campaign:text:show -- <edition>/text.json

# Write the deliverable as HTML for upload to Google Drive.
npm run campaign:text:doc -- <edition>/text.json --output <scratch>/doc.html [--title "<title>"] [--force]
```

`doc` refuses to overwrite an existing output unless `--force` is given. It
writes one heading per subject and, for each channel, the image labels as a
list and the copy with its paragraphs and line breaks. Section labels are in
Spanish for `es` and in English otherwise. Write the HTML to a scratch
location: the committed `text.json` is the source, and the export is
regenerated whenever it is needed.

Glossary findings are listed by `show` and counted by `doc`. They do not block
anything: review each one in context (see [Terminology](terminology.md)), then
fix the wording or deliberately keep it, for example in a quotation.

Errors exit with status `2` and change nothing.

## Delivering the Google Doc

1. Run `campaign:text:show`, read every label and copy block in context
   together with the brand kit, and resolve the glossary findings.
2. Run `campaign:text:doc` to a scratch file.
3. Upload the HTML to Google Drive with content type `text/html`, which
   converts it to a Google Doc. With the Google Drive connector, use
   `create_file` with `textContent` set to the HTML and `contentMimeType`
   `text/html`. Share it only when the user asks to.
4. Store the doc link in `googleDoc` and commit `text.json`.

## Applying feedback

1. Edit `text.json` in place. Keep each label on one line and copy in the
   exact form it will be pasted.
2. Run `campaign:text:show` again and check the changed wording in context.
3. Bring the Google Doc up to date. Either edit the same wording in the doc
   directly, or export again and replace the doc. The Drive connector cannot
   rewrite an existing doc's body, so replacing means uploading a new doc and
   updating `googleDoc`.
4. Commit the change. Render a new kit if images were already produced.

If people edit the Google Doc directly, copy their final wording back into
`text.json`. The builder reads only `text.json`.

## Image builders

Builders are site-owned. Before creating any output, a builder must call
`readCampaignText` from `scripts/lib/campaign-text.mjs` with the `expect`
identifiers for its edition, then take copy only from `exportedCopy`. Builders
must not reconstruct copy from event facts or copy it from earlier kits. Where
artwork is SVG, `scripts/lib/svg-text-binding.mjs` places labels into `<text>`
elements chosen by literal `id` or `x`/`y` locators. It XML-escapes text,
requires every `<text>` element to be bound so baseline wording cannot remain
unnoticed, and rejects missing labels, unbound labels, nested markup, and
unresolved `{{slot}}` markers.

Each kit's `manifest.json` records the text path, its SHA-256 at render time
(a fingerprint for traceability, not an approval), and the Google Doc link
when present. Visual-only reruns use the same `text.json`. Labels and exported
copy stay byte-identical across runs from unchanged text.

## Example: Minifesti 22 November

- Text: `sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/text/v02/text.json`
  is the current text; edit it in place. `text/v01` is the verbatim migration
  from event kit v07, kept as history. Tests verify all ten copy files byte
  for byte, re-binding every label into each v07 SVG, and the email drafts.
  `text/v02/approval.json` is a record from the earlier approval workflow;
  nothing reads it any more.
- Bindings: `event-kit/text-bindings.json` maps label names to the v07
  baseline's `<text>` elements. A channel with a `source` (such as
  `whatsapp-group`) takes `<source>/<subject>.svg` instead; its templates are
  generated by `event-kit/whatsapp-group/render-templates.mjs` with a
  `{{label}}` slot in every `<text>`. The builder renders the channels the text
  lists (Instagram and WhatsApp Status are required) and copies the alt text
  named by `altText`.
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

Historical kits v01–v08 and their builders remain unchanged.

For the final text and image handoff, follow the Minifesti
[delivery recipe](../sites/lamutable.es/campaigns/minifesti/delivery-recipe.md).
It preserves the v08 preview/download/copy pattern, separates central documents
by channel, and adds one relevant rich-text Google Doc per team member, each
with embedded image previews and linked full-resolution PNGs. These are exports
of the same current `text.json`, not independent wording sources.
