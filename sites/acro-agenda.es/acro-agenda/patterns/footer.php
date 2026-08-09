<?php
/**
 * Title: Pie de página
 * Slug: acro-agenda/footer
 * Categories: footer
 * Block Types: core/template-part/footer
 * Description: Pie con frase de cierre, menú de navegación y crédito.
 */
?>
<!-- wp:group {"tagName":"footer","className":"aa-footer","align":"full","backgroundColor":"base-2","style":{"spacing":{"padding":{"top":"var:preset|spacing|2xl","bottom":"var:preset|spacing|xl","left":"var:preset|spacing|lg","right":"var:preset|spacing|lg"},"blockGap":"var:preset|spacing|xl"}},"layout":{"type":"default"}} -->
<footer class="wp-block-group aa-footer alignfull has-base-2-background-color has-background" style="padding-top:var(--wp--preset--spacing--2-xl);padding-right:var(--wp--preset--spacing--lg);padding-bottom:var(--wp--preset--spacing--xl);padding-left:var(--wp--preset--spacing--lg)">

	<!-- wp:paragraph {"className":"aa-footer-line","fontSize":"2xl","style":{"typography":{"fontWeight":"700","letterSpacing":"-0.025em","lineHeight":"1.1"}}} -->
	<p class="aa-footer-line has-2-xl-font-size" style="font-weight:700;letter-spacing:-0.025em;line-height:1.1"><?php esc_html_e( 'Nos vemos volando.', 'acro-agenda' ); ?></p>
	<!-- /wp:paragraph -->

	<!-- wp:group {"className":"aa-footer-meta","style":{"spacing":{"blockGap":"var:preset|spacing|md"}},"layout":{"type":"flex","flexWrap":"wrap","justifyContent":"space-between","verticalAlignment":"center"}} -->
	<div class="wp-block-group aa-footer-meta">

		<!-- wp:navigation {"overlayMenu":"never","ariaLabel":"<?php esc_attr_e( 'footer menu', 'acro-agenda' ); ?>","className":"aa-footer-nav","style":{"spacing":{"blockGap":"var:preset|spacing|2xs"}},"layout":{"type":"flex","flexWrap":"wrap"}} -->
		<nav class="wp-block-navigation aa-footer-nav" aria-label="<?php esc_attr_e( 'footer menu', 'acro-agenda' ); ?>">
			<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Valencia', 'acro-agenda' ); ?>","url":"<?php echo esc_url( home_url( '/valencia/' ) ); ?>","kind":"custom"} /-->
			<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Publica tu evento', 'acro-agenda' ); ?>","url":"<?php echo esc_url( home_url( '/publica-tu-evento/' ) ); ?>","kind":"custom"} /-->
			<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'API', 'acro-agenda' ); ?>","url":"<?php echo esc_url( home_url( '/api/' ) ); ?>","kind":"custom"} /-->
			<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Aviso Legal', 'acro-agenda' ); ?>","url":"<?php echo esc_url( home_url( '/aviso-legal/' ) ); ?>","kind":"custom"} /-->
			<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Política de Privacidad', 'acro-agenda' ); ?>","url":"<?php echo esc_url( home_url( '/politica-de-privacidad/' ) ); ?>","kind":"custom"} /-->
			<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Política de Cookies', 'acro-agenda' ); ?>","url":"<?php echo esc_url( home_url( '/politica-de-cookies/' ) ); ?>","kind":"custom"} /-->
		</nav>
		<!-- /wp:navigation -->

		<!-- wp:paragraph {"className":"aa-footer-copy","fontSize":"sm"} -->
		<p class="aa-footer-copy has-sm-font-size">© <?php echo esc_html( gmdate( 'Y' ) ); ?> <a href="<?php echo esc_url( 'https://lamutable.es/' ); ?>"><?php esc_html_e( 'Asociacion La Mutable', 'acro-agenda' ); ?></a></p>
		<!-- /wp:paragraph -->

	</div>
	<!-- /wp:group -->

</footer>
<!-- /wp:group -->
