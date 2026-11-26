#!/usr/bin/env bash
# List the local posts related to one Fair Events event date, read-only.
# Usage: related-posts.sh <site-id> <event-date-id>
# Output: tab-separated post_id, type, status, language, slug, path.
set -euo pipefail

site_id="${1:?Usage: related-posts.sh <site-id> <event-date-id>}"
event_date_id="${2:?Usage: related-posts.sh <site-id> <event-date-id>}"
[[ "$event_date_id" =~ ^[1-9][0-9]*$ ]] || { echo "Event date ID must be a positive integer: $event_date_id" >&2; exit 2; }

root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
folder="$(node -e '
const sites = require(process.argv[1]).sites;
const site = sites[process.argv[2]];
if (!site) { console.error(`Unknown site: ${process.argv[2]}`); process.exit(2); }
console.log(site.folder);
' "$root/sites.json" "$site_id")"

cd "$root/$folder"
npx @wordpress/env run cli wp eval '
global $wpdb;
require_once ABSPATH . "wp-admin/includes/post.php";
$id = '"$event_date_id"';
if ( ! $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$wpdb->prefix}fair_event_dates WHERE id = %d", $id ) ) ) {
	WP_CLI::error( "Event date $id does not exist locally." );
}
$ids = $wpdb->get_col( $wpdb->prepare(
	"SELECT post_id FROM {$wpdb->prefix}fair_event_date_posts WHERE event_date_id = %d
	 UNION SELECT event_id FROM {$wpdb->prefix}fair_event_dates WHERE id = %d AND event_id IS NOT NULL",
	$id, $id
) );
echo "post_id\ttype\tstatus\tlanguage\tslug\tpath\n";
foreach ( array_unique( array_map( "intval", $ids ) ) as $p ) {
	$post = get_post( $p );
	if ( ! $post ) { echo "$p\tMISSING\t\t\t\t\n"; continue; }
	$url = "publish" === $post->post_status
		? get_permalink( $post )
		: str_replace( array( "%pagename%", "%postname%" ), $post->post_name, get_sample_permalink( $post )[0] );
	$lang = function_exists( "pll_get_post_language" ) ? (string) pll_get_post_language( $p ) : "";
	echo implode( "\t", array( $p, $post->post_type, $post->post_status, $lang, $post->post_name, wp_make_link_relative( $url ) ) ), "\n";
}
' 2>&1 | grep -E '^(post_id|[0-9]+)	|Error:' 
