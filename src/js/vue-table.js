(function(context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['Vue', 'VueUtil', 'VuePopper'], definition);
	} else {
		context.VueTable = definition(context.Vue, context.VueUtil, context.VuePopper);
		delete context.VueTable;
	}
})(this, function(Vue, VueUtil, VuePopper) {
	'use strict';
	var isFirefox = VueUtil.getSystemInfo().browser.toLowerCase() === 'firefox';
	var Dropdown = {
		dropdowns: [],
		open: function(instance) {
			if (instance) {
				this.dropdowns.push(instance);
			}
		},
		close: function(instance) {
			var index = this.dropdowns.indexOf(instance);
			if (index !== -1) {
				this.dropdowns.splice(instance, 1);
			}
		}
	};
	var appendLine = function(content, row, options) {
		var separator = options.separator;
		var quoted = options.quoted
		var line = row.map(function(data) {
			if (!quoted) return data;
			data = typeof data === 'string' ? data.replace(/"/g, '"') : data;
			return '"' + data + '"';
		});
		content.push(line.join(separator));
	};
	var tableDataToCsv = function(columns, datas, options, noHeader) {
		if (typeof noHeader === 'undefined') noHeader = false;
		options = Object.assign({}, {separator: ',', quoted: false}, options);
		var columnOrder;
		var content = [];
		var column = [];
		if (columns) {
			columnOrder = columns.map(function(v) {
				if (typeof v === 'string') return v;
				if (!noHeader) {
					column.push(typeof v.label !== 'undefined' ? v.label : v.property);
				}
				return v.property;
			});
			if (column.length > 0) appendLine(content, column, options);
		} else {
			columnOrder = [];
			datas.forEach(function(v) {
				if (!VueUtil.isArray(v)) {
					columnOrder = columnOrder.concat(Object.keys(v));
				}
			});
			if (columnOrder.length > 0) {
				columnOrder = columnOrder.filter(function(value, index, self) {return self.indexOf(value) === index;});
				if (!noHeader) appendLine(content, columnOrder, options);
			}
		}
		if (VueUtil.isArray(datas)) {
			datas.forEach(function(row) {
				if (!VueUtil.isArray(row)) {
					row = columnOrder.map(function(k) {return typeof row[k] !== 'undefined' ? row[k] : '';});
				}
				appendLine(content, row, options);
			});
		}
		return content.join('\r\n');
	};
	var getDownloadUrl = function(text) {
		var BOM = '\uFEFF';
		if (window.Blob && window.URL && window.URL.createObjectURL) {
			var csvData = new Blob([BOM + text], {type: 'text/csv'});
			return URL.createObjectURL(csvData);
		} else {
			return 'data:attachment/csv;charset=utf-8,' + BOM + encodeURIComponent(text);
		}
	};
	var exportFile = function(fileName, text) {
		if (navigator.msSaveBlob) {
			var BOM = '\uFEFF';
			var csvData = new Blob([BOM + text], {type: 'text/csv'});
			navigator.msSaveBlob(csvData, fileName);
		} else {
			try {
				var link = document.createElement('a');
				link.download = fileName;
				link.href = getDownloadUrl(text);
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			} catch (e) {
				Vue.notify({
					message: Vue.t('vue.screenfull.canot'),
					type: "warning"
				});
			}
		}
	};
	var scrollFilter = function(slots, delta) {
		if (delta.keeps === 0 || slots.length <= delta.keeps) {
			delta.paddingTop = 0;
			delta.allPadding = 0;
			return slots;
		}
		delta.total = slots.length;
		delta.paddingTop = delta.size * delta.start;
		delta.allPadding = delta.size * (slots.length - delta.keeps);
		delta.paddingTop < 0 ? delta.paddingTop = 0 : undefined;
		delta.allPadding < 0 ? delta.allPadding = 0 : undefined;
		delta.allPadding < delta.paddingTop ? delta.allPadding = delta.paddingTop : undefined;
		var result = [];
		for (var i = delta.start, j = delta.end; i < j; i++) {
			result.push(slots[i]);
		}
		return result;
	};
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
	var getCell = function(event) {
		var cell = event.target;
		while (cell && cell.tagName.toUpperCase() !== 'HTML') {
			if (cell.tagName.toUpperCase() === 'TD') {
				return cell;
			}
			cell = cell.parentNode;
		}
		return null;
	};
	var getAllColumns = function(columns) {
		var result = [];
		columns.forEach(function(column) {
			if (column.children) {
				result.push(column);
				result.push.apply(result, getAllColumns(column.children));
			} else {
				result.push(column);
			}
		});
		return result;
	};
	var convertToRows = function(originColumns) {
		var maxLevel = 1;
		var traverse = function(column, parent) {
			if (parent) {
				column.level = parent.level + 1;
				if (maxLevel < column.level) {
					maxLevel = column.level;
				}
			}
			if (column.children) {
				var childrenMax = 1;
				var colSpan = 0;
				column.children.forEach(function(subColumn) {
					var temp = traverse(subColumn, column);
					if (temp > childrenMax) {
						childrenMax = temp;
					}
					colSpan += subColumn.colSpan;
				});
				column.colSpan = colSpan;
			} else {
				column.colSpan = 1;
			}
		};
		originColumns.forEach(function(column) {
			column.level = 1;
			traverse(column);
		});
		var rows = [];
		for (var i = 0; i < maxLevel; i++) {
			rows.push([]);
		}
		var allColumns = getAllColumns(originColumns);
		allColumns.forEach(function(column) {
			if (!column.children) {
				column.rowSpan = maxLevel - column.level + 1;
			} else {
				column.rowSpan = 1;
			}
			rows[column.level - 1].push(column);
		});
		return rows;
	};
	var orderBy = function(array, sortKey, reverse, sortMethod) {
		if (typeof reverse === 'string') {
			reverse = reverse === 'descending' ? -1 : 1;
		}
		if (!sortKey) {
			return array;
		}
		var order = (reverse && reverse < 0) ? -1 : 1;
		return array.slice().sort(sortMethod ? function(a, b) {
			return sortMethod(a, b) ? order : -order;
		} : function(a, b) {
			if (sortKey !== '$key') {
				if (typeof a === 'object' && '$value'in a)
					a = a.$value;
				if (typeof b === 'object' && '$value'in b)
					b = b.$value;
			}
			a = typeof a === 'object' ? getValueByPath(a, sortKey) : a;
			b = typeof b === 'object' ? getValueByPath(b, sortKey) : b;
			return a === b ? 0 : a > b ? order : -order;
		});
	};
	var getColumnById = function(table, columnId) {
		var column = null;
		for (var i=0, j=table.columns.length; i<j; i++) {
			var item = table.columns[i];
			if (item.id === columnId) {
				column = item;
				break;
			}
		}
		return column;
	};
	var getColumnByCell = function(table, cell) {
		var matches = (cell.className || '').match(/vue-table_[^\s]+/gm);
		if (matches) {
			return getColumnById(table, matches[0]);
		}
		return null;
	};
	var sortData = function(data, states) {
		var sortingColumn = states.sortingColumn;
		if (!sortingColumn || typeof sortingColumn.sortable === 'string') {
			return data;
		}
		return orderBy(data, states.sortProp, states.sortOrder, sortingColumn.sortMethod);
	};
	var toggleRowSelection = function(states, row, selected) {
		var changed = false;
		var selection = states.selection;
		var index = selection.indexOf(row);
		if (typeof selected === 'undefined') {
			if (index === -1) {
				selection.push(row);
				changed = true;
			} else {
				selection.splice(index, 1);
				changed = true;
			}
		} else {
			if (selected && index === -1) {
				selection.push(row);
				changed = true;
			} else if (!selected && index > -1) {
				selection.splice(index, 1);
				changed = true;
			}
		}
		return changed;
	};
	var TableStore = function(table, initialState) {
		if (!table) {
			throw new Error('Table is required.');
		}
		this.table = table;
		this.states = {
			_columns: [],
			originColumns: [],
			columns: [],
			fixedColumns: [],
			rightFixedColumns: [],
			isComplex: false,
			_data: null,
			filteredData: null,
			data: null,
			sortingColumn: null,
			sortProp: null,
			sortOrder: null,
			isAllSelected: false,
			selection: [],
			selectable: null,
			currentRow: null,
			hoverRow: null,
			filters: {},
			expandRows: [],
			defaultExpandAll: false
		};
		VueUtil.merge(this.states, initialState);
	};
	TableStore.prototype.mutations = {
		setData: function(states, data) {
			var dataInstanceChanged = states._data !== data;
			states._data = data;
			states.data = sortData((data || []), states);
			this.updateCurrentRow();
			if (dataInstanceChanged) {
				this.clearSelection();
			} else {
				this.cleanSelection();
			}
			this.updateAllSelected();
			if (states.defaultExpandAll) {
				this.states.expandRows = (states.data || []).slice(0);
			}
			var table = this.table;
			if (table.$refs.tableBody && table.$refs.tableBody.delta.keeps !== 0 && !table.fixed) {
				var delta = table.$refs.tableBody.delta;
				var dataLen = data.length;
				delta.start = 0;
				if (dataLen <= delta.remain) {
					delta.end = dataLen;
					delta.keeps = dataLen;
				} else {
					delta.end = delta.remain;
					delta.keeps = delta.remain;
				}
			}
			Vue.nextTick(function() {
				table.updateScrollY();
				table.resizeZone();
			});
		},
		changeSortCondition: function(states) {
			var self = this;
			states.data = sortData((states.filteredData || states._data || []), states);
			this.table.$emit('sort-change', {
				column: self.states.sortingColumn,
				prop: self.states.sortProp,
				order: self.states.sortOrder
			});
			Vue.nextTick(function() {
				self.table.updateScrollY();
			});
		},
		filterChange: function(states, options) {
			var self = this;
			var values = options.values;
			var column = options.column;
			var silent = options.silent;
			if (values && !VueUtil.isArray(values)) {
				values = [values];
			}
			var prop = column.property;
			if (prop) {
				states.filters[column.id] = values;
			}
			var data = states._data;
			var filters = states.filters;
			Object.keys(filters).forEach(function(columnId) {
				var values = filters[columnId];
				if (!values || values.length === 0)
					return;
				var column = getColumnById(self.states, columnId);
				if (column) {
					if (column.filterMethod) {
						data = data.filter(function(row) {
							return values.some(function(value) {
								return column.filterMethod.call(null, value, row)
							});
						});
					} else {
						var columnKey = column.property
						data = data.filter(function(row) {
							return values.some(function(value) {
								return row[columnKey] === value;
							});
						});
					}
				}
			});
			states.filteredData = data;
			states.data = sortData(data, states);
			if (!silent) {
				self.table.$emit('filter-change', filters);
			}
			var table = this.table;
			if (table.$refs.tableBody && table.$refs.tableBody.delta.keeps !== 0 && !table.fixed) {
				var delta = table.$refs.tableBody.delta;
				var dataLen = data.length;
				delta.start = 0;
				if (dataLen <= delta.remain) {
					delta.end = dataLen;
					delta.keeps = dataLen;
				} else {
					delta.end = delta.remain;
					delta.keeps = delta.remain;
				}
			}
			Vue.nextTick(function() {
				table.updateScrollY();
				table.resizeZone();
			});
		},
		insertColumn: function(states, column, index, parent) {
			var array = states._columns;
			if (parent) {
				array = parent.children;
				if (!array)
					array = parent.children = [];
			}
			if (typeof index !== 'undefined') {
				array.splice(index, 0, column);
			} else {
				array.push(column);
			}
			if (column.type === 'selection') {
				states.selectable = column.selectable;
			}
			this.updateColumns();
		},
		removeColumn: function(states, column) {
			var _columns = states._columns;
			if (_columns) {
				_columns.splice(_columns.indexOf(column), 1);
			}
			this.updateColumns();
		},
		setHoverRow: function(states, row) {
			states.hoverRow = row;
		},
		setCurrentRow: function(states, row) {
			var oldCurrentRow = states.currentRow;
			states.currentRow = row;
			if (oldCurrentRow !== row) {
				this.table.$emit('current-change', row, oldCurrentRow);
			}
		},
		rowSelectedChanged: function(states, row) {
			var changed = toggleRowSelection(states, row);
			var selection = states.selection;
			if (changed) {
				var table = this.table;
				table.$emit('selection-change', selection);
				table.$emit('select', selection, row);
			}
			this.updateAllSelected();
		},
		toggleRowExpanded: function(states, row, expanded) {
			var expandRows = states.expandRows;
			if (typeof expanded !== 'undefined') {
				var index = expandRows.indexOf(row);
				if (expanded) {
					if (index === -1)
						expandRows.push(row);
				} else {
					if (index !== -1)
						expandRows.splice(index, 1);
				}
			} else {
				var index = expandRows.indexOf(row);
				if (index === -1) {
					expandRows.push(row);
				} else {
					expandRows.splice(index, 1);
				}
			}
			this.table.$emit('expand', row, expandRows.indexOf(row) !== -1);
		},
		toggleAllSelection: function(states) {
			var data = states.data || [];
			var value = !states.isAllSelected;
			var selection = this.states.selection;
			var selectionChanged = false;
			data.forEach(function(item, index) {
				if (states.selectable) {
					if (states.selectable.call(null, item, index) && toggleRowSelection(states, item, value)) {
						selectionChanged = true;
					}
				} else {
					if (toggleRowSelection(states, item, value)) {
						selectionChanged = true;
					}
				}
			});
			var table = this.table;
			if (selectionChanged) {
				table.$emit('selection-change', selection);
			}
			table.$emit('select-all', selection);
			states.isAllSelected = value;
		}
	};
	var doFlattenColumns = function(columns) {
		var result = [];
		columns.forEach(function(column) {
			if (column.children) {
				result.push.apply(result, doFlattenColumns(column.children));
			} else {
				result.push(column);
			}
		});
		return result;
	};
	TableStore.prototype.updateColumns = function() {
		var states = this.states;
		var _columns = (states._columns || []).slice();
		states.fixedColumns = [];
		states.rightFixedColumns = [];
		for (var i = _columns.length - 1; i >= 0; i--) {
			var column = _columns[i];
			if (!column.visible) {
				_columns.splice(i, 1);
				continue;
			}
			if (column.fixed === true || column.fixed === 'left') {
				if (column.type === 'selection') {
					column.fixed = false;
				} else {
					states.fixedColumns.push(column);
				}
			}
			if (column.fixed === 'right') {
				if (column.type === 'selection') {
					column.fixed = false;
				} else {
					states.rightFixedColumns.push(column);
				}
			}
		}
		states.fixedColumns.sort(function(a, b) {
			return a.fixedIndex > b.fixedIndex;
		});
		states.rightFixedColumns.sort(function(a, b) {
			return a.fixedIndex < b.fixedIndex;
		});
		if (states.fixedColumns.length > 0 && _columns[0] && _columns[0].type === 'selection' && !_columns[0].fixed) {
			_columns[0].fixed = true;
			states.fixedColumns.unshift(_columns[0]);
		}
		states.originColumns = [].concat(states.fixedColumns).concat(_columns.filter(function(column) {
			return !column.fixed
		})).concat(states.rightFixedColumns);
		states.columns = doFlattenColumns(states.originColumns);
		states.isComplex = states.fixedColumns.length > 0 || states.rightFixedColumns.length > 0;
	}
	TableStore.prototype.isSelected = function(row) {
		return (this.states.selection || []).indexOf(row) !== -1;
	}
	TableStore.prototype.clearSelection = function() {
		var states = this.states;
		states.isAllSelected = false;
		var oldSelection = states.selection;
		states.selection = [];
		if (oldSelection.length > 0) {
			this.table.$emit('selection-change', states.selection);
		}
	}
	TableStore.prototype.toggleRowSelection = function(row, selected) {
		var changed = toggleRowSelection(this.states, row, selected);
		if (changed) {
			this.table.$emit('selection-change', this.states.selection);
		}
	}
	TableStore.prototype.cleanSelection = function() {
		var selection = this.states.selection || [];
		var data = this.states.data;
		var deleted;
		deleted = selection.filter(function(item) {
			return data.indexOf(item) === -1;
		});
		deleted.forEach(function(deletedItem) {
			selection.splice(selection.indexOf(deletedItem), 1);
		});
		if (deleted.length) {
			this.table.$emit('selection-change', selection);
		}
	}
	TableStore.prototype.updateAllSelected = function() {
		var states = this.states;
		var selection = states.selection;
		var selectable = states.selectable;
		var data = states.data;
		if (!data || data.length === 0) {
			states.isAllSelected = false;
			return;
		}
		var selectedMap;
		var isSelected = function(row) {
			return selection.indexOf(row) !== -1;
		};
		var isAllSelected = true;
		var selectedCount = 0;
		for (var i = 0, j = data.length; i < j; i++) {
			var item = data[i];
			if (selectable) {
				var isRowSelectable = selectable.call(null, item, i);
				if (isRowSelectable) {
					if (!isSelected(item)) {
						isAllSelected = false;
						break;
					} else {
						selectedCount++;
					}
				}
			} else {
				if (!isSelected(item)) {
					isAllSelected = false;
					break;
				} else {
					selectedCount++;
				}
			}
		}
		if (selectedCount === 0) isAllSelected = false;
		states.isAllSelected = isAllSelected;
	}
	TableStore.prototype.scheduleLayout = function() {
		this.table.doLayout(true);
	}
	TableStore.prototype.updateCurrentRow = function() {
		var states = this.states;
		var table = this.table;
		var data = states.data || [];
		var oldCurrentRow = states.currentRow;
		if (data.indexOf(oldCurrentRow) === -1) {
			states.currentRow = null;
			if (states.currentRow !== oldCurrentRow) {
				table.$emit('current-change', null, oldCurrentRow);
			}
		}
	}
	TableStore.prototype.commit = function(name) {
		var mutations = this.mutations;
		var args = [];
		for (var i = 1, j = arguments.length; i < j; i++) {
			args[i - 1] = arguments[i];
		}
		if (mutations[name]) {
			mutations[name].apply(this, [this.states].concat(args));
		} else {
			throw new Error('Action not found: ' + name);
		}
	}
	var TableLayout = function(options) {
		this.table = null;
		this.store = null;
		this.columns = null;
		this.fit = true;
		this.showHeader = true;
		this.height = null;
		this.scrollX = false;
		this.scrollY = false;
		this.bodyWidth = null;
		this.fixedWidth = null;
		this.rightFixedWidth = null;
		this.tableHeight = null;
		this.headerHeight = 44;
		this.viewportHeight = null;
		this.bodyHeight = null;
		this.fixedBodyHeight = null;
		this.gutterWidth = VueUtil.component.scrollBarWidth();
		VueUtil.merge(this, options);
		if (!this.table) {
			throw new Error('table is required for Table Layout');
		}
		if (!this.store) {
			throw new Error('store is required for Table Layout');
		}
		this.updateScrollY = function() {
			var height = this.height;
			if (typeof height !== 'string' && typeof height !== 'number')
				return;
			var bodyWrapper = this.table.bodyWrapper;
			if (this.table.$el && bodyWrapper) {
				var body = bodyWrapper.querySelector('.vue-table__body');
				this.scrollY = body.offsetHeight > bodyWrapper.offsetHeight;
			}
		}
	};
	TableLayout.prototype.setHeight = function(value) {
		var prop = 'height';
		var el = this.table.$el;
		if (typeof value === 'string' && /^\d+$/.test(value)) {
			value = Number(value);
		}
		this.height = value;
		if (!el)
			return;
		if (typeof value === 'number') {
			el.style[prop] = value + 'px';
		} else if (typeof value === 'string') {
			if (value === '') {
				el.style[prop] = '';
			}
		}
		this.updateHeight();
	}
	TableLayout.prototype.updateHeight = function() {
		var height = this.tableHeight = this.table.$el.clientHeight;
		var noData = !this.table.data || this.table.data.length === 0;
		var headerWrapper = this.table.$refs.headerWrapper;
		if (this.showHeader && !headerWrapper)
			return;
		if (!this.showHeader) {
			this.headerHeight = 0;
			if (this.height !== null && (!isNaN(this.height) || typeof this.height === 'string')) {
				this.bodyHeight = height;
			}
			this.fixedBodyHeight = this.scrollX ? height - this.gutterWidth : height;
		} else {
			var headerHeight = this.headerHeight = headerWrapper.offsetHeight;
			var ratio = this.table.showSummary && this.table.data && this.table.data.length > 0 ? 2 : 1;
			var bodyHeight = height - ratio * headerHeight + (this.table.showSummary ? 1 : 0);
			if (this.height !== null && (!isNaN(this.height) || typeof this.height === 'string')) {
				this.bodyHeight = bodyHeight;
			}
			this.fixedBodyHeight = this.scrollX ? bodyHeight - this.gutterWidth : bodyHeight;
		}
		this.viewportHeight = this.scrollX ? height - this.gutterWidth : height;
		if (this.table.showSummary) this.viewportHeight = height;
	}
	TableLayout.prototype.update = function() {
		var fit = this.fit;
		var columns = this.table.columns;
		var bodyWidth = this.table.$el.clientWidth;
		var bodyMinWidth = 0;
		var flexColumns = [];
		var allColumnsWidth = 0;
		for (var i = 0, j = columns.length; i < j; i++) {
			var column = columns[i];
			if (typeof column.width !== 'number') {
				flexColumns.push(column);
				allColumnsWidth = allColumnsWidth + (column.minWidth || 80);
			}
			bodyMinWidth += column.width || column.minWidth || 80;
		}
		this.scrollX = bodyMinWidth > bodyWidth;
		this.bodyWidth = bodyMinWidth;
		var flexColumnLen = flexColumns.length;
		if (flexColumnLen > 0 && fit) {
			if (bodyMinWidth <= bodyWidth - this.gutterWidth) {
				this.scrollX = false;
				var totalFlexWidth = bodyWidth - this.gutterWidth - bodyMinWidth;
				var noneFirstWidth = 0;
				var flexWidthPerPixel = totalFlexWidth / allColumnsWidth;
				for (var i = 0; i < flexColumnLen; i++) {
					if (i === 0)
						continue;
					var column = flexColumns[i];
					var flexWidth = Math.floor((column.minWidth || 80) * flexWidthPerPixel);
					noneFirstWidth += flexWidth;
					column.realWidth = (column.minWidth || 80) + flexWidth;
				}
				flexColumns[0].realWidth = (flexColumns[0].minWidth || 80) + totalFlexWidth - noneFirstWidth;
			} else {
				this.scrollX = true;
				for (var i = 0; i < flexColumnLen; i++) {
					var column = flexColumns[i];
					column.realWidth = column.minWidth || 80;
				}
			}
			this.bodyWidth = Math.max(bodyMinWidth, bodyWidth);
		}
		var fixedColumns = this.store.states.fixedColumns;
		this.fixedWidth = 0;
		for (var i = 0, l = fixedColumns.length; i < l; i++) {
			var column = fixedColumns[i];
			this.fixedWidth += column.realWidth || 80;
		}
		var rightFixedColumns = this.store.states.rightFixedColumns;
		this.rightFixedWidth = 0;
		for (var i = 0, l = rightFixedColumns.length; i < l; i++) {
			var column = rightFixedColumns[i];
			this.rightFixedWidth += column.realWidth || 80;
		}
	}
	var VueTableFilterPanel = {
		template: '<transition @after-leave="doDestroy"><div class="vue-table-filter" v-if="multiple" v-show="showPopper" v-clickoutside="handleOutsideClick"><div class="vue-table-filter__content"><vue-checkbox-group class="vue-table-filter__checkbox-group" v-model="filteredValue"><vue-checkbox v-for="filter in filters" :key="filter.value" :label="filter.value">{{filter.text}}</vue-checkbox></vue-checkbox-group></div><div class="vue-table-filter__bottom"><button @click="handleConfirm" :class="{\'is-disabled\': filteredValue.length === 0}" :disabled="filteredValue.length === 0">{{$t(\'vue.table.confirmFilter\')}}</button><button @click="handleReset">{{$t(\'vue.table.resetFilter\')}}</button></div></div><div class="vue-table-filter" v-else v-show="showPopper"><ul class="vue-table-filter__list"><li :class="[\'vue-table-filter__list-item\', {\'is-active\': !filterValue}]" @click="handleSelect(null)">{{$t(\'vue.table.clearFilter\')}}</li><li v-for="filter in filters" :key="filter.value" :label="filter.value" :class="[\'vue-table-filter__list-item\', {\'is-active\': isActive(filter)}]" @click="handleSelect(filter.value)" >{{filter.text}}</li></ul></div></transition>',
		name: 'VueTableFilterPanel',
		mixins: [VuePopper],
		directives: {
			Clickoutside: VueUtil.component.clickoutside()
		},
		props: {
			placement: {
				type: String,
				default: 'bottom-end'
			}
		},
		customRender: function(createElement) {
			return createElement('div', {
				class: 'vue-table-filter'
			}, [createElement('div', {
				class: 'vue-table-filter__content'
			}, []), createElement('div', {
				class: 'vue-table-filter__bottom'
			}, [createElement('button', {
				on: {
					click: this.handleConfirm
				}
			}, [this.$t('vue.table.confirmFilter')]), createElement('button', {
				on: {
					click: this.handleReset
				}
			}, [this.$t('vue.table.resetFilter')])])]);
		},
		methods: {
			isActive: function(filter) {
				return filter.value === this.filterValue;
			},
			handleOutsideClick: function() {
				this.showPopper = false;
			},
			handleConfirm: function() {
				this.confirmFilter(this.filteredValue);
				this.handleOutsideClick();
			},
			handleReset: function() {
				this.filteredValue = [];
				this.handleConfirm();
			},
			handleSelect: function(filterValue) {
				this.filterValue = filterValue;
				if ((typeof filterValue !== 'undefined') && (filterValue !== null)) {
					this.confirmFilter(this.filteredValue);
				} else {
					this.confirmFilter([]);
				}
				this.handleOutsideClick();
			},
			confirmFilter: function(filteredValue) {
				this.table.store.commit('filterChange', {
					column: this.column,
					values: filteredValue
				});
			}
		},
		data: function() {
			return {
				table: null,
				cell: null,
				column: null
			};
		},
		computed: {
			filters: function() {
				return this.column && this.column.filters;
			},
			filterValue: {
				get: function() {
					return (this.column.filteredValue || [])[0];
				},
				set: function(value) {
					if (this.filteredValue) {
						if ((typeof value !== 'undefined') && (value !== null)) {
							this.filteredValue.splice(0, 1, value);
						} else {
							this.filteredValue.splice(0, 1);
						}
					}
				}
			},
			filteredValue: {
				get: function() {
					if (this.column) {
						return this.column.filteredValue || [];
					}
					return [];
				},
				set: function(value) {
					if (this.column) {
						this.column.filteredValue = value;
					}
				}
			},
			multiple: function() {
				if (this.column) {
					return this.column.filterMultiple;
				}
				return true;
			}
		},
		mounted: function() {
			var self = this;
			self.popperElm = self.$el;
			self.referenceElm = self.cell;
			self.table.bodyWrapper.addEventListener('scroll', function() {
				self.updatePopper();
			});
			self.$watch('showPopper', function(value) {
				if (self.column)
					self.column.filterOpened = value;
				if (value) {
					Dropdown.open(self);
				} else {
					Dropdown.close(self);
				}
			});
		},
		watch: {
			showPopper: function(val) {
				if (val === true && parseInt(this.popperJS._popper.style.zIndex, 10) < VueUtil.component.popupManager.zIndex) {
					this.popperJS._popper.style.zIndex = VueUtil.component.popupManager.nextZIndex();
				}
			}
		}
	};
	var TableBody = {
		props: {
			store: {
				required: true
			},
			context: {},
			layout: {
				required: true
			},
			rowClassName: [String, Function],
			rowStyle: [Object, Function],
			fixed: String,
			highlight: Boolean,
			expandClassName: [String, Function]
		},
		render: function(createElement) {
			var self = this;
			var columnsHidden = self.columns.map(function(column, index) {
				return self.isColumnHidden(index);
			});
			var selfData;
			var delta = self.delta;
			if (self.fixed) {
				selfData = [];
				if (((self.fixed === true || self.fixed === 'left') && self.table.fixedColumns.length > 0) || ((self.fixed === 'right') && self.table.rightFixedColumns.length > 0)) {
					delta = self.table.$refs.tableBody.delta;
					selfData = delta.data;
					self.$nextTick(self.updateCurrentClass);
				}
			} else {
				selfData = delta.data = scrollFilter(self.data, delta);
			}
			var paddingTop = delta.paddingTop;
			var allPadding = delta.allPadding;
			return createElement('table', {
				class: 'vue-table__body',
				attrs: {
					cellspacing: '0',
					cellpadding: '0',
					border: '0'
				},
				style: {
					'padding-top': paddingTop + 'px',
					'padding-bottom': allPadding - paddingTop + 'px'
				}
			}, [createElement('colgroup', null, [self._l(self.columns, function(column) {
				return createElement('col', {
					attrs: {
						name: column.id,
						width: column.realWidth || column.width || 80
					}
				}, [])
			}), !self.fixed && self.layout.scrollY && self.layout.gutterWidth ? createElement('col', {
				attrs: {
					name: 'gutter',
					width: 0
				}
			}, []) : '']), createElement('tbody', null, [self._l(selfData, function(row, $index) {
				$index = self.data.indexOf(row);
				return [createElement('tr', {
					style: self.rowStyle ? self.getRowStyle(row, $index) : null,
					key: $index,
					on: {
						dblclick: function(e) {
							return self.handleDoubleClick(e, row)
						},
						click: function(e) {
							return self.handleClick(e, row)
						},
						contextmenu: function(e) {
							return self.handleContextMenu(e, row)
						},
						mouseenter: function(e) {
							return self.handleMouseEnter($index)
						},
						mouseleave: function(e) {
							return self.handleMouseLeave()
						}
					},
					class: [self.getRowClass(row, $index)]
				}, [self._l(self.columns, function(column, cellIndex) {
					return createElement('td', {
						class: [column.id, column.align, column.getCellClass($index, cellIndex, row) || '', columnsHidden[cellIndex] ? 'is-hidden' : ''],
						on: {
							mouseenter: function(e) {
								return self.handleCellMouseEnter(e, row)
							},
							mouseleave: self.handleCellMouseLeave
						}
					}, [column.renderCell.call(self._renderProxy, createElement, {
						row: row,
						column: column,
						$index: $index,
						store: self.store,
						_self: self.context || self.table.$vnode.context
					})])
				}), !self.fixed && self.layout.scrollY && self.layout.gutterWidth ? createElement('td', {
					class: 'gutter',
					style: {
						width: 0
					},
				}, []) : '']), self.store.states.expandRows.indexOf(row) > -1 ? createElement('tr', null, [createElement('td', {
					attrs: {
						colspan: self.columns.length
					},
					class: ['vue-table__expanded-cell', self.getExpandClass(row, $index)]
				}, [self.table.renderExpanded ? self.table.renderExpanded(createElement, {
					row: row,
					$index: $index,
					store: self.store
				}) : ''])]) : '']
			}).concat(self._self.$parent.$slots.append).concat(createElement('vue-tooltip', {
				attrs: {
					effect: self.table.tooltipEffect,
					placement: "top",
					content: self.tooltipContent
				},
				ref: "tooltip"
			}, []))])]);
		},
		watch: {
			'store.states.hoverRow': function(newVal, oldVal) {
				var self = this;
				if (!self.store.states.isComplex)
					return;
				var el = self.$el;
				if (!el)
					return;
				var data = self.delta.data;
				if (self.fixed) {
					data = self.table.$refs.tableBody.delta.data;
				}
				var storeData = self.store.states.data;
				var rows = el.querySelectorAll('tbody > tr');
				var oldRow = rows[data.indexOf(storeData[oldVal])];
				var newRow = rows[data.indexOf(storeData[newVal])];
				if (oldRow) {
					oldRow.classList.remove('hover-row');
				}
				for (var i=0; i<rows.length; i++) {
					var row = rows[i];
					row.classList.remove('hover-row')
				}
				if (newRow) {
					newRow.classList.add('hover-row');
				}
			},
			'store.states.currentRow': function(newVal, oldVal) {
				var self = this;
				if (!self.highlight)
					return;
				var el = self.$el;
				if (!el)
					return;
				var data = self.delta.data;
				if (self.fixed) {
					data = self.table.$refs.tableBody.delta.data;
				}
				var rows = el.querySelectorAll('tbody > tr');
				var oldRow = rows[data.indexOf(oldVal)];
				var newRow = rows[data.indexOf(newVal)];
				if (oldRow) {
					oldRow.classList.remove('current-row');
				}
				for (var i=0; i<rows.length; i++) {
					var row = rows[i];
					row.classList.remove('current-row')
				}
				if (newRow) {
					newRow.classList.add('current-row');
				}
			}
		},
		computed: {
			table: function() {
				return this.$parent;
			},
			data: function() {
				return this.store.states.data;
			},
			columnsCount: function() {
				return this.store.states.columns.length;
			},
			leftFixedCount: function() {
				return this.store.states.fixedColumns.length;
			},
			rightFixedCount: function() {
				return this.store.states.rightFixedColumns.length;
			},
			columns: function() {
				return this.store.states.columns;
			}
		},
		data: function() {
			return {
				delta: {
					start: 0,
					end: 0,
					total: 0,
					keeps: 0,
					allPadding: 0,
					paddingTop: 0,
					size: 0,
					remain: 0,
					data: null
				},
				tooltipContent: ''
			};
		},
		created: function() {
			this.activateTooltip = VueUtil.setTimeouter(50, function(tooltip) {
				return tooltip.handleShowPopper();
			});
		},
		methods: {
			updateZone: function(offset) {
				var delta = this.delta;
				delta.size = parseInt(VueUtil.getStyle(this.table.$el.querySelector('tbody > tr'), 'height'), 10) || 40;
				delta.remain = Math.round(this.table.height * 1 / delta.size);
				delta.keeps = delta.remain;
				if (delta.total <= delta.keeps) return;
				var overs = Math.floor(offset / delta.size);
				if (!offset) {
					this.$emit('toTop');
				}
				var start = overs ? overs : 0;
				var end = overs ? (overs + delta.keeps) : delta.keeps;
				if (overs + delta.keeps >= delta.total) {
					end = delta.total;
					start = delta.total - delta.keeps;
					this.$emit('toBottom');
				}
				delta.end = end;
				delta.start = start;
			},
			updateCurrentClass: function() {
				var self = this;
				var el = self.$el;
				if (!el) return;
				var data = self.delta.data;
				if (self.fixed) {
					data = self.table.$refs.tableBody.delta.data;
				}
				var rows = el.querySelectorAll('tbody > tr');
				var currentRow;
				if (self.highlight) {
					currentRow = rows[data.indexOf(self.store.states.currentRow)];
				}
				for (var i=0; i<rows.length; i++) {
					var row = rows[i];
					row.classList.remove('current-row');
					if (currentRow && row === currentRow) {
						row.classList.add('current-row');
					}
				}
			},
			isColumnHidden: function(index) {
				if (this.fixed === true || this.fixed === 'left') {
					return index >= this.leftFixedCount;
				} else if (this.fixed === 'right') {
					return index < this.columnsCount - this.rightFixedCount;
				} else {
					return (index < this.leftFixedCount) || (index >= this.columnsCount - this.rightFixedCount);
				}
			},
			getRowStyle: function(row, index) {
				var rowStyle = this.rowStyle;
				if (typeof rowStyle === 'function') {
					return rowStyle.call(null, row, index);
				}
				return rowStyle;
			},
			getRowClass: function(row, index) {
				var classes = [];
				var rowClassName = this.rowClassName;
				if (typeof rowClassName === 'string') {
					classes.push(rowClassName);
				} else if (typeof rowClassName === 'function') {
					classes.push(rowClassName.call(null, row, index) || '');
				}
				return classes.join(' ');
			},
			getExpandClass: function(row, index) {
				var classes = [];
				var expandClassName = this.expandClassName;
				if (typeof expandClassName === 'string') {
					classes.push(expandClassName);
				} else if (typeof expandClassName === 'function') {
					classes.push(expandClassName.call(null, row, index) || '');
				}
				return classes.join(' ');
			},
			handleCellMouseEnter: function(event, row) {
				var table = this.table;
				var cell = getCell(event);
				if (cell) {
					var column = getColumnByCell(table, cell);
					var hoverState = table.hoverState = {
						cell: cell,
						column: column,
						row: row
					};
					table.$emit('cell-mouse-enter', hoverState.row, hoverState.column, hoverState.cell, event);
				}
				var cellChild = event.target.querySelector('.cell');
				if (VueUtil.hasClass(cellChild, 'vue-tooltip') && cellChild.scrollWidth > cellChild.offsetWidth) {
					var tooltip = this.$refs.tooltip;
					this.tooltipContent = cell.innerText;
					tooltip.referenceElm = cell;
					tooltip.$refs.popper.style.display = 'none';
					tooltip.doDestroy();
					tooltip.setExpectedState(true);
					this.activateTooltip(tooltip);
				}
			},
			handleCellMouseLeave: function(event) {
				var tooltip = this.$refs.tooltip;
				if (tooltip) {
					tooltip.setExpectedState(false);
					tooltip.handleClosePopper();
				}
				var cell = getCell(event);
				if (!cell)
					return;
				var oldHoverState = this.table.hoverState;
				this.table.$emit('cell-mouse-leave', oldHoverState.row, oldHoverState.column, oldHoverState.cell, event);
			},
			handleMouseEnter: function(index) {
				this.store.commit('setHoverRow', index);
			},
			handleMouseLeave: function() {
				this.store.commit('setHoverRow', null);
			},
			handleContextMenu: function(event, row) {
				var table = this.table;
				table.$emit('row-contextmenu', row, event);
			},
			handleDoubleClick: function(event, row) {
				var table = this.table;
				table.$emit('row-dblclick', row, event);
			},
			handleClick: function(event, row) {
				var table = this.table;
				var cell = getCell(event);
				var column;
				if (cell) {
					column = getColumnByCell(table, cell);
					if (column) {
						table.$emit('cell-click', row, column, cell, event);
					}
				}
				this.store.commit('setCurrentRow', row);
				table.$emit('row-click', row, event, column);
			},
			handleExpandClick: function(row) {
				this.store.commit('toggleRowExpanded', row);
			}
		},
		mounted: function() {
			var table = this.table;
			if (table.height && table.lazyload && !this.fixed) {
				var delta = this.delta;
				delta.remain = Math.round(table.height * 1 / delta.size);
				delta.end = delta.remain;
				delta.keeps = delta.remain;
			}
		}
	};
	var TableHeader = {
		name: 'VueTableHeader',
		render: function(createElement) {
			if (!this.store.table.showHeader) return null;
			var self = this;
			var originColumns = self.store.states.originColumns;
			var columnRows = convertToRows(originColumns);
			return createElement('table', {
				class: 'vue-table__header',
				attrs: {
					cellspacing: '0',
					cellpadding: '0',
					border: '0'
				}
			}, [createElement('colgroup', null, [self._l(self.columns, function(column) {
				return createElement('col', {
					attrs: {
						name: column.id,
						width: column.realWidth || column.width || 80
					}
				}, [])
			}), !self.fixed && self.layout.scrollY && self.layout.gutterWidth ? createElement('col', {
				attrs: {
					name: 'gutter',
					width: self.layout.gutterWidth
				}
			}, []) : '']), createElement('thead', null, [self._l(columnRows, function(columns, rowIndex) {
				return createElement('tr', null, [self._l(columns, function(column, cellIndex) {
					return createElement('th', {
						attrs: {
							colspan: column.colSpan,
							rowspan: column.rowSpan
						},
						on: {
							mousemove: function(e) {
								return self.handleMouseMove(e, column)
							},
							mouseout: self.handleMouseOut,
							mousedown: function(e) {
								return self.handleMouseDown(e, column)
							},
							touchstart: function(e) {
								return self.handleMouseDown(e, column)
							},
							click: function(e) {
								return self.handleHeaderClick(e, column)
							}
						},
						class: [column.id, column.order, column.headerAlign, rowIndex === 0 && self.isCellHidden(cellIndex) ? 'is-hidden' : '', !column.children ? 'is-leaf' : '', column.labelClassName]
					}, [createElement('div', {
						class: ['cell', column.filteredValue && column.filteredValue.length > 0 ? 'highlight' : '', column.labelClassName]
					}, [column.renderHeader ? column.renderHeader.call(self._renderProxy, createElement, {
						column: column,
						$index: cellIndex,
						store: self.store,
						_self: self.$parent.$vnode.context
					}) : column.label, column.sortable ? createElement('span', {
						class: 'caret-wrapper',
						on: {
							click: function(e) {
								return self.handleSortClick(e, column);
							}
						}
					}, [createElement('i', {
						class: 'sort-caret ascending',
						on: {
							click: function(e) {
								return self.handleSortClick(e, column, 'ascending');
							}
						}
					}, []), createElement('i', {
						class: 'sort-caret descending',
						on: {
							click: function(e) {
								return self.handleSortClick(e, column, 'descending');
							}
						}
					}, [])]) : '', column.filterable ? createElement('span', {
						class: 'vue-table__column-filter-trigger',
						on: {
							click: function(e) {
								return self.handleFilterClick(e, column)
							}
						}
					}, [createElement('i', {
						class: ['vue-icon-arrow-down', column.filterOpened ? 'vue-icon-arrow-up' : '']
					}, [])]) : ''])])
				}), !self.fixed && self.layout.scrollY && self.layout.gutterWidth ? createElement('th', {
					class: 'gutter',
					style: {
						width: self.layout.gutterWidth + 'px'
					}
				}, []) : ''])
			})])]);
		},
		props: {
			fixed: String,
			store: {
				required: true
			},
			layout: {
				required: true
			},
			border: Boolean,
			defaultSort: {
				type: Object,
				default: function() {
					return {
						prop: '',
						order: ''
					};
				}
			}
		},
		computed: {
			isAllSelected: function() {
				return this.store.states.isAllSelected;
			},
			columnsCount: function() {
				return this.store.states.columns.length;
			},
			leftFixedCount: function() {
				return this.store.states.fixedColumns.length;
			},
			rightFixedCount: function() {
				return this.store.states.rightFixedColumns.length;
			},
			columns: function() {
				return this.store.states.columns;
			}
		},
		created: function() {
			this.filterPanels = {};
		},
		mounted: function() {
			if (this.defaultSort.prop) {
				var states = this.store.states;
				states.sortProp = this.defaultSort.prop;
				states.sortOrder = this.defaultSort.order || 'ascending';
				this.$nextTick(function() {
					for (var i = 0, l = this.columns.length; i < l; i++) {
						var column = this.columns[i];
						if (column.property === states.sortProp) {
							column.order = states.sortOrder;
							states.sortingColumn = column;
							break;
						}
					}
					if (states.sortingColumn) {
						this.store.commit('changeSortCondition');
					}
				});
			}
		},
		beforeDestroy: function() {
			var panels = this.filterPanels;
			for (var prop in panels) {
				if (panels.hasOwnProperty(prop) && panels[prop]) {
					panels[prop].$destroy(true);
				}
			}
		},
		methods: {
			isCellHidden: function(index) {
				if (this.fixed === true || this.fixed === 'left') {
					return index >= this.leftFixedCount;
				} else if (this.fixed === 'right') {
					return index < this.columnsCount - this.rightFixedCount;
				} else {
					return (index < this.leftFixedCount) || (index >= this.columnsCount - this.rightFixedCount);
				}
			},
			toggleAllSelection: function() {
				this.store.commit('toggleAllSelection');
			},
			handleFilterClick: function(event, column) {
				event.stopPropagation();
				var target = event.target;
				var cell = target.parentNode;
				var table = this.$parent;
				var filterPanel = this.filterPanels[column.id];
				if (filterPanel && column.filterOpened) {
					filterPanel.showPopper = false;
					return;
				}
				if (!filterPanel) {
					filterPanel = new Vue(VueTableFilterPanel);
					this.filterPanels[column.id] = filterPanel;
					if (column.filterPlacement) {
						filterPanel.placement = column.filterPlacement;
					}
					filterPanel.table = table;
					filterPanel.cell = cell;
					filterPanel.column = column;
					!VueUtil.isServer && filterPanel.$mount(document.createElement('div'));
				}
				this.$nextTick(function() {
					filterPanel.showPopper = true;
				});
			},
			handleHeaderClick: function(event, column) {
				if (!column.filters && column.sortable) {
					this.handleSortClick(event, column);
				} else if (column.filters && !column.sortable) {
					this.handleFilterClick(event, column);
				}
				this.$parent.$emit('header-click', column, event);
			},
			handleMouseDown: function(event, column) {
				if (VueUtil.isServer) return;
				var self = this;
				if (event.touches) {
					self.handleMouseMove(event, column);
				}
				if (column.children && column.children.length > 0)
					return;
				if (self.draggingColumn && self.border) {
					self.dragging = true;
					self.$parent.resizeProxyVisible = true;
					var table = self.$parent;
					var tableEl = self.$parent.$el;
					var tableLeft = tableEl.getBoundingClientRect().left;
					var columnEl = self.$el.querySelector('th.' + column.id);
					var columnRect = columnEl.getBoundingClientRect();
					var minLeft = columnRect.left - tableLeft + 30;
					columnEl.classList.add('noclick');
					self.dragState = {
						startMouseLeft: event.clientX || event.touches[0].clientX,
						startLeft: columnRect.right - tableLeft,
						startColumnLeft: columnRect.left - tableLeft,
						tableLeft: tableLeft
					};
					var resizeProxy = self.$parent.$refs.resizeProxy;
					resizeProxy.style.left = self.dragState.startLeft + 'px';
					document.onselectstart = function() {
						return false;
					}
					document.ondragstart = function() {
						return false;
					}
					var handleMouseMove = function(event) {
						var deltaLeft = (event.clientX || event.touches[0].clientX) - self.dragState.startMouseLeft;
						var proxyLeft = self.dragState.startLeft + deltaLeft;
						resizeProxy.style.left = Math.max(minLeft, proxyLeft) + 'px';
					};
					var handleMouseUp = function() {
						if (self.dragging) {
							var finalLeft = parseInt(resizeProxy.style.left, 10);
							var startLeft = self.dragState.startLeft;
							var startColumnLeft = self.dragState.startColumnLeft;
							var columnWidth = finalLeft - startColumnLeft;
							column.width = column.realWidth = columnWidth;
							table.$emit('header-dragend', column.width, startLeft - startColumnLeft, column, event);
							document.body.style.cursor = '';
							self.dragging = false;
							self.draggingColumn = null;
							self.dragState = {};
							self.$parent.resizeProxyVisible = false;
						}
						VueUtil.removeTouchMove(document, handleMouseMove);
						VueUtil.removeTouchEnd(document, handleMouseUp);
						document.onselectstart = null;
						document.ondragstart = null;
						self.$nextTick(function() {
							columnEl.classList.remove('noclick');
						});
					};
					VueUtil.addTouchMove(document, handleMouseMove);
					VueUtil.addTouchEnd(document, handleMouseUp);
				}
			},
			handleMouseMove: function(event, column) {
				if (column.children && column.children.length > 0)
					return;
				var target = event.target;
				while (target && target.tagName !== 'TH') {
					target = target.parentNode;
				}
				if (!column || !column.resizable)
					return;
				if (!this.dragging && this.border) {
					var rect = target.getBoundingClientRect();
					var bodyStyle = document.body.style;
					if (rect.width > 12 && rect.right - (event.pageX || event.touches[0].pageX) < 8) {
						bodyStyle.cursor = 'col-resize';
						this.draggingColumn = column;
					} else if (!this.dragging) {
						bodyStyle.cursor = '';
						this.draggingColumn = null;
					}
				}
			},
			handleMouseOut: function() {
				if (VueUtil.isServer) return;
				document.body.style.cursor = '';
			},
			toggleOrder: function(order) {
				return !order ? 'ascending' : order === 'ascending' ? 'descending' : null;
			},
			handleSortClick: function(event, column, givenOrder) {
				event.stopPropagation();
				var order = givenOrder || this.toggleOrder(column.order);
				var target = event.target;
				while (target && target.tagName !== 'TH') {
					target = target.parentNode;
				}
				if (target && target.tagName === 'TH') {
					if (target.classList.contains('noclick')) {
						target.classList.remove('noclick');
						return;
					}
				}
				if (!column.sortable)
					return;
				var states = this.store.states;
				var sortProp = states.sortProp;
				var sortOrder;
				var sortingColumn = states.sortingColumn;
				if (sortingColumn !== column) {
					if (sortingColumn) {
						sortingColumn.order = null;
					}
					states.sortingColumn = column;
					sortProp = column.property;
				}
				if (column.order === order) {
					sortOrder = column.order = null;
					states.sortingColumn = null;
					sortProp = null;
				} else {
					sortOrder = column.order = order;
				}
				states.sortProp = sortProp;
				states.sortOrder = sortOrder;
				this.store.commit('changeSortCondition');
			}
		},
		data: function() {
			return {
				draggingColumn: null,
				dragging: false,
				dragState: {}
			};
		}
	};
	var TableFooter = {
		name: 'VueTableFooter',
		data: function() {
			return {
				sums: []
			}
		},
		render: function(createElement) {
			if (!this.store.table.showSummary) return null;
			var self = this;
			var sums = self.sums;
			if (self.fixed) {
				sums = self.store.table.$refs.tableFooter.sums
			}
			return createElement('table', {
				class: 'vue-table__footer',
				attrs: {
					cellspacing: '0',
					cellpadding: '0',
					border: '0'
				}
			}, [createElement('colgroup', null, [self._l(self.columns, function(column) {
				return createElement('col', {
					attrs: {
						name: column.id,
						width: column.realWidth || column.width || 80
					}
				}, []);
			}), !self.fixed && self.layout.scrollY && self.layout.gutterWidth ? createElement('col', {
				attrs: {
					name: 'gutter',
					width: self.layout.gutterWidth
				}
			}, []) : '']), createElement('tbody', null, [createElement('tr', null, [self._l(self.columns, function(column, cellIndex) {
				return createElement('th', {
					attrs: {
						colspan: column.colSpan,
						rowspan: column.rowSpan
					},
					class: [column.id, column.align, column.className || '', self.isCellHidden(cellIndex, self.columns) ? 'is-hidden' : '', !column.children ? 'is-leaf' : '', column.labelClassName]
				}, [createElement('div', {
					class: ['cell', column.labelClassName]
				}, [self.summaryMethod ? self.summaryMethod({
					columns: self.columns,
					data: self.store.states.data
				})[cellIndex] : sums[cellIndex]])])
			}), !self.fixed && self.layout.scrollY && self.layout.gutterWidth ? createElement('th', {
				class: 'gutter',
				style: {
					width: self.layout.gutterWidth + 'px'
				}
			}, []) : ''])])]);
		},
		props: {
			fixed: String,
			store: {
				required: true
			},
			layout: {
				required: true
			},
			summaryMethod: Function,
			sumText: String,
			border: Boolean,
			defaultSort: {
				type: Object,
				default: function() {
					return {
						prop: '',
						order: ''
					};
				}
			}
		},
		computed: {
			isAllSelected: function() {
				return this.store.states.isAllSelected;
			},
			columnsCount: function() {
				return this.store.states.columns.length;
			},
			leftFixedCount: function() {
				return this.store.states.fixedColumns.length;
			},
			rightFixedCount: function() {
				return this.store.states.rightFixedColumns.length;
			},
			columns: function() {
				return this.store.states.columns;
			}
		},
		methods: {
			isCellHidden: function(index, columns) {
				if (this.fixed === true || this.fixed === 'left') {
					return index >= this.leftFixedCount;
				} else if (this.fixed === 'right') {
					var before = 0;
					for (var i = 0; i < index; i++) {
						before += columns[i].colSpan;
					}
					return before < this.columnsCount - this.rightFixedCount;
				} else {
					return (index < this.leftFixedCount) || (index >= this.columnsCount - this.rightFixedCount);
				}
			},
			getSum: function(data) {
				var self = this;
				self.sums = [];
				var sums = self.sums;
				for (var index=0,len=self.columns.length; index<len; index++) {
					var column = self.columns[index];
					if (index === 0) {
						sums[index] = self.sumText;
						continue;
					}
					var values = data.map(function(item) {
						return Number(item[column.property])
					});
					var precisions = [];
					var notNumber = true;
					for (var i=0,j=values.length; i<j; i++){
						var value = values[i];
						if (!isNaN(value)) {
							notNumber = false;
							var decimal = ('' + value).split('.')[1];
							precisions.push(decimal ? decimal.length : 0);
						}
					}
					var precision = Math.max.apply(null, precisions);
					if (!notNumber) {
						sums[index] = values.reduce(function(prev, curr) {
							var value = Number(curr);
							if (!isNaN(value)) {
								return parseFloat((prev + curr).toFixed(precision));
							} else {
								return prev;
							}
						}, 0);
					} else {
						sums[index] = '';
					}
				}
			}
		}
	};
	var TableContextMenu = {
		template: '<vue-dialog v-model="dialogVisible" custom-class="vue-table-context-menu" :title="$t(\'vue.table.contextMenu\')" show-close @close="closeHandle"><vue-tabs><vue-tab-pane :label="$t(\'vue.table.pin\')"><vue-form label-width="100px"><vue-form-item :label="$t(\'vue.table.leftPin\')"><vue-select clearable v-model="pinForm.leftPin" multiple @change="leftPin" @remove-tag="noPin"><vue-option v-for="(column, index) in tableColumns" :key="index" :label="column.label" :value="column" :disabled="!!column.fixed"></vue-option></vue-select></vue-form-item><vue-form-item :label="$t(\'vue.table.rightPin\')"><vue-select clearable v-model="pinForm.rightPin" multiple @change="rightPin" @remove-tag="noPin"><vue-option v-for="(column, index) in tableColumns" :key="index" :label="column.label" :value="column" :disabled="!!column.fixed"></vue-option></vue-select></vue-form-item></vue-form></vue-tab-pane><vue-tab-pane :label="$t(\'vue.table.sort\')"><vue-list :height="150" :default-selected="false"><vue-list-item v-for="(column, index) in tableColumns" :key="index"><vue-button type="text" style="padding-left:15px" @click="removeSortColumn(column)">{{column.label}}</vue-button><div style="float:right;"><vue-button style="padding:10px 0 0 0;" :style="{color: column.sortOrder === \'ascending\' ? \'#eb9e05\' : \'rgb(151, 168, 190)\'}" icon="vue-icon-caret-top" type="text" @click="sortColumn(column)"></vue-button><vue-button style="padding:10px 15px 0 0;" :style="{color: column.sortOrder === \'descending\' ? \'#eb9e05\' : \'rgb(151, 168, 190)\'}" icon="vue-icon-caret-bottom" type="text" @click="sortColumn(column, true)"></vue-button></div><vue-divider v-if="index!==tableColumns.length-1"></vue-divider></vue-list-item></vue-list><vue-form label-width="70px"><vue-form-item :label="$t(\'vue.table.sortBy\')"><vue-tag hit style="margin:5px 5px 0 0;" v-for="(column, index) in sortList" :key="index" closable type="info" @close="removeSortColumn(column)">{{column.label}}<i style="padding:5px 0 0 5px;" :class="[{\'vue-icon-caret-top\': column.sortOrder === \'ascending\'}, {\'vue-icon-caret-bottom\': column.sortOrder === \'descending\'}]"></i></vue-tag></vue-form-item></vue-form></vue-tab-pane><vue-tab-pane :label="$t(\'vue.table.filter\')"><vue-form label-width="100px" :model="filterForm"><vue-form-item :label="$t(\'vue.table.column\')"><vue-select v-model="filterForm.filterColumn"><vue-option v-for="(column, index) in tableColumns" :key="index" :label="column.label" :value="column"></vue-option></vue-select></vue-form-item><vue-form-item :label="$t(\'vue.table.conditions\')"><vue-input icon="vue-icon-search" v-model="filterForm.conditions" :on-icon-click="filterColumn" @keydown.enter.native="filterColumn" ref="filterInput"><vue-select slot="prepend" v-model="filterForm.operations" style="width:80px;font-size:21px;" @change="operationsChange"><vue-option v-for="(item, index) in operations" :key="index" :label="item" :value="item"></vue-option></vue-select></vue-input></vue-form-item></vue-form><vue-divider></vue-divider><vue-form label-width="100px"><vue-form-item :label="$t(\'vue.table.filterBy\')"><vue-tag hit style="margin:5px 5px 0 0;" v-for="(column, index) in filterList" :key="index" closable type="info" @close="removeFilterColumn(column)">{{column.label}} {{column.operations}} {{column.conditions}}</vue-tag></vue-form-item></vue-form></vue-tab-pane><vue-tab-pane :label="$t(\'vue.table.display\')"><vue-list :height="150" :default-selected="false"><vue-list-item v-for="(column, index) in tableColumns" :key="index" @select="displayColumn(column)" style="cursor:pointer;"><vue-button type="text" style="padding-left:15px">{{column.label}}</vue-button><div style="float:right;"><vue-button style="padding:10px 15px 0 0;" :style="{color: column.visible ? \'#13ce66\' : \'#a94442\'}" :icon="column.visible ? \'vue-icon-success\' : \'vue-icon-error\'" type="text"></vue-button></div><vue-divider v-if="index!==tableColumns.length-1"></vue-divider></vue-list-item></vue-list></vue-tab-pane><vue-tab-pane :label="$t(\'vue.table.exportData\')"><vue-form label-width="100px"><vue-form-item :label="$t(\'vue.table.fileName\')"><vue-input v-model="fileName"></vue-input></vue-form-item></vue-form><div style="text-align:right"><vue-button @click="exportData(false)" type="primary" icon="vue-icon-download2">{{$t(\'vue.table.exportHandleData\')}}</vue-button><vue-button @click="exportData(true)" type="primary" icon="vue-icon-download2">{{$t(\'vue.table.exportOrgData\')}}</vue-button></div></vue-tab-pane></vue-tabs></vue-dialog>',
		data: function() {
			return {
				tableColumns: [],
				pinForm: {
					leftPin: null,
					rightPin: null
				},
				filterForm: {
					filterColumn: null,
					conditions: null,
					operations: '='
				},
				operations: ['=', '<', '>', '<=', '>=', '<>', '%'],
				sortList: [],
				filterList: [],
				dialogVisible: false,
				fileName: ''
			}
		},
		props: {
			visible: Boolean,
			store: {
				required: true
			}
		},
		model: {
			prop: 'visible'
		},
		watch: {
			visible: function(val) {
				this.dialogVisible = val;
			}
		},
		methods: {
			closeHandle: function() {
				this.$parent.showContextMenu = false;
			},
			operationsChange: function() {
				this.$nextTick(this.$refs.filterInput.focus);
			},
			exportData: function(flg) {
				var params = {};
				params.fileName = this.fileName;
				params.original = flg;
				this.store.table.exportCsv(params);
			},
			noPin: function(column) {
				column.value.fixed = false;
				this.store.scheduleLayout();
			},
			leftPin: function(columns) {
				if (columns.length <= 0) {
					var layoutFLg = false;
					this.tableColumns.forEach(function(column){
						if (column.fixed === true || column.fixed === 'left'){
							column.fixed = false;
							layoutFLg = true;
						}
					});
					if (layoutFLg) this.store.scheduleLayout();
					return;
				}
				for (var i=0,j=columns.length; i<j; i++) {
					var column = columns[i];
					column.fixed = 'left';
					column.fixedIndex = i;
				}
				this.store.scheduleLayout();
			},
			rightPin: function(columns) {
				if (columns.length <= 0)  {
					var layoutFLg = false;
					this.tableColumns.forEach(function(column){
						if (column.fixed === 'right'){
							column.fixed = false;
							layoutFLg = true;
						}
					});
					if (layoutFLg) this.store.scheduleLayout();
					return;
				}
				for (var i=0,j=columns.length; i<j; i++) {
					var column = columns[i];
					column.fixed = 'right';
					column.fixedIndex = i;
				}
				this.store.scheduleLayout();
			},
			sortColumn: function(column, descFlg) {
				if (descFlg) {
					column.sortOrder = "descending"
				} else {
					column.sortOrder = "ascending"
				}
				var existflg = false;
				this.sortList.forEach(function(sortObj) {
					if (column.property === sortObj.property) {
						sortObj.sortOrder = column.sortOrder;
						existflg = true;
					}
				});
				if (!existflg) {
					this.sortList.push(column);
				}
				this.doSort();
			},
			removeSortColumn: function(column) {
				var sortIndex = this.sortList.indexOf(column);
				if (sortIndex === -1)
					return;
				column.sortOrder = "";
				this.sortList.splice(sortIndex, 1);
				this.doSort();
			},
			doSort: function() {
				this.store.table.multipleColumnSort(this.sortList);
				this.$forceUpdate();
			},
			filterColumn: function() {
				var filterColumn = this.filterForm.filterColumn;
				if (!filterColumn) return;
				filterColumn.conditions = this.filterForm.conditions;
				filterColumn.operations = this.filterForm.operations;
				if (typeof filterColumn.filterMethod === 'function' && !filterColumn.orgFilterMethod) {
					filterColumn.orgFilterMethod = filterColumn.filterMethod;
				}
				filterColumn.filterMethod = function(value, row) {
					switch (filterColumn.operations) {
						case '=':
							return row[filterColumn.property] === filterColumn.conditions;
						case '>':
							return row[filterColumn.property] > filterColumn.conditions;
						case '<':
							return row[filterColumn.property] < filterColumn.conditions;
						case '<=':
							return row[filterColumn.property] <= filterColumn.conditions;
						case '>=':
							return row[filterColumn.property] >= filterColumn.conditions;
						case '<>':
							return row[filterColumn.property] !== filterColumn.conditions;
						case '%':
							return row[filterColumn.property].indexOf(filterColumn.conditions) !== -1;
					}
				}
				var existflg = false;
				this.filterList.forEach(function(filterObj) {
					if (filterColumn.property === filterObj.property) {
						existflg = true;
					}
				});
				if (filterColumn && !existflg) {
					this.filterList.push(filterColumn);
				}
				this.doFilter();
			},
			removeFilterColumn: function(column) {
				var store = this.store;
				store.commit('filterChange', {
					column: column,
					values: []
				});
				if (column.orgFilterMethod) {
					column.filterMethod = column.orgFilterMethod;
					column.orgFilterMethod = null;
				}
				this.filterList.splice(this.filterList.indexOf(column), 1);
			},
			doFilter: function() {
				var store = this.store;
				var filterList = this.filterList;
				filterList.forEach(function(filterColumn) {
					store.commit('filterChange', {
						column: filterColumn,
						values: 'filter'
					});
				})
				this.doSort();
				this.$forceUpdate();
			},
			displayColumn: function(column) {
				column.visible = !column.visible;
				this.store.scheduleLayout();
			}
		},
		mounted: function() {
			if (this.store) {
				var tableColumns = this.tableColumns;
				this.store.states.columns.forEach(function(column) {
					if (column.property !== 'selectionColumn'
					 && column.property !== 'indexColumn'
					 && column.property !== 'expandColumn') {
						tableColumns.push(column)
					}
				});
				this.pinForm.leftPin = this.store.table.fixedColumns;
				this.pinForm.rightPin = this.store.table.rightFixedColumns
			}
		}
	};
	var VueTable = {
		template: '<div :class="[\'vue-table\', {\'vue-table--fit\': fit, \'vue-table--striped\': stripe, \'vue-table--border\': border, \'vue-table--enable-row-hover\': !store.states.isComplex, \'vue-table--enable-row-transition\': true || (store.states.data || []).length !== 0 && (store.states.data || []).length < 100}]" @mouseleave="handleMouseLeave($event)" :style="{width: layout.bodyWidth <= 0 ? \'0px\' : \'\'}"><div class="hidden-columns" ref="hiddenColumns"><slot></slot></div><div class="vue-table__header-wrapper" ref="headerWrapper" v-show="showHeader"><table-header :store="store" :layout="layout" :border="border" :default-sort="defaultSort" :style="{width: layout.bodyWidth ? layout.bodyWidth + \'px\' : \'\'}"></table-header></div><div class="vue-table__body-wrapper" ref="bodyWrapper" :style="[bodyHeight]"><table-body ref="tableBody" :context="context" :store="store" :layout="layout" :expand-class-name="expandClassName" :row-class-name="rowClassName" :row-style="rowStyle" :highlight="highlightCurrentRow" :style="{width: bodyWidth}"></table-body><div :style="{width: bodyWidth}" class="vue-table__empty-block" v-show="!data || data.length === 0"><span class="vue-table__empty-text"><slot name="empty">{{emptyText || $t(\'vue.table.emptyText\')}}</slot></span></div></div><div class="vue-table__footer-wrapper" ref="footerWrapper" v-show="showSummary && data && data.length > 0"><table-footer ref="tableFooter" :store="store" :layout="layout" :border="border" :sum-text="sumText || $t(\'vue.table.sumText\')" :summary-method="summaryMethod" :default-sort="defaultSort" :style="{width: layout.bodyWidth ? layout.bodyWidth + \'px\' : \'\'}"></table-footer></div><div class="vue-table__fixed" ref="fixedWrapper" v-show="fixedColumns.length > 0" :style="[{width: layout.fixedWidth ? layout.fixedWidth + \'px\' : \'\'}, fixedHeight]"><div class="vue-table__fixed-header-wrapper" ref="fixedHeaderWrapper" v-show="showHeader"><table-header fixed="left" :border="border" :store="store" :layout="layout" :style="{width: layout.fixedWidth ? layout.fixedWidth + \'px\' : \'\'}"></table-header></div><div class="vue-table__fixed-body-wrapper" ref="fixedBodyWrapper" :style="[{top: layout.headerHeight + \'px\'}, fixedBodyHeight]"><table-body fixed="left" :store="store" :layout="layout" :highlight="highlightCurrentRow" :row-class-name="rowClassName" :expand-class-name="expandClassName" :row-style="rowStyle" :style="{width: layout.fixedWidth ? layout.fixedWidth + \'px\' : \'\'}"></table-body></div><div class="vue-table__fixed-footer-wrapper" ref="fixedFooterWrapper" v-show="showSummary && data && data.length > 0"><table-footer fixed="left" :border="border" :sum-text="sumText || $t(\'vue.table.sumText\')" :summary-method="summaryMethod" :store="store" :layout="layout" :style="{width: layout.fixedWidth ? layout.fixedWidth + \'px\' : \'\'}"></table-footer></div></div><div class="vue-table__fixed-right" ref="rightFixedWrapper" v-show="rightFixedColumns.length > 0" :style="[{width: layout.rightFixedWidth ? layout.rightFixedWidth + \'px\' : \'\'}, {right: layout.scrollY ? (border ? layout.gutterWidth : (layout.gutterWidth || 1)) + \'px\' : \'\'}, fixedHeight]"><div class="vue-table__fixed-header-wrapper" ref="rightFixedHeaderWrapper" v-show="showHeader"><table-header fixed="right" :border="border" :store="store" :layout="layout" :style="{width: layout.rightFixedWidth ? layout.rightFixedWidth + \'px\' : \'\'}"></table-header></div><div class="vue-table__fixed-body-wrapper" ref="rightFixedBodyWrapper" :style="[{top: layout.headerHeight + \'px\'}, fixedBodyHeight]"><table-body fixed="right" :store="store" :layout="layout" :row-class-name="rowClassName" :row-style="rowStyle" :highlight="highlightCurrentRow" :style="{width: layout.rightFixedWidth ? layout.rightFixedWidth + \'px\' : \'\'}"></table-body></div><div class="vue-table__fixed-footer-wrapper" ref="rightFixedFooterWrapper" v-show="showSummary && data && data.length > 0"><table-footer fixed="right" :border="border" :sum-text="sumText || $t(\'vue.table.sumText\')" :summary-method="summaryMethod" :store="store" :layout="layout" :style="{width: layout.rightFixedWidth ? layout.rightFixedWidth + \'px\' : \'\'}"></table-footer></div></div><div class="vue-table__fixed-right-patch" v-show="rightFixedColumns.length > 0" :style="{width: layout.scrollY ? layout.gutterWidth + \'px\' : \'0\', height: layout.headerHeight + \'px\'}"></div><div class="vue-table__column-resize-proxy" ref="resizeProxy" v-show="resizeProxyVisible"></div><table-context-menu v-show="contextMenu" v-model="showContextMenu" :store="store"></table-context-menu></div>',
		name: 'VueTable',
		props: {
			data: {
				type: Array,
				default: function() {
					return [];
				}
			},
			lazyload: Boolean,
			height: [String, Number],
			fit: {
				type: Boolean,
				default: true
			},
			stripe: Boolean,
			border: Boolean,
			context: {},
			showHeader: {
				type: Boolean,
				default: true
			},
			showSummary: Boolean,
			contextMenu: Boolean,
			sumText: String,
			summaryMethod: Function,
			rowClassName: [String, Function],
			rowStyle: [Object, Function],
			highlightCurrentRow: Boolean,
			emptyText: String,
			defaultExpandAll: Boolean,
			defaultSort: Object,
			tooltipEffect: String,
			expandClassName: [String, Function]
		},
		components: {
			TableHeader: TableHeader,
			TableBody: TableBody,
			TableFooter: TableFooter,
			TableContextMenu: TableContextMenu
		},
		methods: {
			exportCsv: function(params) {
				if (typeof params !== 'object') params = {};
				if (params.fileName) {
					if (params.fileName.indexOf('.csv') === -1) {
						params.fileName += '.csv';
					}
				} else {
					params.fileName = 'table.csv';
				}
				var columns = [];
				var datas = [];
				if (params.columns && params.data) {
					columns = params.columns;
					datas = params.data;
				} else {
					columns = this.columns;
					if (!('original'in params)) params.original = true;
					datas = params.original ? this.store.states._data : this.store.states.data;
				}
				var noHeader = false;
				if ('noHeader'in params) noHeader = params.noHeader;
				var data = tableDataToCsv(columns, datas, params, noHeader);
				exportFile(params.fileName, data);
			},
			columnFilter: function(column, value) {
				this.store.commit('filterChange', {
					column: column,
					values: value
				});
			},
			multipleColumnSort: function(sortList) {
				var states = this.store.states;
				var _data = (states.filteredData || states._data || []);
				if (sortList.length > 0) {
					states.data = _data.slice().sort(function(data1, data2) {
						for (var i = 0, l = sortList.length; i < l; i++) {
							var column = sortList[i];
							var value1 = data1[column.property];
							var value2 = data2[column.property];
							var sortOrder = 1;
							if (column.sortOrder === "descending") {
								sortOrder = -1
							}
							if (value1 < value2) return -1 * sortOrder;
							if (value1 > value2) return 1 * sortOrder;
						}
					});
				} else {
					states.data = _data;
				}
			},
			toggleContextMenu: function() {
				this.showContextMenu = !this.showContextMenu;
			},
			setCurrentRow: function(row) {
				this.store.commit('setCurrentRow', row);
			},
			toggleRowSelection: function(row, selected) {
				this.store.toggleRowSelection(row, selected);
				this.store.updateAllSelected();
			},
			clearSelection: function() {
				this.store.clearSelection();
			},
			handleMouseLeave: function() {
				this.store.commit('setHoverRow', null);
				if (this.hoverState)
					this.hoverState = null;
			},
			updateScrollY: function() {
				this.layout.updateScrollY();
				var refs = this.$refs;
				if (refs.fixedBodyWrapper)
					refs.fixedBodyWrapper.scrollTop = this.bodyScroll.top;
				if (refs.rightFixedBodyWrapper)
					refs.rightFixedBodyWrapper.scrollTop = this.bodyScroll.top;
			},
			bindEvents: function() {
				var self = this;
				var refs = self.$refs;
				var bodyScroll = function() {
					var scrollLeft = this.scrollLeft;
					var scrollTop = this.scrollTop;
					if (self.bodyScroll.left !== scrollLeft) {
						self.bodyScroll.left = scrollLeft;
						refs.headerWrapper.scrollLeft = scrollLeft;
						refs.footerWrapper.scrollLeft = scrollLeft;
					}
					if (self.bodyScroll.top !== scrollTop) {
						if (refs.tableBody && refs.tableBody.delta.keeps !== 0) {
							refs.tableBody.updateZone(scrollTop);
							refs.tableBody.updateCurrentClass();
						}
						self.bodyScroll.top = scrollTop;
						refs.fixedBodyWrapper.scrollTop = scrollTop;
						refs.rightFixedBodyWrapper.scrollTop = scrollTop;
					}
				};
				var scrollYMouseWheel = function(event) {
					if (self.layout.scrollY) {
						var wheelDelta = event.wheelDelta || -event.detail;
						var scrollTop = self.bodyScroll.top;
						var wheel = (parseInt(VueUtil.getStyle(self.$el.querySelector('tbody > tr'), 'height'), 10) || 40) * 3;
						if (wheelDelta < 0) {
							scrollTop += wheel;
						} else {
							scrollTop -= wheel;
						}
						scrollTop < 0 ? scrollTop = 0 : void 0;
						if (refs.tableBody && refs.tableBody.delta.keeps !== 0) {
							refs.tableBody.updateZone(scrollTop);
							refs.tableBody.updateCurrentClass();
						}
						refs.bodyWrapper.scrollTop = scrollTop;
						refs.fixedBodyWrapper.scrollTop = scrollTop;
						refs.rightFixedBodyWrapper.scrollTop = scrollTop;
						event.preventDefault();
					}
				};
				var scrollXMouseWheel = function(event) {
					if (self.layout.scrollX) {
						var wheelDelta = event.wheelDelta || -event.detail;
						var scrollLeft = self.bodyScroll.left;
						if (wheelDelta < 0) {
							scrollLeft += 80;
						} else {
							scrollLeft -= 80;
						}
						scrollLeft < 0 ? scrollLeft = 0 : void 0;
						refs.bodyWrapper.scrollLeft = scrollLeft;
						refs.headerWrapper.scrollLeft = scrollLeft;
						refs.footerWrapper.scrollLeft = scrollLeft;
						event.preventDefault();
					}
				};
				var mouseWheel = isFirefox ? 'DOMMouseScroll' : 'mousewheel';
				VueUtil.on(refs.bodyWrapper, 'scroll', bodyScroll);
				VueUtil.on(refs.bodyWrapper, mouseWheel, scrollYMouseWheel);
				VueUtil.on(refs.fixedBodyWrapper, mouseWheel, scrollYMouseWheel);
				VueUtil.on(refs.rightFixedBodyWrapper, mouseWheel, scrollYMouseWheel);
				VueUtil.on(refs.headerWrapper, mouseWheel, scrollXMouseWheel);
				VueUtil.on(refs.fixedHeaderWrapper, mouseWheel, scrollXMouseWheel);
				VueUtil.on(refs.rightFixedHeaderWrapper, mouseWheel, scrollXMouseWheel);
				VueUtil.on(refs.footerWrapper, mouseWheel, scrollXMouseWheel);
				VueUtil.on(refs.fixedFooterWrapper, mouseWheel, scrollXMouseWheel);
				VueUtil.on(refs.rightFixedFooterWrapper, mouseWheel, scrollXMouseWheel);
				if (self.fit) {
					VueUtil.addResizeListener(self.$el, self.doLayout);
				}
			},
			resizeZone: function(noFooter) {
				var refs = this.$refs;
				if (refs.tableBody && refs.tableBody.delta.keeps !== 0 && !this.fixed) {
					var scrollTop = this.bodyScroll.top;
					refs.tableBody.updateZone(scrollTop);
					refs.tableBody.updateCurrentClass();
				}
				if (refs.tableFooter && this.showSummary && !this.fixed && !noFooter) {
					refs.tableFooter.getSum(this.store.states.data);
				}
			},
			doLayout: function(noFooter) {
				var self = this;
				self.store.updateColumns();
				self.layout.update();
				self.layout.updateHeight();
				self.$nextTick(function() {
					self.updateScrollY();
					self.resizeZone(noFooter);
				});
			}
		},
		created: function() {
			var self = this;
			self.tableId = 'vue-table_1_';
		},
		computed: {
			bodyWrapper: function() {
				return this.$refs.bodyWrapper;
			},
			selection: function() {
				return this.store.selection;
			},
			columns: function() {
				return this.store.states.columns;
			},
			fixedColumns: function() {
				return this.store.states.fixedColumns;
			},
			rightFixedColumns: function() {
				return this.store.states.rightFixedColumns;
			},
			bodyHeight: function() {
				var style = {};
				if (this.height) {
					style = {
						height: this.layout.bodyHeight ? this.layout.bodyHeight + 'px' : ''
					};
				}
				return style;
			},
			bodyWidth: function() {
				var layout = this.layout;
				return layout.bodyWidth ? layout.bodyWidth - (layout.scrollY ? layout.gutterWidth : 0) + 'px' : '';
			},
			fixedBodyHeight: function() {
				var style = {};
				var layout = this.layout;
				if (this.height) {
					style = {
						height: layout.fixedBodyHeight ? layout.fixedBodyHeight + 'px' : ''
					};
				}
				return style;
			},
			fixedHeight: function() {
				var style = {};
				var layout = this.layout;
				style = {
					height: layout.viewportHeight ? layout.viewportHeight + 'px' : ''
				};
				return style;
			}
		},
		watch: {
			height: function(value) {
				this.layout.setHeight(value);
			},
			data: {
				immediate: true,
				handler: function(val) {
					this.store.commit('setData', val);
				}
			},
			showHeader: function(val) {
				this.$nextTick(this.doLayout);
			},
			showSummary: function(val) {
				this.$nextTick(this.doLayout);
			},
			lazyload: function(val) {
				if (this.height) {
					var delta = this.$refs.tableBody.delta;
					if (val) {
						delta.size = parseInt(VueUtil.getStyle(this.$el.querySelector('tbody > tr'), 'height'), 10) || 40;
						delta.remain = Math.round(this.height * 1 / delta.size);
						delta.keeps = delta.remain;
					} else {
						delta.size = delta.remain = delta.keeps = 0;
					}
					this.$nextTick(this.doLayout);
				}
			}
		},
		destroyed: function() {
			if (this.windowResizeListener)
				VueUtil.removeResizeListener(this.$el, this.windowResizeListener);
		},
		mounted: function() {
			var self = this;
			if (self.height) {
				self.layout.setHeight(self.height);
			}
			self.store.states.columns.forEach(function(column) {
				if (column.filteredValue && column.filteredValue.length) {
					self.store.commit('filterChange', {
						column: cloumn,
						values: column.filteredValue,
						silent: true
					});
				}
			});
			self.doLayout();
			self.$nextTick(function() {
				self.bindEvents();
			});
		},
		data: function() {
			var self = this;
			var store = new TableStore(self, {defaultExpandAll: self.defaultExpandAll});
			var layout = new TableLayout({
				store: store,
				table: self,
				fit: self.fit,
				showHeader: self.showHeader
			});
			return {
				store: store,
				layout: layout,
				renderExpanded: null,
				resizeProxyVisible: false,
				showContextMenu: false,
				bodyScroll: {left: 0, top: 0}
			};
		}
	};
	Vue.component(VueTable.name, VueTable);
});
