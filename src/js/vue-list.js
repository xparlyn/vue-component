(function(context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['Vue', 'VueUtil'], definition);
	} else {
		context.VueList = definition(context.Vue, context.VueUtil);
		delete context.VueList;
	}
})(this, function(Vue, VueUtil) {
	'use strict';
	var VueList = {
		name: 'VueList',
		componentName: 'VueList',
		data: function() {
			return {
				activedIndex: null,
				remain: 0
			}
		},
		props: {
			height: {
				type: Number,
				default: 200
			},
			onScroll: Function,
			defaultActivedIndex: {
				type: Number,
				default: 0
			},
			defaultSelected: {
				type: Boolean,
				default: true
			}
		},
		methods: {
			setItemIndex: function(item) {
				item.index = this.$slots.default.indexOf(item.$vnode);
			},
			handleItemClick: function(itemObj) {
				this.activedIndex = itemObj.index;
			},
			handleScroll: function(e) {
				var scrollTop = this.$el.scrollTop;
				this.updateZone(scrollTop);
				this.$emit('scroll', e, scrollTop)
			},
			updateZone: function(offset) {
				var delta = this.$options.delta;
				if (!VueUtil.isDef(delta)) return;
				if (delta.total <= delta.keeps) return;
				offset = offset || 0;
				var overs = Math.floor(offset / delta.size);
				var start = overs ? overs : 0;
				var end = overs ? (overs + delta.keeps) : delta.keeps;
				if (overs + delta.keeps >= delta.total) {
					end = delta.total;
					start = delta.total - delta.keeps;
				}
				delta.end = end;
				delta.start = start;
				this.$forceUpdate();
			},
			filter: function(slots) {
				var delta = this.$options.delta;
				if (delta.keeps === 0 || slots.length <= delta.keeps) {
					delta.marginTop = 0;
					delta.marginBottom = 0;
					return slots;
				}
				delta.total = slots.length;
				delta.marginTop = delta.size * delta.start;
				delta.marginBottom = delta.size * (delta.total - delta.keeps - delta.start);
				var result = [];
				for (var i = delta.start, j = delta.end; i < j; i++) {
					result.push(slots[i]);
				}
				return result;
			},
			createDelta: function(slots) {
				var delta = this.$options.delta = {};
				delta.start = 0;
				delta.total = 0;
				delta.marginTop = 0;
				delta.marginBottom = 0;
				delta.size = 20;
				delta.remain = Math.floor(this.height * 1 / delta.size);
				delta.end = delta.remain;
				delta.keeps = delta.remain;
				if (slots.length <= delta.remain) {
					delta.end = slots.length;
					delta.keeps = slots.length;
				}
			}
		},
		render: function(createElement) {
			var slots = this.$slots.default;
			if (!VueUtil.isArray(slots)) return null;
			if (!VueUtil.isDef(this.$options.delta)) this.createDelta(slots);
			var delta = this.$options.delta;
			var showList = this.filter(slots);
			return createElement('div', {
				'class': ['vue-list'],
				'style': {
					'height': this.height * 1 + 'px'
				},
				'on': {
					'scroll': this.handleScroll
				}
			}, [createElement('div', {
					'style': {
						'margin-top': delta.marginTop + 'px',
						'margin-bottom':  delta.marginBottom + 'px'
					}
				}, showList)
			]);
		},
		mounted: function() {
			var self = this;
			self.$on('item-click', self.handleItemClick);
			if (self.defaultSelected && self.$slots.default) {
				self.$nextTick(function() {
					var defaultSlot = self.$slots.default[self.defaultActivedIndex];
					defaultSlot && defaultSlot.componentInstance && defaultSlot.componentInstance.handleClick();
				});
			}
		}
	};
	Vue.component(VueList.name, VueList);
});
