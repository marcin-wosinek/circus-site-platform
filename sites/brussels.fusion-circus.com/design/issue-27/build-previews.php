<?php
/**
 * Issue #27 preview builder — runs inside the local wp-env CLI container.
 *
 * Usage (via build-previews.mjs): wp eval-file - <source-id> <key> <alt> <css-base64>
 *
 * Copies a page into a published local preview page whose first Cover block
 * carries the alternative's classes, removes the hero's mobile-only state
 * styles (the partial overlay under review), and prepends the preview CSS.
 * The source page is never modified. Reruns update the same preview page.
 */

list( $source_id, $key, $alt, $css_b64 ) = $args;

$source = get_post( (int) $source_id );
if ( ! $source || 'page' !== $source->post_type ) {
	WP_CLI::error( "Page {$source_id} not found for preview {$key}/{$alt}." );
}

function issue27_strip_states( array $block ) {
	if ( isset( $block['attrs']['style'] ) && is_array( $block['attrs']['style'] ) ) {
		foreach ( array_keys( $block['attrs']['style'] ) as $style_key ) {
			if ( is_string( $style_key ) && '@' === $style_key[0] ) {
				unset( $block['attrs']['style'][ $style_key ] );
			}
		}
		if ( ! $block['attrs']['style'] ) {
			unset( $block['attrs']['style'] );
		}
	}
	foreach ( $block['innerBlocks'] as $i => $inner ) {
		$block['innerBlocks'][ $i ] = issue27_strip_states( $inner );
	}
	return $block;
}

$blocks = parse_blocks( $source->post_content );
$found  = false;
foreach ( $blocks as $i => $block ) {
	if ( 'core/cover' !== $block['blockName'] ) {
		continue;
	}
	$classes = "fc-hero fc-hero--{$alt} fc-hero--focus-{$key}";
	$block   = issue27_strip_states( $block );

	$block['attrs']['className'] = trim( ( $block['attrs']['className'] ?? '' ) . ' ' . $classes );
	$block['innerContent'][0]    = preg_replace(
		'/class="wp-block-cover /',
		'class="wp-block-cover ' . $classes . ' ',
		$block['innerContent'][0],
		1
	);
	$blocks[ $i ] = $block;
	$found        = true;
	break;
}
if ( ! $found ) {
	WP_CLI::error( "Page {$source_id} has no top-level Cover block for preview {$key}/{$alt}." );
}

$css     = base64_decode( $css_b64 );
$style   = "<!-- wp:html -->\n<style id=\"issue-27-preview\">\n{$css}\n</style>\n<!-- /wp:html -->\n\n";
$content = $style . serialize_blocks( $blocks );

$slug     = "issue-27-{$alt}-{$key}";
$existing = get_page_by_path( $slug, OBJECT, 'page' );

kses_remove_filters();
$postarr = array(
	'post_type'    => 'page',
	'post_status'  => 'publish',
	'post_name'    => $slug,
	'post_title'   => "[Preview #27 {$alt}] {$source->post_title}",
	'post_content' => wp_slash( $content ),
	'page_template' => get_page_template_slug( $source ) ?: 'page-no-title',
);
if ( $existing ) {
	$postarr['ID'] = $existing->ID;
}
$id = wp_insert_post( $postarr, true );
if ( is_wp_error( $id ) ) {
	WP_CLI::error( "Preview {$key}/{$alt}: " . $id->get_error_message() );
}
update_post_meta( $id, '_issue_27_preview', '1' );
WP_CLI::log( "/{$slug}/" );
