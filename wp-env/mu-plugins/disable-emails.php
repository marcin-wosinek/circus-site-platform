<?php
/**
 * Plugin Name: Circus Site Platform — Disable Emails
 * Description: Prevents local wp-env sites from sending email.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CIRCUS_SITE_PLATFORM_EMAIL_DISABLED', true );

add_filter( 'pre_wp_mail', '__return_false', PHP_INT_MAX );
