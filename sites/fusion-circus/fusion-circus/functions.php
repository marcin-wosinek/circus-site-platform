<?php

add_action( 'after_setup_theme', function () {
	add_editor_style( 'style.css' );
} );

add_action( 'init', function () {
	// CTA voice alternates (design.md § CTA voice) — styling in style.css.
	register_block_style( 'core/button', array(
		'name'  => 'on-photo',
		'label' => __( 'On photo (white)', 'fusion-circus' ),
	) );
	register_block_style( 'core/button', array(
		'name'  => 'ghost',
		'label' => __( 'Ghost (outline)', 'fusion-circus' ),
	) );
	// Photo hero (design.md § Photo hero) — mobile composition in style.css.
	register_block_style( 'core/cover', array(
		'name'  => 'photo-hero',
		'label' => __( 'Photo hero', 'fusion-circus' ),
	) );
} );

add_action( 'wp_enqueue_scripts', function () {
	wp_enqueue_style(
		'fusion-circus-style',
		get_stylesheet_uri(),
		array(),
		wp_get_theme()->get( 'Version' )
	);
} );

add_action( 'init', function () {
	wp_register_script(
		'fusion-circus-event-card-editor',
		get_stylesheet_directory_uri() . '/blocks/event-card/editor.js',
		array( 'wp-blocks', 'wp-element', 'wp-server-side-render' ),
		filemtime( get_stylesheet_directory() . '/blocks/event-card/editor.js' ),
		true
	);
	register_block_type( __DIR__ . '/blocks/event-card' );
} );

/*
 * Photo hero mobile focal point (design.md § Photo hero). The attribute is
 * stored in the block comment only; the saved Cover markup is unchanged, so
 * removing this code leaves valid blocks that fall back to the Cover focal
 * point.
 */
add_filter( 'register_block_type_args', function ( $args, $name ) {
	if ( 'core/cover' === $name ) {
		$args['attributes']['mobileFocalPoint'] = array( 'type' => 'object' );
	}
	return $args;
}, 10, 2 );

add_action( 'enqueue_block_editor_assets', function () {
	wp_enqueue_script(
		'fusion-circus-photo-hero-editor',
		get_stylesheet_directory_uri() . '/assets/js/photo-hero-editor.js',
		array( 'wp-hooks', 'wp-compose', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-i18n' ),
		filemtime( get_stylesheet_directory() . '/assets/js/photo-hero-editor.js' ),
		true
	);
} );

add_filter( 'render_block_core/cover', function ( $content, $block ) {
	$attrs = $block['attrs'];
	$point = $attrs['mobileFocalPoint'] ?? null;
	if ( ! is_array( $point ) || ! isset( $point['x'], $point['y'] )
		|| ! preg_match( '/(^|\s)is-style-photo-hero(\s|$)/', $attrs['className'] ?? '' ) ) {
		return $content;
	}
	$x = round( min( 1, max( 0, (float) $point['x'] ) ) * 100 );
	$y = round( min( 1, max( 0, (float) $point['y'] ) ) * 100 );
	$tags = new WP_HTML_Tag_Processor( $content );
	if ( $tags->next_tag( array( 'class_name' => 'wp-block-cover' ) ) ) {
		$tags->add_class( 'has-photo-hero-focus' );
		$style = trim( (string) $tags->get_attribute( 'style' ) );
		$tags->set_attribute( 'style', ( $style ? rtrim( $style, ';' ) . ';' : '' ) . "--fc-photo-hero-focus:{$x}% {$y}%" );
	}
	return $tags->get_updated_html();
}, 10, 2 );
