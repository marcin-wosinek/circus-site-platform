<?php
/** Upcoming card presentation; event selection remains owned by Fair Events. */
defined( 'ABSPATH' ) || exit;

if ( ! class_exists( '\FairEvents\Services\EventFeedProvider' ) ) {
	return;
}
$post_id = (int) ( $block->context['postId'] ?? get_the_ID() );
// Resolve once per request, using the same upcoming/series rules as Events List.
static $upcoming_cards = null;
if ( null === $upcoming_cards ) {
	$now = current_time( 'mysql' );
	$rows = ( new \FairEvents\Services\EventFeedProvider() )->get_occurrences( $now, null );
	$rows = \FairEvents\Helpers\EventsListSeries::upcoming( $rows, $now );
	$upcoming_cards = array();
	foreach ( $rows as $row ) {
		$id = (int) ( $row['event_id'] ?? 0 );
		if ( $id && ! isset( $upcoming_cards[ $id ] ) ) {
			$upcoming_cards[ $id ] = $row;
		}
	}
}
$event = $upcoming_cards[ $post_id ] ?? null;
if ( ! $event ) {
	return;
}
// Older Fair Events releases expose site-local start/end strings without
// the canonical timing array. Keep cards compatible with those DTOs too.
$timing = $event['timing'] ?? array(
	'start_date' => ! empty( $event['start'] ) ? substr( $event['start'], 0, 10 ) : null,
	'start_time' => ! empty( $event['start'] ) ? substr( $event['start'], 11, 8 ) : null,
	'end_date'   => ! empty( $event['end'] ) ? substr( $event['end'], 0, 10 ) : null,
	'end_time'   => ! empty( $event['end'] ) ? substr( $event['end'], 11, 8 ) : null,
);
$stamp = ! empty( $timing['start_date'] ) ? strtotime( $timing['start_date'] . ' 12:00:00 UTC' ) : false;
$time = '';
if ( ! empty( $event['all_day'] ) ) {
	$time = __( 'All day', 'fusion-circus' );
} else {
	foreach ( array( 'start_time', 'end_time' ) as $key ) {
		if ( ! empty( $timing[ $key ] ) ) {
			$time .= ( $time ? ' – ' : ( 'end_time' === $key ? __( 'Ends ', 'fusion-circus' ) : '' ) ) . substr( $timing[ $key ], 0, 5 );
		}
	}
}
$location = $event['location'] ?? array();
$location_text = is_array( $location ) ? implode( ', ', array_filter( array( $location['name'] ?? '', $location['address'] ?? '' ) ) ) : (string) $location;
if ( ! $location_text && is_array( $location ) && 'online' === ( $location['mode'] ?? '' ) ) {
	$location_text = __( 'Online', 'fusion-circus' );
}
$url = get_permalink( $post_id );
$image = get_the_post_thumbnail( $post_id, 'large', array( 'class' => 'fc-event-card__image' ) );
// Existing Brussels entries keep their artwork in the event body. Prefer a
// featured image, then reuse the first content image without changing the post.
if ( ! $image ) {
	$tags = new WP_HTML_Tag_Processor( get_post_field( 'post_content', $post_id ) );
	if ( $tags->next_tag( 'IMG' ) ) {
		$src = $tags->get_attribute( 'src' );
		if ( is_string( $src ) && $src ) {
			$image = '<img class="fc-event-card__image" src="' . esc_url( $src ) . '" alt="' . esc_attr( (string) $tags->get_attribute( 'alt' ) ) . '" loading="lazy" decoding="async">';
		}
	}
}
?>
<article class="fc-event-card">
	<div class="fc-event-card__media">
		<?php echo $image; // WordPress attachment HTML or escaped content-image attributes. ?>
		<?php if ( $stamp ) : ?>
		<time class="fc-event-card__badge" datetime="<?php echo esc_attr( $timing['start_date'] ); ?>" aria-label="<?php echo esc_attr( wp_date( 'j F Y', $stamp, new DateTimeZone( 'UTC' ) ) ); ?>">
			<strong><?php echo esc_html( wp_date( 'd', $stamp, new DateTimeZone( 'UTC' ) ) ); ?></strong>
			<span><?php echo esc_html( wp_date( 'M', $stamp, new DateTimeZone( 'UTC' ) ) ); ?></span>
		</time>
		<?php endif; ?>
	</div>
	<div class="fc-event-card__body">
		<h3><?php echo esc_html( get_the_title( $post_id ) ); ?></h3>
		<?php if ( $time ) : ?><p>◷　<?php echo esc_html( $time ); ?></p><?php endif; ?>
		<?php if ( $location_text ) : ?><p>⌖　<?php echo esc_html( $location_text ); ?></p><?php endif; ?>
		<a class="fc-event-card__register" href="<?php echo esc_url( $url ); ?>" aria-label="<?php echo esc_attr( sprintf( __( 'Register for %s', 'fusion-circus' ), get_the_title( $post_id ) ) ); ?>"><?php esc_html_e( 'Register →', 'fusion-circus' ); ?></a>
	</div>
</article>
