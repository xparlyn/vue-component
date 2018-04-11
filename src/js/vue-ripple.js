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
			template: '<div v-show="visible" ref="container" :class="[\'vue-ripple__container\']"><div ref="animation" :class="[\'vue-ripple__animation\']"></div></div>',
			methods: {
				showRipple: function(clientX, clientY) {
					var self = this;
					var el = this.$el.parentNode;
					var animation = self.$refs.animation;
					if (el.originalPosition !== 'absolute') {
						el.style.position = 'relative';
					}
					var size = el.clientWidth >el.clientHeight ? el.clientWidth : el.clientHeight;
					animation.style.height = animation.style.width = size * 2 + 'px';
					var offset = el.getBoundingClientRect();
					var x = clientX - offset.left + 'px';
					var y = clientY - offset.top + 'px';
					VueUtil.addClass(animation, 'vue-ripple__animation--enter');
					VueUtil.addClass(animation, 'vue-ripple__animation--visible');
					VueUtil.setStyle(animation, 'transform', 'translate(-50%, -50%) translate(' + x + ', ' + y + ') scale3d(.1,.1,.1)');
					self.visible = true;
					VueUtil.debounce(function() {
						VueUtil.setStyle(animation, 'transform', 'translate(-50%, -50%) translate(' + x + ', ' + y + ') scale3d(1,1,1)');
						VueUtil.removeClass(animation, 'vue-ripple__animation--enter');
						VueUtil.debounce(300, function() {
							VueUtil.removeClass(animation, 'vue-ripple__animation--visible');
							el.style.position = el.originalPosition;
							self.visible = false;
						})(); 
					})();
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
				el.ripple = new Vue(VueRipple);
				el.appendChild(el.ripple.$mount().$el);
				VueUtil.on(el, 'mousedown', doRipple);
			},
			unbind: function(el) {
				VueUtil.off(el, 'mousedown', doRipple);
				el.ripple.$destroy();
			}
		});
	};
	Vue.use(directive);
});
