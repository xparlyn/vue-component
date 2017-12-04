(function(context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['Vue', 'VuePopper'], definition);
	} else {
		context.VueSelectDropdown = definition(context.Vue, context.VuePopper);
		delete context.VueSelectDropdown;
	}
})(this, function(Vue, VuePopper) {
	'use strict';
	var VueSelectDropdown = {
		template: '<div :class="[\'vue-select-dropdown\', {\'is-multiple\': $parent.multiple}, popperClass]" :style="{minWidth: minWidth}"><slot></slot></div>',
		name: 'VueSelectDropdown',
		componentName: 'VueSelectDropdown',
		mixins: [VuePopper],
		props: {
			placement: {
				type: String,
				default: 'bottom-start'
			}
		},
		data: function() {
			return {
				minWidth: ''
			};
		},
		computed: {
			popperClass: function() {
				return this.$parent.popperClass;
			}
		},
		watch: {
			'$parent.visible': function(val) {
				if (val) {
					var clientRect = this.$parent.$el.getBoundingClientRect();
					this.minWidth = clientRect.width + 'px';
				}
			}
		},
		mounted: function() {
			this.referenceElm = this.$parent.$refs.reference.$el;
			this.$parent.popperElm = this.popperElm = this.$el;
			this.$on('updatePopper', this.updatePopper);
			this.$on('destroyPopper', this.destroyPopper);
		}
	};
	Vue.component(VueSelectDropdown.name, VueSelectDropdown);
});
