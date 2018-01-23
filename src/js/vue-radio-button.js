(function(context, definition) {
	'use strict';
	if (typeof exports === 'object' && typeof module !== 'undefined') {
		module.exports = definition();
	} else if (typeof define === 'function' && define.amd) {
		define(['Vue'], definition);
	} else {
		context.VueRadioButton = definition(context.Vue);
		delete context.VueRadioButton;
	}
})(this, function(Vue) {
	'use strict';
	var VueRadioButton = {
		template: '<label :class="[\'vue-radio-button\', size ? \'vue-radio-button--\' + size : \'\', {\'is-active\': value === label}, {\'is-disabled\': isDisabled}]"><input class="vue-radio-button__original" :value="label" type="radio" v-model="value" :name="name" :disabled="isDisabled"><span class="vue-radio-button__inner" :style="value === label ? activeStyle : null"><slot></slot><template v-if="!$slots.default">{{label}}</template></span></label>',
		name: 'VueRadioButton',
		props: {
			label: {},
			disabled: Boolean,
			name: String
		},
		computed: {
			value: {
				get: function() {
					return this._radioGroup.value;
				},
				set: function(value) {
					this._radioGroup.$emit('input', value);
				}
			},
			_radioGroup: function() {
				var parent = this.$parent;
				while (parent) {
					if (parent.$options.componentName !== 'VueRadioGroup') {
						parent = parent.$parent;
					} else {
						return parent;
					}
				}
				return false;
			},
			activeStyle: function() {
				return {
					backgroundColor: this._radioGroup.fill || '',
					borderColor: this._radioGroup.fill || '',
					boxShadow: this._radioGroup.fill ? '-1px 0 0 0 ' + this._radioGroup.fill : '',
					color: this._radioGroup.textColor || ''
				};
			},
			size: function() {
				return this._radioGroup.size;
			},
			isDisabled: function() {
				return this.disabled || this._radioGroup.disabled;
			}
		}
	};
	Vue.component(VueRadioButton.name, VueRadioButton);
});
