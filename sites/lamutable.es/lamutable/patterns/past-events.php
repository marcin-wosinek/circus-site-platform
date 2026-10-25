<?php
/**
 * Title: Past events grid
 * Slug: lamutable/past-events
 * Categories: lamutable
 * Inserter: no
 *
 * Display layout for the fair-events/events-list block. The block supplies the
 * past-event filter, ordering, and Polylang language; this pattern only lays
 * out the cards. Events without a featured image fall back to their first
 * content image (functions.php).
 */
?>
<!-- wp:query {"query":{"perPage":6,"pages":0,"offset":0,"postType":"fair_event","order":"desc","orderBy":"date","author":"","search":"","exclude":[],"sticky":"","inherit":false},"className":"past-events"} -->
<div class="wp-block-query past-events">
	<!-- wp:post-template {"style":{"spacing":{"blockGap":"var:preset|spacing|lg"}},"layout":{"type":"grid","minimumColumnWidth":"16rem"}} -->
		<!-- wp:post-featured-image {"isLink":true,"aspectRatio":"16/9","className":"past-events__image"} /-->

		<!-- wp:post-title {"level":3,"isLink":true,"className":"past-events__title","style":{"spacing":{"margin":{"top":"var:preset|spacing|md","bottom":"0"}}},"fontSize":"md"} /-->

		<!-- wp:fair-events/event-dates {"className":"past-events__date"} /-->
	<!-- /wp:post-template -->
</div>
<!-- /wp:query -->
