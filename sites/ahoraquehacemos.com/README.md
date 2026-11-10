# Ahora que hacemos

Planned production URL: https://ahoraquehacemos.com/

Local WordPress: http://localhost:9796/ (admin: http://localhost:9796/wp-admin/).
Default local credentials: `admin` / `password`.

This is a fresh local installation using the WordPress.org Twenty Twenty-Five
theme, with no additional plugins or production content. The brand kit remains
the starting point for future design and copy: [brand kit](brand/README.md).

Run from the platform root:

```sh
npm run start -- ahoraquehacemos.com
npm run stop -- ahoraquehacemos.com
npm run update -- ahoraquehacemos.com
```

`start` creates the local installation on first use. The shared local email
safeguard is mounted automatically. Local uploads and import data are ignored.

The shared `bootstrap` / `pull` commands import an existing production site;
they are not needed for this fresh installation. Production hosting, WordPress
path, and active theme have not been verified. Before enabling imports, follow
[Adding a managed website](../../docs/adding-sites.md), verify the production
theme matches the local configuration, and fill the ignored
`.env.import-local/ahoraquehacemos.com` using the provided example.
