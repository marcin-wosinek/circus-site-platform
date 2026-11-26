---
name: track-event-content
description: Start tracking every local WordPress post related to one Fair Events event date (the event post and its translations) in a site's content-publish.json, and export their first baselines. Use when asked to track, manage, or prepare for deployment the pages of an event, given an event date ID or a fair-events-manage-event admin URL.
---

# Track event content

Add every post linked to one event date to the site's content publishing
configuration, then export a first artifact for each new key. Read
`docs/publish-content.md` before starting. This skill only touches the local
`wp-env` site and committed files; it never writes to production.

## Resolve the site and event date

- Accept a site ID with an event date ID, or an admin URL such as
  `http://localhost:9790/wp-admin/admin.php?page=fair-events-manage-event&event_date_id=181`.
  Take `event_date_id` from the query string and find the site in `sites.json`
  by its local `port`.
- Stop if the site has no `content-publish.json`; creating one is a separate
  decision for the user.
- Make sure the local site is running (`npm run start -- <site-id>`).

## Find the related posts

From the repository root, run:

```sh
.codex/skills/track-event-content/related-posts.sh <site-id> <event-date-id>
```

It lists the date's primary event post and every post linked through
`fair_event_date_posts`, which is where Fair Events records translations, with
type, status, language, slug, and site-relative path. Report these rows to
the user and handle them as follows:

- `MISSING`, or an empty slug (a path such as `/fair-events//`): skip it and
  report it. A post needs a slug before it can be selected by path.
- A type other than `page` or `fair_event`: skip it and report it as
  unsupported by content publishing.
- A status outside `draft` and `publish`: skip it and report it.
- Already tracked: an existing item has the same `type` and `selector.path`.
  Leave it unchanged.

## Add the configuration entries

For each remaining post, add an item to `sites/<site-id>/content-publish.json`,
keeping the existing order and appending the new items:

```json
"<slug>": {
  "type": "<type>",
  "selector": { "type": "post_path", "path": "<path>" },
  "artifactDir": "content/fair-events/<slug>",
  "allowedStatuses": ["draft", "publish"],
  "metadata": []
}
```

- Use the post slug as the content key. If that key or `artifactDir` is
  already in use for a different item, stop and ask for a key.
- For a `fair_event`, use `post_path` and `content/fair-events/<slug>`. For a
  `page`, use `page_path` and `content/pages/<slug>`.
- Copy the path exactly as listed, including any language prefix such as
  `/en/`.

## Export the first baselines

Run, for each new key:

```sh
npm run content:export -- <site-id> --key <content-key>
```

The first export records the current local state as the baseline. It is only a
correct baseline if local matches production for that post, or if the post does
not exist on production yet. If the user has already edited the post locally
since the last production import, say that the later plan will report a
`conflict`, and ask before exporting.

Never pass `--refresh-baseline` here.

## Keep the repository consistent

- If `test/content-publish.test.mjs` asserts the site's full key list, append
  the new keys in configuration order. Run `npm test`.
- If the site's README lists managed content, add the new paths.
- If translations share ticket IDs and translate labels in the theme, mention
  that the theme file is deployed separately from content.

## Report and verify

Report the added keys, the skipped posts and why, and the export results.
Show the changed paths. Commit only if the user asks. Once committed, offer the
read-only check `npm run content:plan -- <site-id> --key <content-key>`. It
should report `unchanged` for a post that matches production and `create` for
one that is not deployed yet. Do not run `content:apply`.
