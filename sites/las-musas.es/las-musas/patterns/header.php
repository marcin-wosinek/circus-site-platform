<?php
/**
 * Title: Cabecera
 * Slug: las-musas/header
 * Categories: header
 * Block Types: core/template-part/header
 * Inserter: no
 *
 * Site title plus the site's navigation menu. Presets only — no raw hex/px.
 */
?>
<!-- wp:group {"align":"full","className":"site-header","style":{"spacing":{"padding":{"top":"var:preset|spacing|30","bottom":"var:preset|spacing|30"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull site-header" style="padding-top:var(--wp--preset--spacing--30);padding-bottom:var(--wp--preset--spacing--30)">
	<!-- wp:group {"align":"wide","layout":{"type":"flex","flexWrap":"nowrap","justifyContent":"space-between","verticalAlignment":"center"}} -->
	<div class="wp-block-group alignwide">
		<!-- wp:site-title {"level":0} /-->

		<!-- wp:navigation {"overlayMenu":"mobile","layout":{"type":"flex","flexWrap":"nowrap"}} /-->
	</div>
	<!-- /wp:group -->
</div>
<!-- /wp:group -->
