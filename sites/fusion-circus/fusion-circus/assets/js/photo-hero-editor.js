/*
 * Photo hero: a "Mobile focal point" for Cover blocks with the Photo hero
 * style (design.md § Photo hero). Below 782px the hero crops the photo to a
 * square, so it needs its own focal point; the Cover's native focal point
 * keeps controlling the desktop crop. Rendering: functions.php sets the
 * --fc-photo-hero-focus custom property; style.css reads it.
 */
(function (wp) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var InspectorControls = wp.blockEditor.InspectorControls;
	var PanelBody = wp.components.PanelBody;
	var FocalPointPicker = wp.components.FocalPointPicker;
	var Button = wp.components.Button;

	function isPhotoHero(attributes) {
		return /(^|\s)is-style-photo-hero(\s|$)/.test(attributes.className || '');
	}

	function focusValue(point) {
		return Math.round(point.x * 100) + '% ' + Math.round(point.y * 100) + '%';
	}

	wp.hooks.addFilter('blocks.registerBlockType', 'fusion-circus/photo-hero/attribute', function (settings, name) {
		if (name !== 'core/cover') {
			return settings;
		}
		settings.attributes = Object.assign({}, settings.attributes, {
			mobileFocalPoint: { type: 'object' }
		});
		return settings;
	});

	wp.hooks.addFilter('editor.BlockEdit', 'fusion-circus/photo-hero/controls', wp.compose.createHigherOrderComponent(function (BlockEdit) {
		return function (props) {
			if (props.name !== 'core/cover' || !isPhotoHero(props.attributes) || !props.attributes.url) {
				return el(BlockEdit, props);
			}
			var point = props.attributes.mobileFocalPoint;
			return el(wp.element.Fragment, null,
				el(BlockEdit, props),
				el(InspectorControls, null,
					el(PanelBody, { title: __('Photo hero: mobile crop', 'fusion-circus') },
						el('p', null, __('Below 782px the photo is cropped to a square. Place the point on the main subject; the Cover focal point still controls wider screens.', 'fusion-circus')),
						el(FocalPointPicker, {
							__nextHasNoMarginBottom: true,
							label: __('Mobile focal point', 'fusion-circus'),
							url: props.attributes.url,
							value: point || props.attributes.focalPoint || { x: 0.5, y: 0.5 },
							onChange: function (value) {
								props.setAttributes({ mobileFocalPoint: value });
							}
						}),
						point && el(Button, {
							variant: 'secondary',
							onClick: function () {
								props.setAttributes({ mobileFocalPoint: undefined });
							}
						}, __('Use the Cover focal point', 'fusion-circus'))
					)
				)
			);
		};
	}, 'withPhotoHeroControls'));

	// Editor canvas: mirror the front-end custom property so device previews match.
	wp.hooks.addFilter('editor.BlockListBlock', 'fusion-circus/photo-hero/preview', wp.compose.createHigherOrderComponent(function (BlockListBlock) {
		return function (props) {
			var point = props.attributes && props.attributes.mobileFocalPoint;
			if (props.name !== 'core/cover' || !point || !isPhotoHero(props.attributes)) {
				return el(BlockListBlock, props);
			}
			var wrapperProps = Object.assign({}, props.wrapperProps);
			wrapperProps.style = Object.assign({}, wrapperProps.style, { '--fc-photo-hero-focus': focusValue(point) });
			return el(BlockListBlock, Object.assign({}, props, {
				wrapperProps: wrapperProps,
				className: [props.className, 'has-photo-hero-focus'].filter(Boolean).join(' ')
			}));
		};
	}, 'withPhotoHeroPreview'));
})(window.wp);
