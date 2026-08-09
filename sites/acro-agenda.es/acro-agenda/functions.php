<?php

add_action( 'init', 'acro_agenda_register_block_styles' );

function acro_agenda_register_block_styles() {
	$block_styles = array(
		'core/button' => array(
			array(
				'name'  => 'soft',
				'label' => __( 'Suave (secundario)', 'acro-agenda' ),
			),
		),
		'core/group'  => array(
			array(
				'name'       => 'card',
				'label'      => __( 'Tarjeta', 'acro-agenda' ),
				'style_data' => array(
					'color'   => array(
						'background' => 'var:preset|color|base',
					),
					'border'  => array(
						'radius' => 'var:custom|radius|card',
					),
					'shadow'  => 'var:custom|shadow|card',
					'spacing' => array(
						'padding' => array(
							'top'    => 'var:preset|spacing|lg',
							'right'  => 'var:preset|spacing|lg',
							'bottom' => 'var:preset|spacing|lg',
							'left'   => 'var:preset|spacing|lg',
						),
					),
				),
			),
			array(
				'name'  => 'closing-callout',
				'label' => __( 'Tarjeta cálida', 'acro-agenda' ),
			),
		),
		'core/paragraph' => array(
			array(
				'name'  => 'mono-eyebrow',
				'label' => __( 'Ceja mono', 'acro-agenda' ),
			),
			array(
				'name'  => 'activity-tag',
				'label' => __( 'Etiqueta de actividad', 'acro-agenda' ),
			),
		),
	);

	foreach ( $block_styles as $block_name => $styles ) {
		foreach ( $styles as $style ) {
			register_block_style( $block_name, $style );
		}
	}
}

add_action( 'wp_enqueue_scripts', 'acro_agenda_enqueue_styles' );

function acro_agenda_enqueue_styles() {
	wp_enqueue_style(
		'acro-agenda-style',
		get_stylesheet_uri(),
		array(),
		wp_get_theme()->get( 'Version' )
	);
}
