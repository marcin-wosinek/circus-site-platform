<?php
/**
 * Title: Header (English)
 * Slug: lamutable/header-en
 * Categories: header
 * Block Types: core/template-part/header
 * Inserter: no
 *
 * English counterpart to lamutable/header. Shared layout and styling live in
 * the site-header classes and the theme design tokens.
 */
?>
<!-- wp:group {"align":"full","className":"site-header","style":{"spacing":{"padding":{"top":"var:preset|spacing|md","bottom":"var:preset|spacing|md"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull site-header" style="padding-top:var(--wp--preset--spacing--md);padding-bottom:var(--wp--preset--spacing--md)">
	<!-- wp:group {"align":"wide","layout":{"type":"flex","flexWrap":"nowrap","justifyContent":"space-between","verticalAlignment":"center"}} -->
	<div class="wp-block-group alignwide">
		<!-- wp:image {"className":"site-logo","linkDestination":"custom"} -->
		<figure class="wp-block-image site-logo"><a href="<?php echo esc_url( home_url( '/en/' ) ); ?>" rel="home"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/images/logo.png' ) ); ?>" alt="<?php esc_attr_e( 'La Mutable — home', 'lamutable' ); ?>"/></a></figure>
		<!-- /wp:image -->

		<!-- wp:group {"style":{"spacing":{"blockGap":"var:preset|spacing|lg"}},"layout":{"type":"flex","flexWrap":"nowrap","verticalAlignment":"center"}} -->
		<div class="wp-block-group">
			<!-- wp:navigation {"overlayMenu":"mobile","overlayBackgroundColor":"paper","overlayTextColor":"ink","style":{"spacing":{"blockGap":"var:preset|spacing|lg"}},"layout":{"type":"flex","flexWrap":"nowrap"}} -->
				<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'About us', 'lamutable' ); ?>","url":"<?php echo esc_url( home_url( '/en/about-us/' ) ); ?>"} /-->
				<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Projects', 'lamutable' ); ?>","url":"<?php echo esc_url( home_url( '/en/projects/' ) ); ?>"} /-->
				<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Events', 'lamutable' ); ?>","url":"<?php echo esc_url( home_url( '/en/events/' ) ); ?>"} /-->
			<!-- /wp:navigation -->

			<!-- wp:buttons -->
			<div class="wp-block-buttons">
				<!-- wp:button {"className":"site-header__cta"} -->
				<div class="wp-block-button site-header__cta"><a class="wp-block-button__link wp-element-button" href="<?php echo esc_url( home_url( '/en/contact/' ) ); ?>"><?php esc_html_e( 'Contact', 'lamutable' ); ?></a></div>
				<!-- /wp:button -->
			</div>
			<!-- /wp:buttons -->
		</div>
		<!-- /wp:group -->
	</div>
	<!-- /wp:group -->
</div>
<!-- /wp:group -->
