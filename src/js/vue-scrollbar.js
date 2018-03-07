(function(context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['Vue', 'VueUtil'], definition);
	} else {
		context.VueScrollbar = definition(context.Vue, context.VueUtil);
		delete context.VueScrollbar;
	}
})(this, function(Vue, VueUtil) {
	'use strict';
	var Bar = {
		name: 'Bar',
		props: {
			vertical: Boolean,
			size: Number,
			move: Number
		},
		computed: {
			bar: function() {
				var BAR_MAP = {
					vertical: {
						offset: 'offsetHeight',
						scroll: 'scrollTop',
						scrollSize: 'scrollHeight',
						size: 'height',
						key: 'vertical',
						axis: 'Y',
						client: 'clientY',
						direction: 'top'
					},
					horizontal: {
						offset: 'offsetWidth',
						scroll: 'scrollLeft',
						scrollSize: 'scrollWidth',
						size: 'width',
						key: 'horizontal',
						axis: 'X',
						client: 'clientX',
						direction: 'left'
					}
				};
				return BAR_MAP[this.vertical ? 'vertical' : 'horizontal'];
			},
			wrap: function() {
				return this.$parent.wrap;
			}
		},
		render: function(createElement) {
			var self = this;
			var move = self.move;
			var size = self.size;
			var bar = self.bar;
			var renderThumbStyle = function(obj) {
				var move = obj.move;
				var size = obj.size;
				var bar = obj.bar;
				if (size === 0) move = 0;
				var style = {};
				var translate = "translate" + bar.axis + "(" + move + "%)";
				style[bar.size] = size + "%";
				style.transform = translate;
				style.msTransform = translate;
				style.webkitTransform = translate;
				return style;
			};
			return createElement("div", {
				class: ["vue-scrollbar__bar", "is-" + bar.key],
				on: {
					mousedown: self.clickTrackHandler
				}
			}, [createElement("div", {
				ref: "thumb",
				class: "vue-scrollbar__thumb",
				on: {
					mousedown: self.clickThumbHandler
				},
				style: renderThumbStyle({
					size: size,
					move: move,
					bar: bar
				})
			}, [])]);
		},
		methods: {
			clickThumbHandler: function(e) {
				this.startDrag(e);
				this[this.bar.axis] = e.currentTarget[this.bar.offset] - (e[this.bar.client] - e.currentTarget.getBoundingClientRect()[this.bar.direction]);
			},
			clickTrackHandler: function(e) {
				var offset = Math.abs(e.target.getBoundingClientRect()[this.bar.direction] - e[this.bar.client]);
				var thumbHalf = this.$refs.thumb[this.bar.offset] / 2;
				var thumbPositionPercentage = (offset - thumbHalf) * 100 / this.$el[this.bar.offset];
				this.wrap[this.bar.scroll] = thumbPositionPercentage * this.wrap[this.bar.scrollSize] / 100;
			},
			startDrag: function(e) {
				e.stopImmediatePropagation();
				this.cursorDown = true;
				VueUtil.on(document, 'mousemove', this.mouseMoveDocumentHandler);
				VueUtil.on(document, 'mouseup', this.mouseUpDocumentHandler);
				document.onselectstart = function() {
					return false;
				}
			},
			mouseMoveDocumentHandler: function(e) {
				if (this.cursorDown === false) return;
				var prevPage = this[this.bar.axis];
				if (!prevPage) return;
				var offset = (this.$el.getBoundingClientRect()[this.bar.direction] - e[this.bar.client]) * -1;
				var thumbClickPosition = this.$refs.thumb[this.bar.offset] - prevPage;
				var thumbPositionPercentage = (offset - thumbClickPosition) * 100 / this.$el[this.bar.offset];
				this.wrap[this.bar.scroll] = thumbPositionPercentage * this.wrap[this.bar.scrollSize] / 100;
			},
			mouseUpDocumentHandler: function(e) {
				this.cursorDown = false;
				this[this.bar.axis] = 0;
				VueUtil.off(document, 'mousemove', this.mouseMoveDocumentHandler);
				document.onselectstart = null;
			}
		},
		beforeDestroy: function() {
			VueUtil.off(document, 'mouseup', this.mouseUpDocumentHandler);
		}
	};
	var VueScrollbar = {
		name: 'VueScrollbar',
		components: {
			Bar: Bar
		},
		props: {
			wrapClass: {},
			viewClass: {},
			height: Number,
			width: Number,
			noresize: Boolean,
			tag: {
				type: String,
				default: 'div'
			}
		},
		data: function() {
			return {
				sizeWidth: 0,
				sizeHeight: 0,
				moveX: 0,
				moveY: 0
			};
		},
		computed: {
			wrap: function() {
				return this.$refs.wrap;
			},
			resizeElement: function() {
				var view = this.$refs.resize;
				if (VueUtil.isDef(view) && VueUtil.isElement(view.$el)) {
					return view.$el;
				}
				return view;
			}
		},
		render: function(createElement) {
			var self = this;
			var viewHeight = null;
			var viewWidth = null;
			var scrollHeight = null;
			var scrollWidth = null;
			var gutter = -VueUtil.scrollBarWidth() + 'px';
			if (VueUtil.isNumber(self.height)) {
				viewHeight = scrollHeight = self.height + 'px';
			}
			if (VueUtil.isNumber(self.width)) {
				viewWidth = scrollWidth = self.width + 'px';
			}
			if (!VueUtil.isDef(scrollWidth)) {
				viewHeight = self.height + VueUtil.scrollBarWidth() + 'px';
			}
			if (!VueUtil.isDef(scrollHeight)) {
				viewWidth = self.width + VueUtil.scrollBarWidth() + 'px';
			}
			var view = createElement(self.tag, {
				class: ['vue-scrollbar__view', self.viewClass],
				ref: 'resize'
			}, self.$slots.default);
			var wrap = createElement('div', {
				ref: "wrap",
				style: {marginBottom: gutter, marginRight: gutter, height: viewHeight, width: viewWidth},
				on: {
					scroll: self.handleScroll,
					mouseenter: self.handleScroll,
					mouseleave: self.handleScroll
				},
				class: [self.wrapClass, 'vue-scrollbar__wrap']
			}, [view]);
			var nodes = [wrap, createElement(Bar, {
				style: {width: scrollWidth},
				attrs: {
					move: self.moveX,
					size: self.sizeWidth
				}
			}, []), createElement(Bar, {
				style: {height: scrollHeight},
				attrs: {
					vertical: true,
					move: self.moveY,
					size: self.sizeHeight
				}
			}, [])];
			return createElement('div', {
				class: 'vue-scrollbar'
			}, nodes);
		},
		methods: {
			handleScroll: VueUtil.debounce(function(e) {
				var wrap = this.wrap;
				this.moveY = wrap.scrollTop * 100 / wrap.clientHeight;
				this.moveX = wrap.scrollLeft * 100 / wrap.clientWidth;
				this.$nextTick(this.update)
			}),
			update: VueUtil.debounce(function() {
				var wrap = this.wrap;
				var heightPercentage = wrap.clientHeight * 100 / wrap.scrollHeight;
				var widthPercentage = wrap.clientWidth * 100 / wrap.scrollWidth;
				this.sizeHeight = heightPercentage < 100 ? heightPercentage : 0;
				this.sizeWidth = widthPercentage < 100 ? widthPercentage : 0;
			}),
			goTop: function() {
				this.wrap.scrollTop = 0;
				this.handleScroll();
			}
		},
		mounted: function() {
			this.$nextTick(this.handleScroll);
			!this.noresize && this.resizeElement && VueUtil.addResizeListener(this.resizeElement, this.update);
		},
		beforeDestroy: function() {
			!this.noresize && this.resizeElement && VueUtil.removeResizeListener(this.resizeElement, this.update);
		}
	};
	Vue.component(VueScrollbar.name, VueScrollbar);
});
