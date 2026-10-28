<?php
/**
 * Title: Footer
 * Slug: fusion-circus/footer
 * Categories: footer
 * Block Types: core/template-part/footer
 * Description: Site footer — policy links and copyright over the flood gradient band.
 */
?>
<!-- wp:group {"align":"full","gradient":"flood","className":"fc-footer","style":{"spacing":{"padding":{"top":"var:preset|spacing|md","bottom":"var:preset|spacing|md","left":"var:preset|spacing|md","right":"var:preset|spacing|md"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull fc-footer has-flood-gradient-background has-background" style="padding-top:var(--wp--preset--spacing--md);padding-right:var(--wp--preset--spacing--md);padding-bottom:var(--wp--preset--spacing--md);padding-left:var(--wp--preset--spacing--md)">
	<!-- wp:navigation {"overlayMenu":"never","textColor":"accent-ink","fontFamily":"body","fontSize":"sm","className":"fc-footer__nav","ariaLabel":"<?php esc_attr_e( 'Policies', 'fusion-circus' ); ?>","style":{"spacing":{"blockGap":"var:preset|spacing|sm"}},"layout":{"type":"flex","justifyContent":"center","flexWrap":"wrap"}} -->
		<!-- wp:navigation-link {"label":"<?php esc_html_e( 'Code of Conduct', 'fusion-circus' ); ?>","url":"<?php echo esc_url( home_url( '/code-of-conduct/' ) ); ?>"} /-->
		<!-- wp:navigation-link {"label":"<?php esc_html_e( 'Terms and Conditions', 'fusion-circus' ); ?>","url":"<?php echo esc_url( home_url( '/terms-and-conditions/' ) ); ?>"} /-->
	<!-- /wp:navigation -->

	<!-- wp:paragraph {"align":"center","textColor":"accent-ink","fontFamily":"body","fontSize":"sm"} -->
	<p class="has-text-align-center has-accent-ink-color has-text-color has-body-font-family has-sm-font-size">&copy; <?php echo esc_html( date_i18n( 'Y' ) ); ?> <?php echo esc_html( get_bloginfo( 'name', 'display' ) ); ?></p>
	<!-- /wp:paragraph -->

</div>
<!-- /wp:group -->
