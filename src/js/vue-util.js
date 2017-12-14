(function(context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['Vue', 'SystemInfo', 'DateUtil', 'Screenfull', 'VueI18n', 'VueResource'], definition);
	} else {
		context.VueUtil = definition(context.Vue, context.SystemInfo, context.DateUtil, context.Screenfull);
		delete context.SystemInfo;
		delete context.DateUtil;
		delete context.Screenfull;
		delete context.VueResource;
		delete context.VueI18n;
	}
})(this, function(Vue, SystemInfo, DateUtil, Screenfull) {
	'use strict';
	var isDef = function(v) {
		return v !== undefined && v !== null
	};
	var objType = function(obj) {
		return Object.prototype.toString.call(obj).slice(8, -1);
	};
	var isString = function(obj) {
		return isDef(obj) && objType(obj) === 'String';
	};
	var isNumber = function(obj) {
		return isDef(obj) && objType(obj) === 'Number';
	};
	var isBoolean = function(obj) {
		return isDef(obj) && objType(obj) === 'Boolean';
	};
	var isFile = function(obj) {
		return isDef(obj) && objType(obj) === 'File';
	};
	var isObject = function(obj) {
		return isDef(obj) && objType(obj) === 'Object';
	};
	var isArray = function(obj) {
		return isDef(obj) && objType(obj) === 'Array';
	};
	var isFunction = function(obj) {
		return isDef(obj) && objType(obj) === 'Function';
	};
	var isDate = function(obj) {
		return isDef(obj) && objType(obj) === 'Date';
	};
	var isNodeList = function(obj) {
		return isDef(obj) && objType(obj) === 'NodeList';
	};
	var isVNode = function(node) {
		return isObject(node) && node.hasOwnProperty('componentOptions');
	};
	var toString = function(val) {
		return !isDef(val) ? '' : typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
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
		temp.setDate(1);
		return temp.getDay();
	};
	var getWeekNumber = function(src) {
		var date = toDate(src);
		date.setHours(0, 0, 0, 0);
		date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
		var week1 = new Date(date.getFullYear(), 0, 4);
		return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
	};
	var getStartDateOfMonth = function(year, month) {
		var DAY_DURATION = 86400000;
		var result = new Date(year,month,1);
		var day = result.getDay();
		if (day === 0) {
			result.setTime(result.getTime() - DAY_DURATION * 7);
		} else {
			result.setTime(result.getTime() - DAY_DURATION * day);
		}
		return result;
	};
	var addDate = function(src, num, type) {
		src = toDate(src);
		if (!src) return new Date;
		if (!type) type = 'day';
		var result = new Date();
		switch (type.toLowerCase()) {
			case 'week':
				var week = 7;
			case 'day':
				var DAY_DURATION = 86400000;
				result.setTime(src.getTime() + DAY_DURATION * num * (week||1));
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
	var trim = function(str) {
		if (!isString(str)) str = '';
		return str.replace(/^[\s\uFEFF]+|[\s\uFEFF]+$/g, '');
	};
	var merge = function(target) {
		for (var i = 1, j = arguments.length; i < j; i++) {
			var source = arguments[i] || {};
			for (var prop in source) {
				if (Object.prototype.hasOwnProperty.call(source, prop) && (isDef(source[prop]))) {
					if (isObject(target[prop]) && isObject(source[prop])) {
						target[prop] = merge({}, target[prop], source[prop]);
					} else {
						target[prop] = source[prop];
					}
				}
			}
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
		return function(element, event, handler, useCapture) {
			if (element && event && handler) {
				element.addEventListener(event, handler, useCapture);
			}
		}
	})();
	var off = (function() {
		return function(element, event, handler, useCapture) {
			if (element && event) {
				element.removeEventListener(event, handler, useCapture);
			}
		}
	})();
	var once = function(el, event, fn) {
		var listener = function() {
			if (isFunction(fn)) {
				fn.apply(this, arguments);
			}
			off(el, event, listener);
		};
		on(el, event, listener);
	};
	var hasClass = function(el, clazz) {
		if (!isDef(el) || !isDef(clazz)) return false;
		return (new RegExp('(\\s|^)' + clazz + '(\\s|$)')).test(el.className);
	};
	var addClass = function(el, clazz) {
		if (isDef(el) && isDef(clazz) && !hasClass(el, clazz)) el.className += ' ' + clazz;
	};
	var removeClass = function(el, clazz) {
		if (hasClass(el, clazz)) {
			var reg = new RegExp('(\\s|^)' + clazz + '(\\s|$)');
			el.className = el.className.replace(reg, ' ');
		}
	};
	var getStyle = function(element, styleName) {
		if (!isDef(element) || !isDef(styleName)) return null;
		if (styleName === 'float') {
			styleName = 'cssFloat';
		}
		var computed = getComputedStyle(element, '');
		return computed[styleName];
	};
	var setStyle = function(element, styleName, value) {
		if (!isDef(element) || !isDef(styleName)) return;
		if (isObject(styleName)) {
			for (var prop in styleName) {
				if (styleName.hasOwnProperty(prop)) {
					setStyle(element, prop, styleName[prop]);
				}
			}
		} else {
			element.style[styleName] = value;
		}
	};
	var getCookie = function(name) {
		var arr = document.cookie.replace(/\s/g, "").split(';');
		for (var i=0, j=arr.length; i < j; i++) {
			var tempArr = arr[i].split('=');
			if (tempArr[0] === name) return decodeURIComponent(tempArr[1]);
		}
		return '';
	};
	var setCookie = function(name, value, days) {
		var date = new Date
		date.setDate(date.getDate() + days);
		document.cookie = name + '=' + value + ';expires=' + date;
	};
	var removeCookie = function(name) {
		setCookie(name, '1', -1);
	};
	var throttle = function(delay, callback) {
		var timer = null;
		var wrapper = function() {
			var self = this;
			var args = arguments;
			clearTimeout(timer);
			timer = setTimeout(function(){
				isFunction(callback) && callback.apply(self, args);
				clearTimeout(timer);
			}, delay);
		};
		return wrapper;
	};
	var addResizeListener = function(element, fn) {
		if (!isDef(fn)) {
			fn = element;
			element = document.body;
		}
		if (element !== document.body) {
			var getDisplayParent = function(element) {
				var parent = element.parentNode;
				if (!parent) return true;
				if (parent === document) return true;
				if ((getStyle(parent, 'display')) === 'none') return false;
				return getDisplayParent(element.parentNode);
			};
			if (getDisplayParent(element)) element = document.body;
		}
		if (!isArray(element.__resizeListeners__)) {
			var resetTrigger = function(element) {
				var trigger = element.__resizeTrigger__;
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
			var resizeListeners = throttle(100, function(element, event) {
				if (element.offsetWidth !== element.__resizeLast__.width || element.offsetHeight !== element.__resizeLast__.height) {
					element.__resizeLast__.width = element.offsetWidth;
					element.__resizeLast__.height = element.offsetHeight;
					loop(element.__resizeListeners__, function(fn) {
						fn.call(element, event);
					});
				}
			});
			var scrollListener = function(event) {
				resetTrigger(element);
				resizeListeners(element, event);
			};
			var resizeStart = function(event) {
				if (event.animationName === 'resizeanim') {
					resetTrigger(element);
				}
			};
			if (getComputedStyle(element).position === 'static') {
				element.style.position = 'relative';
			}
			var resizeTrigger = element.__resizeTrigger__ = document.createElement('div');
			resizeTrigger.className = 'resize-triggers';
			resizeTrigger.innerHTML = '<div class="expand-trigger"><div></div></div><div class="contract-trigger"></div>';
			on(resizeTrigger, 'animationstart', resizeStart);
			element.__resizeLast__ = {};
			element.__resizeListeners__ = [];
			element.appendChild(resizeTrigger);
			on(element, 'scroll', scrollListener, true);
		}
		isFunction(fn) && element.__resizeListeners__.push(fn);
	};
	var removeResizeListener = function(element, fn) {
		if (!isDef(fn)) {
			fn = element;
			element = document.body;
		}
		if (isArray(element.__resizeListeners__)) {
			element.__resizeListeners__.splice(element.__resizeListeners__.indexOf(fn), 1);
		}
	};
	var setLang = function(lang) {
		if(isDef(lang)) Vue.config.lang = lang;
	};
	var setLocale = function(lang, langObjs) {
		langObjs = merge({}, Vue.locale(lang), langObjs);
		Vue.locale(lang, langObjs);
	};
	var noLog = function() {
		Vue.config.silent = true;
	};
	var removeNode = function(node) {
		node && node.parentElement && node.parentElement.removeChild(node);
	};
	var insertNodeAt = function(fatherNode, node, position) {
		if (!isDef(position)) position = 0;
		var refNode = (position === 0) ? fatherNode.children[0] : fatherNode.children[position - 1].nextSibling
		fatherNode.insertBefore(node, refNode)
	};
	var scrollBarWidth = function() {
		var outer = document.createElement('div');
		outer.className = 'vue-scrollbar__wrap';
		outer.style.visibility = 'hidden';
		outer.style.width = '100px';
		outer.style.position = 'absolute';
		outer.style.top = '-9999px';
		document.body.appendChild(outer);
		var widthNoScroll = outer.offsetWidth;
		outer.style.overflow = 'scroll';
		var inner = document.createElement('div');
		inner.style.width = '100%';
		outer.appendChild(inner);
		var widthWithScroll = inner.offsetWidth;
		removeNode(outer);
		return widthNoScroll - widthWithScroll;
	};
	var screenfull = function() {
		if (!Screenfull.enabled) {
			Vue.notify.warning({message: Vue.t('vue.screenfull.canot')});
			return false;
		}
		Screenfull.toggle();
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
	var getSystemInfo = function() {
		return SystemInfo;
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
				if (this.rootMenu.mode !== 'vertical')
					return {};
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
						if (!el.dataset)
							el.dataset = {};
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
	var getScrollParent = function(element) {
		var parent = element.parentNode;
		if (!parent) {
			return element;
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
		return getScrollParent(element.parentNode);
	};
	return {
		isDef: isDef,
		objType: objType,
		isString: isString,
		isNumber: isNumber,
		isBoolean: isBoolean,
		isFile: isFile,
		isObject: isObject,
		isArray: isArray,
		isFunction: isFunction,
		isDate: isDate,
		isVNode: isVNode,
		toString: toString,
		toDate: toDate,
		formatDate: formatDate,
		parseDate: parseDate,
		getDayCountOfMonth: getDayCountOfMonth,
		getFirstDayOfMonth: getFirstDayOfMonth,
		getWeekNumber: getWeekNumber,
		getStartDateOfMonth: getStartDateOfMonth,
		addDate: addDate,
		loop: loop,
		trim: trim,
		merge: merge,
		arrayToObject: arrayToObject,
		on: on,
		off: off,
		once: once,
		hasClass: hasClass,
		addClass: addClass,
		removeClass: removeClass,
		getStyle: getStyle,
		setStyle: setStyle,
		getCookie: getCookie,
		setCookie: setCookie,
		removeCookie: removeCookie,
		throttle: throttle,
		addResizeListener: addResizeListener,
		removeResizeListener: removeResizeListener,
		setLang: setLang,
		setLocale: setLocale,
		noLog: noLog,
		removeNode: removeNode,
		insertNodeAt: insertNodeAt,
		scrollBarWidth: scrollBarWidth,
		screenfull: screenfull,
		addTouchStart: addTouchStart,
		addTouchMove: addTouchMove,
		addTouchEnd: addTouchEnd,
		removeTouchStart: removeTouchStart,
		removeTouchMove: removeTouchMove,
		removeTouchEnd: removeTouchEnd,
		getSystemInfo: getSystemInfo,
		nextZIndex: popupManager.nextZIndex,
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
