---
name: export-event-content
description: Export the local state of every tracked post related to one Fair Events event date (the event post and its translations) into its committed content artifact. Use when asked to export, save, or prepare the event's pages for review or deployment, given an event date ID or a fair-events-manage-event admin URL.
---

# Export event content

Run `content:export` for every configured item that belongs to one event date.
Read `docs/publish-content.md` before starting. Export reads only the local
`wp-env` site; this skill never contacts or writes to production.

## Resolve the site and event date

- Accept a site ID with an event date ID, or an admin URL such as
  `http://localhost:9790/wp-admin/admin.php?page=fair-events-manage-event&event_date_id=181`.
  Take `event_date_id` from the query string and find the site in `sites.json`
  by its local `port`.
- Make sure the local site is running (`npm run start -- <site-id>`).

## Match related posts to content keys

From the repository root, list the related posts:

```sh
.codex/skills/track-event-content/related-posts.sh <site-id> <event-date-id>
```

Match each row to an item in `sites/<site-id>/content-publish.json` with the
same `type` and `selector.path`.

- Rows without a match are untracked. Report them, and offer the
  `track-event-content` skill. Do not add configuration here.
- A row whose slug looks like a tracked key but whose path differs usually
  means the slug changed locally. Stop and report it; do not edit the selector
  path, because the path is checked against production.
- If no row is tracked, stop.

## Export

Run, for each matched key:

```sh
npm run content:export -- <site-id> --key <content-key>
```

- Never pass `--refresh-baseline` unless the user explicitly asks to adopt the
  current local state as the baseline.
- If an export fails, for example for a missing upload image or missing
  upload provenance, report the key and the error and continue with the others.
  Do not create provenance or upload files to work around it.

## Review

- Show `git status` and a diff summary for the exported artifact directories.
  Re-exporting without edits should produce no diff.
- Check each changed `content.html` against the site glossary in its language:
  `npm run terminology:check -- --site <site-id> --language <language> <file>`.
  Report findings in context; do not rewrite content to satisfy them.

## Report

List each key with its result (changed, unchanged, failed), and the untracked
or skipped posts. Commit only if the user asks. The next steps are commit, then
the read-only `npm run content:plan -- <site-id> --key <content-key>`. Do not run
`content:apply`.
