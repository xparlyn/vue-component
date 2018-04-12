(function(context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['Vue', 'VueUtil'], definition);
	} else {
		context.VueRipple = definition(context.Vue, context.VueUtil);
		delete context.VueRipple;
	}
})(this, function(Vue, VueUtil) {
	'use strict';
	var directive = function() {
		var VueRipple = {
			template: '<div v-show="visible" class="vue-ripple__container"><transition name="ripple-fade" @after-enter="hiddenRipple"><div v-show="visible" ref="animation" class="vue-ripple__animation"></div></transition></div>',
			methods: {
				showRipple: function(clientX, clientY) {
					var self = this;
					var el = this.$el.parentNode;
					el.style.position = 'relative';
					var animation = self.$refs.animation;
					var size = el.clientWidth >el.clientHeight ? el.clientWidth : el.clientHeight;
					animation.style.height = animation.style.width = size + 'px';
					var offset = el.getBoundingClientRect();
					var x = clientX - offset.left + 'px';
					var y = clientY - offset.top + 'px';
					animation.style.left = x;
					animation.style.top = y;
					self.visible = true;
				},
				hiddenRipple: function() {
					var el = this.$el.parentNode;
					el.style.position = el.originalPosition;
					this.visible = false;
				}
			},
			data: function() {
				return {
					visible: false
				};
			}
		};
		var doRipple = function(e) {
			var clientX = e.clientX;
			var clientY = e.clientY;
			this.ripple.showRipple(clientX, clientY);
		};
		Vue.directive('ripple', {
			bind: function(el, binding) {
				el.originalPosition = el.style.position;
				el.ripple = new Vue(VueRipple).$mount();
				el.appendChild(el.ripple.$el);
				VueUtil.on(el, 'mousedown', doRipple);
			},
			unbind: function(el) {
				VueUtil.off(el, 'mousedown', doRipple);
				VueUtil.removeNode(el.ripple.$el);
				el.ripple.$destroy();
			}
		});
	};
	Vue.use(directive);
});
