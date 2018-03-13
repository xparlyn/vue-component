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
			move: Number,
			disSize: Number
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
				if (bar.axis === 'Y') {
					style.marginTop = move + 'px';
				}
				if (bar.axis === 'X') {
					style.marginLeft = move + 'px';
				}
				style[bar.size] = size + "px";
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
				this.wrap[this.bar.scroll] = (offset - thumbHalf) / (this.$el[this.bar.offset] + this.disSize) * this.wrap[this.bar.scrollSize];
			},
			startDrag: function(e) {
				e.stopImmediatePropagation();
				this.cursorDown = true;
				VueUtil.on(document, 'mousemove', this.mouseMoveDocumentHandler);
				VueUtil.on(document, 'mouseup', this.mouseUpDocumentHandler);
			},
			mouseMoveDocumentHandler: function(e) {
				if (this.cursorDown === false) return;
				var prevPage = this[this.bar.axis];
				if (!prevPage) return;
				var offset = (this.$el.getBoundingClientRect()[this.bar.direction] - e[this.bar.client]) * -1;
				var thumbClickPosition = this.$refs.thumb[this.bar.offset] - prevPage;
				this.wrap[this.bar.scroll] = (offset - thumbClickPosition) / (this.$el[this.bar.offset] + this.disSize) * this.wrap[this.bar.scrollSize];
			},
			mouseUpDocumentHandler: function(e) {
				this.cursorDown = false;
				this[this.bar.axis] = 0;
				VueUtil.off(document, 'mousemove', this.mouseMoveDocumentHandler);
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
				moveY: 0,
				disSizeX: 0,
				disSizeY: 0
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
			},
			mouseWheelEvent: function() {
				return VueUtil.isFirefox ? 'DOMMouseScroll' : 'mousewheel';
			},
		},
		render: function(createElement) {
			var self = this;
			var viewHeight = null;
			var viewWidth = null;
			if (VueUtil.isNumber(self.height)) {
				viewHeight =  self.height + 'px';
			}
			if (VueUtil.isNumber(self.width)) {
				viewWidth =  self.width + 'px';
			}
			var view = createElement(self.tag, {
				class: ['vue-scrollbar__view', self.viewClass],
				ref: 'resize'
			}, [self.$slots.default]);
			var wrap = createElement('div', {
				ref: "wrap",
				style: {height: viewHeight, width: viewWidth},
				on: {
					scroll: self.handleScroll,
					mouseenter: self.handleScroll,
					mouseleave: self.handleScroll
				},
				class: [self.wrapClass, 'vue-scrollbar__wrap']
			}, [view]);
			var nodes = [wrap, createElement(Bar, {
				style: {width: viewWidth},
				attrs: {
					move: self.moveX,
					size: self.sizeWidth,
					disSize: self.disSizeX
				}
			}, []), createElement(Bar, {
				style: {height: viewHeight},
				attrs: {
					vertical: true,
					move: self.moveY,
					size: self.sizeHeight,
					disSize: self.disSizeY
				}
			}, [])];
			return createElement('div', {
				class: 'vue-scrollbar'
			}, nodes);
		},
		methods: {
			isMouseWheelCancel: function(el) {
				if (el === this.wrap) return false;
				if (VueUtil.isIE && el.querySelectorAll('.vue-scrollbar__wrap').length >0) return true;
				var overflowY = VueUtil.getStyle(el, 'overflowY');
				if (['auto', 'scroll'].indexOf(overflowY) !== -1 && el.scrollHeight > el.clientHeight) return true;
				return this.isMouseWheelCancel(el.parentElement);
			},
			scrollMouseWheel: function(e) {
				if (this.isMouseWheelCancel(e.target)) return;
				e.stopPropagation();
				e.preventDefault();
				var wheelDelta = e.wheelDelta || -e.detail;
				var scrollTop = this.wrap.scrollTop;
				var wheel = 90;
				if (wheelDelta < 0) {
					scrollTop += wheel;
				} else {
					scrollTop -= wheel;
				}
				this.wrap.scrollTop = scrollTop;
				this.handleScroll();
			},
			touchStart: function(e) {
				e.stopPropagation();
				var touches = e.touches[0];
				if (!VueUtil.isDef(this.$options.tocuhPlace)) {
					this.$options.tocuhPlace = {};
				}
				this.$options.tocuhPlace.tocuhX = touches.clientX;
				this.$options.tocuhPlace.tocuhY = touches.clientY;
				this.cursorDown = true;
			},
			touchMove: function(e) {
				if (this.cursorDown === false) return;
				e.stopPropagation();
				var touches = e.touches[0];
				console.log(this.$options.tocuhPlace.tocuhX - touches.clientX)
				var scrollLeft = this.wrap.scrollLeft + (this.$options.tocuhPlace.tocuhX - touches.clientX);
				var scrollTop = this.wrap.scrollTop + (this.$options.tocuhPlace.tocuhY - touches.clientY);
				this.wrap.scrollLeft = scrollLeft;
				this.wrap.scrollTop = scrollTop;
			},
			touchEnd: function(e) {
				this.cursorDown = false;
				e.stopPropagation();
			},
			handleScroll: VueUtil.debounce(function(e) {
				this.update();
				var wrap = this.wrap;
				var moveY = wrap.scrollTop / wrap.scrollHeight * wrap.clientHeight;
				var moveX = wrap.scrollLeft / wrap.scrollWidth * wrap.clientWidth;
				var sizeHeight = this.sizeHeight;
				var sizeWidth = this.sizeWidth;
				var minHeight = wrap.clientHeight * 0.1;
				var minWidth = wrap.clientWidth * 0.1;
				if (sizeHeight < minHeight && sizeHeight !== 0) {
					moveY = wrap.scrollTop / wrap.scrollHeight * (wrap.clientHeight - minHeight + sizeHeight);
					this.sizeHeight = minHeight;
					this.disSizeY = sizeHeight - minHeight;
				}
				if (sizeWidth < minWidth && sizeWidth !== 0) {
					moveX = wrap.scrollLeft / wrap.scrollWidth * (wrap.clientHeight - minWidth + sizeWidth);
					this.sizeWidth = minWidth;
					this.disSizeX = sizeWidth - minWidth;
				}
				if (this.moveY !== moveY) {
					this.moveY = moveY;
					var isTop = (wrap.scrollTop === 0);
					var isBottom = (wrap.scrollHeight - wrap.scrollTop === wrap.clientHeight);
					this.$emit('scrollY', e, wrap.scrollTop, isTop, isBottom);
				}
				if (this.moveX !== moveX) {
					this.moveX = moveX;
					var isLeft = (wrap.scrollLeft === 0);
					var isRight = (wrap.scrollWidth - wrap.scrollLeft === wrap.clientWidth);
					this.$emit('scrollX', e, wrap.scrollLeft, isLeft, isRight);
				}
			}),
			update: function() {
				var wrap = this.wrap;
				var heightPercentage = wrap.clientHeight * 100 / wrap.scrollHeight;
				var widthPercentage = wrap.clientWidth * 100 / wrap.scrollWidth;
				var sizeHeight = heightPercentage < 100 ? wrap.clientHeight * heightPercentage / 100 : 0;
				var sizeWidth = widthPercentage < 100 ? wrap.clientWidth * widthPercentage / 100 : 0;
				this.sizeHeight = sizeHeight;
				this.sizeWidth = sizeWidth;
				this.disSizeX = 0;
				this.disSizeY = 0;
			},
			goTop: function() {
				this.wrap.scrollTop = 0;
				this.handleScroll();
			}
		},
		mounted: function() {
			this.$nextTick(this.handleScroll);
			VueUtil.on(this.wrap, this.mouseWheelEvent, this.scrollMouseWheel);
			VueUtil.on(this.wrap, 'touchstart', this.touchStart);
			VueUtil.on(this.wrap, 'touchmove', this.touchMove);
			VueUtil.on(this.wrap, 'touchend', this.touchEnd);
			!this.noresize && this.resizeElement && VueUtil.addResizeListener(this.resizeElement, this.update);
		},
		beforeDestroy: function() {
			VueUtil.off(this.wrap, this.mouseWheelEvent, this.scrollMouseWheel);
			VueUtil.off(this.wrap, 'touchstart', this.touchStart);
			VueUtil.off(this.wrap, 'touchmove',this.touchMove);
			VueUtil.off(this.wrap, 'touchend', this.touchEnd);
			!this.noresize && this.resizeElement && VueUtil.removeResizeListener(this.resizeElement, this.update);
		}
	};
	Vue.component(VueScrollbar.name, VueScrollbar);
});
