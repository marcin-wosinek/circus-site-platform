#!/usr/bin/env bash
#
# Install the most recently built versions of the fair-event-plugins suite
# (https://github.com/marcin-wosinek/fair-event-plugins) into the local
# wp-env site. Requires the `gh` CLI (authenticated) and a running wp-env.
#
# Usage:
#   bin/update-fair-plugins.sh [--experimental] [--no-activate]
#
#   --experimental   also install the "-experimental" plugin variants
#   --no-activate    install without activating

set -euo pipefail

REPO="marcin-wosinek/fair-event-plugins"
INCLUDE_EXPERIMENTAL=false
ACTIVATE=true
CLI_CONTAINER="$(docker ps --filter 'name=wp-env-acro-agendaes-.*-cli-' --format '{{.Names}}' | head -n 1)"

for arg in "$@"; do
  case "$arg" in
    --experimental) INCLUDE_EXPERIMENTAL=true ;;
    --no-activate) ACTIVATE=false ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

command -v gh >/dev/null || {
  echo "gh CLI is required: https://cli.github.com/" >&2
  exit 1
}

if [ -z "$CLI_CONTAINER" ]; then
	echo "wp-env is not running. Start it first with: npx wp-env start" >&2
	exit 1
fi

LATEST_TAG=$(gh release list --repo "$REPO" --limit 1 --json tagName --jq '.[0].tagName')
echo "Latest build: $LATEST_TAG"

FILTER='.assets[] | select(.name | endswith(".zip"))'
if [ "$INCLUDE_EXPERIMENTAL" = false ]; then
  FILTER="$FILTER | select(.name | test(\"experimental\") | not)"
fi

ASSET_URLS=$(gh release view "$LATEST_TAG" --repo "$REPO" --json assets --jq "$FILTER | .url")

if [ -z "$ASSET_URLS" ]; then
  echo "No matching plugin assets found in $LATEST_TAG" >&2
  exit 1
fi

WP_ARGS=(--force)
[ "$ACTIVATE" = true ] && WP_ARGS+=(--activate)

mapfile -t URLS <<< "$ASSET_URLS"
for url in "${URLS[@]}"; do
  echo "Installing $(basename "$url")..."
  # wp-cli's download cache key for GitHub release assets collapses to
  # "<repo>-<tag>", so every asset in a release would otherwise reuse the
  # first one downloaded. Clear it before each install to force a fresh
  # download.
  docker exec "$CLI_CONTAINER" wp cli cache clear </dev/null >/dev/null
  docker exec "$CLI_CONTAINER" wp plugin install "$url" "${WP_ARGS[@]}" </dev/null
done

echo "Done."
