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

/** Translate shared ticket names on the English Dance Connection event. */
add_filter(
	'render_block_fair-events/event-signup',
	function ( $content ) {
		if (
			! is_singular( 'fair_event' ) ||
			'dance-connection-27th-of-september' !== get_post_field( 'post_name', get_queried_object_id() ) ||
			! function_exists( 'pll_get_post_language' ) ||
			'en' !== pll_get_post_language( get_queried_object_id() )
		) {
			return $content;
		}

		return str_replace(
			array( 'Todo —', 'Solo jam —' ),
			array( 'Full event —', 'Jam only —' ),
			$content
		);
	}
);

/** Translate shared ticket and activity names on the English October Minifesti. */
function lamutable_translate_october_minifesti_tickets( $content ) {
	if (
		! is_singular( 'fair_event' ) ||
		'minifesti-la-mutable-10th-of-october' !== get_post_field( 'post_name', get_queried_object_id() ) ||
		! function_exists( 'pll_get_post_language' ) ||
		'en' !== pll_get_post_language( get_queried_object_id() )
	) {
		return $content;
	}

	return str_replace(
		array(
			'Entrada regular | Regular ticket',
			'Entrada completa | Full pass',
			'Emuná Yoga con Yesica',
			'Lillah el juego de la vida con Eu G',
			'Slow Flow con Muriel',
			'Tai Chi con Nataliia',
			'Danza con Sayil',
			'Danza con Julia',
		),
		array(
			'Regular ticket',
			'Full pass',
			'Emuná Yoga with Yesica',
			'Lillah: The Game of Life with Eu G',
			'Slow Flow with Muriel',
			'Tai Chi with Nataliia',
			'Fusion Dance with Sayil',
			'Motion and Emotion with Julia',
		),
		$content
	);
}

add_filter( 'render_block_fair-events/event-prices', 'lamutable_translate_october_minifesti_tickets' );
add_filter( 'render_block_fair-events/event-signup', 'lamutable_translate_october_minifesti_tickets' );

/**
 * Add the Meta Pixel after targeting consent is granted.
 */
add_action(
	'wp_head',
	function () {
		?>
		<!-- Meta Pixel Code — activated only after targeting consent -->
		<script type="text/plain" data-cookiecategory="targeting">
		!function(f,b,e,v,n,t,s)
		{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
		n.callMethod.apply(n,arguments):n.queue.push(arguments)};
		if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
		n.queue=[];t=b.createElement(e);t.async=!0;
		t.src=v;s=b.getElementsByTagName(e)[0];
		s.parentNode.insertBefore(t,s)}(window,document,'script',
		'https://connect.facebook.net/en_US/fbevents.js');

		fbq('init', '1642066550767859');
		fbq('track', 'PageView');
		</script>
		<!-- End Meta Pixel Code -->
		<?php
	}
);
