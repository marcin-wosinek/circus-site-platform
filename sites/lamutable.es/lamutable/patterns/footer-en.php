<?php
/**
 * Title: Footer (English)
 * Slug: lamutable/footer-en
 * Categories: footer
 * Block Types: core/template-part/footer
 * Inserter: no
 *
 * English counterpart to lamutable/footer. Shared layout and styling live in
 * the site-footer classes and the theme design tokens.
 */
?>
<!-- wp:group {"align":"full","className":"site-footer","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull site-footer">
	<!-- wp:group {"align":"wide","style":{"spacing":{"blockGap":"var:preset|spacing|lg"}},"layout":{"type":"default"}} -->
	<div class="wp-block-group alignwide">
		<!-- wp:paragraph {"className":"site-footer__statement"} -->
		<p class="site-footer__statement"><?php esc_html_e( 'Movement in common.', 'lamutable' ); ?></p>
		<!-- /wp:paragraph -->

		<!-- wp:group {"className":"site-footer__meta","layout":{"type":"flex","flexWrap":"wrap","justifyContent":"space-between","verticalAlignment":"center"}} -->
		<div class="wp-block-group site-footer__meta">
			<!-- wp:paragraph {"className":"site-footer__wordmark"} -->
			<p class="site-footer__wordmark"><?php esc_html_e( 'Asociación La Mutable', 'lamutable' ); ?></p>
			<!-- /wp:paragraph -->

			<!-- wp:navigation {"overlayMenu":"never","style":{"spacing":{"blockGap":"var:preset|spacing|lg"}},"layout":{"type":"flex","flexWrap":"wrap"}} -->
				<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Privacy policy', 'lamutable' ); ?>","url":"<?php echo esc_url( home_url( '/en/privacy-policy/' ) ); ?>"} /-->
				<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Legal notice', 'lamutable' ); ?>","url":"<?php echo esc_url( home_url( '/en/legal-notice/' ) ); ?>"} /-->
				<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Terms and conditions', 'lamutable' ); ?>","url":"<?php echo esc_url( home_url( '/en/terms-and-conditions/' ) ); ?>"} /-->
				<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Cookies policy', 'lamutable' ); ?>","url":"<?php echo esc_url( home_url( '/en/cookies-policy/' ) ); ?>"} /-->
				<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Contact', 'lamutable' ); ?>","url":"<?php echo esc_url( home_url( '/en/contact/' ) ); ?>"} /-->
			<!-- /wp:navigation -->
		</div>
		<!-- /wp:group -->

		<!-- wp:paragraph {"className":"site-footer__legal","fontSize":"xs","textColor":"muted"} -->
		<p class="site-footer__legal has-muted-color has-text-color has-xs-font-size">© <?php echo esc_html( date_i18n( 'Y' ) ); ?> <?php esc_html_e( 'Asociación La Mutable · Valencia', 'lamutable' ); ?></p>
		<!-- /wp:paragraph -->
	</div>
	<!-- /wp:group -->
</div>
<!-- /wp:group -->
