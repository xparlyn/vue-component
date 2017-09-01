!(function(name, context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['Vue', 'VueUtil'], definition);
	} else {
		context[name] = definition(context['Vue'], context['VueUtil']);
	}
})('VuePopup', this, function(Vue, VueUtil) {
	'use strict';
	var instances = {};
	var PopupManager = {
		zIndex: 2000,
		getInstance: function(id) {
			return instances[id];
		},
		register: function(id, instance) {
			if (id && instance) {
				instances[id] = instance;
			}
		},
		deregister: function(id) {
			if (id) {
				instances[id] = null;
				delete instances[id];
			}
		},
		nextZIndex: function() {
			return PopupManager.zIndex++;
		},
		modalStack: [],
		openModal: function(id, zIndex) {
			if (Vue.prototype.$isServer)
				return;
			if (!id || zIndex === undefined)
				return;
			var modalStack = this.modalStack;
			for (var i = 0, j = modalStack.length; i < j; i++) {
				var item = modalStack[i];
				if (item.id === id) {
					return;
				}
			}
			this.modalStack.push({
				id: id,
				zIndex: zIndex
			});
		},
		closeModal: function(id) {
			var modalStack = this.modalStack;
			if (modalStack.length > 0) {
				var topItem = modalStack[modalStack.length - 1];
				if (topItem.id === id) {
					modalStack.pop();
				} else {
					for (var i = modalStack.length - 1; i >= 0; i--) {
						if (modalStack[i].id === id) {
							modalStack.splice(i, 1);
							break;
						}
					}
				}
			}
		}
	};
	!Vue.prototype.$isServer && window.addEventListener('keydown', function(event) {
		if (event.keyCode === 27) {
			if (PopupManager.modalStack.length > 0) {
				var topItem = PopupManager.modalStack[PopupManager.modalStack.length - 1];
				if (!topItem)
					return;
				var instance = PopupManager.getInstance(topItem.id);
				if (instance.closeOnPressEscape) {
					instance.$emit('visible-change', false);
				}
			}
		}
	});
	var idSeed = 1;
	var scrollBarWidth;
	var getDOM = function(dom) {
		if (dom.nodeType === 3) {
			dom = dom.nextElementSibling || dom.nextSibling;
			getDOM(dom);
		}
		return dom;
	};
	var VuePopup = {};
	VuePopup.model = {
		prop: 'visible',
		event: 'visible-change'
	};
	VuePopup.props = {
		visible: {
			type: Boolean,
			default: false
		},
		openDelay: {},
		closeDelay: {},
		zIndex: {},
		closeOnPressEscape: {
			type: Boolean,
			default: true
		}
	};
	VuePopup.beforeMount = function() {
		this._popupId = 'popup-' + idSeed++;
		PopupManager.register(this._popupId, this);
	}
	VuePopup.beforeDestroy = function() {
		PopupManager.deregister(this._popupId);
		PopupManager.closeModal(this._popupId);
	}
	VuePopup.data = function() {
		return {
			opened: false
		};
	}
	VuePopup.watch = {
		visible: function(val) {
			var self = this;
			if (val) {
				if (!self.opened) {
					self.$nextTick(function() {
						var dom = getDOM(self.$el);
						if (getComputedStyle(dom).position === 'static') {
							dom.style.position = 'absolute';
						}
						dom.style.zIndex = PopupManager.nextZIndex();
						if (self.closeOnPressEscape)
							PopupManager.openModal(self._popupId, dom.style.zIndex);
					});
				}
			} else {
				PopupManager.closeModal(self._popupId);
				self.$nextTick(function() {
					if (self.opened && self.closeOnPressEscape) {
						var dom = getDOM(self.$el);
						PopupManager.openModal(self._popupId, dom.style.zIndex);
					}
				});
			}
		}
	};
	return function() {
		return {
			VuePopup: VuePopup,
			PopupManager: PopupManager
		};
	}
});
