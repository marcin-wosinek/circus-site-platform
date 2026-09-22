# acroyoga-club.es

The Acroyoga Club Valencia website is managed directly by the platform
repository. Production uses the official WordPress.org Blockbase theme with
the Fair Audience and Fair Events plugins, so the local `wp-env` downloads
those dependencies instead of tracking a site-specific theme.

## Local WordPress

The site runs locally at <http://localhost:9793>. Run site operations from the
platform root:

```sh
npm run start -- acroyoga-club.es
npm run stop -- acroyoga-club.es
npm run update -- acroyoga-club.es
```

## Import production content

The shared importer reads production over SSH and destructively replaces only
this site's local wp-env database and uploads. Production remains read-only.
The required credentials live in the ignored platform-root file
`.env.import-local/acroyoga-club.es`.

For a first-time setup, run:

```sh
npm run bootstrap -- acroyoga-club.es --apply
```

If the credentials file does not exist, the command creates it from this
site's `.env.import-local.example` and stops. Fill in the SSH values, then run
the same command again. It starts the local environment before importing.

```sh
npm run start -- acroyoga-club.es
npm run import -- acroyoga-club.es --apply
```

`--apply` is mandatory. See
[`../../docs/import-production.md`](../../docs/import-production.md) for
prerequisites, safeguards, and recovery details.

The active production theme and plugins were audited on 2026-09-22. Imports
refresh the plugin sources from production; run the update command afterward
when that tracked configuration changes.
