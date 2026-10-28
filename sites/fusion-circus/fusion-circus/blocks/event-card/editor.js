(function (blocks, element, serverSideRender) {
	blocks.registerBlockType('fusion-circus/event-card', {
		title: 'Fusion Circus Event Card',
		usesContext: ['postId', 'postType'],
		attributes: { layout: { type: 'string', default: 'card' } },
		supports: { html: false, inserter: false },
		edit: function (props) {
			return element.createElement(serverSideRender.default || serverSideRender, {
				block: 'fusion-circus/event-card',
				attributes: props.attributes,
				urlQueryArgs: { post_id: props.context.postId }
			});
		},
		save: function () { return null; }
	});
})(window.wp.blocks, window.wp.element, window.wp.serverSideRender);
