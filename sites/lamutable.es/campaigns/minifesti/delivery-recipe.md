# Campaign text and image delivery recipe

Use this recipe whenever delivering a Minifesti edition. It captures the
user's preferred delivery pattern and applies to future editions, independently
of their workshop count or image design.

## Reference

- [v08 copy document](https://docs.google.com/document/d/10dleHuILlTIoZayrqdB4PK6K1JjqOJWMFHE5GQNjK2M/edit):
  subject heading, embedded image preview, full-resolution image link, then
  ready-to-copy text.
- [v08 folder](https://drive.google.com/drive/folders/1DmuZV352K76ofh5b81F8ugkfI3bHeTbq),
  inside [Carteles](https://drive.google.com/drive/folders/1IT4lroGUdjvUwgMc8bNS8QphpdvRr1qV):
  one versioned folder containing the document and individually downloadable
  PNGs for the general event and every workshop.

Preserve this pairing of images and copy. Split central delivery by channel
and add a personal text file for every team member, as specified below.
The references remain unchanged; their wording and event facts are historical.

## Inputs

Read the edition's `event.json`, `team.json`, current `text.json`, and current
kit manifest and delivery record. Use the site brand kit, effective terminology,
and shared media formats. Follow [campaign text](../../../../docs/campaign-text.md)
for text editing and export and the campaign README for personal invitations.

All wording comes from the current `text.json`, including sender-specific
group messages in `senderCopy`. Apply feedback there and regenerate affected
deliverables. Preserve exact copy, paragraph breaks, WhatsApp markers, accents,
and links during export. Do not reconstruct wording from this recipe or v08.

Channel IDs currently mean:

| ID | Delivery label |
| --- | --- |
| `instagram` | Instagram post |
| `whatsapp` | WhatsApp status |
| `whatsapp-group` | WhatsApp group message |

Keep status and group messages distinct even though both use WhatsApp.
If a required channel, sender version, workshop association, or image is
missing, report the gap and resolve it in the source before final delivery.
Never substitute a status caption for a personal group invitation.

## Folder and files

Use one versioned delivery folder per edition and kit version, in the campaign's
existing Drive location. Preserve previous versions. Within that folder:

```text
<version>/
  <campaign> <edition> · <version> · Instagram       (Google Doc)
  <campaign> <edition> · <version> · WhatsApp status (Google Doc)
  <campaign> <edition> · <version> · WhatsApp groups (Google Doc)
  <campaign>-<edition>-<version>-<subject>-<channel>.png
  team/
    marcin.txt
    sayil.txt
    nina.txt
    diana.txt
    arancha.txt
    bart.txt
    emanuela.txt
    tavi.txt
```

The three Google Docs are central working documents. Each covers the general
event followed by every workshop in programme order, for its channel only.
For each subject include, in this order:

1. Subject heading.
2. Embedded preview of that channel's image, preserving its aspect ratio.
3. A clearly labelled full-resolution link to the individual PNG in Drive.
4. Exact, selectable channel copy with real paragraph breaks.

Use readable previews rather than placing full-size posters on a document
page. Link to the original PNG, not a screenshot or thumbnail. Keep copy as
text rather than baking it into an image. Do not combine Instagram and
WhatsApp status into tabs or sections of one document.

Upload images once per subject/channel. Central documents and personal files
link to those same assets. Editable SVGs and review records may accompany the
kit, but PNG download links are the primary image handoff.

## One text file for every teammate

Create a UTF-8 `.txt` file named by each stable `team.json` member ID. Begin
with their display name, edition, and kit version. Organize by relevant subject,
then use these three sections in order:

1. WhatsApp group message: sender-specific invitation and group-image link.
2. Instagram post: exact post copy and Instagram-image link.
3. WhatsApp status: exact status copy and status-image link.

Keep file labels and asset links outside the copy blocks. Preserve the copy
itself exactly, including whitespace. Use unambiguous separators between
sections so the recipient can select just the message to paste.

Select relevance from recorded roles and workshop associations:

- Organizers receive the general event bundle.
- Workshop teachers receive bundles for every ID in their `workshopIds`.
- Members with both roles receive the union, with no duplicate subjects.
- Members without a recorded association need clarification; do not silently
  omit their file or assign them unrelated workshops.

Resolve a group message from that subject's
`senderCopy["whatsapp-group"][member.id]`. If it is absent, write the missing
version in the current `text.json` using verified facts and the campaign's
personal-message rules. Do not reuse another person's first-person message.
Instagram and status use the subject's shared channel copy unless an explicit
sender version exists for that channel; if it does, use it.

For 22 November 2026, produce all eight files:

| File | Relevant subject |
| --- | --- |
| `marcin.txt` | General event |
| `sayil.txt` | General event |
| `nina.txt` | General event |
| `diana.txt` | Contact improvisación · Corpo Sutil |
| `arancha.txt` | INWARD — Yin Yoga y meditación guiada |
| `bart.txt` | Masaje Thai Yoga |
| `emanuela.txt` | Dance Lift: apoyándonos en movimiento |
| `tavi.txt` | Dance Lift: apoyándonos en movimiento |

Tavi's file therefore contains his own Dance Lift group invitation, the Dance
Lift Instagram post, and the Dance Lift WhatsApp status, each paired with the
correct image link. Emanuela receives a separate file with her own invitation
and the same workshop's shared assets. Future editions derive this table
from their own roster rather than copying these names.

## Delivery checks

1. Check current source copy and terminology for each language in use. Compare
   exported text against the selected source blocks without normalizing it.
2. Confirm three separate central Google Docs, one file per team member, and
   one complete subject/channel image set. Confirm subject order and recipient
   selection against `event.json` and `team.json`.
3. Read back the delivered documents and text files. Inspect document previews
   and final images for readable text, correct pairing, aspect ratio, accents,
   and clipping. Open the download links and confirm full-resolution files.
4. Record delivered folder, central-document, image, and team-file links in the
   edition's delivery record, along with the source text path/hash and kit
   version. Keep review status explicit; packaging does not approve visuals.
5. Return the folder and central document links to the user. Preparation does
   not authorize publishing, sending messages, or changing sharing permissions.

This is a delivery procedure, not a new export command. The existing
`campaign:text:doc` exports source text; it does not by itself create these
channel documents, link uploaded images, or generate personal bundles.
