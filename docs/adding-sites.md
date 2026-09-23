# Adding a managed website

Registering a URL is only part of setup. A new managed site must also have a
local WordPress configuration so the shared bootstrap command can run.

1. Inspect `sites.json`, `.gitmodules`, and a comparable site's configuration.
   Choose a stable site ID, a unique `sites/<site-id>` folder, and an unused
   local port. Add `folder`, `port`, and the canonical HTTPS `productionUrl`
   to `sites.json`. Track platform-owned site folders directly; use the
   [repository merge workflow](merge-repository.md) when importing a repository.
2. Confirm the production WordPress path and active theme using read-only
   SSH/WP-CLI. Do not infer the theme from the domain or assume subdomains use
   the same hosting directory layout. For example, run `wp --path=<path> theme
   list --status=active --skip-plugins --skip-themes` on the production host.
3. Add `sites/<site-id>/.wp-env.json` with `core: null`, the registered `port`,
   `testsEnvironment: false`, and exactly one confirmed theme source. Local
   theme paths are relative to the site folder. Brussels and Valencia use
   `../fusion-circus/fusion-circus`; initialize that submodule before use.
   Include these import mappings:

   ```json
   "mappings": {
     "wp-content/uploads": "./import/uploads",
     "wp-content/import": "./import/db"
   }
   ```

   Follow existing debug configuration conventions. The importer refreshes
   plugin sources from production; do not copy another site's plugin list
   without checking it. Bootstrap initially defers plugin mounting so plugins
   do not run migrations against an empty database.
4. Add a site `.gitignore` covering `import/`, `.env.import-local`,
   `.wp-env.override.json`, and `.wp-env-plugins/`. Add a committed
   `.env.import-local.example` with placeholders for `PRODUCTION_SSH`,
   `PRODUCTION_SSH_PORT`, and `PRODUCTION_WP_PATH`. Document optional overrides
   using the site's URL and port, not the template site's values.
5. Store real credentials only in the ignored root
   `.env.import-local/<site-id>` file with permissions `0600`. When reusing
   another site's hosting settings, preserve its SSH connection details but
   adjust and verify the WordPress path. Never overwrite existing credentials
   or print secrets. Confirm the new file is ignored with `git check-ignore`.
6. Add a site README with its production URL, local port, theme dependency,
   credential location, and root-level bootstrap/start/stop/update commands.
   Update the website list in the root README and the table in `sites/README.md`.
7. Run `npm test` and `git diff --check`. Check that registry folders and ports
   are unique, site folders exist, configuration ports match the registry,
   and local theme paths exist. Run `npm run bootstrap -- <site-id>` without
   `--apply` to check configuration presence (it may create a credentials
   template); this does not verify connectivity. With credentials available,
   run `node scripts/import-production.mjs <site-id> --preflight` for a
   read-only production/theme check.

When ready to replace the selected local database and uploads, run
`npm run bootstrap -- <site-id> --apply`. This requires Docker, Node.js, SSH,
and remote WP-CLI. It checks production before starting, imports into local
WordPress, mounts the imported plugins, and verifies the result. Production
remains read-only. See [production imports](import-production.md) for the
complete safeguards and recovery workflow. Do not report runtime verification
as complete unless bootstrap has actually succeeded.
