# Import production content

The shared import command retrieves a registered site's production database and
uploads over SSH, then destructively replaces only that site's local `wp-env`
database and uploads. Production is read-only: the command streams the database
export and uploads archive without creating or changing remote files. Repository
code and configured themes are not replaced.

## Prerequisites

- Docker and Node.js on the local machine
- For the import-only command, a running local site started with
  `npm run start -- <site-id>`; `pull` starts it for you
- SSH key access to the production host
- WP-CLI and `mysqldump` on the production host
- Internet access to GitHub when production has active `fair-*` plugins

The remote database export runs `mysqldump` directly, using connection values
read by WP-CLI from `wp-config.php`. The database password is not written to
disk remotely or included in the command log. This approach also supports hosts
where PHP process functions such as `proc_open()` are disabled.

## Configuration

Create the ignored `.env.import-local/<site-id>` file at the platform root.
The previous site-local `.env.import-local` location remains supported for
compatibility. Do not commit either file.

Required values:

- `PRODUCTION_SSH`: SSH target in the form accepted by `ssh`, such as
  `user@example-host`
- `PRODUCTION_WP_PATH`: absolute path to the remote WordPress installation

Optional values:

- `PRODUCTION_SSH_PORT`: remote SSH port
- `PRODUCTION_SSH_KEY`: absolute path to a private key not selected by SSH
  configuration
- `PRODUCTION_URL`: overrides the production URL in `sites.json`
- `LOCAL_URL`: overrides the local URL derived from the registered port
- `LOCAL_ADMIN_USER`: local administrator username; defaults to `admin`
- `LOCAL_ADMIN_EMAIL`: local administrator email; defaults to
  `admin@localhost.test`
- `LOCAL_ADMIN_PASSWORD`: local administrator password; defaults to `password`
- `FAIR_PLUGIN_RELEASE`: optional `fair-event-plugins` GitHub release tag to pin;
  by default the newest release containing every required `fair-*` ZIP is used
- `GITHUB_TOKEN`: optional GitHub token used only for API authentication; public
  releases work without one, subject to GitHub's unauthenticated rate limit

Site READMEs may point to a site-specific example containing appropriate host
and path placeholders.

## Run the import

For the full production-to-local workflow, including starting or updating
local WordPress and verifying the final result, run from the platform root:

```sh
npm run pull -- <site-id> --apply
```

`pull` also works on an existing local environment. `bootstrap` is an alias.
Both require `--apply` because they replace the selected local database and
uploads. If the credentials file is missing, the first run creates an ignored
template and stops so you can fill it in.

To run only the import against an already running local site:

```sh
npm run import -- <site-id> --apply
```

`--apply` is mandatory. Before changing the local environment, the command
downloads both production snapshots and validates the uploads archive. It then:

1. Saves the current local database and uploads under the ignored site
   `import/` directory.
2. Resets and imports the local database.
3. Performs a serialization-safe replacement of the production URL with the
   local URL.
4. Updates `.wp-env.json` with download URLs derived from active plugin entry
   files. `fair-*` plugins resolve to versioned ZIP assets from one coherent
   [`fair-event-plugins`](https://github.com/marcin-wosinek/fair-event-plugins)
   GitHub prerelease; other plugins resolve to WordPress.org.
5. Activates the single theme configured by `.wp-env.json`.
6. Creates or resets the configured local administrator.

Before replacing local data, the importer checks production access and rejects
a configured theme that does not match the active production theme. After the
import it compares the local site identity, active theme, front-page settings,
front-page status, and published-page count with production. Bootstrap repeats
this verification after its final wp-env update.

Active plugins outside the `fair-*` suite must be published in the WordPress.org
Plugin Directory under the same slug as their production plugin directory. The
selected fair plugin release URL is written into `.wp-env.json`, so subsequent
updates remain pinned until another import is run. To apply a changed plugin
list:

```sh
npm run update -- <site-id>
```

Treat database and uploads snapshots as sensitive production data. They can
contain personal data, WordPress settings, or secrets and must remain outside
version control.

## Recovery

Each applied import preserves the previous local database and uploads in the
site's ignored `import/` directory. The command prints their paths when it
finishes. Restoring them is currently a manual operation.
