# valencia.fusion-circus.com

Production: <https://valencia.fusion-circus.com/>

This website is tracked directly in the platform repository. Local WordPress
runs at <http://localhost:9795> and mounts the shared Fusion Circus theme
from the `sites/fusion-circus` submodule. Initialize it before starting:

```sh
git submodule update --init --recursive
npm run bootstrap -- valencia.fusion-circus.com --apply
```

Run these commands from the platform root. Credentials belong in the ignored
`.env.import-local/valencia.fusion-circus.com` file; use this site's
`.env.import-local.example` as a template. Bootstrap checks production, starts
WordPress without plugins, imports the production database and uploads, then
mounts the imported plugins and verifies the local result. It destructively
replaces only this site's local database and uploads; production is read-only.

For subsequent local operations:

```sh
npm run start -- valencia.fusion-circus.com
npm run stop -- valencia.fusion-circus.com
npm run update -- valencia.fusion-circus.com
```

The production theme was confirmed as `fusion-circus` on 2026-09-23. Theme
changes in the shared submodule affect every local site using that source.
See [production imports](../../docs/import-production.md) for prerequisites
and recovery, and [adding sites](../../docs/adding-sites.md) for setup guidance.
