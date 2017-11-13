(function(context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['Vue'], definition);
	} else {
		context.VueBadge = definition(context.Vue);
		delete context.VueBadge;
	}
})(this, function(Vue) {
	'use strict';
	var VueBadge = {
		template: '<div class="vue-badge"><slot></slot><sup v-show="!hidden && ( content || isDot )" v-text="content" :class="[\'vue-badge__content\', {\'is-fixed\': $slots.default, \'is-dot\': isDot }]"></sup></div>',
		name: 'VueBadge',
		props: {
			value: {},
			max: Number,
			isDot: Boolean,
			hidden: Boolean
		},
		computed: {
			content: function() {
				if (this.isDot) return;
				var value = this.value;
				var max = this.max;
				if (typeof value === 'number' && typeof max === 'number') {
					return max < value ? max + '+' : value;
				}
				return value;
			}
		}
	};
	Vue.component(VueBadge.name, VueBadge);
});
