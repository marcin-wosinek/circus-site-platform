<?php
/**
 * Title: Header
 * Slug: fusion-circus/header
 * Categories: header
 * Block Types: core/template-part/header
 * Description: Site header — round badge splitting the nav row over the flood gradient band.
 */
?>
<!-- wp:group {"align":"full","gradient":"flood","className":"fc-header","style":{"spacing":{"padding":{"top":"var:preset|spacing|xs","bottom":"var:preset|spacing|xs","left":"var:preset|spacing|md","right":"var:preset|spacing|md"},"blockGap":"var:preset|spacing|lg"}},"layout":{"type":"flex","flexWrap":"wrap","justifyContent":"center","verticalAlignment":"center"}} -->
<div class="wp-block-group alignfull fc-header has-flood-gradient-background has-background" style="padding-top:var(--wp--preset--spacing--xs);padding-right:var(--wp--preset--spacing--md);padding-bottom:var(--wp--preset--spacing--xs);padding-left:var(--wp--preset--spacing--md)">

	<!-- wp:navigation {"overlayMenu":"never","textColor":"accent-ink","fontFamily":"body","fontSize":"md","className":"fc-header__nav fc-header__nav--left","ariaLabel":"<?php esc_attr_e( 'Primary', 'fusion-circus' ); ?>","style":{"spacing":{"blockGap":"var:preset|spacing|sm"}},"layout":{"type":"flex","justifyContent":"right","flexWrap":"wrap"}} -->
		<!-- wp:navigation-link {"label":"<?php esc_html_e( 'Home', 'fusion-circus' ); ?>","url":"<?php echo esc_url( home_url( '/' ) ); ?>"} /-->
		<!-- wp:navigation-link {"label":"<?php esc_html_e( 'Events', 'fusion-circus' ); ?>","url":"<?php echo esc_url( home_url( '/events/' ) ); ?>"} /-->
		<!-- wp:navigation-link {"label":"<?php esc_html_e( 'Blog', 'fusion-circus' ); ?>","url":"<?php echo esc_url( home_url( '/blog/' ) ); ?>"} /-->
	<!-- /wp:navigation -->

	<!-- wp:image {"sizeSlug":"full","linkDestination":"custom","className":"fc-header__badge"} -->
	<figure class="wp-block-image size-full fc-header__badge"><a href="<?php echo esc_url( home_url( '/' ) ); ?>"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/images/fusion-circus-badge-inverse.png' ) ); ?>" alt="<?php esc_attr_e( 'Fusion Circus', 'fusion-circus' ); ?>"/></a></figure>
	<!-- /wp:image -->

	<!-- wp:navigation {"overlayMenu":"never","textColor":"accent-ink","fontFamily":"body","fontSize":"md","className":"fc-header__nav fc-header__nav--right","ariaLabel":"<?php esc_attr_e( 'Secondary', 'fusion-circus' ); ?>","style":{"spacing":{"blockGap":"var:preset|spacing|sm"}},"layout":{"type":"flex","justifyContent":"left","flexWrap":"wrap"}} -->
		<!-- wp:navigation-link {"label":"<?php esc_html_e( 'Collaborations', 'fusion-circus' ); ?>","url":"<?php echo esc_url( home_url( '/collaborations/' ) ); ?>"} /-->
	<!-- /wp:navigation -->

</div>
<!-- /wp:group -->
