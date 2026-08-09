#!/usr/bin/env bash
#
# Rebuild the local wp-env site from the supplied production snapshot.
# This operates only on the local Docker database and gitignored import/ area.
#
# Usage:
#   bin/reimport-local-site.sh [database.sql] [uploads.zip]
#
# Defaults match the latest files supplied for this site in ~/Downloads.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_SOURCE="${1:-/Users/marcinwosinek/Downloads/u637708279_kZVKZ.sql}"
UPLOADS_SOURCE="${2:-/Users/marcinwosinek/Downloads/uploads.zip}"
IMPORT_DB="$PROJECT_DIR/import/db"
IMPORT_UPLOADS="$PROJECT_DIR/import/uploads"
LOG_FILE="$PROJECT_DIR/import/reimport-local-site.log"
REST_ENV="$PROJECT_DIR/.env.wp-rest"
CLI_CONTAINER="$(docker ps --filter 'name=wp-env-acro-agendaes-.*-cli-' --format '{{.Names}}' | head -n 1)"

run() {
	local rendered
	printf -v rendered ' %q' "$@"
	printf '+%s\n' "$rendered" | tee -a "$LOG_FILE"
	"$@" >>"$LOG_FILE" 2>&1
	printf '  completed\n' | tee -a "$LOG_FILE"
}

require_file() {
	if [ ! -f "$1" ]; then
		echo "Required file not found: $1" >&2
		exit 1
	fi
}

require_file "$DB_SOURCE"
require_file "$UPLOADS_SOURCE"

if [ -z "$CLI_CONTAINER" ]; then
	echo "wp-env is not running. Start it first with: npx wp-env start" >&2
	exit 1
fi

mkdir -p "$IMPORT_DB" "$IMPORT_UPLOADS"
: > "$LOG_FILE"
printf 'Reimport started: %s\nProject: %s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$PROJECT_DIR" | tee -a "$LOG_FILE"

# Stage exact snapshot files that wp-env maps into its containers.
run cp "$DB_SOURCE" "$IMPORT_DB/$(basename "$DB_SOURCE")"
run find "$IMPORT_UPLOADS" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
run unzip -o "$UPLOADS_SOURCE" -d "$IMPORT_UPLOADS"

cd "$PROJECT_DIR"
# Start wp-env once before running this script.  Docker is used below so the
# command sequence remains in one shell and can be logged reliably.
run docker exec "$CLI_CONTAINER" wp core is-installed
run docker exec "$CLI_CONTAINER" wp db reset --yes
run docker exec "$CLI_CONTAINER" wp db import "wp-content/import/$(basename "$DB_SOURCE")"
run "$SCRIPT_DIR/update-fair-plugins.sh"
run docker exec "$CLI_CONTAINER" wp theme activate acro-agenda

# Re-running the script leaves the requested credentials in a known state.
if docker exec "$CLI_CONTAINER" wp user get admin --field=ID >/dev/null 2>&1; then
	run docker exec "$CLI_CONTAINER" wp user update admin --user_pass=password --role=administrator
else
	run docker exec "$CLI_CONTAINER" wp user create admin admin@localhost.test --user_pass=password --role=administrator
fi

# Keep local REST publishing credentials in a known state after every import.
# Application Passwords are intentionally captured outside run(), because its
# command log is kept under import/ and must never contain a credential.
if docker exec "$CLI_CONTAINER" wp user get ai-editor --field=ID >/dev/null 2>&1; then
	run docker exec "$CLI_CONTAINER" wp user update ai-editor --user_email=ai-editor@localhost.test --display_name='AI Editor' --role=administrator
else
	run docker exec "$CLI_CONTAINER" wp user create ai-editor ai-editor@localhost.test --display_name='AI Editor' --role=administrator
fi

AI_APPLICATION_PASSWORD="$(docker exec "$CLI_CONTAINER" wp user application-password create ai-editor 'Local REST API' --porcelain)"
if [ -z "$AI_APPLICATION_PASSWORD" ]; then
	echo 'Failed to create an Application Password for ai-editor.' >&2
	exit 1
fi

umask 077
{
	printf 'WP_REST_URL=http://localhost:9788\n'
	printf 'WP_REST_USERNAME=ai-editor\n'
	printf 'WP_REST_APPLICATION_PASSWORD=%s\n' "$AI_APPLICATION_PASSWORD"
} >"$REST_ENV"
chmod 600 "$REST_ENV"
printf '  created local REST credentials in %s\n' "$REST_ENV" | tee -a "$LOG_FILE"

run docker exec "$CLI_CONTAINER" wp option get home
run docker exec "$CLI_CONTAINER" wp user get admin --fields=ID,user_login,roles --format=table
run docker exec "$CLI_CONTAINER" wp user get ai-editor --fields=ID,user_login,display_name,roles --format=table
run docker exec "$CLI_CONTAINER" wp plugin list --fields=name,status,version --format=table
printf 'Reimport finished: %s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" | tee -a "$LOG_FILE"
