(function(context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['Vue'], definition);
	} else {
		context.VueCard = definition(context.Vue);
		delete context.VueCard;
	}
})(this, function(Vue) {
	'use strict';
	var VueCard = {
		template: '<div class="vue-card"><div class="vue-card__header" v-if="$slots.header || header"><slot name="header">{{header}}</slot></div><div class="vue-card__body" :style="bodyStyle"><slot></slot></div></div>',
		name: 'VueCard',
		props: ['header', 'bodyStyle']
	};
	Vue.component(VueCard.name, VueCard);
});
