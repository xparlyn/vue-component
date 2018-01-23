(function(context, definition) {
	'use strict';
	if (typeof exports === 'object' && typeof module !== 'undefined') {
		module.exports = definition();
	} else if (typeof define === 'function' && define.amd) {
		define(['Vue'], definition);
	} else {
		context.VueDivider = definition(context.Vue);
		delete context.VueDivider;
	}
})(this, function(Vue) {
	'use strict';
	var VueDivider = {
		template: '<div class="vue-divider"><legend class="vue-divider__content" v-if="$slots.default"><slot></slot></legend></div>',
		name: 'VueDivider'
	};
	Vue.component(VueDivider.name, VueDivider);
});
