(function(context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['Vue', 'VueUtil'], definition);
	} else {
		context.VueNotification = definition(context.Vue, context.VueUtil);
		delete context.VueNotification;
	}
})(this, function(Vue, VueUtil) {
	'use strict';
	var VueNotification = {
		template: '<transition :name="isLeft ? \'notify-left\' : isTop ? \'notify-top\' : isBottom ? \'notify-bottom\' : isCenter? \'notify-center\' : \'notify-right\'" @after-leave="doDestroy"><div :class="[\'vue-notification\', {\'vue-notification-translateX\':centerX, \'vue-notification-translateY\':centerY},customClass]" v-show="visible" :style="{top: top ? top + \'px\' : \'auto\', bottom: bottom ? bottom + \'px\' : \'auto\', left: left ? left + \'px\' : \'auto\', right: right ? right + \'px\' : \'auto\'}"><i :class="[\'vue-notification__icon\', typeClass, iconClass]" v-if="type || iconClass"></i><div class="vue-notification__group"><h2 class="vue-notification__title" v-text="title" v-if="showTitle"></h2><div class="vue-notification__content" v-if="showMessage" :style="{\'margin-top\':showTitle?\'10px\':\'\'}"><slot>{{message}}</slot></div><div class="vue-notification__closeBtn vue-icon-close" @click="close" v-if="duration===0 || showClose"></div></div></div></transition>',
		data: function() {
			return {
				visible: false,
				title: '',
				message: '',
				duration: 3000,
				type: '',
				customClass: '',
				iconClass: '',
				onClose: null,
				closed: false,
				top: null,
				bottom: null,
				left: null,
				right: null,
				centerX: false,
				centerY: false,
				position: 'top-right',
				isLeft: false,
				isTop: false,
				isBottom: false,
				isCenter: false,
				showClose: false
			};
		},
		computed: {
			showTitle: function() {
				if (VueUtil.trim(this.title) === "") {
					return false;
				}
				return true;
			},
			showMessage: function() {
				if (VueUtil.trim(this.message) === "" && !this.$slots.default) {
					return false;
				}
				return true;
			},
			typeClass: function() {
				var typeMap = {
					success: 'success',
					info: 'information',
					warning: 'warning',
					error: 'error'
				};
				return this.type && typeMap[this.type.toLowerCase()] ? 'vue-icon-' + typeMap[this.type.toLowerCase()] : '';
			}
		},
		methods: {
			close: function() {
				this.closed = true;
				if (VueUtil.isFunction(this.onClose)) {
					this.onClose();
				}
			},
			doDestroy: function() {
				VueUtil.removeNode(this.$el);
				this.$destroy();
			}
		},
		mounted: function() {
			var self = this;
			if (self.duration > 0) {
				VueUtil.debounce(self.duration, function() {
					!self.closed && self.close();
				})();
			}
		}
	};
	var NotificationConstructor = Vue.extend(VueNotification);
	var instances = [];
	var leftTopInstances = [];
	var leftBottomInstances = [];
	var rightTopInstances = [];
	var rightBottomInstances = [];
	var centerTopInstances = [];
	var centerBottomInstances = [];
	var seed = 1;
	var offHeight = 8;
	var Notification = function(options) {
		options = options || {};
		var userOnClose = options.onClose;
		var id = 'notification_' + seed++;
		options.onClose = function() {
			Notification.close(id, userOnClose);
		};
		var instance = new NotificationConstructor({
			data: options
		});
		if (VueUtil.isVNode(options.message)) {
			instance.$slots.default = [options.message];
			options.message = '';
		}
		instance.id = id;
		instance.vm = instance.$mount();
		instance.dom = instance.vm.$el;
		instance.dom.style.zIndex = VueUtil.nextZIndex();
		var instancePosition = instance.position.split("-");
		var positionX = instancePosition[1];
		var positionY = instancePosition[0];
		var isLeft = positionX.indexOf('left') !== -1;
		var isCenterX = positionX.indexOf('center') !== -1;
		var isRight = positionX.indexOf('right') !== -1;
		var isTop = positionY.indexOf('top') !== -1;
		var isCenterY = positionY.indexOf('center') !== -1;
		var isBottom = positionY.indexOf('bottom') !== -1;
		if ((!isLeft && !isCenterX && !isRight) || (!isTop && !isCenterY && !isBottom)) {
			VueUtil.removeNode(instance.dom);
			instance.$destroy();
			return;
		}
		instance.isLeft = false;
		instance.isBottom = false;
		instance.top = false;
		instance.isCenter = false;
		if (isCenterY) {
			instance.centerY = true;
		}
		if (isLeft) {
			instance.left = 8;
			instance.isLeft = true;
		}
		if (isCenterX) {
			instance.centerX = true;
			instance.isCenter = true;
		}
		if (isRight) {
			instance.right = 8;
		}
		if (isBottom) {
			if (isLeft) {
				var leftBottomDist = offHeight;
				VueUtil.loop(leftBottomInstances, function(leftBottomInstance) {
					leftBottomDist += leftBottomInstance.dom.offsetHeight + offHeight;
				});
				instance.bottom = leftBottomDist;
				leftBottomInstances.push(instance);
			}
			if (isCenterX) {
				instance.isBottom = true;
				var centerBottomDist = offHeight;
				VueUtil.loop(centerBottomInstances, function(centerBottomInstance) {
					centerBottomDist += centerBottomInstance.dom.offsetHeight + offHeight;
				});
				instance.bottom = centerBottomDist;
				centerBottomInstances.push(instance);
			}
			if (isRight) {
				var rightBottomDist = offHeight;
				VueUtil.loop(rightBottomInstances, function(rightBottomInstance) {
					rightBottomDist += rightBottomInstance.dom.offsetHeight + offHeight;
				});
				instance.bottom = rightBottomDist;
				rightBottomInstances.push(instance);
			}
		}
		if (isTop) {
			if (isLeft) {
				var leftTopDist = offHeight;
				VueUtil.loop(leftTopInstances, function(leftTopInstance) {
					leftTopDist += leftTopInstance.dom.offsetHeight + offHeight;
				});
				instance.top = leftTopDist;
				leftTopInstances.push(instance);
			}
			if (isCenterX) {
				instance.isTop = true;
				var centerTopDist = offHeight;
				VueUtil.loop(centerTopInstances, function(centerTopInstance) {
					centerTopDist += centerTopInstance.dom.offsetHeight + offHeight;
				});
				instance.top = centerTopDist;
				centerTopInstances.push(instance);
			}
			if (isRight) {
				var rightTopDist = offHeight;
				VueUtil.loop(rightTopInstances, function(rightTopInstance) {
					rightTopDist += rightTopInstance.dom.offsetHeight + offHeight;
				});
				instance.top = rightTopDist;
				rightTopInstances.push(instance);
			}
		}
		instance.dom.style.display = "";
		instance.dom.style.opacity = 0;
		instances.push(instance);
		document.body.appendChild(instance.vm.$el);
		Vue.nextTick(function() {
			instance.vm.visible = true;
			instance.dom.style.opacity = 1;
		});
	};
	VueUtil.loop(['success', 'warning', 'info', 'error'], function(type) {
		Notification[type] = function(options) {
			options.type = type;
			Notification(options);
		};
	});
	Notification.close = function(id, userOnClose) {
		VueUtil.loop(instances, function(instance, i) {
			if (id === instance.id) {
				if (VueUtil.isFunction(userOnClose)) {
					userOnClose(instance);
				}
				var removedHeight = instance.dom.offsetHeight + offHeight;
				var instancesPosition = instance.position.split("-");
				var positionX = instancesPosition[1];
				var positionY = instancesPosition[0];
				var isLeft = positionX.indexOf('left') !== -1;
				var isCenterX = positionX.indexOf('center') !== -1;
				var isRight = positionX.indexOf('right') !== -1;
				var isTop = positionY.indexOf('top') !== -1;
				var isBottom = positionY.indexOf('bottom') !== -1;
				if (isBottom) {
					if (isLeft) {
						var lbi = leftBottomInstances.indexOf(instance);
						leftBottomInstances.splice(lbi, 1);
						VueUtil.loop(leftBottomInstances, function(leftBottomInstance, index) {
							if (index < lbi) return;
							leftBottomInstance.dom.style.bottom = parseInt(leftBottomInstance.dom.style.bottom, 10) - removedHeight + 'px';
						});
					}
					if (isCenterX) {
						var cbi = centerBottomInstances.indexOf(instance);
						centerBottomInstances.splice(cbi, 1);
						VueUtil.loop(centerBottomInstances, function(centerBottomInstance, index) {
							if (index < cbi) return;
							centerBottomInstance.dom.style.bottom = parseInt(centerBottomInstance.dom.style.bottom, 10) - removedHeight + 'px';
						});
					}
					if (isRight) {
						var rbi = rightBottomInstances.indexOf(instance);
						rightBottomInstances.splice(rbi, 1);
						VueUtil.loop(rightBottomInstances, function(rightBottomInstance, index) {
							if (index < rbi) return;
							rightBottomInstance.dom.style.bottom = parseInt(rightBottomInstance.dom.style.bottom, 10) - removedHeight + 'px';
						});
					}
				}
				if (isTop) {
					if (isLeft) {
						var lti = leftTopInstances.indexOf(instance);
						leftTopInstances.splice(lti, 1);
						VueUtil.loop(leftTopInstances, function(leftTopInstance, index) {
							if (index < lti) return;
							leftTopInstance.dom.style.top = parseInt(leftTopInstance.dom.style.top, 10) - removedHeight + 'px';
						});
					}
					if (isCenterX) {
						var cti = centerTopInstances.indexOf(instance);
						centerTopInstances.splice(cti, 1);
						VueUtil.loop(centerTopInstances, function(centerTopInstance, index) {
							if (index < cti) return;
							centerTopInstance.dom.style.top = parseInt(centerTopInstance.dom.style.top, 10) - removedHeight + 'px';
						});
					}
					if (isRight) {
						var rti = rightTopInstances.indexOf(instance);
						rightTopInstances.splice(rti, 1);
						VueUtil.loop(rightTopInstances, function(rightTopInstance, index) {
							if (index < rti) return;
							rightTopInstance.dom.style.top = parseInt(rightTopInstance.dom.style.top, 10) - removedHeight + 'px';
						});
					}
				}
				instance.vm.visible = false;
				instances.splice(i, 1);
			}
			return;
		});
	};
	Vue.prototype.$notify = Notification;
	Vue.notify = Notification;
});
