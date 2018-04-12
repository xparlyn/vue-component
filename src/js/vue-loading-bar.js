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
		}
	};
	var newInstance = function() {
		var div = document.createElement('loading-bar');
		document.body.appendChild(div);
		var loadingBar = new Vue({
			components: {LoadingBar: LoadingBar},
			mounted: function() {
				this.$el.style.zIndex = VueUtil.nextZIndex();
			}
		}).$mount(div);
		var loading_bar = loadingBar.$children[0];
		return {
			update: function(options) {
				if (VueUtil.isDef(options.percent)) loading_bar.percent = options.percent;
				if (VueUtil.isDef(options.status)) loading_bar.status = options.status;
			},
			destroy: function() {
				loadingBar.$destroy();
			}
		};
	};
	var updateInstance = function(options) {
		if (!VueUtil.isDef(loadingBarInstance)) loadingBarInstance = newInstance();
		loadingBarInstance.update(options);
	};
	var destroyInstance = VueUtil.debounce(500, function(fn) {
		if (VueUtil.isDef(loadingBarInstance)) {
			loadingBarInstance.destroy();
			loadingBarInstance = null;
			if (VueUtil.isFunction(fn)) {
				fn();
			}
		}
	});
	var VueLoadingBar = {
		start: function(fn) {
			if (VueUtil.isDef(loadingBarInstance)) return;
			var percent = 0;
			updateInstance({percent: percent});
			intervaler = setInterval(function() {
				percent += 6;
				if (percent > 95) {
					clearInterval(intervaler);
					percent = 96;
				}
				updateInstance({percent: percent});
			}, 200);
			if (VueUtil.isFunction(fn)) {
				fn();
			}
		},
		update: function(percent, fn) {
			clearInterval(intervaler);
			updateInstance({percent: percent});
			if (VueUtil.isFunction(fn)) {
				fn();
			}
		},
		finish: VueUtil.debounce(function(fn) {
			clearInterval(intervaler);
			updateInstance({percent: 100});
			destroyInstance(fn);
		}),
		error: VueUtil.debounce(function(fn) {
			clearInterval(intervaler);
			updateInstance({percent: 100, status: 'error'});
			destroyInstance(fn);
		})
	}
	Vue.loadingBar = VueLoadingBar;
});
