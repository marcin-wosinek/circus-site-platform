# fair-event-plugins.com

The Fair Event Plugins website is managed directly by the platform repository.
Production currently uses the official WordPress.org Blockbase theme, so the
local `wp-env` downloads that theme instead of tracking a site-specific theme.

## Local WordPress

The site runs locally at <http://localhost:9792>. Run site operations from the
platform root:

```sh
npm run start -- fair-event-plugins.com
npm run stop -- fair-event-plugins.com
npm run update -- fair-event-plugins.com
```

## Import production content

The shared importer reads production over SSH and destructively replaces only
this site's local wp-env database and uploads. Production remains read-only.
The required credentials live in the ignored platform-root file
`.env.import-local/fair-event-plugins.com`.

```sh
npm run start -- fair-event-plugins.com
npm run import -- fair-event-plugins.com --apply
```

`--apply` is mandatory. See [`../../docs/import-production.md`](../../docs/import-production.md)
for prerequisites, safeguards, and recovery details.

The active production theme and plugins were audited on 2026-09-21. Imports
refresh the plugin sources from production; run the update command afterward
when that tracked configuration changes.

## Managed content

Two pages are configured for managed publishing through
[`content-publish.json`](content-publish.json):

| Content key | Page |
| --- | --- |
| `homepage` | The static front page |
| `privacy-policy` | The existing published page at `/privacy-policy/` |

Edit a page in the local WordPress environment, then export and plan only that
item from the platform root, so the other page is left out:

```sh
npm run content:export -- fair-event-plugins.com --key privacy-policy
npm run content:plan -- fair-event-plugins.com --key privacy-policy
```

The privacy policy should plan as an `update` of the existing production page;
investigate a `create` or `conflict` result before going further. Its wording
needs explicit approval before publication.

See [`../../docs/publish-content.md`](../../docs/publish-content.md) for the
guarded plan and apply workflow.
