# Publish content

The content publishing workflow treats committed artifacts as the deployable
source of truth for a small, explicitly configured set of WordPress content,
while the local `wp-env` database remains the authoring environment. It is
separate from [production imports](import-production.md): importing is a
one-way, destructive-to-local copy of an entire site from production;
publishing is a per-item, explicitly configured workflow that can write a
reviewed, committed artifact to production after confirmation and backup.

**Current scope:** export, read-only plan, and guarded apply manage configured
items and their featured images. Production import remains separate.

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
  preserves it across intentional edits so `plan` can tell a real conflict
  apart from an expected content change. It is only replaced with the current
  state via `--refresh-baseline`, and never silently.

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

## Planning workflow

Once an item's artifact is committed, compare it against the *current*
production state:

```sh
npm run content:plan -- <site-id> [--key <content-key>]
```

Without `--key`, plan evaluates every configured item. Plan is entirely
read-only against production: it inspects content, allowlisted metadata, and
the featured image over the existing read-only SSH/WP-CLI connection, and
never issues a write, temp-file, or backup command remotely.

### Precondition: a clean, committed Git state

Before contacting production, plan requires the site's `content-publish.json`
and every selected item's `artifactDir` to be tracked in Git with no staged,
unstaged, or untracked changes. This binds the plan to an exact commit —
`git rev-parse HEAD` at plan time — so a later apply can refuse to run against
a different commit. Plan fails fast, naming the offending paths, if this does
not hold.

### Identity resolution

Production identity is tracked by the `_circus_content_key` post meta. Plan
looks up the current production post carrying that meta value, scoped to the
item's type, across all core statuses including `trash`:

- **No match** — the item has not been deployed yet.
- **Exactly one match** — that post is production's current state for this
  item, unless it is trashed, in which case plan reports a `conflict` rather
  than silently treating the item as never deployed (which would otherwise
  let a later apply create a duplicate-identity page).
- **More than one match** — a `conflict` ("ambiguous identity marker"); plan
  never guesses which one is authoritative.

Only the `homepage` item (`selector.type: "page_on_front"`) gets a
first-adoption fallback when no marker is found: plan resolves production's
current `page_on_front`. If that page already carries a *different*
`_circus_content_key`, it is a `conflict`, not a silent skip. Every other
selector type never falls back — no marker means `create`, full stop.

### Classification

Once a production match is resolved (or definitively absent), plan reports
one of four classifications per item:

- **`create`** — no production match; the item has never been deployed.
- **`unchanged`** — production's normalized state hashes the same as the
  artifact's target state.
- **`update`** — production's normalized state hashes the same as the
  artifact's recorded `baselineHash` (and differs from the target), meaning
  only the local, committed edit needs to be applied.
- **`conflict`** — production has drifted from both the recorded baseline and
  the target (or the identity resolution itself was ambiguous, trashed, or
  claimed by another key).

Plan always reports every selected item — it never stops at the first
conflict. It exits `1` if any item is a `conflict`, `0` otherwise.

### Saved plan record

Plan writes an ignored JSON record to
`.content-publish/plans/<site-id>/plan.json`, containing the site ID, the Git
commit SHA the plan was computed against, each item's artifact hashes
(baseline/target), each item's observed production state (post ID,
normalized hash, classification), and a `planHash` over the record. A later
`apply` step requires version 2 of this record, which also binds the registered
production URL, SSH target and port, and WordPress path. Regenerate older plans
with `content:plan`. Apply checks the record shape and hash, current commit,
clean configuration and artifacts, destination, and live production state.

## Applying a saved plan

Review the plan report and then run, from the repository root:

```sh
npm run content:apply -- <site-id> --plan .content-publish/plans/<site-id>/plan.json --confirm-production=<site-id>
```

The site name must match exactly. Apply displays the production URL, SSH target,
WordPress path, keys, and artifact-to-production direction. It rejects a
changed destination, commit, artifact, identity, or production state. It accepts
the planned starting state or an item already at the target; completed items are
skipped on retry. A conflict requires investigation of the direct production
edit before any new plan is made. Missing configuration or artifacts cause an
error and never delete or unpublish production content.

Immediately before the first mutation, apply streams a full database dump to
`.content-publish/backups/<site-id>/`, checks its structure and completion
marker, and records its SHA-256. Backups and journals are ignored by Git. The
existing ignored `.env.import-local/<site-id>` provides `PRODUCTION_SSH`,
`PRODUCTION_WP_PATH`, and optional `PRODUCTION_SSH_PORT` and
`PRODUCTION_SSH_KEY`. Keep this file and backups private. A fresh backup is
made on every retry that needs a write. Each page is read back and hashed after
writing; a mismatch is a failed deployment even if WordPress accepted it.

### Recovery

The journal at `.content-publish/journals/<site-id>/<plan-hash>.json` contains
the backup path and SHA-256, item IDs, and phase. Inspect the failure and the
current production state first. If a database restore is needed, have an
operator with production access verify the backup checksum, transfer the file
securely, and restore it with WP-CLI from the WordPress installation:

```sh
shasum -a 256 /path/to/production-backup.sql
wp --path=/absolute/wordpress/path db import /path/to/production-backup.sql
```

Use the exact path and hash reported by apply. This restore is a separate,
explicit operator action and replaces the production database state. A newly
uploaded but unreferenced image file may remain after restoring the database;
apply never deletes existing uploads. Re-read production and plan again before
the next deployment.

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
