(function(context, definition) {
	'use strict';
	if (typeof exports === 'object' && typeof module !== 'undefined') {
		module.exports = definition();
	} else if (typeof define === 'function' && define.amd) {
		define(['Vue', 'VueUtil'], definition);
	} else {
		context.VueBreadcrumbItem = definition(context.Vue, context.VueUtil);
		delete context.VueBreadcrumbItem;
	}
})(this, function(Vue, VueUtil) {
	'use strict';
	var VueBreadcrumbItem = {
		template: '<span class="vue-breadcrumb__item"><span class="vue-breadcrumb__item__inner" ref="link"><slot></slot></span><span class="vue-breadcrumb__separator">{{separator}}</span></span>',
		name: 'VueBreadcrumbItem',
		props: {
			to: {},
			replace: Boolean
		},
		data: function() {
			return {
				separator: ''
			};
		},
		mounted: function() {
			this.separator = this.$parent.separator;
			var self = this;
			var link = self.$refs.link;
			if (self.to) {
				VueUtil.on(link, 'click', function() {
					var to = self.to;
					if (self.$router) {
						self.replace ? self.$router.replace(to) : self.$router.push(to);
					}
				});
			} else {
				VueUtil.on(link, 'click', function() {
					self.$emit('click');
				});
			}
		}
	};
	Vue.component(VueBreadcrumbItem.name, VueBreadcrumbItem);
});
