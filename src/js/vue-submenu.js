(function(context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['Vue', 'VueUtil'], definition);
	} else {
		context.VueSubmenu = definition(context.Vue, context.VueUtil);
		delete context.VueSubmenu;
	}
})(this, function(Vue, VueUtil) {
	'use strict';
	var VueSubMenu = {
		template: '<li :class="{\'vue-submenu\': true, \'is-active\': active, \'is-opened\': opened}"><div class="vue-submenu__title" ref="submenu-title" :style="paddingStyle"><slot name="title"></slot><i :class="[\'vue-icon-arrow-down\', {\'vue-submenu__icon-arrow\': true}]"></i></div><template v-if="rootMenu.mode === \'horizontal\'"><ul class="vue-menu" v-show="opened"><slot></slot></ul></template><collapse-transition v-else><ul class="vue-menu" v-show="opened"><slot></slot></ul></collapse-transition></li>',
		name: 'VueSubmenu',
		componentName: 'VueSubmenu',
		mixins: [VueUtil.component.menumixin, VueUtil.component.emitter],
		components: {
			CollapseTransition: VueUtil.component.collapseTransition
		},
		props: {
			index: {
				type: String,
				required: true
			}
		},
		data: function() {
			return {
				items: {},
				submenus: {}
			};
		},
		computed: {
			opened: function() {
				return (this.rootMenu.openedMenus.indexOf(this.index) !== -1);
			},
			active: {
				cache: false,
				get: function() {
					var isActive = false;
					var submenus = this.submenus;
					var items = this.items;
					VueUtil.ownPropertyLoop(items, function(index) {
						if (items[index].active) {
							isActive = true;
						}
					});
					VueUtil.ownPropertyLoop(submenus, function(index) {
						if (submenus[index].active) {
							isActive = true;
						}
					});
					return isActive;
				}
			}
		},
		methods: {
			addItem: function(item) {
				this.$set(this.items, item.index, item);
			},
			removeItem: function(item) {
				delete this.items[item.index];
			},
			addSubmenu: function(item) {
				this.$set(this.submenus, item.index, item);
			},
			removeSubmenu: function(item) {
				delete this.submenus[item.index];
			},
			handleClick: function() {
				this.dispatch('VueMenu', 'submenu-click', this);
			},
			handleMouseenter: function() {
				var self = this;
				var timer = requestAnimationFrame(function() {
					self.rootMenu.openMenu(self.index, self.indexPath);
					cancelAnimationFrame(timer);
				});
			},
			handleMouseleave: function() {
				var self = this;
				var timer = requestAnimationFrame(function() {
					self.rootMenu.closeMenu(self.index, self.indexPath);
					cancelAnimationFrame(timer);
				});
			},
			initEvents: function() {
				var triggerElm;
				if (this.rootMenu.mode === 'horizontal' && this.rootMenu.menuTrigger === 'hover') {
					triggerElm = this.$el;
					VueUtil.on(triggerElm, 'mouseenter', this.handleMouseenter);
					VueUtil.on(triggerElm, 'mouseleave', this.handleMouseleave);
				} else {
					triggerElm = this.$refs['submenu-title'];
					VueUtil.on(triggerElm, 'click', this.handleClick);
				}
			}
		},
		created: function() {
			this.parentMenu.addSubmenu(this);
			this.rootMenu.addSubmenu(this);
		},
		beforeDestroy: function() {
			this.parentMenu.removeSubmenu(this);
			this.rootMenu.removeSubmenu(this);
		},
		mounted: function() {
			this.initEvents();
		}
	};
	Vue.component(VueSubMenu.name, VueSubMenu);
});
