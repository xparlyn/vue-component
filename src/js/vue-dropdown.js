(function(context, definition) {
	'use strict';
	if (typeof exports === 'object' && typeof module !== 'undefined') {
		module.exports = definition();
	} else if (typeof define === 'function' && define.amd) {
		define(['Vue', 'VueUtil'], definition);
	} else {
		context.VueDropdown = definition(context.Vue, context.VueUtil);
		delete context.VueDropdown;
	}
})(this, function(Vue, VueUtil) {
	'use strict';
	var VueDropdown = {
		template: '',
		name: 'VueDropdown',
		componentName: 'VueDropdown',
		mixins: [VueUtil.component.emitter],
		directives: {
			Clickoutside: VueUtil.component.clickoutside()
		},
		props: {
			trigger: {
				type: String,
				default: 'hover'
			},
			menuAlign: {
				type: String,
				default: 'end'
			},
			type: String,
			size: String,
			splitButton: Boolean,
			hideOnClick: {
				type: Boolean,
				default: true
			}
		},
		data: function() {
			return {
				visible: false,
				timer: null
			};
		},
		mounted: function() {
			this.$on('menu-item-click', this.handleMenuItemClick);
			this.initEvent();
		},
		watch: {
			visible: function(val) {
				this.broadcast('VueDropdownMenu', 'visible', val);
			}
		},
		methods: {
			show: function() {
				var self = this;
				cancelAnimationFrame(self.timer);
				self.timer = requestAnimationFrame(function() {
					self.visible = true;
				});
			},
			hide: function() {
				var self = this;
				cancelAnimationFrame(self.timer);
				self.timer = requestAnimationFrame(function() {
					self.visible = false;
				});
			},
			handleClick: function() {
				this.visible = !this.visible;
			},
			initEvent: function() {
				var trigger = this.trigger
					, show = this.show
					, hide = this.hide
					, handleClick = this.handleClick
					, splitButton = this.splitButton;
				var triggerElm = splitButton ? this.$refs.trigger.$el : this.$slots.default[0].elm;
				if (trigger === 'hover') {
					VueUtil.on(triggerElm, 'mouseenter', show);
					VueUtil.on(triggerElm, 'mouseleave', hide);
					var dropdownElm = this.$slots.dropdown[0].elm;
					VueUtil.on(dropdownElm, 'mouseenter', show);
					VueUtil.on(dropdownElm, 'mouseleave', hide);
				} else if (trigger === 'click') {
					VueUtil.on(triggerElm, 'click', handleClick);
				}
			},
			handleMenuItemClick: function(command, instance) {
				if (this.hideOnClick) {
					this.visible = false;
				}
				this.$emit('command', command, instance);
			}
		},
		render: function(createElement) {
			var self = this;
			var hide = self.hide
				, splitButton = self.splitButton
				, type = self.type
				, size = self.size;
			var handleClick = function() {
				self.$emit('click');
			};
			var triggerElm = !splitButton ? self.$slots.default : createElement('vue-button-group', null, [createElement('vue-button', {
				attrs: {
					type: type,
					size: size
				},
				nativeOn: {
					click: handleClick
				}
			}, [self.$slots.default]), createElement('vue-button', {
				ref: 'trigger',
				attrs: {
					type: type,
					size: size
				},
				class: 'vue-dropdown__caret-button'
			}, [createElement('i', {
				class: 'vue-dropdown__icon vue-icon-arrow-down'
			}, [])])]);
			return createElement('div', {
				class: 'vue-dropdown',
				directives: [{
					name: 'clickoutside',
					value: hide
				}]
			}, [triggerElm, self.$slots.dropdown]);
		}
	};
	Vue.component(VueDropdown.name, VueDropdown);
});
