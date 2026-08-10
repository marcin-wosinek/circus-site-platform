<?php
/**
 * Lamutable child theme.
 *
 * Block themes do not load style.css automatically — enqueue it explicitly.
 */

add_action(
	'wp_enqueue_scripts',
	function () {
		wp_enqueue_style(
			'lamutable-style',
			get_stylesheet_uri(),
			array(),
			wp_get_theme()->get( 'Version' )
		);
	}
);
