# circus-it.eu

The Circus IT website lives directly in the platform repository. It is not a
Git submodule.

The local clone uses Blockbase, matching the active production theme. The
`circus-it` directory is a minimal standalone WordPress block theme. It has
no build step or third-party runtime dependencies; the homepage is composed
from native WordPress blocks so it can evolve alongside the platform's
automation. It is retained for development and is not used by the local clone.

## Retained development theme

- Theme directory: `circus-it`
- Minimum WordPress version: 6.7
- Minimum PHP version: 7.4
- Text domain: `circus-it`

## Local WordPress

The site runs locally with `wp-env` on <http://localhost:9791>. From the
platform root, start it with:

```sh
npm run start -- circus-it.eu
```

## Import production content

Use `.env.import-local.example` as a template for the platform-root
`.env.import-local/circus-it.eu` file and set the Hostinger SSH target, port,
and absolute WordPress path. Set `PRODUCTION_SSH_KEY` too if the key is not
selected through your SSH configuration. Ensure SSH key authentication works
and that `wp` and `mysqldump` are available on the remote server.

```sh
npm run import -- circus-it.eu --apply
```

The import verifies that production uses Blockbase and activates it locally.
Production templates and styles stored in the database are imported with the
content. The retained `circus-it` theme files are not replaced by an import. See
[`../../docs/import-production.md`](../../docs/import-production.md) for the
shared workflow, safeguards, configuration keys, and local credentials.
