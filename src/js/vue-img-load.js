(function(context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['Vue', 'VueUtil'], definition);
	} else {
		context.VueImgLoad = definition(context.Vue, context.VueUtil);
		delete context.VueImgLoad;
	}
})(this, function(Vue, VueUtil) {
	'use strict';
	var imgload = function() {
		var fadeIn = function(el) {
			el.style.opacity = 0;
			el.style.display = "block";
			VueUtil.debounce(function _fadeIn() {
				var val = parseFloat(el.style.opacity);
				if (!((val += .1) > 1)) {
					el.style.opacity = val;
					_fadeIn();
				}
			})();
		};
		Vue.directive('imgload', {
			bind: function(el, binding) {
				if (el.tagName === 'IMG') {
					var img = new Image();
					img.src = binding.value;
					img.onload = function() {
						el.src = img.src;
						fadeIn(el);
					}
				}
			}
		})
	};
	Vue.use(imgload);
});
