(function(context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['Vue', 'Sortable', 'VueUtil'], definition);
	} else {
		context.VueSortable = definition(context.Vue, context.Sortable, context.VueUtil);
		delete context.VueSortable;
	}
})(this, function(Vue, Sortable, VueUtil) {
	'use strict';
	var arrayfrom = function(arr) {
		var isCallable = function(fn) {
			return typeof fn === 'function' || Object.prototype.toString.call(fn) === '[object Function]';
		};
		var toInteger = function(value) {
			var number = Number(value);
			if (isNaN(number)) {
				return 0;
			}
			if (number === 0 || !isFinite(number)) {
				return number;
			}
			return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
		};
		var maxSafeInteger = Math.pow(2, 53) - 1;
		var toLength = function(value) {
			var len = toInteger(value);
			return Math.min(Math.max(len, 0), maxSafeInteger);
		};
		var from = function(arrayLike) {
			var C = this;
			var items = Object(arrayLike);
			if (arrayLike == null) {
				throw new TypeError("Array.from requires an array-like object - not null or undefined");
			}
			var mapFn = arguments.length > 1 ? arguments[1] : void undefined;
			var T;
			if (typeof mapFn !== 'undefined') {
				if (!isCallable(mapFn)) {
					throw new TypeError('Array.from: when provided, the second argument must be a function');
				}
				if (arguments.length > 2) {
					T = arguments[2];
				}
			}
			var len = toLength(items.length);
			var A = isCallable(C) ? Object(new C(len)) : new Array(len);
			var k = 0;
			var kValue;
			while (k < len) {
				kValue = items[k];
				if (mapFn) {
					A[k] = typeof T === 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k);
				} else {
					A[k] = kValue;
				}
				k += 1;
			}
			A.length = len;
			return A;
		}
		return from(arr);
	};
	var toConsumableArray = function(arr) {
		if (VueUtil.isArray(arr)) {
			for (var i = 0, arr2 = Array(arr.length), j = arr.length; i < j; i++) {
				arr2[i] = arr[i];
			}
			return arr2;
		} else {
			return arrayfrom(arr);
		}
	};
	var computeVmIndex = function(vnodes, element) {
		if (vnodes) {
			return vnodes.map(function(elt) {
				return elt.elm;
			}).indexOf(element)
		} else {
			return -1;
		}
	}
	var computeIndexes = function(slots, children) {
		if (!slots) {
			return [];
		}
		var elmFromNodes = slots.map(function(elt) {
			return elt.elm;
		});
		var rawIndexes = [].concat(toConsumableArray(children)).map(function(elt) {
				return elmFromNodes.indexOf(elt);
		});
		return rawIndexes.filter(function(index){
			return index !== -1;
		});
	}
	var emit = function(evtName, evtData) {
		var self = this;
		self.$nextTick(function() {
			self.$emit(evtName.toLowerCase(), evtData);
		});
	}
	var delegateAndEmit = function(evtName) {
		var self = this;
		return function(evtData) {
			if (self.realList !== null) {
				self['onDrag' + evtName](evtData);
			}
			emit.call(self, evtName, evtData);
		}
	}
	var eventsListened = ['Start', 'Add', 'Remove', 'Update', 'End'];
	var eventsToEmit = ['Choose', 'Sort', 'Filter', 'Clone'];
	var readonlyProperties = ['Move'].concat(eventsListened, eventsToEmit).map(function(evt) {
		return 'on' + evt;
	});
	var draggingElement = null;
	var VueSortable = {
		name: 'VueSortable',
		props: {
			options: Object,
			value: {
				type: Array,
				default: null
			},
			clone: {
				type: Function,
				default: function(original) {
					return original;
				}
			},
			element: {
				type: String,
				default: 'div'
			},
			move: {
				type: Function,
				default: null
			}
		},
		data: function() {
			return {
				componentMode: false
			};
		},
		render: function(createElement) {
			return createElement(this.element, null, this.$slots.default);
		},
		mounted: function() {
			var self = this;
			self.componentMode = self.element.toLowerCase() !== self.$el.nodeName.toLowerCase();
			var optionsAdded = {};
			eventsListened.forEach(function(elt) {
				optionsAdded['on' + elt] = delegateAndEmit.call(self, elt);
			});
			eventsToEmit.forEach(function(elt) {
				optionsAdded['on' + elt] = emit.bind(self, elt);
			});
			var options = VueUtil.merge({}, self.options, optionsAdded, {
				onMove: function(evt, originalEvent) {
					return self.onDragMove(evt, originalEvent);
				}
			});
			!('draggable'in options) && (options.draggable = '>*');
			self._sortable = new Sortable(self.rootContainer,options);
			self.computeIndexes();
		},
		beforeDestroy: function() {
			this._sortable.destroy();
		},
		computed: {
			rootContainer: function() {
				return this.$el;
			},
			isCloning: function() {
				return !!this.options && !!this.options.group && this.options.group.pull === 'clone';
			},
			realList: function() {
				return this.value;
			}
		},
		watch: {
			options: {
				handler: function(newOptionValue) {
					for (var property in newOptionValue) {
						if (readonlyProperties.indexOf(property) === -1) {
							this._sortable.option(property, newOptionValue[property]);
						}
					}
				},
				deep: true
			},
			realList: function() {
				this.computeIndexes();
			}
		},
		methods: {
			getChildrenNodes: function() {
				if (this.componentMode) {
					return this.$children[0].$slots.default;
				}
				return this.$slots.default;
			},
			computeIndexes: function() {
				var self = this;
				self.$nextTick(function() {
					self.visibleIndexes = computeIndexes(self.getChildrenNodes(), self.rootContainer.children);
				});
			},
			getUnderlyingVm: function(htmlElt) {
				var index = computeVmIndex(this.getChildrenNodes(), htmlElt);
				if (index === -1)
					return null;
				var element = this.realList[index];
				return {
					index: index,
					element: element
				};
			},
			getUnderlyingPotencialDraggableComponent: function(ref) {
				return ref.__vue__;
			},
			emitChanges: function(evt) {
				var self = this;
				self.$nextTick(function() {
					self.$emit('change', evt);
				});
			},
			alterList: function(onList) {
				var newList = [].concat(toConsumableArray(this.value));
				onList(newList);
				this.$emit('input', newList);
			},
			spliceList: function() {
				var _arguments = arguments;
				var spliceList = function(list) {
					return list.splice.apply(list, _arguments);
				};
				this.alterList(spliceList);
			},
			updatePosition: function(oldIndex, newIndex) {
				var updatePosition = function(list) {
					return list.splice(newIndex, 0, list.splice(oldIndex, 1)[0]);
				};
				this.alterList(updatePosition);
			},
			getRelatedContextFromMoveEvent: function(ref) {
				var to = ref.to
				var related = ref.related;
				var component = this.getUnderlyingPotencialDraggableComponent(to);
				if (!component) {
					return {
						component: component
					};
				}
				var list = component.realList;
				var context = {
					list: list,
					component: component
				};
				if (to !== related && list && component.getUnderlyingVm) {
					var destination = component.getUnderlyingVm(related);
					if (destination) {
						return VueUtil.merge(destination, context);
					}
				}
				return context;
			},
			getVmIndex: function(domIndex) {
				var indexes = this.visibleIndexes;
				var numberIndexes = indexes.length;
				return (domIndex > numberIndexes - 1) ? numberIndexes : indexes[domIndex]
			},
			getComponent: function() {
				return this.$slots.default[0].componentInstance;
			},
			onDragStart: function(evt) {
				this.context = this.getUnderlyingVm(evt.item);
				evt.item._underlying_vm_ = this.clone(this.context.element);
				draggingElement = evt.item;
			},
			onDragAdd: function(evt) {
				var element = evt.item._underlying_vm_;
				if (element === undefined) {
					return;
				}
				VueUtil.removeNode(evt.item);
				var newIndex = this.getVmIndex(evt.newIndex);
				this.spliceList(newIndex, 0, element);
				this.computeIndexes();
				var added = {
					element: element,
					newIndex: newIndex
				};
				this.emitChanges({
					added: added
				});
			},
			onDragRemove: function(evt) {
				VueUtil.insertNodeAt(this.rootContainer, evt.item, evt.oldIndex);
				if (this.isCloning) {
					VueUtil.removeNode(evt.clone);
					return;
				}
				var oldIndex = this.context.index;
				this.spliceList(oldIndex, 1);
				var removed = {
					element: this.context.element,
					oldIndex: oldIndex
				};
				this.emitChanges({
					removed: removed
				});
			},
			onDragUpdate: function(evt) {
				var oldIndex = this.context.index;
				var newIndex = this.getVmIndex(evt.newIndex);
				VueUtil.removeNode(evt.item);
				VueUtil.insertNodeAt(evt.from, evt.item, evt.oldIndex);
				this.updatePosition(oldIndex, newIndex);
				var moved = {
					element: this.context.element,
					oldIndex: oldIndex,
					newIndex: newIndex
				};
				this.emitChanges({
					moved: moved
				});
			},
			computeFutureIndex: function(relatedContext, evt) {
				if (!relatedContext.element) {
					return 0;
				}
				var domChildren = [].concat(toConsumableArray(evt.to.children)).filter(function(el) {
					return el.style['display'] !== 'none';
				});
				var currentDOMIndex = domChildren.indexOf(evt.related);
				var currentIndex = relatedContext.component.getVmIndex(currentDOMIndex);
				var draggedInList = domChildren.indexOf(draggingElement) != -1;
				return (draggedInList || !evt.willInsertAfter) ? currentIndex : currentIndex + 1
			},
			onDragMove: function(evt) {
				var onMove = this.move;
				if (!onMove || !this.realList) {
					return true;
				}
				var relatedContext = this.getRelatedContextFromMoveEvent(evt);
				var draggedContext = this.context;
				var futureIndex = this.computeFutureIndex(relatedContext, evt);
				VueUtil.merge(draggedContext, {
					futureIndex: futureIndex
				});
				VueUtil.merge(evt, {
					relatedContext: relatedContext,
					draggedContext: draggedContext
				});
				return onMove(evt);
			},
			onDragEnd: function(evt) {
				this.computeIndexes();
				draggingElement = null;
			}
		}
	};
	Vue.component(VueSortable.name, VueSortable);
});
