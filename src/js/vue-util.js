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
	var isServer = Vue.prototype.$isServer;
	var isVNode = function(node) {
		return typeof node === 'object' && Object.prototype.hasOwnProperty.call(node, 'componentOptions');
	};
	var objType = function(obj) {
		return Object.prototype.toString.call(obj);
	}
	var isArray = Array.isArray || function(obj) {
		return obj && objType(obj) === '[object Array]';
	};
	var isFunction = function(obj) {
		return obj && objType(obj) === '[object Function]';
	};
	var isUndef = function(v) {
		return v === undefined || v === null
	};
	var isDef = function(v) {
		return v !== undefined && v !== null
	};
	var trim = function(string) {
		if (typeof string !== 'string') string = '';
		return string.replace(/^[\s\uFEFF]+|[\s\uFEFF]+$/g, '');
	};
	var on = (function() {
		if (!isServer && document.addEventListener) {
			return function(element, event, handler) {
				if (element && event && handler) {
					element.addEventListener(event, handler, false);
				}
			}
		} else {
			return function(element, event, handler) {
				if (element && event && handler) {
					element.attachEvent('on' + event, handler);
				}
			}
		}
	})();
	var off = (function() {
		if (!isServer && document.removeEventListener) {
			return function(element, event, handler) {
				if (element && event) {
					element.removeEventListener(event, handler, false);
				}
			}
		} else {
			return function(element, event, handler) {
				if (element && event) {
					element.detachEvent('on' + event, handler);
				}
			}
		}
	})();
	var once = function(el, event, fn) {
		var listener = function() {
			if (fn) {
				fn.apply(this, arguments);
			}
			off(el, event, listener);
		};
		on(el, event, listener);
	};
	var hasClass = function(el, clazz) {
		return (new RegExp('(\\s|^)' + clazz + '(\\s|$)')).test(el.className);
	};
	var addClass = function(el, clazz) {
		if (!hasClass(el, clazz)) {
			el.className += ' ' + clazz;
		}
	};
	var removeClass = function(el, clazz) {
		if (hasClass(el, clazz)) {
			var reg = new RegExp('(\\s|^)' + clazz + '(\\s|$)');
			el.className = el.className.replace(reg, ' ');
		}
	};
	var camelCase = function(name) {
		return name.replace(/([\:\-\_]+(.))/g, function(_, separator, letter, offset) {
			return offset ? letter.toUpperCase() : letter;
		}).replace(/^moz([A-Z])/, 'Moz$1');
	};
	var getStyle = function(element, styleName) {
		if (isServer) return;
		if (!element || !styleName) return null;
		styleName = camelCase(styleName);
		if (styleName === 'float') {
			styleName = 'cssFloat';
		}
		try {
			var computed = document.defaultView.getComputedStyle(element, '');
			return element.style[styleName] || computed ? computed[styleName] : null;
		} catch (e) {
			return element.style[styleName];
		}
	};
	var setStyle = function(element, styleName, value) {
		if (!element || !styleName) return;
		if (typeof styleName === 'object') {
			for (var prop in styleName) {
				if (styleName.hasOwnProperty(prop)) {
					setStyle(element, prop, styleName[prop]);
				}
			}
		} else {
			styleName = camelCase(styleName);
			element.style[styleName] = value;
		}
	};
	var getCookie = function(name) {
		var arr = document.cookie.replace(/\s/g, "").split(';');
		for (var i=0, j=arr.length; i < j; i++) {
			var tempArr = arr[i].split('=');
			if (tempArr[0] === name) 
				return decodeURIComponent(tempArr[1]);
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
			if (isDef(timer)) clearTimeout(timer);
			timer = setTimeout(function(){
				callback.apply(self, args);
				clearTimeout(timer);
			}, delay);
		};
		return wrapper;
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
			if (isServer) return;
			if (!id || isUndef(zIndex)) return;
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
	var merge = function(target) {
		for (var i = 1, j = arguments.length; i < j; i++) {
			var source = arguments[i] || {};
			for (var prop in source) {
				var value = source[prop];
				if (isDef(value)) {
					target[prop] = value;
				}
			}
		}
		return target;
	};
	var mergeArray = function(arr) {
		if (isArray(arr)) {
			for (var i = 0, arr2 = Array(arr.length), j = arr.length; i < j; i++) {
				var arrObj = arr[i];
				if (typeof arrObj === 'object') {
					arr2[i] = merge({}, arrObj);
				} else {
					arr2[i] = arrObj;
				}
			}
			return arr2;
		}
		return [];
	};
	var addResizeListener = function(element, fn) {
		if (isServer) return;
		if (isUndef(fn)) fn = element;
		element = document.body;
		if (document.addEventListener) {
			var stylesCreated = false;
			var animation = false;
			var RESIZE_ANIMATION_NAME = 'resizeanim';
			var keyFramePrefix = '';
			var animationStartEvent = 'animationstart';
			var DOM_PREFIXES = 'Webkit Moz O ms'.split(' ');
			var START_EVENTS = 'webkitAnimationStart animationstart oAnimationStart MSAnimationStart'.split(' ');
			var testElement = document.createElement('fakeelement');
			if (isDef(testElement.style.animationName)) {
				animation = true;
			}
			if (animation === false) {
				var prefix = '';
				for (var i = 0, j = DOM_PREFIXES.length; i < j; i++) {
					if (isDef(testElement.style[DOM_PREFIXES[i] + 'AnimationName'])) {
						prefix = DOM_PREFIXES[i];
						keyFramePrefix = '-' + prefix.toLowerCase() + '-';
						animationStartEvent = START_EVENTS[i];
						animation = true;
						break;
					}
				}
			}
			var createStyles = function() {
				if (!stylesCreated && isDef(window)) {
					var animationKeyframes = '@' + keyFramePrefix + 'keyframes ' + RESIZE_ANIMATION_NAME + ' {from {opacity: 0;} to {opacity: 0;}} ';
					var animationStyle = keyFramePrefix + 'animation: 1ms ' + RESIZE_ANIMATION_NAME + ';';
					var css = animationKeyframes + '\n .resize-triggers {' + animationStyle + ' visibility: hidden; opacity: 0;}\n .resize-triggers, .resize-triggers > div, .contract-trigger:before {content: " "; display: block; position: absolute; top: 0; left: 0; height: 100%; width: 100%; overflow: hidden;}\n .resize-triggers > div {background: #eee; overflow: auto;}\n .contract-trigger:before {width: 200%; height: 200%;}';
					var head = document.head || document.getElementsByTagName('head')[0];
					var style = document.createElement('style');
					style.type = 'text/css';
					if (style.styleSheet) {
						style.styleSheet.cssText = css;
					} else {
						style.appendChild(document.createTextNode(css));
					}
					head.appendChild(style);
					stylesCreated = true;
				}
			};
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
			var resizeListeners = function(element, event) {
				if (element.offsetWidth !== element.__resizeLast__.width || element.offsetHeight !== element.__resizeLast__.height) {
					element.__resizeLast__.width = element.offsetWidth;
					element.__resizeLast__.height = element.offsetHeight;
					element.__resizeListeners__.forEach(function(fn) {
						fn = throttle(20, fn);
						fn.call(element, event);
					});
				}
			};
			var scrollListener = function(event) {
				resetTrigger(this);
				resizeListeners(this, event);
			};
			if (!element.__resizeTrigger__) {
				if (getComputedStyle(element).position === 'static') {
					element.style.position = 'relative';
				}
				createStyles();
				element.__resizeLast__ = {};
				element.__resizeListeners__ = [];
				var resizeTrigger = element.__resizeTrigger__ = document.createElement('div');
				resizeTrigger.className = 'resize-triggers';
				resizeTrigger.innerHTML = '<div class="expand-trigger"><div></div></div><div class="contract-trigger"></div>';
				element.appendChild(resizeTrigger);
				element.addEventListener('scroll', scrollListener, true);
				if (animationStartEvent) {
					var resizeStart = function(event) {
						if (event.animationName === RESIZE_ANIMATION_NAME) {
							resetTrigger(element);
							resizeTrigger.removeEventListener(animationStartEvent, resizeStart);
						}
					}
					resizeTrigger.addEventListener(animationStartEvent, resizeStart);
				}
			}
			element.__resizeListeners__.push(fn);
		} else {
			element.attachEvent('onresize', fn);
		}
	};
	var removeResizeListener = function(element, fn) {
		if (isUndef(fn)) fn = element;
		element = document.body;
		if (document.removeEventListener && element.__resizeListeners__.indexOf(fn)) {
			element.__resizeListeners__.splice(element.__resizeListeners__.indexOf(fn), 1);
		} else {
			element.detachEvent('onresize', fn);
		}
	};
	var isDate = function(date) {
		if (isUndef(date)) return false;
		if (isNaN(new Date(date).getTime())) return false;
		return true;
	};
	var toDate = function(date) {
		return isDate(date) ? new Date(date) : null;
	};
	var formatDate = function(date, format) {
		date = toDate(date);
		if (!date) return '';
		return DateUtil.format(date, format || 'yyyy-MM-dd');
	};
	var parseDate = function(string, format) {
		string = formatDate(string, format);
		return DateUtil.parse(string, format || 'yyyy-MM-dd');
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
				for (var i=0; i<num; i++) {
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
	var setLang = function(lang) {
		if (lang) {
			Vue.config.lang = lang;
		}
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
		if (isUndef(position)) position = 0;
		var refNode = (position === 0) ? fatherNode.children[0] : fatherNode.children[position - 1].nextSibling
		fatherNode.insertBefore(node, refNode)
	};
	var arrayToObject = function(arr) {
		var res = {};
		for (var i = 0, j = arr.length; i < j; i++) {
			var arrObj = arr[i];
			if (arrObj) {
				for (var key in arrObj) {
					res[key] = arrObj[key];
				}
			}
		}
		return res;
	};
	var screenfull = function() {
		if (!Screenfull.enabled) {
			this.$alert(this.$t('vue.screenfull.canot'), {
				type: 'warning'
			});
			return false;
		}
		Screenfull.toggle();
	};
	var addTouchStart = function(el, fn) {
		on(el, 'mousedown', fn);
		if ('ontouchstart' in window) {
			on(el, 'touchstart', fn);
		}
	};
	var removeTouchStart = function(el, fn) {
		off(el, 'mousedown', fn);
		if ('ontouchstart' in window) {
			off(el, 'touchstart', fn);
		}
	};
	var addTouchMove = function(el, fn) {
		on(el, 'mousemove', fn);
		if ('ontouchstart' in window) {
			on(el, 'touchmove', fn);
		}
	};
	var removeTouchMove = function(el, fn) {
		off(el, 'mousemove', fn);
		if ('ontouchstart' in window) {
			off(el, 'touchmove', fn);
		}
	};
	var addTouchEnd = function(el, fn) {
		on(el, 'mouseup', fn);
		if ('ontouchstart' in window) {
			on(el, 'touchend', fn);
		}
	};
	var removeTouchEnd = function(el, fn) {
		off(el, 'mouseup', fn);
		if ('ontouchstart' in window) {
			off(el, 'touchend', fn);
		}
	};
	var getSystemInfo = function() {
		return SystemInfo;
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
					this.$children.forEach(function(child) {
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
						if (typeof vueComponent.collapseBeforeEnter === 'function') {
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
						if (typeof vueComponent.collapseEnter === 'function') {
							vueComponent.collapseEnter();
						}
					},
					'afterEnter': function(el) {
						el.style.height = '';
						el.style.overflow = el.dataset.oldOverflow;
						if (typeof vueComponent.collapseAfterEnter === 'function') {
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
						if (typeof vueComponent.collapseBeforeLeave === 'function') {
							vueComponent.collapseBeforeLeave();
						}
					},
					'leave': function(el) {
						if (el.scrollHeight !== 0) {
							el.style.height = 0;
							el.style.paddingTop = 0;
							el.style.paddingBottom = 0;
						}
						if (typeof vueComponent.collapseLeave === 'function') {
							vueComponent.collapseLeave();
						}
					},
					'afterLeave': function(el) {
						el.style.height = '';
						el.style.overflow = el.dataset.oldOverflow;
						el.style.paddingTop = el.dataset.oldPaddingTop;
						el.style.paddingBottom = el.dataset.oldPaddingBottom;
						if (typeof vueComponent.collapseAfterLeave === 'function') {
							vueComponent.collapseAfterLeave();
						}
					}
				}
			};
			children.forEach(function(child) {
				child.data.class = ['collapse-transition'];
			});
			return createElement('transition', data, children);
		}
	};
	var clickoutside = function() {
		var nodeList = [];
		var CTX = '@@clickoutsideContext';
		var clickOutSideFn = function(e) {
			nodeList.forEach(function(node) {
				node[CTX].documentHandler(e)
			});
		};
		if (!isServer) {
			on(document, 'click', clickOutSideFn);
		}
		return {
			bind: function(el, binding, vnode) {
				var id = nodeList.push(el) - 1;
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
				for (var i = 0, j = nodeList.length; i < j; i++) {
					if (nodeList[i][CTX].id === el[CTX].id) {
						nodeList.splice(i, 1);
						break;
					}
				}
			}
		}
	};
	var scrollBarWidth = function() {
		if (isServer) return;
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
		outer.parentNode.removeChild(outer);
		return widthNoScroll - widthWithScroll;
	};
	return {
		on: on,
		off: off,
		once: once,
		trim: trim,
		hasClass: hasClass,
		addClass: addClass,
		removeClass: removeClass,
		getStyle: getStyle,
		setStyle: setStyle,
		getCookie: getCookie,
		setCookie: setCookie,
		removeCookie: removeCookie,
		merge: merge,
		mergeArray: mergeArray,
		addResizeListener: addResizeListener,
		removeResizeListener: removeResizeListener,
		parseDate: parseDate,
		formatDate: formatDate,
		isDate: isDate,
		toDate: toDate,
		addDate: addDate,
		noLog: noLog,
		setLang: setLang,
		setLocale: setLocale,
		removeNode: removeNode,
		insertNodeAt: insertNodeAt,
		arrayToObject: arrayToObject,
		screenfull: screenfull,
		objType: objType,
		isArray: isArray,
		isFunction: isFunction,
		isServer: isServer,
		isVNode: isVNode,
		isUndef: isUndef,
		isDef: isDef,
		getDayCountOfMonth: getDayCountOfMonth,
		getWeekNumber: getWeekNumber,
		getFirstDayOfMonth: getFirstDayOfMonth,
		getStartDateOfMonth: getStartDateOfMonth,
		addTouchStart: addTouchStart,
		addTouchMove: addTouchMove,
		addTouchEnd: addTouchEnd,
		removeTouchStart: removeTouchStart,
		removeTouchMove: removeTouchMove,
		removeTouchEnd: removeTouchEnd,
		throttle: throttle,
		getSystemInfo: getSystemInfo,
		scrollBarWidth: scrollBarWidth,
		component: {
			menumixin: menumixin,
			emitter: emitter,
			collapseTransition: collapseTransition,
			clickoutside: clickoutside,
			popupManager: popupManager
		}
	}
});
