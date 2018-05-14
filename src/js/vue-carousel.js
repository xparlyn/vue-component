(function(context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['Vue', 'VueUtil'], definition);
	} else {
		context.VueCarousel = definition(context.Vue, context.VueUtil);
		delete context.VueCarousel;
	}
})(this, function(Vue, VueUtil) {
	'use strict';
	var VueCarousel = {
		template: '<div :class="[\'vue-carousel\', {\'vue-carousvue--card\': type === \'card\'}]" @mouseenter.stop="handleMouseEnter" @mouseleave.stop="handleMouseLeave" @touchstart.stop="handleTouchStart"><div class="vue-carousel__container" :style="{height: height}"><transition name="carousel-arrow-left"><button v-if="arrow !== \'never\'" v-show="arrow === \'always\' || hover" @mouseenter="handleButtonEnter(\'left\')" @mouseleave="handleButtonLeave" @click.stop="throttledArrowClick(activeIndex - 1)" class="vue-carousel__arrow vue-carousel__arrow--left"><i class="vue-icon-arrow-left"></i></button></transition><transition name="carousel-arrow-right"><button v-if="arrow !== \'never\'" v-show="arrow === \'always\' || hover" @mouseenter="handleButtonEnter(\'right\')" @mouseleave="handleButtonLeave" @click.stop="throttledArrowClick(activeIndex + 1)" class="vue-carousel__arrow vue-carousel__arrow--right"><i class="vue-icon-arrow-right"></i></button></transition><slot></slot></div><ul v-if="indicatorPosition !== \'none\'" :class="[\'vue-carousel__indicators\', {\'vue-carousel__indicators--outside\': indicatorPosition === \'outside\' || type === \'card\'}]"><li v-for="(item, index) in items" :class="[\'vue-carousel__indicator\', {\'is-active\': index === activeIndex}]" @mouseenter="throttledIndicatorHover(index)" @click.stop="handleIndicatorClick(index)"><button class="vue-carousel__button"></button></li></ul></div>',
		name: 'VueCarousel',
		props: {
			initialIndex: {
				type: Number,
				default: 0
			},
			height: String,
			trigger: {
				type: String,
				default: 'hover'
			},
			autoplay: {
				type: Boolean,
				default: true
			},
			interval: {
				type: Number,
				default: 3000
			},
			indicatorPosition: String,
			indicator: {
				type: Boolean,
				default: true
			},
			arrow: {
				type: String,
				default: 'hover'
			},
			hoverStop: {
				type: Boolean,
				default: true
			},
			type: String
		},
		data: function() {
			return {
				items: [],
				activeIndex: -1,
				hover: false
			};
		},
		watch: {
			items: function(val) {
				if (val.length > 0)
					this.setActiveItem(0);
			},
			activeIndex: function(val, oldVal) {
				this.resetItemPosition();
				this.$emit('change', val, oldVal);
			}
		},
		methods: {
			handleMouseEnter: function() {
				this.hover = true;
				if (this.hoverStop) this.pauseTimer();
			},
			handleMouseLeave: function() {
				this.hover = false;
				if (this.hoverStop) this.startTimer();
			},
			handleTouchStart: function(e) {
				e.stopImmediatePropagation();
				var tocuhPlace = this.tocuhPlace;
				if (!VueUtil.isDef(tocuhPlace)) {
					tocuhPlace = this.tocuhPlace = {};
				}
				var touches = e.touches[0];
				tocuhPlace.tocuhX = touches.pageX;
				VueUtil.on(document, 'touchmove', this.handleTouchMove);
				VueUtil.on(document, 'touchend', this.handleTouchEnd);
			},
			handleTouchMove: function(e) {
				var touches = e.touches[0];
				var tocuhPlace = this.tocuhPlace;
				tocuhPlace.touchMove = tocuhPlace.tocuhX - touches.pageX;
			},
			handleTouchEnd: function(e) {
				var tocuhPlace = this.tocuhPlace;
				if (tocuhPlace.touchMove > 0) {
					this.throttledArrowClick(this.activeIndex + 1)
				}
				if (tocuhPlace.touchMove < 0) {
					this.throttledArrowClick(this.activeIndex - 1)
				}
				VueUtil.off(document, 'touchmove',this.handleTouchMove);
				VueUtil.off(document, 'touchend', this.handleTouchEnd);
			},
			itemInStage: function(item, index) {
				var length = this.items.length;
				if (index === length - 1 && item.inStage && this.items[0].active || (item.inStage && this.items[index + 1] && this.items[index + 1].active)) {
					return 'left';
				} else if (index === 0 && item.inStage && this.items[length - 1].active || (item.inStage && this.items[index - 1] && this.items[index - 1].active)) {
					return 'right';
				}
				return false;
			},
			handleButtonEnter: function(arrow) {
				var self = this;
				VueUtil.loop(self.items, function(item, index) {
					if (arrow === self.itemInStage(item, index)) {
						item.hover = true;
					}
				});
			},
			handleButtonLeave: function() {
				var self = this;
				VueUtil.loop(self.items, function(item) {
					item.hover = false;
				});
			},
			updateItems: function() {
				this.items = VueUtil.filter(this.$children, function(child) {
					return child.$options.name === 'VueCarouselItem';
				});
			},
			resetItemPosition: function() {
				var self = this;
				VueUtil.loop(self.items, function(item, index) {
					item.translateItem(index, self.activeIndex);
				});
			},
			playSlides: function() {
				if (this.activeIndex < this.items.length - 1) {
					this.activeIndex++;
				} else {
					this.activeIndex = 0;
				}
			},
			pauseTimer: function() {
				clearInterval(this.timer);
			},
			startTimer: function() {
				if (this.interval <= 0 || !this.autoplay) return;
				this.timer = setInterval(this.playSlides, this.interval);
			},
			setActiveItem: function(index) {
				if (VueUtil.isString(index)) {
					var filteredItems = VueUtil.filter(this.items, function(item) {
						return item.name === index;
					});
					if (filteredItems.length > 0) {
						index = this.items.indexOf(filteredItems[0]);
					}
				}
				index = Number(index);
				if (isNaN(index) || index !== Math.floor(index)) {
					return;
				}
				var length = this.items.length;
				if (index < 0) {
					this.activeIndex = length - 1;
				} else if (index >= length) {
					this.activeIndex = 0;
				} else {
					this.activeIndex = index;
				}
			},
			prev: function() {
				this.setActiveItem(this.activeIndex - 1);
			},
			next: function() {
				this.setActiveItem(this.activeIndex + 1);
			},
			handleIndicatorClick: function(index) {
				this.activeIndex = index;
			},
			handleIndicatorHover: function(index) {
				if (this.trigger === 'hover' && index !== this.activeIndex) {
					this.activeIndex = index;
				}
			}
		},
		created: function() {
			var self = this;
			self.timer = null;
			self.throttledArrowClick = function(index) {
				self.setActiveItem(index);
			};
			self.throttledIndicatorHover = function(index) {
				self.handleIndicatorHover(index);
			};
		},
		mounted: function() {
			var self = this;
			self.updateItems();
			self.$nextTick(function() {
				VueUtil.addResizeListener(self.$el, self.resetItemPosition);
				if (self.initialIndex < self.items.length && self.initialIndex >= 0) {
					self.activeIndex = self.initialIndex;
				}
				self.startTimer();
			});
		},
		beforeDestroy: function() {
			this.pauseTimer();
			this.$el && VueUtil.removeResizeListener(this.$el, this.resetItemPosition);
		}
	};
	Vue.component(VueCarousel.name, VueCarousel);
});
