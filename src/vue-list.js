!(function(name, context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['Vue', 'VueUtil'], definition);
	} else {
		context[name] = definition(context['Vue'], context['VueUtil']);
		delete context[name];
	}
})('VueList', this, function(Vue, VueUtil) {
	'use strict';
	var VueList = {
		name: 'VueList',
		componentName: 'VueList',
		data: function(){
			return {
				activedIndex: null,
				remain: 0,
				size: 0
			}
		},
		props: {
			height: {
				type: Number,
				default: 200
			},
			onScroll: Function
		},
		delta: {
			start: 0,
			end: 0,
			total: 0,
			keeps: 0,
			viewHeight: 0,
			allPadding: 0,
			paddingTop: 0
		},
		methods: {
			setItemIndex: function(item) {
				item.index = this.$slots.default.indexOf(item.$vnode);
			},
			handleItemClick: function(itemObj) {
				this.activedIndex = itemObj.index;
			},
			handleScroll: function(e) {
				var scrollTop = this.$refs.container.scrollTop;
				this.updateZone(scrollTop);
				if (this.onScroll) {
					this.onScroll(e, scrollTop);
				}
			},
			updateZone: function(offset) {
				var delta = this.$options.delta;
				var overs = Math.floor(offset / this.size);
				if (!offset) {
					this.$emit('toTop');
				}
				var start = overs ? overs : 0;
				var end = overs ? (overs + delta.keeps) : delta.keeps;
				if (overs + this.remain >= delta.total) {
					end = delta.total;
					start = delta.total - delta.keeps;
					this.$emit('toBottom');
				}
				delta.end = end;
				delta.start = start;
				this.$forceUpdate();
			},
			filter: function(slots) {
				if (!slots) return;
				var delta = this.$options.delta;
				delta.total = slots.length;
				delta.paddingTop = this.size * delta.start;
				delta.allPadding = this.size * (slots.length - delta.keeps);
				delta.paddingTop < 0 ? delta.paddingTop = 0 : undefined;
				delta.allPadding < 0 ? delta.allPadding = 0 : undefined;
				delta.allPadding < delta.paddingTop ? delta.allPadding = delta.paddingTop : undefined;
				return slots.filter(function(slot, index) {
					return index >= delta.start && index <= delta.end;
				});
			}
		},
		render: function(createElement) {
			var delta = this.$options.delta;
			var showList = this.filter(this.$slots.default);
			var viewHeight = delta.viewHeight;
			var paddingTop = delta.paddingTop;
			var allPadding = delta.allPadding;
			return createElement('div', {
				'ref': 'container',
				'class': ['vue-list'],
				'style': {
					'height': viewHeight + 'px'
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
			this.size=20;
			this.remain = Math.round(this.height*1 / this.size);
			var delta = this.$options.delta;
			delta.end = this.remain;
			delta.keeps = this.remain;
			delta.viewHeight = this.height*1;
			this.updateZone(0);
			this.$on('item-click', this.handleItemClick);
		}
	};
	Vue.component(VueList.name, VueList);
});
