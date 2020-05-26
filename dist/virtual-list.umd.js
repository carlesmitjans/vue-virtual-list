(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global['virtual-list'] = {}));
}(this, (function (exports) { 'use strict';

  function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
      var info = gen[key](arg);
      var value = info.value;
    } catch (error) {
      reject(error);
      return;
    }

    if (info.done) {
      resolve(value);
    } else {
      Promise.resolve(value).then(_next, _throw);
    }
  }

  function _asyncToGenerator(fn) {
    return function () {
      var self = this,
          args = arguments;
      return new Promise(function (resolve, reject) {
        var gen = fn.apply(self, args);

        function _next(value) {
          asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
        }

        function _throw(err) {
          asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
        }

        _next(undefined);
      });
    };
  }

  /**
   * Returns a function, that, as long as it continues to be invoked, will not
   * be triggered. The function will be called after it stops being called for
   * N milliseconds. If `immediate` is passed, trigger the function on the
   * leading edge, instead of the trailing. The function also has a property 'clear' 
   * that is a function which will clear the timer to prevent previously scheduled executions. 
   *
   * @source underscore.js
   * @see http://unscriptable.com/2009/03/20/debouncing-javascript-methods/
   * @param {Function} function to wrap
   * @param {Number} timeout in ms (`100`)
   * @param {Boolean} whether to execute at the beginning (`false`)
   * @api public
   */
  function debounce(func, wait, immediate){
    var timeout, args, context, timestamp, result;
    if (null == wait) wait = 100;

    function later() {
      var last = Date.now() - timestamp;

      if (last < wait && last >= 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          context = args = null;
        }
      }
    }
    var debounced = function(){
      context = this;
      args = arguments;
      timestamp = Date.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };

    debounced.clear = function() {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
    };
    
    debounced.flush = function() {
      if (timeout) {
        result = func.apply(context, args);
        context = args = null;
        
        clearTimeout(timeout);
        timeout = null;
      }
    };

    return debounced;
  }
  // Adds compatibility for ES modules
  debounce.debounce = debounce;

  var debounce_1 = debounce;

  function isScrollable(node) {
    var scrollRegex = /(auto|scroll)/;

    function getStyle(node, prop) {
      getComputedStyle(node, null).getPropertyValue(prop);
    }

    return scrollRegex.test(getStyle(node, 'overflow')) || scrollRegex.test(getStyle(node, 'overflow-x')) || scrollRegex.test(getStyle(node, 'overflow-y'));
  }
  function getFirstScrollableParent(node) {
    var parentNode = node && node.parentNode;

    if (!parentNode || parentNode === document.body) {
      return document.body;
    } else if (isScrollable(parentNode)) {
      return parentNode;
    } else {
      return getFirstScrollableParent(parentNode);
    }
  }

  var uid = 0;
  var script = {
    props: {
      items: {
        type: Array,
        "default": function _default() {
          return [];
        }
      },
      keyField: {
        type: String,
        "default": 'id'
      },
      prerender: {
        type: Number,
        "default": 0
      },
      itemSize: {
        type: Number,
        "default": null
      },
      buffer: {
        type: Number,
        "default": 10
      },
      typeField: {
        type: String,
        "default": 'type'
      }
    },
    data: function data() {
      return {
        scrollableParent: null,
        totalHeight: 0,
        ready: false,
        pool: [],
        sizeCache: new Map(),
        views: new Map(),
        unusedViews: new Map(),
        averageItemSize: 0,
        minItemSize: 0,
        anchorItem: {
          index: 0,
          offset: 0
        },
        firstAttachedItem: 0,
        lastAttachedItem: 0,
        anchorScrollTop: 0
      };
    },
    watch: {
      items: function items() {
        this.updateVisibleItems(true);
      }
    },
    created: function created() {
      this.$_scrollDirty = false;
      this.$_window_width = null;
      this.debouncedUpdatePositions = debounce_1.debounce(this.updateItemsPosition, 100); // In SSR mode, we also prerender the same number of item for the first render
      // to avoir mismatch between server and client templates

      if (this.prerender) {
        this.$_prerender = true;
        this.updateVisibleItems(false);
      }
    },
    mounted: function mounted() {
      this.$_window_width = window.innerWidth;
      this.init();
    },
    beforeDestroy: function beforeDestroy() {
      this.removeEventListeners();
    },
    methods: {
      getFirstScrollableParent: function getFirstScrollableParent$1() {
        return getFirstScrollableParent(this.$el);
      },
      init: function init() {
        var scrollableParent = this.getFirstScrollableParent();

        if (scrollableParent !== document.body) {
          this.scrollableParent = scrollableParent;
        }

        this.addEventListeners(); // In SSR mode, render the real number of visible items

        this.$_prerender = false;
        this.updateVisibleItems(true);
        this.ready = true;
      },
      addEventListeners: function addEventListeners() {
        if (!this.scrollableParent) {
          window.addEventListener('scroll', this.onScroll);
        } else {
          this.scrollableParent.addEventListener('scroll', this.onScroll);
        }

        window.addEventListener('resize', this.onResize);
      },
      removeEventListeners: function removeEventListeners() {
        if (!this.scrollableParent) {
          window.removeEventListener('scroll', this.onScroll);
        } else {
          this.scrollableParent.removeEventListener('scroll', this.onScroll);
        }

        window.removeEventListener('resize', this.onResize);
      },
      onScroll: function onScroll() {
        var _this = this;

        if (!this.$_scrollDirty) {
          this.$_scrollDirty = true;
          requestAnimationFrame(function () {
            _this.$_scrollDirty = false;

            var _this$updateVisibleIt = _this.updateVisibleItems(false, true),
                continuous = _this$updateVisibleIt.continuous; // It seems sometimes chrome doesn't fire scroll event :/
            // When non continous scrolling is ending, we force a refresh


            if (!continuous) {
              clearTimeout(_this.$_refreshTimout);
              _this.$_refreshTimout = setTimeout(_this.handleScroll, 100);
            }
          });
        }
      },
      onResize: function onResize() {
        if (this.$_window_width !== window.innerWidth) {
          this.clearSizeCache();

          if (this.ready) {
            this.updateVisibleItems(false);
          }
        }
      },
      clearSizeCache: function clearSizeCache() {
        this.averageItemSize = null;
        this.minItemSize = null;
        this.sizeCache.clear();
      },
      calculateAnchoredItem: function calculateAnchoredItem(initialAnchor, delta) {
        var keyField = this.keyField;

        if (delta === 0) {
          return initialAnchor;
        } else {
          delta += initialAnchor.offset;
          var i = initialAnchor.index;

          if (delta < 0) {
            while (delta < 0 && i > 0) {
              var key = keyField ? this.items[i - 1][keyField] : this.items[i - 1];
              var height = this.sizeCache.get(key) || this.averageItemSize;
              delta += height;
              i--;
            }
          } else {
            while (delta > 0 && i < this.items.length - 1) {
              var _key = keyField ? this.items[i + 1][keyField] : this.items[i + 1];

              var _height = this.sizeCache.get(_key) || this.averageItemSize;

              delta -= _height;
              i++;
            }
          }

          return {
            index: i,
            offset: delta
          };
        }
      },
      updateVisibleItems: function updateVisibleItems(checkItem) {
        var _arguments = arguments,
            _this2 = this;

        return _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
          var checkPositionDiff, items, count, itemSize, minItemSize, averageItemSize, buffer, views, unusedViews, keyField, typeField, pool, prevFirstAttachedItem, prevLastAttachedItem, scroll, delta, positionDiff, lastScreenItem, continuous, unusedIndex, item, type, unusedPool, v, view, i, key;
          return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  checkPositionDiff = _arguments.length > 1 && _arguments[1] !== undefined ? _arguments[1] : false;
                  items = _this2.items;
                  count = items.length;
                  itemSize = _this2.itemSize;
                  minItemSize = _this2.minItemSize;
                  averageItemSize = _this2.averageItemSize;
                  buffer = _this2.buffer;
                  views = _this2.views;
                  unusedViews = _this2.unusedViews;
                  keyField = _this2.keyField;
                  typeField = _this2.typeField;
                  pool = _this2.pool;
                  prevFirstAttachedItem = _this2.firstAttachedItem;
                  prevLastAttachedItem = _this2.lastAttachedItem;

                  if (count) {
                    _context.next = 21;
                    break;
                  }

                  _this2.firstAttachedItem = 0;
                  _this2.lastAttachedItem = 0;
                  _this2.totalHeight = 0;
                  return _context.abrupt("return");

                case 21:
                  if (!_this2.$_prerender) {
                    _context.next = 28;
                    break;
                  }

                  _this2.firstAttachedItem = 0;
                  _this2.lastAttachedItem = _this2.prerender;
                  _this2.totalHeight = null;
                  return _context.abrupt("return");

                case 28:
                  if (!(!itemSize && (!minItemSize || !averageItemSize))) {
                    _context.next = 32;
                    break;
                  }

                  // render an initial number of items to estimate item size
                  _this2.lastAttachedItem = _this2.firstAttachedItem + 20;
                  _context.next = 44;
                  break;

                case 32:
                  scroll = _this2.getScroll();
                  delta = scroll.start - _this2.anchorScrollTop; // Skip update if user hasn't scrolled enough

                  if (!checkPositionDiff) {
                    _context.next = 39;
                    break;
                  }

                  positionDiff = delta;

                  if (positionDiff < 0) {
                    positionDiff = -positionDiff;
                  }

                  if (!(itemSize === null && positionDiff < minItemSize || positionDiff < itemSize)) {
                    _context.next = 39;
                    break;
                  }

                  return _context.abrupt("return", {
                    continuous: true
                  });

                case 39:
                  if (scroll.start === 0) {
                    _this2.anchorItem = {
                      index: 0,
                      offset: 0
                    };
                  } else {
                    _this2.anchorItem = _this2.calculateAnchoredItem(_this2.anchorItem, delta);
                  }

                  _this2.anchorScrollTop = scroll.start;
                  lastScreenItem = _this2.calculateAnchoredItem(_this2.anchorItem, scroll.end);
                  _this2.firstAttachedItem = Math.max(0, _this2.anchorItem.index - buffer);
                  _this2.lastAttachedItem = Math.min(_this2.items.length, lastScreenItem.index + buffer);

                case 44:
                  // Collect unused views
                  continuous = _this2.firstAttachedItem <= prevLastAttachedItem && _this2.lastAttachedItem >= prevFirstAttachedItem;

                  if (_this2.continuous !== continuous) {
                    if (continuous) {
                      views.clear();
                      unusedViews.clear();

                      _this2.pool.forEach(function (view) {
                        _this2.unuseView(view);
                      });
                    }

                    _this2.continuous = continuous;
                  } else if (continuous) {
                    _this2.pool.forEach(function (view) {
                      if (view.nr.used) {
                        // Update view item index
                        if (checkItem) {
                          view.nr.index = items.findIndex(function (item) {
                            return _this2.keyField ? item[keyField] === view.item[keyField] : item === view.item;
                          });
                        } // Check if index is still in visible range


                        if (view.nr.index === -1 || view.nr.index < _this2.firstAttachedItem || view.nr.index >= _this2.lastAttachedItem) {
                          _this2.unuseView(view);
                        }
                      }
                    });
                  } // Use or create views


                  unusedIndex = continuous ? null : new Map();
                  i = _this2.firstAttachedItem;

                case 48:
                  if (!(i < _this2.lastAttachedItem)) {
                    _context.next = 58;
                    break;
                  }

                  item = items[i];
                  key = keyField ? item[keyField] : item;

                  if (!(key == null)) {
                    _context.next = 53;
                    break;
                  }

                  throw new Error("Key is ".concat(key, " on item (keyField is '").concat(keyField, "')"));

                case 53:
                  view = views.get(key); // No view assigned to item

                  if (!view) {
                    type = item[typeField];
                    unusedPool = unusedViews.get(type);

                    if (continuous) {
                      // Reuse existing view
                      if (unusedPool && unusedPool.length) {
                        view = unusedPool.pop();
                        view.item = item;
                        view.nr.used = true;
                        view.nr.index = i;
                        view.nr.key = key;
                        view.nr.type = type;
                      } else {
                        view = _this2.addView(pool, i, item, key, type);
                      }
                    } else {
                      // Use existing view
                      // We don't care if they are already used
                      // because we are not in continous scrolling
                      v = unusedIndex.get(type) || 0;

                      if (!unusedPool || v >= unusedPool.length) {
                        view = _this2.addView(pool, i, item, key, type);

                        _this2.unuseView(view, true);

                        unusedPool = unusedViews.get(type);
                      }

                      view = unusedPool[v];
                      view.item = item;
                      view.nr.used = true;
                      view.nr.index = i;
                      view.nr.key = key;
                      view.nr.type = type;
                      unusedIndex.set(type, v + 1);
                      v++;
                    }

                    views.set(key, view);
                  } else {
                    view.nr.used = true;
                    view.item = item;
                  }

                case 55:
                  i++;
                  _context.next = 48;
                  break;

                case 58:
                  _context.next = 60;
                  return _this2.$nextTick();

                case 60:
                  _this2.measureItems();

                  _this2.totalHeight = _this2.calculateTotalHeight();

                  _this2.fixScrollPosition();

                  _this2.debouncedUpdatePositions();

                case 64:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee);
        }))();
      },
      getScroll: function getScroll() {
        var el = this.$el;
        var scrollState;

        if (!this.scrollableParent) {
          var bounds = el.getBoundingClientRect();
          var boundsSize = bounds.height;
          var start = -bounds.top;
          var size = window.innerHeight;

          if (start < 0) {
            size += start;
            start = 0;
          }

          if (start + size > boundsSize) {
            size = boundsSize - start;
          }

          scrollState = {
            start: start,
            end: start + size
          };
        } else {
          scrollState = {
            start: this.scrollableParent.scrollTop,
            end: this.scrollableParent.scrollTop + this.scrollableParent.clientHeight
          };
        }

        return scrollState;
      },
      calculateTotalHeight: function calculateTotalHeight() {
        if (this.itemSize) {
          return this.itemSize * this.items.length;
        }

        var height = 0;
        var itemsWithSizeCount = this.sizeCache.size;
        var itemsWithoutSizeCount = this.items.length - itemsWithSizeCount;
        height += itemsWithoutSizeCount * this.averageItemSize;
        this.sizeCache.forEach(function (size) {
          height += size;
        });
        return height;
      },
      unuseView: function unuseView(view) {
        var fake = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
        var unusedViews = this.unusedViews;
        var type = view.nr.type;
        var unusedPool = unusedViews.get(type);

        if (!unusedPool) {
          unusedPool = [];
          unusedViews.set(type, unusedPool);
        }

        unusedPool.push(view);

        if (!fake) {
          view.nr.used = false;
          view.position = -9999;
          this.views["delete"](view.nr.key);
        }
      },
      addView: function addView(pool, index, item, key, type) {
        var view = {
          item: item,
          position: 0
        };
        var nonReactive = {
          id: uid++,
          index: index,
          used: true,
          key: key,
          type: type
        };
        Object.defineProperty(view, 'nr', {
          configurable: false,
          value: nonReactive
        });
        pool.push(view);
        return view;
      },
      measureItems: function measureItems() {
        var _this3 = this;

        var poolDomElements = this.$refs.listviewItem;
        var hasUpdated = false;
        poolDomElements.forEach(function (poolDomElement, index) {
          var view = _this3.pool[index];

          if (view.nr.used) {
            var height = poolDomElement.offsetHeight;
            var key = view.nr.key;

            if (!_this3.sizeCache.has(key) || _this3.sizeCache.get(key) !== height) {
              hasUpdated = true;

              _this3.sizeCache.set(key, height);
            }
          }
        });

        if (hasUpdated) {
          var sizesCount = this.sizeCache.size;
          var minItemSize = null;
          var sizesSum = 0;
          this.sizeCache.forEach(function (size) {
            minItemSize = minItemSize === null ? size : Math.min(size, minItemSize);
            sizesSum += size;
          });
          var averageItemSize = sizesSum / sizesCount;
          this.minItemSize = minItemSize;
          this.averageItemSize = averageItemSize;
        }
      },
      fixScrollPosition: function fixScrollPosition() {
        var anchorScrollTop = 0;

        for (var i = 0; i < this.anchorItem.index; i++) {
          var keyField = this.keyField;
          var key = keyField ? this.items[i][keyField] : this.items[i];
          anchorScrollTop += this.sizeCache.get(key) || this.averageItemSize || 0;
        }

        anchorScrollTop += this.anchorItem.offset;
        this.anchorScrollTop = anchorScrollTop;
      },
      updateItemsPosition: function updateItemsPosition() {
        var keyField = this.keyField; // Position all nodes.

        var curPos = this.anchorScrollTop - this.anchorItem.offset;
        var i = this.anchorItem.index;

        while (i > this.firstAttachedItem) {
          var key = keyField ? this.items[i - 1][keyField] : this.items[i - 1];
          curPos -= this.sizeCache.get(key) || this.averageItemSize || 0;
          i--;
        }

        while (i < this.firstAttachedItem) {
          var _key2 = keyField ? this.items[i][keyField] : this.items[i];

          curPos += this.sizeCache.get(_key2) || this.averageItemSize || 0;
          i++;
        }

        for (var _i = this.firstAttachedItem; _i < this.lastAttachedItem; _i++) {
          var _key3 = keyField ? this.items[_i][keyField] : this.items[_i];

          var view = this.views.get(_key3);
          view.position = curPos;
          curPos += this.sizeCache.get(_key3) || this.averageItemSize || 0;
        }
      }
    }
  };

  function normalizeComponent(template, style, script, scopeId, isFunctionalTemplate, moduleIdentifier /* server only */, shadowMode, createInjector, createInjectorSSR, createInjectorShadow) {
      if (typeof shadowMode !== 'boolean') {
          createInjectorSSR = createInjector;
          createInjector = shadowMode;
          shadowMode = false;
      }
      // Vue.extend constructor export interop.
      const options = typeof script === 'function' ? script.options : script;
      // render functions
      if (template && template.render) {
          options.render = template.render;
          options.staticRenderFns = template.staticRenderFns;
          options._compiled = true;
          // functional template
          if (isFunctionalTemplate) {
              options.functional = true;
          }
      }
      // scopedId
      if (scopeId) {
          options._scopeId = scopeId;
      }
      let hook;
      if (moduleIdentifier) {
          // server build
          hook = function (context) {
              // 2.3 injection
              context =
                  context || // cached call
                      (this.$vnode && this.$vnode.ssrContext) || // stateful
                      (this.parent && this.parent.$vnode && this.parent.$vnode.ssrContext); // functional
              // 2.2 with runInNewContext: true
              if (!context && typeof __VUE_SSR_CONTEXT__ !== 'undefined') {
                  context = __VUE_SSR_CONTEXT__;
              }
              // inject component styles
              if (style) {
                  style.call(this, createInjectorSSR(context));
              }
              // register component module identifier for async chunk inference
              if (context && context._registeredComponents) {
                  context._registeredComponents.add(moduleIdentifier);
              }
          };
          // used by ssr in case component is cached and beforeCreate
          // never gets called
          options._ssrRegister = hook;
      }
      else if (style) {
          hook = shadowMode
              ? function (context) {
                  style.call(this, createInjectorShadow(context, this.$root.$options.shadowRoot));
              }
              : function (context) {
                  style.call(this, createInjector(context));
              };
      }
      if (hook) {
          if (options.functional) {
              // register for functional component in vue file
              const originalRender = options.render;
              options.render = function renderWithStyleInjection(h, context) {
                  hook.call(context);
                  return originalRender(h, context);
              };
          }
          else {
              // inject component registration as beforeCreate hook
              const existing = options.beforeCreate;
              options.beforeCreate = existing ? [].concat(existing, hook) : [hook];
          }
      }
      return script;
  }

  /* script */
  const __vue_script__ = script;
  /* template */
  var __vue_render__ = function() {
    var _vm = this;
    var _h = _vm.$createElement;
    var _c = _vm._self._c || _h;
    return _c(
      "div",
      {
        staticClass: "listview",
        class: { ready: _vm.ready },
        style: { height: _vm.totalHeight + "px" }
      },
      _vm._l(_vm.pool, function(view) {
        return _c(
          "div",
          {
            key: view.nr.id,
            ref: "listviewItem",
            refInFor: true,
            staticClass: "listview__item",
            style: _vm.ready
              ? { transform: "translateY(" + view.position + "px)" }
              : null
          },
          [
            _vm._t("default", null, {
              item: view.item,
              index: view.nr.index,
              active: view.nr.used
            })
          ],
          2
        )
      }),
      0
    )
  };
  var __vue_staticRenderFns__ = [];
  __vue_render__._withStripped = true;

    /* style */
    const __vue_inject_styles__ = undefined;
    /* scoped */
    const __vue_scope_id__ = "data-v-a8581048";
    /* module identifier */
    const __vue_module_identifier__ = undefined;
    /* functional template */
    const __vue_is_functional_template__ = false;
    /* style inject */
    
    /* style inject SSR */
    
    /* style inject shadow dom */
    

    
    const __vue_component__ = /*#__PURE__*/normalizeComponent(
      { render: __vue_render__, staticRenderFns: __vue_staticRenderFns__ },
      __vue_inject_styles__,
      __vue_script__,
      __vue_scope_id__,
      __vue_is_functional_template__,
      __vue_module_identifier__,
      false,
      undefined,
      undefined,
      undefined
    );

  function install(Vue) {
    if (install.installed) return;
    install.installed = true;
    Vue.component('ListView', __vue_component__);
  }
  var plugin = {
    install: install
  };
  var GlobalVue = null;

  if (typeof window !== 'undefined') {
    GlobalVue = window.Vue;
  } else if (typeof global !== 'undefined') {
    GlobalVue = global.Vue;
  }

  if (GlobalVue) {
    GlobalVue.use(plugin);
  } // To allow use as module (npm/webpack/etc.) export component

  exports.default = __vue_component__;
  exports.install = install;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=virtual-list.umd.js.map
