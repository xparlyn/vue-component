(function(context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['Vue', 'VueUtil'], definition);
	} else {
		context.VueForm = definition(context.Vue, context.VueUtil);
		delete context.VueForm;
	}
})(this, function(Vue, VueUtil) {
	'use strict';
	var VueForm = {
		template: '<form :class="[\'vue-form\', labelPosition ? \'vue-form--label-\' + labelPosition : \'\', {\'vue-form--inline\': inline}]"><slot></slot><input style="display:none" /></form>',
		name: 'VueForm',
		componentName: 'VueForm',
		props: {
			model: Object,
			rules: Object,
			labelPosition: String,
			labelWidth: String,
			labelSuffix: {
				type: String,
				default: ''
			},
			inline: Boolean,
			showMessage: {
				type: Boolean,
				default: true
			},
			labelResponsive: {
				type: Boolean,
				default: true
			},
			notifyMessage: Boolean,
			customMessageMethod: Function
		},
		watch: {
			rules: function() {
				this.validate();
			}
		},
		data: function() {
			return {
				fields: []
			};
		},
		created: function() {
			this.$on('vue.form.addField', function(field) {
				if (field) {
					this.fields.push(field);
				}
			});
			this.$on('vue.form.removeField', function(field) {
				if (field.prop) {
					this.fields.splice(this.fields.indexOf(field), 1);
				}
			});
		},
		methods: {
			resetFields: function() {
				this.fields.forEach(function(field) {
					field.resetField();
				});
			},
			validate: function(callback) {
				var self = this;
				var valid = true;
				var count = 0;
				var errorMsgs = [];
				this.fields.forEach(function(field, index) {
					field.validate('', function(errors) {
						if (errors) {
							valid = false;
							errorMsgs.push(errors);
						}
						if (VueUtil.isFunction(callback) && ++count === self.fields.length) {
							callback(valid);
						}
					});
				});
				if (errorMsgs.length > 0) {
					if (VueUtil.isFunction(self.customMessageMethod)) {
						self.customMessageMethod(errorMsgs);
					} else if (self.notifyMessage) {
						var createElement = self.$createElement;
						self.$notify.error({
							message: createElement('div', null, [self._l(errorMsgs, function(errorMsg) {
								return [createElement('span', null, [errorMsg]), createElement('br', null, [])];
							})]),
							duration: 0
						});
					}
				}
			},
			validateField: function(prop, cb) {
				var field = this.fields.filter(function(field) {
					return (field.prop === prop)
				})[0];
				if (!field) {
					throw new Error('must call validateField with valid prop string!');
				}
				field.validate('', cb);
			}
		}
	};
	Vue.component(VueForm.name, VueForm);
});
