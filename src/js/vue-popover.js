(function(context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['Vue', 'VueUtil', 'VuePopper'], definition);
	} else {
		context.VuePopover = definition(context.Vue, context.VueUtil, context.VuePopper);
		delete context.VuePopover;
	}
})(this, function(Vue, VueUtil, VuePopper) {
	'use strict';
	var VuePopover = {
		template: '<span><transition @after-leave="doDestroy"><div :class="[\'vue-popover\', popperClass, {\'no-arrow\': !visibleArrow}]" ref="popper" v-show="!disabled && showPopper" :style="{width: popoverWidth + \'px\' \}"><div class="vue-popover__title" v-if="title" v-text="title"></div><slot>{{content}}</slot></div></transition><slot name="reference"></slot></span>',
		name: 'VuePopover',
		mixins: [VuePopper],
		props: {
			trigger: {
				type: String,
				default: 'click',
				validator: function(value) {
					return ['click', 'focus', 'hover', 'manual'].indexOf(value) !== -1
				}
			},
			title: String,
			disabled: Boolean,
			content: String,
			reference: {},
			popperClass: String,
			width: [String, Number],
			visibleArrow: {
				type: Boolean,
				default: true
			}
		},
		data: function() {
			return {
				popoverWidth: null
			}
		},
		watch: {
			showPopper: function(newVal, oldVal) {
				if (newVal) {
					this.popoverWidth = this.width;
					if (!this.popoverWidth) {
						var reference = this.reference || this.$refs.reference;
						this.popoverWidth = parseInt(VueUtil.getStyle(reference, 'width'));
					}
					this.$emit('show');
				} else {
					this.$emit('hide');
				}
			}
		},
		methods: {
			bindEvents: function() {
				var self = this;
				var reference = self.reference || self.$refs.reference;
				var popper = self.popper || self.$refs.popper;
				if (!reference && self.$slots.reference && self.$slots.reference[0]) {
					reference = self.referenceElm = self.$slots.reference[0].elm;
				}
				if (self.trigger === 'click') {
					VueUtil.on(reference, 'click', self.doToggle);
					VueUtil.on(document, 'click', self.handleDocumentClick);
				} else if (self.trigger === 'hover') {
					VueUtil.on(reference, 'mouseenter', self.handleMouseEnter);
					VueUtil.on(popper, 'mouseenter', self.handleMouseEnter);
					VueUtil.on(reference, 'mouseleave', self.handleMouseLeave);
					VueUtil.on(popper, 'mouseleave', self.handleMouseLeave);
				} else if (self.trigger === 'focus') {
					var found = false;
					if ([].slice.call(reference.children).length) {
						var children = reference.childNodes;
						var len = children.length;
						for (var i = 0; i < len; i++) {
							if (children[i].nodeName === 'INPUT' || children[i].nodeName === 'TEXTAREA') {
								VueUtil.on(children[i], 'focus', self.doShow);
								VueUtil.on(children[i], 'blur', self.doClose);
								found = true;
								break;
							}
						}
					}
					if (found) return;
					if (reference.nodeName === 'INPUT' || reference.nodeName === 'TEXTAREA') {
						VueUtil.on(reference, 'focus', self.doShow);
						VueUtil.on(reference, 'blur', self.doClose);
					} else {
						VueUtil.on(reference, 'mousedown', self.doShow);
						VueUtil.on(reference, 'mouseup', self.doClose);
					}
				}
			},
			unBindEvents: function() {
				var self = this;
				var reference = self.reference || self.$refs.reference;
				var popper = self.popper || self.$refs.popper;
				if (!reference && self.$slots.reference && self.$slots.reference[0]) {
					reference = self.referenceElm = self.$slots.reference[0].elm;
				}
				if (self.trigger === 'click') {
					VueUtil.off(reference, 'click', self.doToggle);
					VueUtil.off(document, 'click', self.handleDocumentClick);
				} else if (self.trigger === 'hover') {
					VueUtil.off(reference, 'mouseenter', self.handleMouseEnter);
					VueUtil.off(popper, 'mouseenter', self.handleMouseEnter);
					VueUtil.off(reference, 'mouseleave', self.handleMouseLeave);
					VueUtil.off(popper, 'mouseleave', self.handleMouseLeave);
				} else if (self.trigger === 'focus') {
					var found = false;
					if ([].slice.call(reference.children).length) {
						var children = reference.childNodes;
						var len = children.length;
						for (var i = 0; i < len; i++) {
							if (children[i].nodeName === 'INPUT' || children[i].nodeName === 'TEXTAREA') {
								VueUtil.off(children[i], 'focus', self.doShow);
								VueUtil.off(children[i], 'blur', self.doClose);
								found = true;
								break;
							}
						}
					}
					if (found) return;
					if (reference.nodeName === 'INPUT' || reference.nodeName === 'TEXTAREA') {
						VueUtil.off(reference, 'focus', self.doShow);
						VueUtil.off(reference, 'blur', self.doClose);
					} else {
						VueUtil.off(reference, 'mousedown', self.doShow);
						VueUtil.off(reference, 'mouseup', self.doClose);
					}
				}
			},
			doToggle: function() {
				this.showPopper = !this.showPopper;
			},
			doShow: function() {
				this.showPopper = true;
				clearTimeout(this.$options.timer);
			},
			doClose: function() {
				this.showPopper = false;
				clearTimeout(this.$options.timer);
			},
			handleMouseEnter: function() {
				var self = this;
				clearTimeout(self.$options.timer);
				self.$options.timer = setTimeout(function(){
					self.doShow();
				}, 300);
			},
			handleMouseLeave: function() {
				var self = this;
				clearTimeout(self.$options.timer);
				self.$options.timer = setTimeout(function(){
					self.doClose();
				}, 300);
			},
			handleDocumentClick: function(e) {
				var reference = this.reference || this.$refs.reference;
				var popper = this.popper || this.$refs.popper;
				if (!reference && this.$slots.reference && this.$slots.reference[0]) {
					reference = this.referenceElm = this.$slots.reference[0].elm;
				}
				if (!this.$el || !reference || this.$el.contains(e.target) || reference.contains(e.target) || !popper || popper.contains(e.target))
					return;
				this.showPopper = false;
			}
		},
		mounted: function() {
			this.bindEvents();
		},
		destroyed: function() {
			this.unBindEvents();
		}
	};
	var directive = function(el, binding, vnode) {
		vnode.context.$refs[binding.arg].$refs.reference = el;
	};
	Vue.directive('popover', directive);
	VuePopover.directive = directive;
	Vue.component(VuePopover.name, VuePopover);
});
