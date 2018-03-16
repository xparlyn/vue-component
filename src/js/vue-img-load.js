(function(context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['Vue'], definition);
	} else {
		context.VueImgLoad = definition(context.Vue);
		delete context.VueImgLoad;
	}
})(this, function(Vue) {
	'use strict';
	var imgload = function() {
		Vue.directive('imgload', {
			bind: function(el, binding) {
				if (el.tagName === 'IMG') {
					var img = new Image();
					img.src = binding.value;
					img.onload = function() {
						el.src = img.src;
					}
				}
			}
		});
	};
	Vue.use(imgload);
});
