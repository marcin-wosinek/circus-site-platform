<?php
/**
 * Title: Portada
 * Slug: lamutable/front-page
 * Categories: page
 * Inserter: no
 *
 * Hallmark · macrostructure: Ecosystem Index · genre: playful · theme: custom (design.md)
 * Color journey (design.md § Main region): hero-wash → paper-2 → accent-tint → ink → paper.
 * All copy sourced from the association's own pages (quienes-somos, eventos,
 * proyectos, colaboraciones) — nothing invented. Presets only — no raw hex/px.
 */
?>
<!-- wp:group {"align":"full","gradient":"hero-wash","style":{"spacing":{"padding":{"top":"var:preset|spacing|3xl","bottom":"var:preset|spacing|3xl"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull has-hero-wash-gradient-background has-background" style="padding-top:var(--wp--preset--spacing--3-xl);padding-bottom:var(--wp--preset--spacing--3-xl)">
	<!-- wp:heading {"level":1} -->
	<h1 class="wp-block-heading"><?php esc_html_e( 'Movimiento, circo y danza en Valencia', 'lamutable' ); ?></h1>
	<!-- /wp:heading -->

	<!-- wp:paragraph {"fontSize":"md"} -->
	<p class="has-md-font-size"><?php esc_html_e( 'La Mutable reúne a personas que organizan actividades de movimiento en Valencia —acroyoga, danza, circo, contact improvisation— para traer propuestas interesantes a la comunidad local, uniendo fuerzas y recursos entre clubes y colectivos.', 'lamutable' ); ?></p>
	<!-- /wp:paragraph -->

	<!-- wp:buttons {"style":{"spacing":{"blockGap":"var:preset|spacing|md","margin":{"top":"var:preset|spacing|xl"}}}} -->
	<div class="wp-block-buttons" style="margin-top:var(--wp--preset--spacing--xl)">
		<!-- wp:button -->
		<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="<?php echo esc_url( home_url( '/eventos/' ) ); ?>"><?php esc_html_e( 'Calendario', 'lamutable' ); ?></a></div>
		<!-- /wp:button -->

		<!-- wp:button {"className":"is-style-outline"} -->
		<div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button" href="<?php echo esc_url( home_url( '/quienes-somos/' ) ); ?>"><?php esc_html_e( 'Quiénes somos', 'lamutable' ); ?></a></div>
		<!-- /wp:button -->
	</div>
	<!-- /wp:buttons -->
</div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","backgroundColor":"paper-2","style":{"spacing":{"padding":{"top":"var:preset|spacing|3xl","bottom":"var:preset|spacing|3xl"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull has-paper-2-background-color has-background" style="padding-top:var(--wp--preset--spacing--3-xl);padding-bottom:var(--wp--preset--spacing--3-xl)">
	<!-- wp:group {"align":"wide","layout":{"type":"flex","flexWrap":"wrap","justifyContent":"space-between","verticalAlignment":"bottom"}} -->
	<div class="wp-block-group alignwide">
		<!-- wp:heading -->
		<h2 class="wp-block-heading"><?php esc_html_e( 'Próximos eventos', 'lamutable' ); ?></h2>
		<!-- /wp:heading -->

		<!-- wp:paragraph -->
		<p><a href="<?php echo esc_url( home_url( '/eventos/' ) ); ?>"><?php esc_html_e( 'Ver el calendario →', 'lamutable' ); ?></a></p>
		<!-- /wp:paragraph -->
	</div>
	<!-- /wp:group -->

	<!-- wp:group {"align":"wide","className":"event-rail","style":{"spacing":{"blockGap":"0","margin":{"top":"var:preset|spacing|lg"}}},"layout":{"type":"default"}} -->
	<div class="wp-block-group alignwide event-rail" style="margin-top:var(--wp--preset--spacing--lg)">
		<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|md","bottom":"var:preset|spacing|md"}}},"layout":{"type":"flex","flexWrap":"wrap","justifyContent":"space-between"}} -->
		<div class="wp-block-group" style="padding-top:var(--wp--preset--spacing--md);padding-bottom:var(--wp--preset--spacing--md)">
			<!-- wp:paragraph {"fontSize":"md","fontFamily":"display","style":{"typography":{"fontWeight":"600"}}} -->
			<p class="has-display-font-family has-md-font-size" style="font-weight:600"><a href="<?php echo esc_url( home_url( '/dance-connection/' ) ); ?>"><?php esc_html_e( 'Ciclo de Dance Connection', 'lamutable' ); ?></a></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:group -->

		<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|md","bottom":"var:preset|spacing|md"}}},"layout":{"type":"flex","flexWrap":"wrap","justifyContent":"space-between"}} -->
		<div class="wp-block-group" style="padding-top:var(--wp--preset--spacing--md);padding-bottom:var(--wp--preset--spacing--md)">
			<!-- wp:paragraph {"fontSize":"md","fontFamily":"display","style":{"typography":{"fontWeight":"600"}}} -->
			<p class="has-display-font-family has-md-font-size" style="font-weight:600"><a href="<?php echo esc_url( home_url( '/eventos/ciclo-de-iniciacion-a-contact-improvisation/' ) ); ?>"><?php esc_html_e( 'Ciclo de iniciación a Contact improvisation', 'lamutable' ); ?></a></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:group -->

		<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|md","bottom":"var:preset|spacing|md"}}},"layout":{"type":"flex","flexWrap":"wrap","justifyContent":"space-between"}} -->
		<div class="wp-block-group" style="padding-top:var(--wp--preset--spacing--md);padding-bottom:var(--wp--preset--spacing--md)">
			<!-- wp:paragraph {"fontSize":"md","fontFamily":"display","style":{"typography":{"fontWeight":"600"}}} -->
			<p class="has-display-font-family has-md-font-size" style="font-weight:600"><a href="https://acroyoga-club.es/club/ciclo-de-perfeccionamiento/"><?php esc_html_e( 'Acroyoga: Ciclo de perfeccionamiento', 'lamutable' ); ?></a></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:group -->

		<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|md","bottom":"var:preset|spacing|md"}}},"layout":{"type":"flex","flexWrap":"wrap","justifyContent":"space-between"}} -->
		<div class="wp-block-group" style="padding-top:var(--wp--preset--spacing--md);padding-bottom:var(--wp--preset--spacing--md)">
			<!-- wp:paragraph {"fontSize":"md","fontFamily":"display","style":{"typography":{"fontWeight":"600"}}} -->
			<p class="has-display-font-family has-md-font-size" style="font-weight:600"><a href="https://acroyoga-club.es/club/entrenamiento-gratis-al-aire-libre/"><?php esc_html_e( 'Acroyoga: Entrenamiento gratis, al aire libre', 'lamutable' ); ?></a></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:group -->

		<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|md","bottom":"var:preset|spacing|md"}}},"layout":{"type":"flex","flexWrap":"wrap","justifyContent":"space-between"}} -->
		<div class="wp-block-group" style="padding-top:var(--wp--preset--spacing--md);padding-bottom:var(--wp--preset--spacing--md)">
			<!-- wp:paragraph {"fontSize":"md","fontFamily":"display","style":{"typography":{"fontWeight":"600"}}} -->
			<p class="has-display-font-family has-md-font-size" style="font-weight:600"><a href="https://fusion-circus.com/valencia/halloween-fusion-valencia-2026/"><?php esc_html_e( 'Halloween Fusion Valencia', 'lamutable' ); ?></a></p>
			<!-- /wp:paragraph -->

			<!-- wp:paragraph {"fontSize":"sm","textColor":"muted"} -->
			<p class="has-muted-color has-text-color has-sm-font-size"><?php esc_html_e( '6–8 de noviembre', 'lamutable' ); ?></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:group -->
	</div>
	<!-- /wp:group -->
</div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","backgroundColor":"accent-tint","style":{"spacing":{"padding":{"top":"var:preset|spacing|3xl","bottom":"var:preset|spacing|3xl"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull has-accent-tint-background-color has-background" style="padding-top:var(--wp--preset--spacing--3-xl);padding-bottom:var(--wp--preset--spacing--3-xl)">
	<!-- wp:group {"align":"wide","layout":{"type":"flex","flexWrap":"wrap","justifyContent":"space-between","verticalAlignment":"bottom"}} -->
	<div class="wp-block-group alignwide">
		<!-- wp:heading -->
		<h2 class="wp-block-heading"><?php esc_html_e( 'Proyectos', 'lamutable' ); ?></h2>
		<!-- /wp:heading -->

		<!-- wp:paragraph -->
		<p><a href="<?php echo esc_url( home_url( '/proyectos/' ) ); ?>"><?php esc_html_e( 'Todos los proyectos →', 'lamutable' ); ?></a></p>
		<!-- /wp:paragraph -->
	</div>
	<!-- /wp:group -->

	<!-- wp:group {"align":"wide","style":{"spacing":{"blockGap":"var:preset|spacing|lg","margin":{"top":"var:preset|spacing|lg"}}},"layout":{"type":"grid","minimumColumnWidth":"18rem"}} -->
	<div class="wp-block-group alignwide" style="margin-top:var(--wp--preset--spacing--lg)">
		<!-- wp:group {"className":"project-card","backgroundColor":"paper","style":{"spacing":{"padding":{"top":"var:preset|spacing|lg","bottom":"var:preset|spacing|lg","left":"var:preset|spacing|lg","right":"var:preset|spacing|lg"},"blockGap":"var:preset|spacing|sm"}},"layout":{"type":"default"}} -->
		<div class="wp-block-group project-card has-paper-background-color has-background" style="padding-top:var(--wp--preset--spacing--lg);padding-right:var(--wp--preset--spacing--lg);padding-bottom:var(--wp--preset--spacing--lg);padding-left:var(--wp--preset--spacing--lg)">
			<!-- wp:heading {"level":3,"fontSize":"lg"} -->
			<h3 class="wp-block-heading has-lg-font-size"><a href="<?php echo esc_url( home_url( '/proyectos/acroyoga-club/' ) ); ?>"><?php esc_html_e( 'Acroyoga Club', 'lamutable' ); ?></a></h3>
			<!-- /wp:heading -->

			<!-- wp:paragraph {"fontSize":"sm"} -->
			<p class="has-sm-font-size"><?php esc_html_e( 'Club autogestionado de acroyoga — entrenamientos cada miércoles desde octubre de 2022.', 'lamutable' ); ?></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:group -->

		<!-- wp:group {"className":"project-card","backgroundColor":"paper","style":{"spacing":{"padding":{"top":"var:preset|spacing|lg","bottom":"var:preset|spacing|lg","left":"var:preset|spacing|lg","right":"var:preset|spacing|lg"},"blockGap":"var:preset|spacing|sm"}},"layout":{"type":"default"}} -->
		<div class="wp-block-group project-card has-paper-background-color has-background" style="padding-top:var(--wp--preset--spacing--lg);padding-right:var(--wp--preset--spacing--lg);padding-bottom:var(--wp--preset--spacing--lg);padding-left:var(--wp--preset--spacing--lg)">
			<!-- wp:heading {"level":3,"fontSize":"lg"} -->
			<h3 class="wp-block-heading has-lg-font-size"><a href="<?php echo esc_url( home_url( '/proyectos/fusion-circus-espana/' ) ); ?>"><?php esc_html_e( 'Fusion Circus España', 'lamutable' ); ?></a></h3>
			<!-- /wp:heading -->

			<!-- wp:paragraph {"fontSize":"sm"} -->
			<p class="has-sm-font-size"><?php esc_html_e( 'Actividades de danza fusión en Valencia.', 'lamutable' ); ?></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:group -->

		<!-- wp:group {"className":"project-card","backgroundColor":"paper","style":{"spacing":{"padding":{"top":"var:preset|spacing|lg","bottom":"var:preset|spacing|lg","left":"var:preset|spacing|lg","right":"var:preset|spacing|lg"},"blockGap":"var:preset|spacing|sm"}},"layout":{"type":"default"}} -->
		<div class="wp-block-group project-card has-paper-background-color has-background" style="padding-top:var(--wp--preset--spacing--lg);padding-right:var(--wp--preset--spacing--lg);padding-bottom:var(--wp--preset--spacing--lg);padding-left:var(--wp--preset--spacing--lg)">
			<!-- wp:heading {"level":3,"fontSize":"lg"} -->
			<h3 class="wp-block-heading has-lg-font-size"><a href="<?php echo esc_url( home_url( '/proyectos/life-in-motion/' ) ); ?>"><?php esc_html_e( 'Life In Motion', 'lamutable' ); ?></a></h3>
			<!-- /wp:heading -->

			<!-- wp:paragraph {"fontSize":"sm"} -->
			<p class="has-sm-font-size"><?php esc_html_e( 'Grupo de Meetup para conocer gente haciendo actividades físicas y divertidas.', 'lamutable' ); ?></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:group -->

		<!-- wp:group {"className":"project-card","backgroundColor":"paper","style":{"spacing":{"padding":{"top":"var:preset|spacing|lg","bottom":"var:preset|spacing|lg","left":"var:preset|spacing|lg","right":"var:preset|spacing|lg"},"blockGap":"var:preset|spacing|sm"}},"layout":{"type":"default"}} -->
		<div class="wp-block-group project-card has-paper-background-color has-background" style="padding-top:var(--wp--preset--spacing--lg);padding-right:var(--wp--preset--spacing--lg);padding-bottom:var(--wp--preset--spacing--lg);padding-left:var(--wp--preset--spacing--lg)">
			<!-- wp:heading {"level":3,"fontSize":"lg"} -->
			<h3 class="wp-block-heading has-lg-font-size"><a href="<?php echo esc_url( home_url( '/proyectos/idiolect/' ) ); ?>"><?php esc_html_e( 'Idiolect', 'lamutable' ); ?></a></h3>
			<!-- /wp:heading -->

			<!-- wp:paragraph {"fontSize":"sm"} -->
			<p class="has-sm-font-size"><a href="https://idiolect.es/">idiolect.es →</a></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:group -->
	</div>
	<!-- /wp:group -->
</div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","className":"band-ink","backgroundColor":"ink","textColor":"paper","style":{"elements":{"link":{"color":{"text":"var:preset|color|paper"}}},"spacing":{"padding":{"top":"var:preset|spacing|3xl","bottom":"var:preset|spacing|3xl"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull band-ink has-ink-background-color has-paper-color has-text-color has-background has-link-color" style="padding-top:var(--wp--preset--spacing--3-xl);padding-bottom:var(--wp--preset--spacing--3-xl)">
	<!-- wp:heading {"textColor":"paper"} -->
	<h2 class="wp-block-heading has-paper-color has-text-color"><?php esc_html_e( 'Una red de apoyo mutuo', 'lamutable' ); ?></h2>
	<!-- /wp:heading -->

	<!-- wp:paragraph {"fontSize":"md"} -->
	<p class="has-md-font-size"><?php esc_html_e( 'Compartimos recursos, conocimiento y respaldo para que cada proyecto pueda centrarse en lo que mejor sabe hacer. Estamos abiertos a ampliar la red e incluir más gente en la cooperación.', 'lamutable' ); ?></p>
	<!-- /wp:paragraph -->

	<!-- wp:group {"style":{"spacing":{"blockGap":"var:preset|spacing|lg","margin":{"top":"var:preset|spacing|xl"}}},"layout":{"type":"flex","flexWrap":"wrap","verticalAlignment":"center"}} -->
	<div class="wp-block-group" style="margin-top:var(--wp--preset--spacing--xl)">
		<!-- wp:buttons -->
		<div class="wp-block-buttons">
			<!-- wp:button -->
			<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="<?php echo esc_url( home_url( '/contacto/' ) ); ?>"><?php esc_html_e( 'Contacto', 'lamutable' ); ?></a></div>
			<!-- /wp:button -->
		</div>
		<!-- /wp:buttons -->

		<!-- wp:paragraph -->
		<p><a href="<?php echo esc_url( home_url( '/colaboraciones/' ) ); ?>"><?php esc_html_e( 'Colaboraciones →', 'lamutable' ); ?></a></p>
		<!-- /wp:paragraph -->
	</div>
	<!-- /wp:group -->
</div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","backgroundColor":"paper","style":{"spacing":{"padding":{"top":"var:preset|spacing|3xl","bottom":"var:preset|spacing|3xl"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull has-paper-background-color has-background" style="padding-top:var(--wp--preset--spacing--3-xl);padding-bottom:var(--wp--preset--spacing--3-xl)">
	<!-- wp:heading -->
	<h2 class="wp-block-heading"><?php esc_html_e( 'Quiénes somos', 'lamutable' ); ?></h2>
	<!-- /wp:heading -->

	<!-- wp:paragraph {"fontSize":"md"} -->
	<p class="has-md-font-size"><?php esc_html_e( 'La Mutable es una asociación sin ánimo de lucro nacida en Valencia para sostener algo sencillo pero difícil de conseguir en solitario: que las actividades de movimiento, bienestar y cultura sean accesibles para quien participa y sostenibles para quien las organiza.', 'lamutable' ); ?></p>
	<!-- /wp:paragraph -->

	<!-- wp:paragraph -->
	<p><a href="<?php echo esc_url( home_url( '/quienes-somos/' ) ); ?>"><?php esc_html_e( 'Conoce la asociación →', 'lamutable' ); ?></a></p>
	<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
