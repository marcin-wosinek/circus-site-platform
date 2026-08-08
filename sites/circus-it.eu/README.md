# circus-it.eu

The Circus IT website lives directly in the platform repository. It is not a
Git submodule.

The `circus-it` directory is a minimal standalone WordPress block theme. It has
no build step or third-party runtime dependencies; the homepage is composed
from native WordPress blocks so it can evolve alongside the platform's
automation.

## Theme

- Theme directory: `circus-it`
- Minimum WordPress version: 6.7
- Minimum PHP version: 7.4
- Text domain: `circus-it`

## Local WordPress

The site runs locally with `wp-env` on <http://localhost:9791>. From this
directory, start it with:

```sh
npx @wordpress/env start
```

## Import production content

The import command retrieves the production database and uploads over SSH,
then replaces the local wp-env database and uploads. Production is read-only:
the command streams a database export and uploads archive without creating or
changing remote files. Repository code, including the local `circus-it` theme,
is not replaced.

The database export runs the remote `mysqldump` executable directly, using
connection values read by WP-CLI from `wp-config.php`. This is compatible with
Hostinger accounts where PHP process functions such as `proc_open()` are
disabled. The database password is neither written to disk remotely nor added
to the command log.

Copy `.env.import-local.example` to `.env.import-local` and set the Hostinger
SSH target, port, and absolute WordPress path. Set `PRODUCTION_SSH_KEY` too if
the key is not selected through your SSH configuration. The local file is
ignored by Git and must not be committed. Ensure SSH key authentication works
and that `wp` is available on the remote server, then run:

```sh
npx @wordpress/env start
node scripts/import-production.mjs --apply
```

`--apply` is mandatory because the operation resets the local database and
replaces local uploads. Before doing so, the command downloads both snapshots,
validates the uploads archive, and saves the current local database and uploads
under the ignored `import/` directory. It then performs a serialization-safe
URL replacement from `https://circus-it.eu` to `http://localhost:9791`,
activates the tracked theme, and creates or resets the local `admin` user.

The default local password is `password`. Override `LOCAL_ADMIN_USER`,
`LOCAL_ADMIN_EMAIL`, or `LOCAL_ADMIN_PASSWORD` in `.env.import-local` when
needed. Treat the ignored snapshots as sensitive production data: they can
contain personal data and WordPress settings or secrets.
