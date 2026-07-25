<?php
/**
 * Title: Cabecera
 * Slug: lamutable/header
 * Categories: header
 * Block Types: core/template-part/header
 * Inserter: no
 *
 * Hallmark · component: header · nav: N7 brutal slab (playful-rounded) ·
 * genre: playful · theme: custom (design.md). Slab rule + logo sizing live in
 * style.css under `.site-header`; typography voice in theme.json
 * (styles.blocks.core/navigation). Presets only — no raw hex/px here.
 */
?>
<!-- wp:group {"align":"full","className":"site-header","style":{"spacing":{"padding":{"top":"var:preset|spacing|md","bottom":"var:preset|spacing|md"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull site-header" style="padding-top:var(--wp--preset--spacing--md);padding-bottom:var(--wp--preset--spacing--md)">
	<!-- wp:group {"align":"wide","layout":{"type":"flex","flexWrap":"nowrap","justifyContent":"space-between","verticalAlignment":"center"}} -->
	<div class="wp-block-group alignwide">
		<!-- wp:image {"className":"site-logo","linkDestination":"custom"} -->
		<figure class="wp-block-image site-logo"><a href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/images/logo.png' ) ); ?>" alt="<?php esc_attr_e( 'La Mutable — inicio', 'lamutable' ); ?>"/></a></figure>
		<!-- /wp:image -->

		<!-- wp:group {"style":{"spacing":{"blockGap":"var:preset|spacing|lg"}},"layout":{"type":"flex","flexWrap":"nowrap","verticalAlignment":"center"}} -->
		<div class="wp-block-group">
			<!-- wp:navigation {"overlayMenu":"mobile","overlayBackgroundColor":"paper","overlayTextColor":"ink","style":{"spacing":{"blockGap":"var:preset|spacing|lg"}},"layout":{"type":"flex","flexWrap":"nowrap"}} -->
				<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Quiénes somos', 'lamutable' ); ?>","url":"<?php echo esc_url( home_url( '/quienes-somos/' ) ); ?>"} /-->
				<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Proyectos', 'lamutable' ); ?>","url":"<?php echo esc_url( home_url( '/proyectos/' ) ); ?>"} /-->
				<!-- wp:navigation-link {"label":"<?php esc_attr_e( 'Eventos', 'lamutable' ); ?>","url":"<?php echo esc_url( home_url( '/eventos/' ) ); ?>"} /-->
			<!-- /wp:navigation -->

			<!-- wp:buttons -->
			<div class="wp-block-buttons">
				<!-- wp:button {"className":"site-header__cta"} -->
				<div class="wp-block-button site-header__cta"><a class="wp-block-button__link wp-element-button" href="<?php echo esc_url( home_url( '/contacto/' ) ); ?>"><?php esc_html_e( 'Contacto', 'lamutable' ); ?></a></div>
				<!-- /wp:button -->
			</div>
			<!-- /wp:buttons -->
		</div>
		<!-- /wp:group -->
	</div>
	<!-- /wp:group -->
</div>
<!-- /wp:group -->
