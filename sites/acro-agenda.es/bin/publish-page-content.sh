#!/usr/bin/env bash
#
# Replace the complete Gutenberg content of one existing, published page.
# Credentials stay in the gitignored .env.wp-rest file and are never printed.
#
# Usage:
#   bin/publish-page-content.sh [--dry-run] <page-slug> <source.html>
#
# Examples:
#   bin/publish-page-content.sh --dry-run pagina-de-inicio homepage.html
#   bin/publish-page-content.sh pagina-de-inicio homepage.html

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REST_ENV="$PROJECT_DIR/.env.wp-rest"
DRY_RUN=false

usage() {
	cat >&2 <<'EOF'
Usage: bin/publish-page-content.sh [--dry-run] <page-slug> <source.html>

Replaces only the content field of one existing, published WordPress page.
EOF
	exit 1
}

if [ "${1:-}" = "--dry-run" ]; then
	DRY_RUN=true
	shift
fi

if [ "$#" -ne 2 ]; then
	usage
fi

PAGE_SLUG="$1"
SOURCE_FILE="$2"

if [[ ! "$PAGE_SLUG" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
	echo "Page slug must use lowercase letters, numbers, and single hyphens." >&2
	exit 1
fi

if [ ! -f "$SOURCE_FILE" ]; then
	echo "Source file not found: $SOURCE_FILE" >&2
	exit 1
fi

if ! rg --quiet '<!-- wp:' "$SOURCE_FILE"; then
	echo "Source file does not contain Gutenberg block markup: $SOURCE_FILE" >&2
	exit 1
fi

if [ ! -f "$REST_ENV" ]; then
	echo "REST credentials file not found: $REST_ENV" >&2
	exit 1
fi

read_env_value() {
	local key="$1"
	local value
	value="$(sed -n "s/^${key}=//p" "$REST_ENV")"

	if [ -z "$value" ]; then
		echo "Missing $key in $REST_ENV" >&2
		exit 1
	fi

	printf '%s' "$value"
}

REST_URL="$(read_env_value WP_REST_URL)"
REST_USER="$(read_env_value WP_REST_USERNAME)"
REST_PASSWORD="$(read_env_value WP_REST_APPLICATION_PASSWORD)"
API_BASE="${REST_URL%/}/wp-json/wp/v2/pages"

PAGE_RESPONSE="$(curl --fail --silent --show-error --location --max-time 20 \
	"${API_BASE}?slug=${PAGE_SLUG}&context=view&_fields=id,slug,status,link,title")"

if [ "$(jq 'length' <<<"$PAGE_RESPONSE")" -ne 1 ]; then
	echo "Expected exactly one page for slug: $PAGE_SLUG" >&2
	exit 1
fi

PAGE_ID="$(jq -r '.[0].id' <<<"$PAGE_RESPONSE")"
PAGE_STATUS="$(jq -r '.[0].status' <<<"$PAGE_RESPONSE")"

if [ "$PAGE_STATUS" != "publish" ]; then
	echo "Refusing to update a non-published page: $PAGE_SLUG ($PAGE_STATUS)" >&2
	exit 1
fi

if [ "$DRY_RUN" = true ]; then
	jq -r '.[0] | ["Would update", .id, .slug, .status, .link] | @tsv' <<<"$PAGE_RESPONSE"
	exit 0
fi

PUBLISH_RESPONSE="$(curl --fail --silent --show-error --location --max-time 20 \
	--user "$REST_USER:$REST_PASSWORD" \
	--request POST \
	--data-urlencode "content@${SOURCE_FILE}" \
	"${API_BASE}/${PAGE_ID}?_fields=id,slug,status,modified,link")"

if ! jq --exit-status --argjson id "$PAGE_ID" --arg slug "$PAGE_SLUG" \
	'.id == $id and .slug == $slug and .status == "publish"' <<<"$PUBLISH_RESPONSE" >/dev/null; then
	echo "WordPress returned an unexpected page identity or status after publishing." >&2
	exit 1
fi

jq -r '[.id, .slug, .status, .modified, .link] | @tsv' <<<"$PUBLISH_RESPONSE"
