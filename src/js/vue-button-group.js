(function(context, definition) {
	'use strict';
	if (typeof exports === 'object' && typeof module !== 'undefined') {
		module.exports = definition();
	} else if (typeof define === 'function' && define.amd) {
		define(['Vue'], definition);
	} else {
		context.VueButtonGroup = definition(context.Vue);
		delete context.VueButtonGroup;
	}
})(this, function(Vue) {
	'use strict';
	var VueButtonGroup = {
		template: '<div class="vue-button-group"><slot></slot></div>',
		name: 'VueButtonGroup'
	};
	Vue.component(VueButtonGroup.name, VueButtonGroup);
});
