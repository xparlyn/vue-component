(function(context, definition) {
	'use strict';
	if (typeof exports === 'object' && typeof module !== 'undefined') {
		module.exports = definition();
	} else if (typeof define === 'function' && define.amd) {
		define(['Vue', 'VueUtil'], definition);
	} else {
		context.VueTabPane = definition(context.Vue, context.VueUtil);
		delete context.VueTabPane;
	}
})(this, function(Vue, VueUtil) {
	'use strict';
	var VueTabPane = {
		template: '<div class="vue-tab-pane" v-show="active"><router-view v-if="router"></router-view><slot v-else></slot></div>',
		name: 'VueTabPane',
		componentName: 'VueTabPane',
		props: {
			label: String,
			labelContent: Function,
			name: String,
			closable: Boolean,
			disabled: Boolean
		},
		data: function() {
			return {
				index: null
			};
		},
		computed: {
			isClosable: function() {
				return this.closable || this.$parent.closable;
			},
			active: function() {
				return this.$parent.currentName === (this.name || this.index);
			},
			router: function() {
				return this.$parent.router;
			}
		},
		mounted: function() {
			this.$parent.addPanes(this);
		},
		destroyed: function() {
			VueUtil.removeNode(this.$el);
			this.$parent.removePanes(this);
		},
		watch: {
			label: function() {
				this.$parent.$forceUpdate();
			}
		}
	};
	Vue.component(VueTabPane.name, VueTabPane);
});
