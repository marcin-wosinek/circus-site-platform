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

		fbq('init', '1710336696711601');
		fbq('track', 'PageView');
		</script>
		<!-- End Meta Pixel Code -->
		<?php
	}
);
