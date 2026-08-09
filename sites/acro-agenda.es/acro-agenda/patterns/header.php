<?php
/**
 * Title: Cabecera
 * Slug: acro-agenda/header
 * Categories: header
 * Block Types: core/template-part/header
 * Description: Cabecera de tres secciones: marca a la izquierda, regiones al centro, «Publica tu evento» a la derecha.
 */
?>
<!-- wp:group {"tagName":"header","className":"aa-header","align":"full","backgroundColor":"base-2","style":{"spacing":{"padding":{"top":"var:preset|spacing|sm","bottom":"var:preset|spacing|sm","left":"var:preset|spacing|lg","right":"var:preset|spacing|lg"},"blockGap":"var:preset|spacing|md"}},"layout":{"type":"flex","flexWrap":"nowrap","justifyContent":"space-between","verticalAlignment":"center"}} -->
<header class="wp-block-group aa-header alignfull has-base-2-background-color has-background" style="padding-top:var(--wp--preset--spacing--sm);padding-right:var(--wp--preset--spacing--lg);padding-bottom:var(--wp--preset--spacing--sm);padding-left:var(--wp--preset--spacing--lg)">

	<!-- wp:paragraph {"className":"aa-wordmark","fontSize":"md","style":{"typography":{"fontWeight":"800","letterSpacing":"-0.025em"}}} -->
	<p class="aa-wordmark has-md-font-size" style="font-weight:800;letter-spacing:-0.025em"><a href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php echo esc_html( get_bloginfo( 'name' ) ); ?></a></p>
	<!-- /wp:paragraph -->

	<!-- wp:navigation {"overlayMenu":"mobile","overlayBackgroundColor":"base","overlayTextColor":"contrast","style":{"typography":{"fontWeight":"600"}},"layout":{"type":"flex","justifyContent":"center"}} -->
		<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Valencia', 'acro-agenda' ); ?>","url":"<?php echo esc_url( home_url( '/valencia/' ) ); ?>","kind":"custom"} /-->
		<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Festivales', 'acro-agenda' ); ?>","url":"<?php echo esc_url( home_url( '/festivales/' ) ); ?>","kind":"custom"} /-->
	<!-- /wp:navigation -->

	<!-- wp:buttons {"className":"aa-header-cta","style":{"spacing":{"blockGap":"0"}}} -->
	<div class="wp-block-buttons aa-header-cta">
		<!-- wp:button -->
		<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="<?php echo esc_url( home_url( '/publica-tu-evento/' ) ); ?>"><?php esc_html_e( 'Publica tu evento', 'acro-agenda' ); ?></a></div>
		<!-- /wp:button -->
	</div>
	<!-- /wp:buttons -->

</header>
<!-- /wp:group -->
