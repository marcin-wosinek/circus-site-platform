<?php
/**
 * Lamutable child theme.
 *
 * Load style.css in both the front end and block editor preview canvas.
 */

add_action(
	'enqueue_block_assets',
	function () {
		wp_enqueue_style(
			'lamutable-style',
			get_stylesheet_uri(),
			array(),
			wp_get_theme()->get( 'Version' )
		);
	}
);
