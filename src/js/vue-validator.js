(function(context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['VueUtil'], definition);
	} else {
		context.VueValidator = definition(context.VueUtil);
	}
})(this, function(VueUtil) {
	'use strict';
	var newMessages = function() {
		return {
			default: 'Validation Error'
		};
	};
	var _extends = Object.assign || function(target) {
		for (var i = 1; i < arguments.length; i++) {
			var source = arguments[i];
			for (var key in source) {
				if (Object.prototype.hasOwnProperty.call(source, key)) {
					target[key] = source[key];
				}
			}
		}
		return target;
	}
	var isNativeStringType = function(type) {
		return type === 'string' || type === 'url' || type === 'hex' || type === 'email' || type === 'pattern';
	};
	var isEmptyValue = function(value, type) {
		if (VueUtil.isUndef(value)) {
			return true;
		}
		if (type === 'array' && VueUtil.isArray(value) && !value.length) {
			return true;
		}
		if (isNativeStringType(type) && typeof value === 'string' && !value) {
			return true;
		}
		return false;
	};
	var isEmptyObject = function(obj) {
		return Object.keys(obj).length === 0;
	};
	var asyncParallelArray = function(arr, func, callback) {
		var results = [];
		var total = 0;
		var arrLength = arr.length;
		function count(errors) {
			results.push.apply(results, errors);
			total++;
			if (total === arrLength) {
				callback(results);
			}
		}
		arr.forEach(function(a) {
			func(a, count);
		});
	};
	var asyncSerialArray = function(arr, func, callback) {
		var index = 0;
		var arrLength = arr.length;
		function next(errors) {
			if (errors && errors.length) {
				callback(errors);
				return;
			}
			var original = index;
			index = index + 1;
			if (original < arrLength) {
				func(arr[original], next);
			} else {
				callback([]);
			}
		}
		next([]);
	};
	var flattenObjArr = function(objArr) {
		var ret = [];
		Object.keys(objArr).forEach(function(k) {
			ret.push.apply(ret, objArr[k]);
		});
		return ret;
	};
	var asyncMap = function(objArr, option, func, callback) {
		if (option.first) {
			var flattenArr = flattenObjArr(objArr);
			return asyncSerialArray(flattenArr, func, callback);
		}
		var firstFields = option.firstFields || [];
		if (firstFields === true) {
			firstFields = Object.keys(objArr);
		}
		var objArrKeys = Object.keys(objArr);
		var objArrLength = objArrKeys.length;
		var total = 0;
		var results = [];
		var next = function(errors) {
			results.push.apply(results, errors);
			total++;
			if (total === objArrLength) {
				callback(results);
			}
		};
		objArrKeys.forEach(function(key) {
			var arr = objArr[key];
			if (firstFields.indexOf(key) !== -1) {
				asyncSerialArray(arr, func, next);
			} else {
				asyncParallelArray(arr, func, next);
			}
		});
	};
	var complementError = function(rule) {
		return function(oe) {
			if (oe && oe.message) {
				oe.field = oe.field || rule.fullField;
				return oe;
			}
			return {
				message: oe,
				field: oe.field || rule.fullField,
			};
		}
	};
	var deepMerge = function(target, source) {
		if (source) {
			for (var s in source) {
				if (source.hasOwnProperty(s)) {
					var value = source[s];
					if (typeof value === 'object' && typeof target[s] === 'object') {
						target[s] = _extends({}, target[s], value);
					} else {
						target[s] = value;
					}
				}
			}
		}
		return target;
	};
	var rulesEnumerable = function(rule, value, source, errors, options) {
		var ENUM = 'enum';
		rule[ENUM] = VueUtil.isArray(rule[ENUM]) ? rule[ENUM] : [];
		if (rule[ENUM].indexOf(value) === -1) {
			errors.push(options.messages.default);
		}
	};
	var rulesPattern = function(rule, value, source, errors, options) {
		if (rule.pattern) {
			if (rule.pattern instanceof RegExp) {
				if (!rule.pattern.test(value)) {
					errors.push(options.messages.default);
				}
			} else if (typeof rule.pattern === 'string') {
				var _pattern = new RegExp(rule.pattern);
				if (!_pattern.test(value)) {
					errors.push(options.messages.default);
				}
			}
		}
	};
	var rulesRange = function(rule, value, source, errors, options) {
		var len = typeof rule.len === 'number';
		var min = typeof rule.min === 'number';
		var max = typeof rule.max === 'number';
		var val = value;
		var key = null;
		var num = typeof (value) === 'number';
		var str = typeof (value) === 'string';
		var arr = VueUtil.isArray(value);
		if (num) {
			key = 'number';
		} else if (str) {
			key = 'string';
		} else if (arr) {
			key = 'array';
		}
		if (!key) {
			return false;
		}
		if (str || arr) {
			val = value.length;
		}
		if (len) {
			if (val !== rule.len) {
				errors.push(options.messages.default);
			}
		} else if (min && !max && val < rule.min) {
			errors.push(options.messages.default);
		} else if (max && !min && val > rule.max) {
			errors.push(options.messages.default);
		} else if (min && max && (val < rule.min || val > rule.max)) {
			errors.push(options.messages.default);
		}
	};
	var rulesRequired = function(rule, value, source, errors, options, type) {
		if (rule.required && (!source.hasOwnProperty(rule.field) || isEmptyValue(value, type || rule.type))) {
			errors.push(options.messages.default);
		}
	};
	var rulesType = function(rule, value, source, errors, options) {
		var pattern = {
			email: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
			url: new RegExp('^(?!mailto:)(?:(?:http|https|ftp)://|//)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$','i'),
			hex: /^#?([a-f0-9]{6}|[a-f0-9]{3})$/i,
		};
		var types = {
			integer: function(value) {
				return types.number(value) && parseInt(value, 10) === value;
			},
			float: function(value) {
				return types.number(value) && !types.integer(value);
			},
			array: function(value) {
				return VueUtil.isArray(value);
			},
			regexp: function(value) {
				if (value instanceof RegExp) {
					return true;
				}
				try {
					return !!new RegExp(value);
				} catch (e) {
					return false;
				}
			},
			date: function(value) {
				return typeof value.getTime === 'function' && typeof value.getMonth === 'function' && typeof value.getYear === 'function';
			},
			number: function(value) {
				if (isNaN(value)) {
					return false;
				}
				return typeof (value) === 'number';
			},
			object: function(value) {
				return typeof (value) === 'object' && !types.array(value);
			},
			method: function(value) {
				return typeof (value) === 'function';
			},
			email: function(value) {
				return typeof (value) === 'string' && !!value.match(pattern.email) && value.length < 255;
			},
			url: function(value) {
				return typeof (value) === 'string' && !!value.match(pattern.url);
			},
			hex: function(value) {
				return typeof (value) === 'string' && !!value.match(pattern.hex);
			},
		};
		if (rule.required && VueUtil.isUndef(value)) {
			rulesRequired(rule, value, source, errors, options);
			return;
		}
		var custom = ['integer', 'float', 'array', 'regexp', 'object', 'method', 'email', 'number', 'date', 'url', 'hex'];
		var ruleType = rule.type;
		if (custom.indexOf(ruleType) > -1) {
			if (!types[ruleType](value)) {
				errors.push(options.messages.default);
			}
		} else if (ruleType && typeof (value) !== rule.type) {
			errors.push(options.messages.default);
		}
	};
	var rulesWhitespace = function(rule, value, source, errors, options) {
		if (/^\s+$/.test(value) || value === '') {
			errors.push(options.messages.default);
		}
	};
	var rules = {
		enum: rulesEnumerable,
		pattern: rulesPattern,
		range: rulesRange,
		required: rulesRequired,
		type: rulesType,
		whitespace: rulesWhitespace
	};
	var validtorDate = function(rule, value, callback, source, options) {
		var errors = [];
		var validate = rule.required || (!rule.required && source.hasOwnProperty(rule.field));
		if (validate) {
			if (isEmptyValue(value) && !rule.required) {
				return callback();
			}
			rules.required(rule, value, source, errors, options);
			if (!isEmptyValue(value)) {
				rules.type(rule, value, source, errors, options);
				if (value) {
					rules.range(rule, value.getTime(), source, errors, options);
				}
			}
		}
		callback(errors);
	};
	var validtorBoolean = function(rule, value, callback, source, options) {
		var errors = [];
		var validate = rule.required || (!rule.required && source.hasOwnProperty(rule.field));
		if (validate) {
			if (isEmptyValue(value) && !rule.required) {
				return callback();
			}
			rules.required(rule, value, source, errors, options);
			if (VueUtil.isDef(value)) {
				rules.type(rule, value, source, errors, options);
			}
		}
		callback(errors);
	};
	var validtorArray = function(rule, value, callback, source, options) {
		var errors = [];
		var validate = rule.required || (!rule.required && source.hasOwnProperty(rule.field));
		if (validate) {
			if (isEmptyValue(value, 'array') && !rule.required) {
				return callback();
			}
			rules.required(rule, value, source, errors, options, 'array');
			if (!isEmptyValue(value, 'array')) {
				rules.type(rule, value, source, errors, options);
				rules.range(rule, value, source, errors, options);
			}
		}
		callback(errors);
	};
	var validtorType = function(rule, value, callback, source, options) {
		var ruleType = rule.type;
		var errors = [];
		var validate = rule.required || (!rule.required && source.hasOwnProperty(rule.field));
		if (validate) {
			if (isEmptyValue(value, ruleType) && !rule.required) {
				return callback();
			}
			rules.required(rule, value, source, errors, options, ruleType);
			if (!isEmptyValue(value, ruleType)) {
				rules.type(rule, value, source, errors, options);
			}
		}
		callback(errors);
	};
	var validtorString = function(rule, value, callback, source, options) {
		var errors = [];
		var validate = rule.required || (!rule.required && source.hasOwnProperty(rule.field));
		if (validate) {
			if (isEmptyValue(value, 'string') && !rule.required) {
				return callback();
			}
			rules.required(rule, value, source, errors, options, 'string');
			if (!isEmptyValue(value, 'string')) {
				rules.type(rule, value, source, errors, options);
				rules.range(rule, value, source, errors, options);
				rules.pattern(rule, value, source, errors, options);
				if (rule.whitespace === true) {
					rules.whitespace(rule, value, source, errors, options);
				}
			}
		}
		callback(errors);
	};
	var validtorRequired = function(rule, value, callback, source, options) {
		var errors = [];
		var type = VueUtil.isArray(value) ? 'array' : typeof value;
		rules.required(rule, value, source, errors, options, type);
		callback(errors);
	};
	var validtorRegexp = function(rule, value, callback, source, options) {
		var errors = [];
		var validate = rule.required || (!rule.required && source.hasOwnProperty(rule.field));
		if (validate) {
			if (isEmptyValue(value) && !rule.required) {
				return callback();
			}
			rules.required(rule, value, source, errors, options);
			if (!isEmptyValue(value)) {
				rules.type(rule, value, source, errors, options);
			}
		}
		callback(errors);
	};
	var validtorPattern = function(rule, value, callback, source, options) {
		var errors = [];
		var validate = rule.required || (!rule.required && source.hasOwnProperty(rule.field));
		if (validate) {
			if (isEmptyValue(value, 'string') && !rule.required) {
				return callback();
			}
			rules.required(rule, value, source, errors, options);
			if (!isEmptyValue(value, 'string')) {
				rules.pattern(rule, value, source, errors, options);
			}
		}
		callback(errors);
	};
	var validtorObject = function(rule, value, callback, source, options) {
		var errors = [];
		var validate = rule.required || (!rule.required && source.hasOwnProperty(rule.field));
		if (validate) {
			if (isEmptyValue(value) && !rule.required) {
				return callback();
			}
			rules.required(rule, value, source, errors, options);
			if (VueUtil.isDef(value)) {
				rules.type(rule, value, source, errors, options);
			}
		}
		callback(errors);
	};
	var validtorNumber = function(rule, value, callback, source, options) {
		var errors = [];
		var validate = rule.required || (!rule.required && source.hasOwnProperty(rule.field));
		if (validate) {
			if (isEmptyValue(value) && !rule.required) {
				return callback();
			}
			rules.required(rule, value, source, errors, options);
			if (VueUtil.isDef(value)) {
				rules.type(rule, value, source, errors, options);
				rules.range(rule, value, source, errors, options);
			}
		}
		callback(errors);
	};
	var validtorMethod = function(rule, value, callback, source, options) {
		var errors = [];
		var validate = rule.required || (!rule.required && source.hasOwnProperty(rule.field));
		if (validate) {
			if (isEmptyValue(value) && !rule.required) {
				return callback();
			}
			rules.required(rule, value, source, errors, options);
			if (VueUtil.isDef(value)) {
				rules.type(rule, value, source, errors, options);
			}
		}
		callback(errors);
	};
	var validtorEnumerable = function(rule, value, callback, source, options) {
		var errors = [];
		var validate = rule.required || (!rule.required && source.hasOwnProperty(rule.field));
		if (validate) {
			if (isEmptyValue(value) && !rule.required) {
				return callback();
			}
			rules.required(rule, value, source, errors, options);
			if (value) {
				rules['enum'](rule, value, source, errors, options);
			}
		}
		callback(errors);
	};
	var validators = {
		string: validtorString,
		method: validtorMethod,
		number: validtorNumber,
		boolean: validtorBoolean,
		regexp: validtorRegexp,
		integer: validtorNumber,
		float: validtorNumber,
		array: validtorArray,
		object: validtorObject,
		enum: validtorEnumerable,
		pattern: validtorPattern,
		email: validtorType,
		url: validtorType,
		date: validtorDate,
		hex: validtorType,
		required: validtorRequired
	};
	var Schema = function(descriptor) {
		this.rules = null;
		this._messages = newMessages();
		this.define(descriptor);
	};
	Schema.prototype = {
		messages: function(messages) {
			if (messages) {
				this._messages = deepMerge(newMessages(), messages);
			}
			return this._messages;
		},
		define: function(rules) {
			if (!rules) {
				throw new Error('No rules');
			}
			if (typeof rules !== 'object' || VueUtil.isArray(rules)) {
				throw new Error('Rules must be an object');
			}
			this.rules = {};
			var z;
			var item;
			for (z in rules) {
				if (rules.hasOwnProperty(z)) {
					item = rules[z];
					this.rules[z] = VueUtil.isArray(item) ? item : [item];
				}
			}
		},
		validate: function(source_, o, oc) {
			var source = source_;
			var options = o || {};
			var callback = oc;
			if (typeof options === 'function') {
				callback = options;
				options = {};
			}
			if (!this.rules || Object.keys(this.rules).length === 0) {
				if (callback) {
					callback();
				}
				return;
			}
			function complete(results) {
				var i;
				var field;
				var errors = [];
				var fields = {};
				function add(e) {
					if (VueUtil.isArray(e)) {
						errors = errors.concat.apply(errors, e);
					} else {
						errors.push(e);
					}
				}
				for (i = 0; i < results.length; i++) {
					add(results[i]);
				}
				if (!errors.length) {
					errors = null;
					fields = null;
				} else {
					for (i = 0; i < errors.length; i++) {
						field = errors[i].field;
						fields[field] = fields[field] || [];
						fields[field].push(errors[i]);
					}
				}
				callback(errors, fields);
			}
			if (options.messages) {
				var messages = this.messages();
				deepMerge(messages, options.messages);
				options.messages = messages;
			} else {
				options.messages = this.messages();
			}
			var self = this;
			var arr;
			var value;
			var series = {};
			var keys = options.keys || Object.keys(self.rules);
			keys.forEach(function(z) {
				arr = self.rules[z];
				value = source[z];
				arr.forEach(function(r) {
					var rule = r;
					if (typeof (rule.transform) === 'function') {
						if (source === source_) {
							source = _extends({}, source);
						}
						value = source[z] = rule.transform(value);
					}
					if (typeof (rule) === 'function') {
						rule = {
							validator: rule,
						};
					} else {
						rule = _extends({}, rule);
					}
					rule.validator = self.getValidationMethod(rule);
					rule.field = z;
					rule.fullField = rule.fullField || z;
					rule.type = self.getType(rule);
					if (!rule.validator) {
						return;
					}
					series[z] = series[z] || [];
					series[z].push({
						rule: rule,
						value: value,
						source: source,
						field: z,
					});
				});
			});
			var errorFields = {};
			asyncMap(series, options, function(data, doIt) {
				var rule = data.rule;
				var deep = (rule.type === 'object' || rule.type === 'array') && (typeof (rule.fields) === 'object' || typeof (rule.defaultField) === 'object');
				deep = deep && (rule.required || (!rule.required && data.value));
				rule.field = data.field;
				function addFullfield(key, schema) {
					return _extends({}, schema, {
						fullField: rule.fullField + '.' + key
					});
				}
				function cb() {
					var errors = arguments.length > 0 && VueUtil.isDef(arguments[0]) ? arguments[0] : [];
					if (!VueUtil.isArray(errors)) {
						errors = [errors];
					}
					if (errors.length && rule.message) {
						errors = [].concat(rule.message);
					}
					errors = errors.map(complementError(rule));
					if (options.first && errors.length) {
						errorFields[rule.field] = 1;
						return doIt(errors);
					}
					if (!deep) {
						doIt(errors);
					} else {
						if (rule.required && !data.value) {
							if (rule.message) {
								errors = [].concat(rule.message).map(complementError(rule));
							} else if (options.error) {
								errors = [options.error(rule, options.messages.default)];
							} else {
								errors = [];
							}
							return doIt(errors);
						}
						var fieldsSchema = {};
						if (rule.defaultField) {
							for (var k in data.value) {
								if (data.value.hasOwnProperty(k)) {
									fieldsSchema[k] = rule.defaultField;
								}
							}
						}
						fieldsSchema = _extends({}, fieldsSchema, data.rule.fields);
						for (var f in fieldsSchema) {
							if (fieldsSchema.hasOwnProperty(f)) {
								var fieldSchema = VueUtil.isArray(fieldsSchema[f]) ? fieldsSchema[f] : [fieldsSchema[f]];
								fieldsSchema[f] = fieldSchema.map(addFullfield.bind(null, f));
							}
						}
						var schema = new Schema(fieldsSchema);
						schema.messages(options.messages);
						if (data.rule.options) {
							data.rule.options.messages = options.messages;
							data.rule.options.error = options.error;
						}
						schema.validate(data.value, data.rule.options || options, function(errs) {
							doIt(errs && errs.length ? errors.concat(errs) : errs);
						});
					}
				}
				var res = rule.validator(rule, data.value, cb, data.source, options);
				if (res && res.then) {
					res.then(function() {cb();}, function(e) {cb(e);});
				}
			}, function(results) {
				complete(results);
			});
		},
		getType: function(rule) {
			if (VueUtil.isUndef(rule.type) && (rule.pattern instanceof RegExp)) {
				rule.type = 'pattern';
			}
			if (typeof (rule.validator) !== 'function' && (rule.type && !validators.hasOwnProperty(rule.type))) {
				throw new Error('Unknown rule type ' + rule.type.toString());
			}
			return rule.type || 'string';
		},
		getValidationMethod: function(rule) {
			if (typeof rule.validator === 'function') {
				return rule.validator;
			}
			var keys = Object.keys(rule);
			var messageIndex = keys.indexOf('message');
			if (messageIndex !== -1) {
				keys.splice(messageIndex, 1);
			}
			if (keys.length === 1 && keys[0] === 'required') {
				return validators.required;
			}
			return validators[this.getType(rule)] || false;
		},
	};
	Schema.register = function register(type, validator) {
		if (typeof validator !== 'function') {
			throw new Error('Cannot register a validator by type, validator is not a function');
		}
		validators[type] = validator;
	}
	Schema.messages = newMessages();
	return Schema;
});
