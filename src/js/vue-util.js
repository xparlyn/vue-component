(function(context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['Vue', 'SystemInfo', 'DateUtil', 'VueI18n', 'VueResource'], definition);
	} else {
		context.VueUtil = definition(context.Vue, context.SystemInfo, context.DateUtil);
		delete context.SystemInfo;
		delete context.DateUtil;
		delete context.VueResource;
		delete context.VueI18n;
	}
})(this, function(Vue, SystemInfo, DateUtil) {
	'use strict';
	var version ='1.36.9311';
	var isDef = function(v) {
		return v !== undefined && v !== null
	};
	var objType = function(obj) {
		return Object.prototype.toString.call(obj).slice(8, -1);
	};
	var isString = function(obj) {
		return objType(obj) === 'String';
	};
	var isNumber = function(obj) {
		return objType(obj) === 'Number';
	};
	var isBoolean = function(obj) {
		return objType(obj) === 'Boolean';
	};
	var isFile = function(obj) {
		return objType(obj) === 'File';
	};
	var isObject = function(obj) {
		return objType(obj) === 'Object';
	};
	var isArray = function(obj) {
		return objType(obj) === 'Array';
	};
	var isFunction = function(obj) {
		return objType(obj) === 'Function';
	};
	var isDate = function(obj) {
		return objType(obj) === 'Date';
	};
	var isNodeList = function(obj) {
		return objType(obj) === 'NodeList';
	};
	var isElement = function(obj) {
		return objType(obj).indexOf('Element') !== -1;
	};
	var isVNode = function(node) {
		return isObject(node) && node.hasOwnProperty('componentOptions');
	};
	var toString = function(val) {
		return !isDef(val) ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
	};
	var toDate = function(date) {
		return (!isDef(date) || isNaN(new Date(date).getTime())) ? null : new Date(date);
	};
	var formatDate = function(date, format) {
		date = toDate(date);
		if (!isDef(date)) return null;
		return DateUtil.format(date, format || 'yyyy-MM-dd');
	};
	var parseDate = function(string, format) {
		var str = formatDate(string, format);
		if (!isDef(str)) str = string;
		return DateUtil.parse(str, format || 'yyyy-MM-dd');
	};
	var getDayCountOfMonth = function(year, month) {
		if (!isNumber(year) || !isNumber(month)) return null;
		month--;
		if (month === 3 || month === 5 || month === 8 || month === 10) {
			return 30;
		}
		if (month === 1) {
			if (year % 4 === 0 && year % 100 !== 0 || year % 400 === 0) {
				return 29;
			} else {
				return 28;
			}
		}
		return 31;
	};
	var getFirstDayOfMonth = function(date) {
		var temp = toDate(date);
		if (!isDate(temp)) return null;
		temp.setDate(1);
		return temp.getDay();
	};
	var getWeekNumber = function(date) {
		var date = toDate(date);
		if (!isDate(date)) return null;
		date.setHours(0, 0, 0, 0);
		date.setTime((date.getTime() + (6 - date.getDay()) * 86400000));
		var firstDate = new Date(date.getFullYear(), 0, 1);
		return Math.ceil(((date.getTime() - firstDate.getTime()) / 86400000) / 7);
	};
	var addDate = function(src, num, type) {
		src = toDate(src);
		if (!isDate(src)) return null;
		if (type !== 'week' && type !== 'day' && type !== 'month' && type !== 'year') type = 'day';
		var result = new Date();
		switch (type.toLowerCase()) {
			case 'week':
				var week = 7;
			case 'day':
				var DAY_DURATION = 86400000;
				result.setTime(src.getTime() + DAY_DURATION * num * (week || 1));
				break;
			case 'month':
				var year = src.getFullYear();
				var month = src.getMonth();
				var date = src.getDate();
				var addMonth = 1;
				if (num < 0) {
					addMonth = -1;
					num = -num;
				}
				while (num--) {
					if (addMonth > 0) {
						year = month === 11 ? year + addMonth : year;
						month = month === 11 ? 0 : month + addMonth;
					} else {
						year = month === 0 ? year + addMonth : year;
						month = month === 0 ? 11 : month + addMonth;
					}
				}
				var newMonthDayCount = getDayCountOfMonth(year, month);
				if (newMonthDayCount < date) {
					src.setDate(newMonthDayCount);
				}
				src.setMonth(month);
				src.setFullYear(year);
				result.setTime(src.getTime());
				break;
			case 'year':
				var year = src.getFullYear();
				src.setFullYear(year + num);
				result.setTime(src.getTime());
				break;
		}
		return result;
	};
	var loop = function(arr, fn) {
		(isArray(arr) || isNodeList(arr)) && Array.prototype.forEach.call(arr, fn);
	};
	var ownPropertyLoop = function (obj, fn) {
		isDef(obj) && loop(Object.keys(obj), fn);
	};
	var trim = function(str) {
		if (!isString(str)) str = '';
		return str.replace(/^[\s\uFEFF]+|[\s\uFEFF]+$/g, '');
	};
	var merge = function(target) {
		for (var i = 1, j = arguments.length; i < j; i++) {
			var source = arguments[i] || {};
			ownPropertyLoop(source, function(prop) {
				if (isObject(target[prop]) && isObject(source[prop])) {
					target[prop] = merge({}, target[prop], source[prop]);
				} else {
					isDef(source[prop]) && (target[prop] = source[prop]);
				}
			});
		}
		return target;
	};
	var arrayToObject = function(arr) {
		var res = {};
		for (var i = 0, j = arr.length; i < j; i++) {
			res = merge(res, arr[i]);
		}
		return res;
	};
	var on = (function() {
		return function(el, event, handler, useCapture) {
			if (el && event && handler) {
				el.addEventListener(event, handler, useCapture);
			}
		}
	})();
	var off = (function() {
		return function(el, event, handler, useCapture) {
			if (el && event) {
				el.removeEventListener(event, handler, useCapture);
			}
		}
	})();
	var once = function(el, event, handler, useCapture) {
		var listener = function() {
			isFunction(handler) && handler.apply(this, arguments);
			off(el, event, listener, useCapture);
		};
		on(el, event, listener, useCapture);
	};
	var removeNode = function(node) {
		node && node.parentElement && node.parentElement.removeChild(node);
	};
	var insertNodeAt = function(fatherNode, node, position) {
		if (!isNumber(position)) position = 0;
		var refNode = (position === 0) ? fatherNode.firstElementChild : fatherNode.children[position - 1].nextElementSibling;
		fatherNode.insertBefore(node, refNode);
	};
	var scrollBarWidth = function() {
		if (!isNumber(document.__scrollBarWidth__)) {
			var inner = document.createElement('div');
			inner.style.width = '100%';
			var outer = document.createElement('div');
			outer.style.visibility = 'hidden';
			outer.style.width = '100px';
			outer.style.overflow = 'scroll';
			outer.appendChild(inner);
			document.body.appendChild(outer);
			document.__scrollBarWidth__ = outer.offsetWidth - inner.offsetWidth;
			removeNode(inner);
			removeNode(outer);
		}
		return document.__scrollBarWidth__;
	};
	var hasClass = function(el, clazz) {
		if (!isElement(el) || !isString(clazz)) return false;
		return (new RegExp('(\\s|^)' + clazz + '(\\s|$)')).test(el.className);
	};
	var addClass = function(el, clazz) {
		if (isElement(el) && isString(clazz) && !hasClass(el, clazz)) el.className += ' ' + clazz;
	};
	var removeClass = function(el, clazz) {
		if (hasClass(el, clazz)) {
			el.className = el.className.replace((new RegExp('(\\s|^)' + clazz + '(\\s|$)')), ' ');
		}
	};
	var getStyle = function(el, styleName) {
		if (!isElement(el) || !isString(styleName)) return null;
		if (styleName === 'float') {
			styleName = 'cssFloat';
		}
		var computed = getComputedStyle(el, '');
		return computed[styleName];
	};
	var setStyle = function(el, styleName, value) {
		if (!isElement(el) || !isString(styleName)) return;
		el.style[styleName] = value;
	};
	var getCookie = function(name) {
		var arr = document.cookie.replace(/\s/g, "").split(';');
		for (var i = 0, j = arr.length; i < j; i++) {
			var tempArr = arr[i].split('=');
			if (tempArr[0] === name) return decodeURIComponent(tempArr[1]);
		}
		return null;
	};
	var setCookie = function(name, value, days) {
		if (!isNumber(days)) days = 1;
		var date = addDate((new Date), days);
		document.cookie = name + '=' + value + ';expires=' + date;
	};
	var removeCookie = function(name) {
		setCookie(name, '1', -1);
	};
	var performance = function(delay, callback, throttleflg) {
		if (!isFunction(callback)) callback = delay;
		if (!isFunction(callback)) return function() {};
		var timer = null;
		if (!isNumber(delay)) {
			return function() {
				var self = this;
				var args = arguments;
				if (throttleflg) {
					if (timer) return false;
				} else {
					cancelAnimationFrame(timer);
				}
				timer = requestAnimationFrame(function() {
					callback.apply(self, args);
					cancelAnimationFrame(timer);
					timer = null;
				});
			}
		} else {
			return function() {
				var self = this;
				var args = arguments;
				if (throttleflg) {
					if (timer) return false;
				} else {
					clearTimeout(timer);
				}
				timer = setTimeout(function() {
					callback.apply(self, args);
					clearTimeout(timer);
					timer = null;
				}, delay);
			}
		}
	}
	var throttle = function(delay, callback) {
		return performance(delay, callback, true);
	};
	var debounce = function(delay, callback) {
		return performance(delay, callback);
	};
	var resizeListener = function(el, fn, removeFlg) {
		if (!isFunction(fn)) {
			fn = el;
			el = document.body;
		}
		if (!isArray(el.__resizeListeners__)) {
			var resetTrigger = function(el) {
				var trigger = el.__resizeTrigger__;
				var expand = trigger.firstElementChild;
				var contract = trigger.lastElementChild;
				var expandChild = expand.firstElementChild;
				contract.scrollLeft = contract.scrollWidth;
				contract.scrollTop = contract.scrollHeight;
				expandChild.style.width = expand.offsetWidth + 1 + 'px';
				expandChild.style.height = expand.offsetHeight + 1 + 'px';
				expand.scrollLeft = expand.scrollWidth;
				expand.scrollTop = expand.scrollHeight;
			};
			var resizeListeners = function(el, event) {
				if (el.offsetWidth !== el.__resizeLast__.width || el.offsetHeight !== el.__resizeLast__.height) {
					el.__resizeLast__.width = el.offsetWidth;
					el.__resizeLast__.height = el.offsetHeight;
					loop(el.__resizeListeners__, function(resizeListener) {
						resizeListener.call(el, event);
					});
				}
			};
			var scrollListener = debounce(function(event) {
				resetTrigger(el);
				resizeListeners(el, event);
			});
			var resizeStart = function(event) {
				if (event.animationName === 'resizeanim') {
					resetTrigger(el);
				}
			};
			if (getComputedStyle(el).position === 'static') {
				el.style.position = 'relative';
			}
			var resizeTrigger = el.__resizeTrigger__ = document.createElement('div');
			resizeTrigger.className = 'resize-triggers';
			resizeTrigger.innerHTML = '<div class="expand-trigger"><div></div></div><div class="contract-trigger"></div>';
			on(resizeTrigger, 'animationstart', resizeStart);
			el.__resizeLast__ = {};
			el.__resizeListeners__ = [];
			el.appendChild(resizeTrigger);
			on(el, 'scroll', scrollListener, true);
		}
		if (removeFlg) {
			var index = el.__resizeListeners__.indexOf(fn);
			index !== -1 && el.__resizeListeners__.splice(index, 1);
		} else {
			isFunction(fn) && el.__resizeListeners__.push(fn);
		}
	};
	var addResizeListener = function(el, fn) {
		resizeListener(el, fn);
	};
	var removeResizeListener = function(el, fn) {
		resizeListener(el, fn, true);
	};
	var addTouchStart = function(el, fn) {
		on(el, 'mousedown', fn);
		on(el, 'touchstart', fn);
	};
	var removeTouchStart = function(el, fn) {
		off(el, 'mousedown', fn);
		off(el, 'touchstart', fn);
	};
	var addTouchMove = function(el, fn) {
		on(el, 'mousemove', fn);
		on(el, 'touchmove', fn);
	};
	var removeTouchMove = function(el, fn) {
		off(el, 'mousemove', fn);
		off(el, 'touchmove', fn);
	};
	var addTouchEnd = function(el, fn) {
		on(el, 'mouseup', fn);
		on(el, 'touchend', fn);
	};
	var removeTouchEnd = function(el, fn) {
		off(el, 'mouseup', fn);
		off(el, 'touchend', fn);
	};
	var screenfull = function() {
		var fn = (function() {
			var fnMap = [['requestFullscreen', 'exitFullscreen', 'fullscreenElement', 'fullscreenEnabled', 'fullscreenchange', 'fullscreenerror']
						, ['webkitRequestFullscreen', 'webkitExitFullscreen', 'webkitFullscreenElement', 'webkitFullscreenEnabled', 'webkitfullscreenchange', 'webkitfullscreenerror']
						, ['webkitRequestFullScreen', 'webkitCancelFullScreen', 'webkitCurrentFullScreenElement', 'webkitCancelFullScreen', 'webkitfullscreenchange', 'webkitfullscreenerror']
						, ['mozRequestFullScreen', 'mozCancelFullScreen', 'mozFullScreenElement', 'mozFullScreenEnabled', 'mozfullscreenchange', 'mozfullscreenerror']
						, ['msRequestFullscreen', 'msExitFullscreen', 'msFullscreenElement', 'msFullscreenEnabled', 'MSFullscreenChange', 'MSFullscreenError']];
			var ret = {};
			for (var i = 0, l = fnMap.length; i < l; i++) {
				var val = fnMap[i];
				if (val[1] in document) {
					for (i = 0; i < val.length; i++) {
						ret[fnMap[0][i]] = val[i];
					}
					return ret;
				}
			}
			return false;
		})();
		if (!fn) {
			Vue.notify.warning({message: Vue.t('vue.screenfull.canot')});
			return false;
		}
		var screenfull = {
			request: function(elem) {
				var request = fn.requestFullscreen;
				elem = elem || document.documentElement;
				if (/5\.1[.\d]* Safari/.test(navigator.userAgent)) {
					elem[request]();
				} else {
					elem[request]('ALLOW_KEYBOARD_INPUT' in Element && Element.ALLOW_KEYBOARD_INPUT);
				}
			},
			exit: function() {
				document[fn.exitFullscreen]();
			},
			toggle: function(elem) {
				if (this.isFullscreen) {
					this.exit();
				} else {
					this.request(elem);
				}
			},
			onchange: function(callback) {
				on(document, fn.fullscreenchange, callback);
			},
			onerror: function(callback) {
				on(document, fn.fullscreenerror, callback);
			},
			raw: fn
		};
		Object.defineProperties(screenfull, {
			isFullscreen: {
				get: function() {
					return Boolean(document[fn.fullscreenElement]);
				}
			},
			element: {
				enumerable: true,
				get: function() {
					return document[fn.fullscreenElement];
				}
			},
			enabled: {
				enumerable: true,
				get: function() {
					return Boolean(document[fn.fullscreenEnabled]);
				}
			}
		});
		if (!screenfull.enabled) {
			Vue.notify.warning({message: Vue.t('vue.screenfull.canot')});
			return false;
		}
		screenfull.toggle();
	};
	var getSystemInfo = function() {
		return SystemInfo;
	};
	var setLang = function(lang) {
		if (isString(lang)) Vue.config.lang = lang;
	};
	var setLocale = function(lang, langObjs) {
		Vue.locale(lang, merge({}, Vue.locale(lang), langObjs));
	};
	var produceModel = function() {
		Vue.config.productionTip = false;
		Vue.config.devtools = false;
		Vue.config.silent = true;
	};
	var popupManager = {
		instances: {},
		zIndex: 2000,
		getInstance: function(id) {
			return popupManager.instances[id];
		},
		register: function(id, instance) {
			if (id && instance) {
				popupManager.instances[id] = instance;
			}
		},
		deregister: function(id) {
			if (id) {
				popupManager.instances[id] = null;
				delete popupManager.instances[id];
			}
		},
		nextZIndex: function() {
			return popupManager.zIndex++;
		},
		modalStack: [],
		openModal: function(id, zIndex) {
			if (!id || !isDef(zIndex)) return;
			var modalStack = this.modalStack;
			for (var i = 0, j = modalStack.length; i < j; i++) {
				var item = modalStack[i];
				if (item.id === id) return;
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
	var emitter = {
		methods: {
			dispatch: function(componentName, eventName, params) {
				var parent = this.$parent || this.$root;
				var name = parent.$options.componentName;
				while (parent && (!name || name !== componentName)) {
					parent = parent.$parent;
					if (parent) {
						name = parent.$options.componentName;
					}
				}
				if (parent) {
					parent.$emit.apply(parent, [eventName].concat(params));
				}
			},
			broadcast: function(componentName, eventName, params) {
				var broadcast = function(componentName, eventName, params) {
					loop(this.$children, function(child) {
						var name = child.$options.componentName;
						if (name === componentName) {
							child.$emit.apply(child, [eventName].concat(params));
						} else {
							broadcast.apply(child, [componentName, eventName].concat([params]));
						}
					});
				};
				broadcast.call(this, componentName, eventName, params);
			}
		}
	};
	var menumixin = {
		computed: {
			indexPath: function() {
				var path = [this.index];
				var parent = this.$parent;
				while (parent.$options.componentName !== 'VueMenu') {
					if (parent.index) {
						path.unshift(parent.index);
					}
					parent = parent.$parent;
				}
				return path;
			},
			rootMenu: function() {
				var parent = this.$parent;
				while (parent && parent.$options.componentName !== 'VueMenu') {
					parent = parent.$parent;
				}
				return parent;
			},
			parentMenu: function() {
				var parent = this.$parent;
				while (parent && ['VueMenu', 'VueSubmenu'].indexOf(parent.$options.componentName) === -1) {
					parent = parent.$parent;
				}
				return parent;
			},
			paddingStyle: function() {
				if (this.rootMenu.mode !== 'vertical') return {};
				var padding = 20;
				var parent = this.$parent;
				while (parent && parent.$options.componentName !== 'VueMenu') {
					if (parent.$options.componentName === 'VueSubmenu') {
						padding += 20;
					}
					parent = parent.$parent;
				}
				return {
					paddingLeft: padding + 'px'
				};
			}
		}
	};
	var collapseTransition = {
		functional: true,
		render: function(createElement, obj) {
			var vueComponent = obj.parent;
			var children = obj.children;
			var data = {
				on: {
					'beforeEnter': function(el) {
						if (!el.dataset) el.dataset = {};
						el.dataset.oldPaddingTop = el.style.paddingTop;
						el.dataset.oldPaddingBottom = el.style.paddingBottom;
						el.style.height = '0';
						el.style.paddingTop = 0;
						el.style.paddingBottom = 0;
						if (isFunction(vueComponent.collapseBeforeEnter)) {
							vueComponent.collapseBeforeEnter();
						}
					},
					'enter': function(el) {
						el.dataset.oldOverflow = el.style.overflow;
						if (el.scrollHeight !== 0) {
							el.style.height = el.scrollHeight + 'px';
							el.style.paddingTop = el.dataset.oldPaddingTop;
							el.style.paddingBottom = el.dataset.oldPaddingBottom;
						} else {
							el.style.height = '';
							el.style.paddingTop = el.dataset.oldPaddingTop;
							el.style.paddingBottom = el.dataset.oldPaddingBottom;
						}
						el.style.overflow = 'hidden';
						if (isFunction(vueComponent.collapseEnter)) {
							vueComponent.collapseEnter();
						}
					},
					'afterEnter': function(el) {
						el.style.height = '';
						el.style.overflow = el.dataset.oldOverflow;
						if (isFunction(vueComponent.collapseAfterEnter)) {
							vueComponent.collapseAfterEnter();
						}
					},
					'beforeLeave': function(el) {
						if (!el.dataset)
							el.dataset = {};
						el.dataset.oldPaddingTop = el.style.paddingTop;
						el.dataset.oldPaddingBottom = el.style.paddingBottom;
						el.dataset.oldOverflow = el.style.overflow;
						el.style.height = el.scrollHeight + 'px';
						el.style.overflow = 'hidden';
						if (isFunction(vueComponent.collapseBeforeLeave)) {
							vueComponent.collapseBeforeLeave();
						}
					},
					'leave': function(el) {
						if (el.scrollHeight !== 0) {
							el.style.height = 0;
							el.style.paddingTop = 0;
							el.style.paddingBottom = 0;
						}
						if (isFunction(vueComponent.collapseLeave)) {
							vueComponent.collapseLeave();
						}
					},
					'afterLeave': function(el) {
						el.style.height = '';
						el.style.overflow = el.dataset.oldOverflow;
						el.style.paddingTop = el.dataset.oldPaddingTop;
						el.style.paddingBottom = el.dataset.oldPaddingBottom;
						if (isFunction(vueComponent.collapseAfterLeave)) {
							vueComponent.collapseAfterLeave();
						}
					}
				}
			};
			loop(children, function(child) {
				child.data.class = ['collapse-transition'];
			});
			return createElement('transition', data, children);
		}
	};
	var clickoutside = function() {
		var nodes = document.__clickoutsideNodes__;
		var CTX = '@@clickoutsideContext';
		if (!isArray(nodes)) {
			nodes = document.__clickoutsideNodes__ = [];
			var clickOutSideFn = function(e) {
				loop(nodes, function(node) {
					node[CTX].documentHandler(e)
				});
			};
			on(document, 'click', clickOutSideFn);
		}
		return {
			bind: function(el, binding, vnode) {
				var id = nodes.push(el) - 1;
				var documentHandler = function(e) {
					if (!vnode.context || el.contains(e.target) || (vnode.context.popperElm && vnode.context.popperElm.contains(e.target)))
						return;
					if (binding.expression && el[CTX].methodName && vnode.context[el[CTX].methodName]) {
						vnode.context[el[CTX].methodName]();
					} else {
						el[CTX].bindingFn && el[CTX].bindingFn();
					}
				};
				el[CTX] = {
					id: id,
					documentHandler: documentHandler,
					methodName: binding.expression,
					bindingFn: binding.value
				};
			},
			update: function(el, binding) {
				el[CTX].methodName = binding.expression;
				el[CTX].bindingFn = binding.value;
			},
			unbind: function(el) {
				for (var i = 0, j = nodes.length; i < j; i++) {
					if (nodes[i][CTX].id === el[CTX].id) {
						nodes.splice(i, 1);
						break;
					}
				}
			}
		}
	};
	var getScrollParent = function(el) {
		var parent = el.parentNode;
		if (!parent) {
			return el;
		}
		if (parent === document) {
			if (document.body.scrollTop) {
				return document.body;
			} else {
				return document.documentElement;
			}
		}
		if (['scroll', 'auto'].indexOf(getStyle(parent, 'overflow')) !== -1 || ['scroll', 'auto'].indexOf(getStyle(parent, 'overflow-x')) !== -1 || ['scroll', 'auto'].indexOf(getStyle(parent, 'overflow-y')) !== -1) {
			return parent;
		}
		return getScrollParent(el.parentNode);
	};
	return {
		isDef: isDef,
		isString: isString,
		isNumber: isNumber,
		isBoolean: isBoolean,
		isFile: isFile,
		isObject: isObject,
		isArray: isArray,
		isFunction: isFunction,
		isDate: isDate,
		isNodeList: isNodeList,
		isElement: isElement,
		isVNode: isVNode,
		toString: toString,
		toDate: toDate,
		formatDate: formatDate,
		parseDate: parseDate,
		getDayCountOfMonth: getDayCountOfMonth,
		getFirstDayOfMonth: getFirstDayOfMonth,
		getWeekNumber: getWeekNumber,
		addDate: addDate,
		loop: loop,
		ownPropertyLoop: ownPropertyLoop,
		trim: trim,
		merge: merge,
		arrayToObject: arrayToObject,
		on: on,
		off: off,
		once: once,
		removeNode: removeNode,
		insertNodeAt: insertNodeAt,
		scrollBarWidth: scrollBarWidth,
		hasClass: hasClass,
		addClass: addClass,
		removeClass: removeClass,
		getStyle: getStyle,
		setStyle: setStyle,
		getCookie: getCookie,
		setCookie: setCookie,
		removeCookie: removeCookie,
		throttle: throttle,
		debounce: debounce,
		addResizeListener: addResizeListener,
		removeResizeListener: removeResizeListener,
		addTouchStart: addTouchStart,
		addTouchMove: addTouchMove,
		addTouchEnd: addTouchEnd,
		removeTouchStart: removeTouchStart,
		removeTouchMove: removeTouchMove,
		removeTouchEnd: removeTouchEnd,
		screenfull: screenfull,
		getSystemInfo: getSystemInfo,
		setLang: setLang,
		setLocale: setLocale,
		produceModel: produceModel,
		nextZIndex: popupManager.nextZIndex,
		version: version,
		component: {
			menumixin: menumixin,
			emitter: emitter,
			collapseTransition: collapseTransition,
			clickoutside: clickoutside,
			popupManager: popupManager,
			getScrollParent: getScrollParent
		}
	}
});
