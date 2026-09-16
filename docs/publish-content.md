# Publish content

The content publishing workflow treats committed artifacts as the deployable
source of truth for a small, explicitly configured set of WordPress content,
while the local `wp-env` database remains the authoring environment. It is
separate from [production imports](import-production.md): importing is a
one-way, destructive-to-local copy of an entire site from production;
publishing is a per-item, explicitly configured workflow that will (in a
follow-up) write a reviewed, committed artifact to production.

**Current scope:** this repository currently implements authoring and
**export** only — turning the local `wp-env` state of a configured item into a
committed artifact. Planning and applying that artifact to production
(read-only inspection, conflict detection, backups, and the guarded
production write) are a follow-up; running them today is not yet possible.

## Concepts

- **Content key**: a stable identifier for one managed item (for example
  `homepage`), independent of its WordPress database ID or slug. Production
  identity is tracked separately by the `_circus_content_key` post meta once
  an item has been deployed.
- **Site configuration**: `content-publish.json` inside a site's directory
  selects which WordPress items are managed and where their artifacts live.
  It is validated by [`schemas/content-publish.schema.json`](../schemas/content-publish.schema.json)
  and, at the code boundary, by `scripts/lib/content-publish-config.mjs`.
- **Artifact**: a directory containing `manifest.json`, an exact Gutenberg
  `content.html` file, and an optional featured-image file. Its shape is
  documented by [`schemas/content-artifact.schema.json`](../schemas/content-artifact.schema.json)
  and validated by `scripts/lib/content-artifact.mjs`.
- **Site-URL token**: exported content and hashes replace the registered
  local and production URLs with the literal token `{{SITE_URL}}`, so an
  artifact is not tied to one environment and its hash does not change when
  only the host differs.
- **Baseline hash**: the manifest's `baselineHash` field records the
  normalized state the local edit was last reconciled against. Export
  preserves it across intentional edits so the eventual `plan` step can tell
  a real conflict apart from an expected content change. It is only replaced
  with the current state via `--refresh-baseline`, and never silently.

## Authoring workflow

1. Start the site locally and edit the configured item (for Acro Agenda,
   the page assigned to **Settings → Reading → homepage**) in the block
   editor as usual.
2. Export the local state into the committed artifact:

   ```sh
   npm run content:export -- <site-id> [--key <content-key>]
   ```

   Without `--key`, export processes every configured item. Pass `--key` to
   export only one item.
   Export reads only the site's local `wp-env`; production is never
   contacted.
3. Review the resulting diff under the item's `artifactDir` before
   committing. Because export never writes timestamps or generated IDs,
   re-running it without further edits produces no diff.
4. Commit the artifact together with any related code changes.

### Adopting the current local state as the baseline

The very first export for a content key has nothing to preserve, so it
records the current state as its own baseline automatically. On every later
export, the previous `baselineHash` is kept as-is even though the rest of the
manifest is refreshed to the new local content — export refuses to silently
discard it. Pass `--refresh-baseline` only when you intend to adopt the
current local state as the new baseline, such as right after a fresh
production import (local now matches production) or after confirming
production was updated out of band:

```sh
npm run content:export -- <site-id> --key <content-key> --refresh-baseline
```

## Site configuration reference

`content-publish.json` declares one object per managed content key:

- `type`: WordPress content type. `page` and `fair_event` are supported.
- `selector.type`: how the local item is located. `page_on_front` selects the
  static front page; `page_path` selects a page by its site-relative path; and
  `post_path` selects a post of the configured type by the final slug in its
  site-relative path.
- `selector.path`: required for `page_path` and `post_path`; an absolute path
  with a trailing slash, such as `/valencia/` or
  `/fair-events/festival-de-conexion/`.
- `artifactDir`: site-relative directory for this item's artifact. Must stay
  inside the site directory and must not be shared with another item.
- `allowedStatuses`: subset of `draft` and `publish`.
- `metadata`: additional allowlisted post-meta keys. Empty until a real item
  needs one; keys starting with `_circus_` are reserved for the platform.

## Roadmap

Planning (read-only comparison against production, conflict classification)
and applying (backups, the guarded production write, and post-write
verification) are tracked as follow-up work and are intentionally not part of
this repository yet. Do not build local automation that assumes a `plan` or
`apply` command exists.
