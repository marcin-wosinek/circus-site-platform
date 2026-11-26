<?php
/**
 * Las Musas child theme.
 *
 * Load style.css in both the front end and block editor preview canvas.
 */

add_action(
	'enqueue_block_assets',
	function () {
		wp_enqueue_style(
			'las-musas-style',
			get_stylesheet_uri(),
			array(),
			wp_get_theme()->get( 'Version' )
		);
	}
);
