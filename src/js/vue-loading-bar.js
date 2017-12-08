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
	var intervaler = null;
	var LoadingBar = {
		template: '<div class="vue-loading-bar"><div :class="innerClasses" :style="styles"></div></div>',
		data: function() {
			return {
				percent: 0,
				status: ''
			};
		},
		computed: {
			innerClasses: function() {
				return ['vue-loading-bar-inner', 'vue-loading-bar-inner-color-primary', {'vue-loading-bar-inner-color-error': this.status === 'error'}];
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
			components: {LoadingBar: LoadingBar},
			mounted: function() {
				this.$el.style.zIndex = VueUtil.component.popupManager.nextZIndex();
			}
		}).$children[0];
		return {
			update: function(options) {
				if (VueUtil.isDef(options.percent)) loading_bar.percent = options.percent;
				if (VueUtil.isDef(options.status)) loading_bar.status = options.status;
			},
			destroy: function() {
				loading_bar.$destroy();
			}
		};
	};
	var updateInstance = function(options) {
		if (VueUtil.isUndef(loadingBarInstance)) loadingBarInstance = newInstance();
		loadingBarInstance.update(options);
	};
	var destroyInstance = function() {
		var closeTimer = setTimeout(function() {
			loadingBarInstance.destroy();
			loadingBarInstance = null;
			clearTimeout(closeTimer);
		}, 1500);
	};
	var VueLoadingBar = {
		start: function() {
			if (VueUtil.isDef(loadingBarInstance)) return;
			var percent = 0;
			updateInstance({percent: percent});
			intervaler = setInterval(function() {
				percent += 5;
				if (percent > 95) {
					clearInterval(intervaler);
					percent = 95;
				}
				updateInstance({percent: percent});
			}, 200);
		},
		update: function(percent) {
			clearInterval(intervaler);
			updateInstance({percent: percent});
		},
		finish: function() {
			clearInterval(intervaler);
			updateInstance({percent: 100});
			destroyInstance();
		},
		error: function() {
			clearInterval(intervaler);
			updateInstance({percent: 100, status: 'error'});
			destroyInstance();
		}
	}
	Vue.loadingBar = VueLoadingBar;
});
