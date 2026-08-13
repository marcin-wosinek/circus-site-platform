<?php
/**
 * Title: Pie de página
 * Slug: lamutable/footer
 * Categories: footer
 * Block Types: core/template-part/footer
 * Inserter: no
 *
 * Hallmark · component: footer (template part) · footer: Ft5 statement ·
 * genre: playful · theme: custom (design.md). Slab rule + statement sizing
 * live in style.css under `.site-footer`; nav voice comes from theme.json
 * (styles.blocks.core/navigation). Presets only — no raw hex/px here.
 */
?>
<!-- wp:group {"align":"full","className":"site-footer","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull site-footer">
	<!-- wp:group {"align":"wide","style":{"spacing":{"blockGap":"var:preset|spacing|lg"}},"layout":{"type":"default"}} -->
	<div class="wp-block-group alignwide">
		<!-- wp:paragraph {"className":"site-footer__statement"} -->
		<p class="site-footer__statement"><?php esc_html_e( 'Movimiento en común.', 'lamutable' ); ?></p>
		<!-- /wp:paragraph -->

		<!-- wp:group {"className":"site-footer__meta","layout":{"type":"flex","flexWrap":"wrap","justifyContent":"space-between","verticalAlignment":"center"}} -->
		<div class="wp-block-group site-footer__meta">
			<!-- wp:paragraph {"className":"site-footer__wordmark"} -->
			<p class="site-footer__wordmark"><?php esc_html_e( 'Asociación La Mutable', 'lamutable' ); ?></p>
			<!-- /wp:paragraph -->

			<!-- wp:navigation {"overlayMenu":"never","style":{"spacing":{"blockGap":"var:preset|spacing|lg"}},"layout":{"type":"flex","flexWrap":"wrap"}} -->
				<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Aviso legal', 'lamutable' ); ?>","url":"https://lamutable.es/aviso-legal/","kind":"custom"} /-->
				<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Política de privacidad', 'lamutable' ); ?>","url":"https://lamutable.es/politica-de-privacidad/","kind":"custom"} /-->
				<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Política de cookies', 'lamutable' ); ?>","url":"https://lamutable.es/politica-de-cookies/","kind":"custom"} /-->
				<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Términos y condiciones', 'lamutable' ); ?>","url":"<?php echo esc_url( home_url( '/terminos-y-condiciones/' ) ); ?>"} /-->
				<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Contacto', 'lamutable' ); ?>","url":"<?php echo esc_url( home_url( '/contacto/' ) ); ?>"} /-->
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
