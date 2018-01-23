(function(context, definition) {
	'use strict';
	if (typeof exports === 'object' && typeof module !== 'undefined') {
		module.exports = definition();
	} else if (typeof define === 'function' && define.amd) {
		define(['Vue', 'VueUtil'], definition);
	} else {
		context.VueTableColumn = definition(context.Vue, context.VueUtil);
		delete context.VueTableColumn;
	}
})(this, function(Vue, VueUtil) {
	'use strict';
	var columnIdSeed = 1;
	var defaults = {
		default: {
			order: ''
		},
		selection: {
			width: 53,
			minWidth: 53,
			realWidth: 53,
			order: '',
			className: 'vue-table-column--selection'
		},
		expand: {
			width: 53,
			minWidth: 53,
			realWidth: 53,
			order: ''
		},
		index: {
			width: 53,
			minWidth: 53,
			realWidth: 53,
			order: ''
		}
	};
	var forced = {
		selection: {
			property: 'selectionColumn',
			renderHeader: function(createElement) {
				return createElement('vue-checkbox', {
					on: {
						change: this.toggleAllSelection
					},
					attrs: {
						value: this.store.states.isAllSelected
					}
				}, []);
			},
			renderCell: function(createElement, data) {
				var row = data.row;
				var column = data.column;
				var store = data.store;
				var index = data.$index;
				return createElement('vue-checkbox', {
					attrs: {
						disabled: !!column.selectable && !column.selectable.call(null, row, index),
						value: store.isSelected(row)
					},
					on: {
						input: function() {
							store.commit('rowSelectedChanged', row)
						}
					}
				}, []);
			},
			sortable: false,
			resizable: false
		},
		index: {
			property: 'indexColumn',
			renderHeader: function(createElement) {
				return '#';
			},
			renderCell: function(createElement, data) {
				var n = data.$index;
				return createElement('div', null, [n + 1])
			},
			sortable: false
		},
		expand: {
			property: 'expandColumn',
			renderHeader: function(createElement) {
				return '';
			},
			renderCell: function(createElement, data, proxy) {
				var row = data.row;
				var store = data.store;
				var expanded = store.states.expandRows.indexOf(row) > -1;
				return createElement('div', {
					class: 'vue-table__expand-icon ' + (expanded ? 'vue-table__expand-icon--expanded' : ''),
					on: {
						click: function() {
							return proxy.handleExpandClick(row)
						}
					}
				}, [createElement('i', {
					class: 'vue-icon vue-icon-arrow-right'
				}, [])])
			},
			sortable: false,
			resizable: false,
			className: 'vue-table__expand-column'
		}
	};
	var VueTableColumn = {
		name: 'VueTableColumn',
		props: {
			type: {
				type: String,
				default: 'default'
			},
			label: String,
			className: [String, Function],
			labelClassName: String,
			property: String,
			prop: String,
			width: {},
			minWidth: {},
			sortable: {
				type: [String, Boolean],
				default: false
			},
			sortMethod: Function,
			resizable: {
				type: Boolean,
				default: true
			},
			context: {},
			align: String,
			headerAlign: String,
			showOverflowTooltip: Boolean,
			fixed: [Boolean, String],
			formatter: Function,
			selectable: Function,
			visible: {
				type: Boolean,
				default: true
			},
			filterMethod: Function,
			filteredValue: Array,
			filters: Array,
			filterPlacement: String,
			filterMultiple: {
				type: Boolean,
				default: true
			},
			aggregate: {
				type: String,
				default: ''
			},
			aggregateLabel: String,
			colspan: Boolean
		},
		beforeCreate: function() {
			this.row = {};
			this.column = {};
			this.$index = 0;
		},
		computed: {
			owner: function() {
				var parent = this.$parent;
				while (parent && !parent.tableId) {
					parent = parent.$parent;
				}
				return parent;
			}
		},
		created: function() {
			var slots = this.$slots.default;
			this.customRender = this.$options.render;
			this.$options.render = function(createElement) {
				return createElement('div', slots)
			}
			var columnId = this.columnId = ((this.$parent.tableId || (this.$parent.columnId + '_')) + 'column_' + columnIdSeed++);
			var parent = this.$parent;
			var owner = this.owner;
			var type = this.type;
			var width = this.width;
			if (VueUtil.isDef(width)) {
				width = parseInt(width, 10);
				if (isNaN(width)) {
					width = null;
				}
			}
			var minWidth = this.minWidth;
			if (VueUtil.isDef(minWidth)) {
				minWidth = parseInt(minWidth, 10);
				if (isNaN(minWidth)) {
					minWidth = 80;
				}
			}
			var getDefaultColumn = function(type, options) {
				var column = {};
				VueUtil.merge(column, defaults[type || 'default'], options);
				column.realWidth = column.width || column.minWidth;
				return column;
			};
			var column = getDefaultColumn(type, {
				id: columnId,
				label: this.label,
				className: this.className,
				labelClassName: this.labelClassName,
				property: this.prop || this.property,
				type: type,
				renderCell: null,
				renderHeader: this.renderHeader,
				minWidth: minWidth,
				width: width,
				visible: this.visible,
				context: this.context,
				align: this.align ? 'is-' + this.align : null,
				headerAlign: this.headerAlign ? 'is-' + this.headerAlign : 'is-center',
				sortable: this.sortable === '' ? true : this.sortable,
				sortMethod: this.sortMethod,
				resizable: this.resizable,
				showOverflowTooltip: this.showOverflowTooltip,
				formatter: this.formatter,
				selectable: this.selectable,
				fixed: this.fixed === '' ? true : this.fixed,
				fixedIndex: -1,
				filterMethod: this.filterMethod,
				filters: this.filters,
				filterable: this.filters || this.filterMethod,
				filterMultiple: this.filterMultiple,
				filterOpened: false,
				filteredValue: this.filteredValue || [],
				filterPlacement: this.filterPlacement || 'bottom',
				aggregate: this.aggregate,
				aggregateLabel: this.aggregateLabel,
				colspan: this.colspan,
				getCellClass: function(rowIndex, cellIndex, rowData) {
					var classes = [];
					var className = this.className;
					if (VueUtil.isString(className)) {
						classes.push(className);
					} else if (VueUtil.isFunction(className)) {
						classes.push(className.call(null, rowIndex, cellIndex, rowData) || '');
					}
					return classes.join(' ');
				}
			});
			VueUtil.merge(column, forced[type] || {});
			this.columnConfig = column;
			var renderCell = column.renderCell;
			var renderHeader = column.renderHeader;
			var self = this;
			column.renderHeader = function() {
				if (self.$scopedSlots.header) {
					column.renderHeader = function() {
						return self.$scopedSlots.header();
					};
				} else {
					column.renderHeader = renderHeader;
				}
			};
			if (type === 'expand') {
				owner.renderExpanded = function(createElement, data) {
					return self.$scopedSlots.default ? self.$scopedSlots.default(data) : self.$slots.default;
				}
				column.renderCell = function(createElement, data) {
					return createElement('div', {
						class: 'cell'
					}, [renderCell(createElement, data, this._renderProxy)]);
				}
				return;
			}
			column.renderCell = function(createElement, data) {
				if (self.$vnode.data.inlineTemplate) {
					renderCell = function() {
						data.self = self.context || data.self;
						if (VueUtil.isObject(data.self)) {
							VueUtil.merge(data, data.self);
						}
						data._staticTrees = self._staticTrees;
						data.$options.staticRenderFns = self.$options.staticRenderFns;
						return self.customRender.call(data);
					};
				} else if (self.$scopedSlots.default) {
					renderCell = function() {
						return self.$scopedSlots.default(data);
					};
				}
				if (!renderCell) {
					renderCell = function(createElement, data) {
						var row = data.row;
						var column = data.column;
						var property = column.property;
						var value = row[property];
						if (property && property.indexOf('.') !== -1) {
							var getValueByPath = function(object, prop) {
								prop = prop || '';
								var paths = prop.split('.');
								var current = object;
								var result = null;
								for (var i = 0, j = paths.length; i < j; i++) {
									var path = paths[i];
									if (!current)
										break;
									if (i === j - 1) {
										result = current[path];
										break;
									}
									current = current[path];
								}
								return result;
							};
							value = getValueByPath(row, property);
						}
						if (VueUtil.isFunction(column.formatter)) {
							return column.formatter(row, column, value);
						}
						return value;
					};
				}
				return self.showOverflowTooltip ? createElement('div',
					{'class': 'cell vue-tooltip'},
					[renderCell(createElement, data)]) : createElement('div', {
						class: 'cell'
					}, [renderCell(createElement, data)]);
			};
		},
		destroyed: function() {
			if (!this.$parent) return;
			this.owner.store.commit('removeColumn', this.columnConfig);
		},
		watch: {
			label: function(newVal) {
				if (this.columnConfig) {
					this.columnConfig.label = newVal;
				}
			},
			prop: function(newVal) {
				if (this.columnConfig) {
					this.columnConfig.property = newVal;
				}
			},
			property: function(newVal) {
				if (this.columnConfig) {
					this.columnConfig.property = newVal;
				}
			},
			filters: function(newVal) {
				if (this.columnConfig) {
					this.columnConfig.filters = newVal;
				}
			},
			filterMultiple: function(newVal) {
				if (this.columnConfig) {
					this.columnConfig.filterMultiple = newVal;
				}
			},
			align: function(newVal) {
				if (this.columnConfig) {
					this.columnConfig.align = newVal ? 'is-' + newVal : null;
					if (!this.headerAlign) {
						this.columnConfig.headerAlign = newVal ? 'is-' + newVal : null;
					}
				}
			},
			headerAlign: function(newVal) {
				if (this.columnConfig) {
					this.columnConfig.headerAlign = 'is-' + (newVal ? newVal : this.align);
				}
			},
			width: function(newVal) {
				if (this.columnConfig) {
					this.columnConfig.width = newVal;
					this.owner.doLayout();
				}
			},
			minWidth: function(newVal) {
				if (this.columnConfig) {
					this.columnConfig.minWidth = newVal;
					this.owner.doLayout();
				}
			},
			fixed: function(newVal) {
				if (this.columnConfig) {
					this.columnConfig.fixed = newVal;
					this.owner.doLayout();
				}
			},
			sortable: function(newVal) {
				if (this.columnConfig) {
					this.columnConfig.sortable = newVal;
				}
			},
			visible: function(newVal) {
				if (this.columnConfig) {
					this.columnConfig.visible = newVal;
					this.owner.doLayout();
				}
			}
		},
		mounted: function() {
			var owner = this.owner;
			var parent = this.$parent;
			var columnIndex;
			columnIndex = [].indexOf.call(parent.$refs.hiddenColumns.children, this.$el);
			owner.store.commit('insertColumn', this.columnConfig, columnIndex);
		}
	};
	Vue.component(VueTableColumn.name, VueTableColumn);
});
