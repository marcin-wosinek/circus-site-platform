<?php
/**
 * Title: Pie de página
 * Slug: las-musas/footer
 * Categories: footer
 * Block Types: core/template-part/footer
 * Inserter: no
 *
 * Site title and copyright year. Presets only — no raw hex/px.
 */
?>
<!-- wp:group {"align":"full","className":"site-footer","style":{"spacing":{"padding":{"top":"var:preset|spacing|50","bottom":"var:preset|spacing|50"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull site-footer" style="padding-top:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--50)">
	<!-- wp:group {"align":"wide","layout":{"type":"flex","flexWrap":"wrap","justifyContent":"space-between","verticalAlignment":"center"}} -->
	<div class="wp-block-group alignwide">
		<!-- wp:site-title {"level":0} /-->

		<!-- wp:paragraph {"className":"site-footer__legal","fontSize":"small"} -->
		<p class="site-footer__legal has-small-font-size">© <?php echo esc_html( date_i18n( 'Y' ) ); ?> <?php echo esc_html( get_bloginfo( 'name' ) ); ?></p>
		<!-- /wp:paragraph -->
	</div>
	<!-- /wp:group -->
</div>
<!-- /wp:group -->
