(function(context, definition) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['Vue', 'VueUtil'], definition);
	} else {
		context.VueLoader = definition(context.Vue, context.VueUtil);
	}
})(this, function(Vue, VueUtil) {
	'use strict';
	var promiseLoop = function(arr, cb) {
		var realResult = []
		var result = Promise.resolve()
		arr.reverse();
		arr.forEach(function(a, index) {
			result = result.then(function() {
				return cb(a).then(function(res) {
					realResult.push(res)
				})
			})
		})
		return result.then(function() {
			return realResult
		})
	};
	var scopeIndex = 0;
	var scriptCache = [];
	var scriptScopedCache = [];
	var identity = function(value) {
		return value;
	};
	var resolveURL = function(baseURL, url) {
		if (url.substr(0, 2) === './' || url.substr(0, 3) === '../') {
			return baseURL + url;
		}
		return url;
	};
	var StyleContext = function(component, elt) {
		this.component = component;
		this.elt = elt;
	};
	StyleContext.prototype = {
		withBase: function(callback) {
			var tmpBaseElt;
			if (this.component.baseURI) {
				tmpBaseElt = document.createElement('base');
				tmpBaseElt.href = this.component.baseURI;
				var headElt = this.component.getHead();
				headElt.insertBefore(tmpBaseElt, headElt.firstChild);
			}
			callback.call(this);
			if (tmpBaseElt)
				this.component.getHead().removeChild(tmpBaseElt);
		},
		scopeStyles: function(styleElt, scopeName) {
			var resetStyle = function(rules) {
				var scopedRuleAry = [];
				VueUtil.loop(rules, function(rule) {
					var scopedRule = null;
					if (rule.type === 1) {
						var scopedSelectors = [];
						VueUtil.loop(rule.selectorText.split(/\s*,\s*/), function(sel) {
							scopedSelectors.push(scopeName + ' ' + sel);
						});
						scopedRule = scopedSelectors.join(',') + rule.cssText.substr(rule.selectorText.length);
					}
					if (rule.type === 4) {
						scopedRule = '@media ' + rule.conditionText + '{';
						VueUtil.loop(resetStyle(rule.cssRules), function(subScopedRule) {
							if (subScopedRule) {
								scopedRule = scopedRule + subScopedRule;
							}
						});
						scopedRule = scopedRule + '}';
					}
					scopedRuleAry.push(scopedRule);
				});
				return scopedRuleAry;
			};
			var process = function() {
				var sheet = styleElt.sheet;
				var rules = sheet.cssRules;
				var scopedRuleAry = resetStyle(rules);
				VueUtil.loop(scopedRuleAry, function(scopedRule, i) {
					if (VueUtil.isDef(scopedRule)) {
						sheet.deleteRule(i);
						sheet.insertRule(scopedRule, i);
					}
				});
			};
			try {
				process();
			} catch (ex) {
				if (ex instanceof DOMException && ex.code === DOMException.INVALID_ACCESS_ERR) {
					styleElt.sheet.disabled = true;
					styleElt.addEventListener('load', function onStyleLoaded() {
						styleElt.removeEventListener('load', onStyleLoaded);
						VueUtil.debounce(function() {
							process();
							styleElt.sheet.disabled = false;
						})();
					});
					return;
				}
				throw ex;
			}
		},
		compile: function() {
			var hasTemplate = this.template !== null;
			var scoped = this.elt.hasAttribute('scoped');
			if (scoped) {
				if (!hasTemplate) return;
				this.elt.removeAttribute('scoped');
			}
			this.withBase(function() {
				this.component.getHead().appendChild(this.elt);
			});
			if (scoped) this.scopeStyles(this.elt, '[' + this.component.getScopeId() + ']');
			return Promise.resolve();
		},
		getContent: function() {
			return this.elt.textContent;
		},
		setContent: function(content) {
			this.withBase(function() {
				this.elt.textContent = content;
			});
		}
	};
	var ScriptContext = function(component, elt) {
		this.component = component;
		this.elt = elt;
		this.module = {
			exports: {}
		};
	};
	ScriptContext.prototype = {
		getContent: function() {
			return this.elt.textContent;
		},
		setContent: function(content) {
			this.elt.textContent = content;
		},
		addContent: function(content) {
			this.elt.textContent = content + this.elt.textContent;
		},
		asynReadContent: function(url) {
			return new Promise(function(resolve, reject) {
				Vue.http.get(url).then(function(reqponse) {
					resolve(reqponse.bodyText);
				}, function(reqponse) {
					reject(reqponse.status);
				});
			});
		},
		compile: function(module) {
			var childModuleRequire = function(childURL) {
				return httpVueLoader.require(resolveURL(this.component.baseURI, childURL));
			}.bind(this);
			var childLoader = function(childURL, childName) {
				return VueLoader(resolveURL(this.component.baseURI, childURL), childName);
			}.bind(this);
			try {
				Function('exports', 'require', 'VueLoader', 'module', this.getContent()).call(this.module.exports, this.module.exports, childModuleRequire, childLoader, this.module);
			} catch (ex) {
				Vue.config.productionTip && console.error("[VueLoader error]: in '" + this.component.url + "'\n\n" + ex);
			}
			return Promise.resolve(this.module.exports);
		}
	};
	var TemplateContext = function(component, elt) {
		this.component = component;
		this.elt = elt;
	};
	TemplateContext.prototype = {
		getContent: function() {
			return this.elt.innerHTML;
		},
		setContent: function(content) {
			this.elt.innerHTML = content;
		},
		getRootElt: function() {
			var tplElt = this.elt.content || this.elt;
			if ('firstElementChild'in tplElt)
				return tplElt.firstElementChild;
			for (tplElt = tplElt.firstChild; tplElt !== null; tplElt = tplElt.nextSibling)
				if (tplElt.nodeType === Node.ELEMENT_NODE)
					return tplElt;
			return null;
		},
		compile: function() {
			return Promise.resolve();
		}
	};
	var Component = function() {
		this.template = null;
		this.script = null;
		this.styles = [];
		this._scopeId = '';
		this.url = null;
	};
	Component.prototype = {
		getHead: function() {
			return document.head || document.getElementsByTagName('head')[0];
		},
		getScopeId: function() {
			if (this._scopeId === '') {
				this._scopeId = 'data-scope-' + (scopeIndex++).toString(36);
				this.template.getRootElt().setAttribute(this._scopeId, '');
			}
			return this._scopeId;
		},
		load: function(componentURL) {
			this.url = componentURL;
			return httpVueLoader.httpRequest(componentURL).then(function(responseText) {
				scriptScopedCache = [];
				this.baseURI = componentURL.substr(0, componentURL.lastIndexOf('/') + 1);
				var doc = document.implementation.createHTMLDocument('');
				doc.body.innerHTML = (this.baseURI ? '<base href="' + this.baseURI + '">' : '') + responseText;
				for (var it = doc.body.firstChild; it; it = it.nextSibling) {
					switch (it.nodeName) {
					case 'TEMPLATE':
						this.template = new TemplateContext(this,it);
						break;
					case 'SCRIPT':
						var srcStr = it.getAttribute('src');
						var scoped = it.getAttribute('scoped');
						if (srcStr) {
							if (VueUtil.isDef(scoped)) {
								if (scriptScopedCache.indexOf(srcStr) === -1) scriptScopedCache.push(srcStr);
							} else {
								if (scriptCache.indexOf(srcStr) === -1) {
									var newScript = document.createElement('script');
									newScript.setAttribute('src', srcStr);
									this.getHead().appendChild(newScript);
									scriptCache.push(srcStr);
								}
							}
						} else {
							this.script = new ScriptContext(this, it);
						}
						break;
					case 'STYLE':
						this.styles.push(new StyleContext(this,it));
						break;
					}
				}
				return this;
			}.bind(this));
		},
		_normalizeSection: function(eltCx) {
			var p;
			if (eltCx === null || !eltCx.elt.hasAttribute('src')) {
				p = Promise.resolve(null);
			} else {
				p = httpVueLoader.httpRequest(eltCx.elt.getAttribute('src')).then(function(content) {
					eltCx.elt.removeAttribute('src');
					return content;
				});
			}
			return p.then(function(content) {
				if (eltCx !== null && eltCx.elt.hasAttribute('lang')) {
					var lang = eltCx.elt.getAttribute('lang');
					eltCx.elt.removeAttribute('lang');
					return httpVueLoader.langProcessor[lang.toLowerCase()](content === null ? eltCx.getContent() : content);
				}
				return content;
			}).then(function(content) {
				if (content !== null)
					eltCx.setContent(content);
			});
		},
		normalize: function() {
			return Promise.all(Array.prototype.concat(this._normalizeSection(this.template), this._normalizeSection(this.script), this.styles.map(this._normalizeSection))).then(function() {
				return this;
			}.bind(this));
		},
		compile: function() {
			return Promise.all(Array.prototype.concat(this.template && this.template.compile(), this.script && this.script.compile(), this.styles.map(function(style) {
				return style.compile();
			}))).then(function() {
				return this;
			}.bind(this));
		}
	};
	var httpVueLoader = {
		load: function(url) {
			return function() {
				return new Component().load(url).then(function(component) {
					if (VueUtil.isDef(component.script)) {
						return promiseLoop(scriptScopedCache, component.script.asynReadContent).then(function(responseText){
							component.script.addContent(responseText);
							return component;
						});
					} else {
						return component;
					}
				}).then(function(component) {
					return component.normalize();
				}).then(function(component) {
					return component.compile();
				}).then(function(component) {
					var exports = component.script !== null ? component.script.module.exports : {};
					if (component.template !== null)
						exports.template = component.template.getContent();
					exports._baseURI = component.baseURI;
					return exports;
				});
			}
		},
		require: function(moduleName) {
			return window[moduleName];
		},
		httpRequest: function(url) {
			return new Promise(function(resolve, reject) {
				Vue.http.get(url).then(function(reqponse) {
					resolve(reqponse.bodyText);
				}, function(reqponse) {
					reject(reqponse.status);
				});
			});
		},
		langProcessor: {
			html: identity,
			js: identity,
			css: identity
		}
	};
	var VueLoader = function(url) {
		return httpVueLoader.load(url);
	};
	return VueLoader;
});
