(function(context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['Vue', 'VueUtil'], definition);
	} else {
		context.VueLoadingBar = definition(context.Vue, context.VueUtil);
		delete context.VueLoadingBar;
	}
})(this, function(Vue, VueUtil) {
	'use strict';
	var loadingBarInstance = null;
	var timer = null;
	var LoadingBar = {
		template: '<div class="vue-loading-bar" v-show="show"><div :class="innerClasses" :style="styles"></div></div>',
		data: function() {
			return {
				percent: 0,
				status: 'success',
				show: false
			};
		},
		watch: {
			'show': function(val) {
				if (val) {
					this.$el.style.zIndex = VueUtil.component.popupManager.nextZIndex();
				}
			}
		},
		computed: {
			innerClasses: function() {
				return ['vue-loading-bar-inner', 'vue-loading-bar-inner-color-primary', {'vue-loading-bar-inner-failed-color-error': this.status === 'error'}];
			},
			styles: function() {
				var style = {
					width: this.percent + '%',
					height: '2px'
				};
				return style;
			}
		},
		beforeDestroy: function() {
			VueUtil.removeNode(this.$el);
		}
	};
	var newInstance = function() {
		var div = document.createElement('loading-bar');
		document.body.appendChild(div);
		var loading_bar = new Vue({
			el: div,
			components: {LoadingBar: LoadingBar}
		}).$children[0];
		return {
			update: function(options) {
				if ('percent' in options) {
					loading_bar.percent = options.percent;
				}
				if (options.status) {
					loading_bar.status = options.status;
				}
				if ('show' in options) {
					loading_bar.show = options.show;
				}
			},
			destroy: function() {
				loading_bar.$destroy();
			}
		};
	};
	var update = function(options) {
		VueUtil.isUndef(loadingBarInstance) ? loadingBarInstance = newInstance() : void 0;
		loadingBarInstance.update(options);
	};
	var hide = function() {
		var closeTimer = setTimeout(function() {
			update({show: false});
			update({percent: 0});
			loadingBarInstance.destroy();
			loadingBarInstance = null;
			clearTimeout(closeTimer);
		}, 500);
	};
	var clearTimer = function() {
		if (VueUtil.isDef(timer)) {
			clearInterval(timer);
			timer = null;
		}
	};
	var VueLoadingBar = {
		start: function() {
			if (VueUtil.isDef(loadingBarInstance)) return;
			var percent = 0;
			update({percent: percent, show: true});
			timer = setInterval(function() {
				percent += 5;
				if (percent > 95) {
					clearTimer();
					percent = 95;
				}
				update({percent: percent, show: true});
			}, 200);
		},
		update: function(percent) {
			clearTimer();
			update({percent: percent, show: true});
		},
		finish: function() {
			clearTimer();
			update({percent: 100, show: true});
			hide();
		},
		error: function() {
			clearTimer();
			update({percent: 100, status: 'error', show: true});
			hide();
		}
	}
	Vue.loadingBar = VueLoadingBar;
});
