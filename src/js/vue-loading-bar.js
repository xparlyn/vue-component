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
	var loadingBar = null;
	var intervaler = null;
	var LoadingBar = Vue.extend({
		template: '<div v-show="visible" class="vue-loading-bar"><div :class="innerClasses" :style="innerStyle"></div></div>',
		data: function() {
			return {
				percent: 0,
				error: false,
				visible: false
			};
		},
		watch: {
			visible: function(val) {
				if (val) this.$el.style.zIndex = VueUtil.nextZIndex();
			}
		},
		computed: {
			innerClasses: function() {
				return ['vue-loading-bar-inner', 'vue-loading-bar-inner-color-primary', {'vue-loading-bar-inner-color-error': this.error}];
			},
			innerStyle: function() {
				return {width: this.percent + '%'};
			}
		}
	});
	var newInstance = function() {
		var div = document.createElement('div');
		document.body.appendChild(div);
		var loadingBar = new LoadingBar({el: div});
		return {
			show: function(options) {
				if (!loadingBar.visible) loadingBar.visible = true;
				loadingBar.error = options.error;
				if (VueUtil.isDef(options.percent)) loadingBar.percent = options.percent;
			},
			hide: function() {
				loadingBar.visible = false;
			},
			isShow: function() {
				return loadingBar.visible;
			}
		};
	};
	var initLoadingBar = function() {
		if (!VueUtil.isDef(loadingBar)) loadingBar = newInstance();
	};
	var hideInstance = VueUtil.debounce(500, function(fn) {
		if (VueUtil.isFunction(fn)) fn();
		loadingBar.hide();
	});
	var VueLoadingBar = {
		start: function(fn) {
			initLoadingBar();
			if (loadingBar.isShow()) return;
			var percent = 0;
			loadingBar.show({percent: percent});
			intervaler = setInterval(function() {
				percent += 6;
				if (percent > 95) {
					clearInterval(intervaler);
					percent = 96;
				}
				loadingBar.show({percent: percent});
			}, 250);
			if (VueUtil.isFunction(fn)) fn();
		},
		update: function(percent, fn) {
			initLoadingBar();
			clearInterval(intervaler);
			loadingBar.show({percent: percent});
			if (VueUtil.isFunction(fn)) fn();
		},
		finish: VueUtil.debounce(function(fn) {
			initLoadingBar();
			clearInterval(intervaler);
			loadingBar.show({percent: 100});
			hideInstance(fn);
		}),
		error: VueUtil.debounce(function(fn) {
			initLoadingBar();
			clearInterval(intervaler);
			loadingBar.show({percent: 100, error: true});
			hideInstance(fn);
		})
	}
	Vue.loadingBar = VueLoadingBar;
});
