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
	var LoadingBar = Vue.extend({
		template: '<transition @after-leave="handleAfterLeave"><div v-show="visible" class="vue-loading-bar"><div :class="innerClasses" :style="styles"></div></div></transition>',
		data: function() {
			return {
				percent: 0,
				status: '',
				visible: false
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
		methods: {
			handleAfterLeave: function() {
				this.$destroy();
				this.$nextTick(function(){
					loadingBarInstance = null;
				});
			}
		},
		mounted: function() {
			this.$el.style.zIndex = VueUtil.nextZIndex();
		}
	});
	var newInstance = function() {
		var div = document.createElement('div');
		document.body.appendChild(div);
		var loadingBar = new LoadingBar({el: div});
		return {
			update: function(options) {
				loadingBar.visible = true;
				if (VueUtil.isDef(options.percent)) loadingBar.percent = options.percent;
				if (VueUtil.isDef(options.status)) loadingBar.status = options.status;
			},
			destroy: function() {
				loadingBar.visible = false;
			}
		};
	};
	var updateInstance = function(options) {
		if (!VueUtil.isDef(loadingBarInstance)) loadingBarInstance = newInstance();
		loadingBarInstance.update(options);
	};
	var destroyInstance = VueUtil.debounce(500, function(fn) {
		if (VueUtil.isDef(loadingBarInstance)) {
			if (VueUtil.isFunction(fn)) fn();
			loadingBarInstance.destroy();
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
			if (VueUtil.isFunction(fn)) fn();
		},
		update: function(percent, fn) {
			clearInterval(intervaler);
			updateInstance({percent: percent});
			if (VueUtil.isFunction(fn)) fn();
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
