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

run docker exec "$CLI_CONTAINER" wp option get home
run docker exec "$CLI_CONTAINER" wp user get admin --fields=ID,user_login,roles --format=table
run docker exec "$CLI_CONTAINER" wp plugin list --fields=name,status,version --format=table
printf 'Reimport finished: %s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" | tee -a "$LOG_FILE"
