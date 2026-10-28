<?php
/**
 * Title: Frequently asked questions
 * Slug: fusion-circus/faq
 * Categories: text
 * Keywords: FAQ, questions, answers, accordion
 * Description: An editable FAQ section with three separate accordion items. Duplicate an Accordion Item to add a question.
 */
?>

<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|lg","bottom":"var:preset|spacing|lg"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group" style="padding-top:var(--wp--preset--spacing--lg);padding-bottom:var(--wp--preset--spacing--lg)">
<!-- wp:heading -->
<h2 class="wp-block-heading"><?php esc_html_e( 'Frequently asked questions', 'fusion-circus' ); ?></h2>
<!-- /wp:heading -->

<!-- wp:accordion -->
<div role="group" class="wp-block-accordion">
<?php
$faq_items = array(
	array(
		'question' => __( 'How do I book?', 'fusion-circus' ),
		'answer'   => __( 'Replace this answer with your booking steps, contact details and payment arrangements.', 'fusion-circus' ),
	),
	array(
		'question' => __( 'What should I prepare?', 'fusion-circus' ),
		'answer'   => __( 'Replace this answer with what visitors should bring, wear or prepare before attending.', 'fusion-circus' ),
	),
	array(
		'question' => __( 'Can I cancel or reschedule?', 'fusion-circus' ),
		'answer'   => __( 'Replace this answer with your cancellation and rescheduling terms, including any deadlines.', 'fusion-circus' ),
	),
);
foreach ( $faq_items as $faq_item ) :
?>
<!-- wp:accordion-item -->
<div class="wp-block-accordion-item">
<!-- wp:accordion-heading -->
<h3 class="wp-block-accordion-heading has-icon has-icon-right"><button type="button" class="wp-block-accordion-heading__toggle"><span class="wp-block-accordion-heading__toggle-title"><?php echo esc_html( $faq_item['question'] ); ?></span><span class="wp-block-accordion-heading__toggle-icon" aria-hidden="true">+</span></button></h3>
<!-- /wp:accordion-heading -->

<!-- wp:accordion-panel -->
<div role="region" class="wp-block-accordion-panel">
<!-- wp:paragraph -->
<p><?php echo esc_html( $faq_item['answer'] ); ?></p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:accordion-panel -->
</div>
<!-- /wp:accordion-item -->
<?php endforeach; ?>
</div>
<!-- /wp:accordion -->
</div>
<!-- /wp:group -->
