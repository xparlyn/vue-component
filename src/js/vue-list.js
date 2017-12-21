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
		delta: {
			start: 0,
			end: 0,
			total: 0,
			keeps: 0,
			allPadding: 0,
			paddingTop: 0,
			remain: 0,
			size: 20,
			setFlg: false
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
				if (delta.total <= delta.keeps) return;
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
					delta.paddingTop = 0;
					delta.allPadding = 0;
					return slots;
				}
				delta.total = slots.length;
				delta.paddingTop = delta.size * delta.start;
				delta.allPadding = delta.size * (delta.total - delta.keeps);
				var result = [];
				for (var i = delta.start, j = delta.end; i < j; i++) {
					result.push(slots[i]);
				}
				return result;
			},
			init: function() {
				var slots = this.$slots.default;
				var delta = this.$options.delta;
				delta.remain = Math.floor(this.height * 1 / delta.size);
				delta.end = delta.remain;
				delta.keeps = delta.remain;
				if (slots && slots.length <= delta.remain) {
					delta.end = slots.length;
					delta.keeps = slots.length;
				}
				delta.setFlg = true;
				this.updateZone(0);
			}
		},
		render: function(createElement) {
			var slots = this.$slots.default;
			if (!VueUtil.isArray(slots)) return null;
			var delta = this.$options.delta;
			if (slots && !delta.setFlg) {
				this.init();
			}
			var showList = this.filter(slots);
			var paddingTop = delta.paddingTop;
			var allPadding = delta.allPadding;
			return createElement('div', {
				'class': ['vue-list'],
				'style': {
					'height': this.height * 1 + 'px'
				},
				'on': {
					'scroll': this.handleScroll
				}
			}, [
					createElement('div', {
						'style': {
							'padding-top': paddingTop + 'px',
							'padding-bottom': allPadding - paddingTop + 'px'
						}
					}, showList)
				]);
		},
		mounted: function() {
			var self = this;
			self.$on('item-click', self.handleItemClick);
			if (self.defaultSelected) {
				self.$nextTick(function() {
					self.$slots.default[self.defaultActivedIndex].componentInstance.handleClick();
				});
			}
		}
	};
	Vue.component(VueList.name, VueList);
});
