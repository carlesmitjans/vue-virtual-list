<template>
    <div
        class="listview"
        :class="{ ready }"
        :style="{ height: totalHeight !== null ? `${totalHeight}px` : null }"
    >
        <div
            v-for="view in pool"
            class="listview__item"
            :key="view.nr.id"
            :style="ready ? { transform: `translateY(${view.position}px)` } : null"
            :ref="`listviewItem`"
        >
            <slot
                :item="view.item"
                :index="view.nr.index"
                :active="view.nr.used"
            />
        </div>
    </div>
</template>

<script>
import { getFirstScrollableParent } from '../utils/scroll';

let uid = 0;

export default {
    props: {
        items: {
            type: Array,
            default: () => [],
        },
        keyField: {
            type: String,
            default: 'id',
        },
        prerender: {
            type: Number,
            default: 0,
        },
        itemSize: {
            type: Number,
            default: null,
        },
        buffer: {
            type: Number,
            default: 10,
        },
        typeField: {
            type: String,
            default: 'type',
        },
    },
    data () {
        return {
            scrollableParent: null,
            totalHeight: null,
            ready: false,
            pool: [],
            sizeCache: new Map(),
            views: new Map(),
            unusedViews: new Map(),
            averageItemSize: 0,
            anchorItem: { index: 0, offset: 0 },
            firstAttachedItem: 0,
            lastAttachedItem: 0,
            anchorScrollTop: 0,
            scrollEnd: 0,
        };
    },
    watch: {
        async items () {
            await this.updateVisibleItems(true);
        },
    },
    created () {
        this.$_scrollDirty = false;
        this.$_window_width = null;

        // In SSR mode, we also prerender the same number of item for the first render
        // to avoid mismatch between server and client templates
        if (this.prerender) {
            this.$_prerender = true;
            this.updateVisibleItems(false);
        }
    },
    mounted () {
        this.init();
    },
    beforeDestroy () {
        this.removeEventListeners();
        clearTimeout(this.$_refreshTimout);
    },
    methods: {
        getFirstScrollableParent () {
            return getFirstScrollableParent(this.$el);
        },

        async init () {
            this.$_window_width = window.innerWidth;
            const scrollableParent = this.getFirstScrollableParent();

            if (scrollableParent !== document.body) {
                this.scrollableParent = scrollableParent;
            }

            this.addEventListeners();

            // In SSR mode, render the real number of visible items
            this.$_prerender = false;
            await this.updateVisibleItems(true);
            this.ready = true;
        },

        addEventListeners () {
            if (!this.scrollableParent) {
                window.addEventListener('scroll', this.onScroll);
            } else {
                this.scrollableParent.addEventListener('scroll', this.onScroll);
            }

            window.addEventListener('resize', this.onResize);
        },

        removeEventListeners () {
            if (!this.scrollableParent) {
                window.removeEventListener('scroll', this.onScroll);
            } else {
                this.scrollableParent.removeEventListener('scroll', this.onScroll);
            }

            window.removeEventListener('resize', this.onResize);
        },

        onScroll () {
            if (!this.$_scrollDirty) {
                this.$_scrollDirty = true;
                requestAnimationFrame(async () => {
                    this.$_scrollDirty = false;
                    const scrollResult = await this.updateVisibleItems(false, true);
                    const continuous = scrollResult && scrollResult.continuous;
                    // It seems sometimes chrome doesn't fire scroll event :/
                    // When non continous scrolling is ending, we force a refresh
                    if (!continuous) {
                        clearTimeout(this.$_refreshTimout);
                        this.$_refreshTimout = setTimeout(this.onScroll, 100);
                    }
                });
            }
        },

        onResize () {
            if (this.$_window_width !== window.innerWidth) {
                this.clearSizeCache();
                if (this.ready) {
                    this.updateVisibleItems(false);
                };
            }
        },

        clearSizeCache () {
            this.averageItemSize = 0;
            this.sizeCache.clear();
        },

        calculateAnchoredItem (initialAnchor, delta) {
            const keyField = this.keyField;

            if (delta === 0) {
                return initialAnchor;
            } else {
                delta += initialAnchor.offset;
                let i = initialAnchor.index;

                if (delta < 0) {
                    while (delta < 0 && i > 0) {
                        const key = keyField ? this.items[i - 1][keyField] : this.items[i - 1];
                        const height = this.sizeCache.get(key) || this.averageItemSize;
                        delta += height;
                        i--;
                    }
                } else {
                    while (delta > 0 && i <= this.items.length - 1) {
                        const key = keyField ? this.items[i][keyField] : this.items[i];
                        const height = this.sizeCache.get(key) || this.averageItemSize;
                        const nextDelta = delta - height;

                        if (nextDelta <= 0) {
                            break;
                        }

                        delta = nextDelta;
                        i++;
                    }
                }

                return {
                    index: i,
                    offset: delta,
                };
            }
        },

        async updateVisibleItems (checkItem, checkPositionDiff = false) {
            const items = this.items;
            const count = items.length;
            const itemSize = this.itemSize;
            const averageItemSize = this.averageItemSize;
            const buffer = this.buffer;
            const views = this.views;
            const unusedViews = this.unusedViews;
            const keyField = this.keyField;
            const typeField = this.typeField;
            const pool = this.pool;

            const prevFirstAttachedItem = this.firstAttachedItem;
            const prevLastAttachedItem = this.lastAttachedItem;

            let rerender = false;

            if (!count) {
                this.firstAttachedItem = 0;
                this.lastAttachedItem = 0;
                this.totalHeight = 0;
                return;
            } else if (this.$_prerender) {
                this.firstAttachedItem = 0;
                this.lastAttachedItem = Math.min(this.prerender, count - 1);
                this.totalHeight = null;
                return;
            } else if (!itemSize && !averageItemSize) {
                // render an initial number of items to estimate item size
                this.lastAttachedItem = Math.min(this.firstAttachedItem + 20, count - 1);
                rerender = true;
            } else {
                const scroll = this.getScroll();
                const delta = scroll.start - this.anchorScrollTop;

                // Skip update if user hasn't scrolled enough
                if (checkPositionDiff) {
                    let startPositionDiff = delta;
                    let endPositionDiff = scroll.end - this.scrollEnd;

                    startPositionDiff = startPositionDiff < 0 ? -startPositionDiff : startPositionDiff;
                    endPositionDiff = endPositionDiff < 0 ? -endPositionDiff : endPositionDiff;
                    const minScroll = itemSize || averageItemSize || 0;

                    if (startPositionDiff < minScroll && endPositionDiff < minScroll) {
                        return {
                            continuous: true,
                        };
                    }
                }

                if (scroll.start === 0) {
                    this.anchorItem = { index: 0, offset: 0 };
                } else {
                    this.anchorItem = this.calculateAnchoredItem(this.anchorItem, delta);
                }

                this.anchorScrollTop = scroll.start;
                this.scrollEnd = scroll.end;
                const lastScreenItem = this.calculateAnchoredItem(this.anchorItem, scroll.end - scroll.start);
                this.firstAttachedItem = Math.max(0, this.anchorItem.index - buffer);
                this.lastAttachedItem = Math.min(count - 1, lastScreenItem.index + buffer);
            }

            // Collect unused views
            const continuous = this.firstAttachedItem <= prevLastAttachedItem && this.lastAttachedItem >= prevFirstAttachedItem;

            if (this.continuous !== continuous) {
                if (continuous) {
                    views.clear();
                    unusedViews.clear();
                    this.pool.forEach((view) => {
                        this.unuseView(view);
                    });
                }
                this.continuous = continuous;
            } else if (continuous) {
                this.pool.forEach((view) => {
                    if (view.nr.used) {
                        // Update view item index
                        if (checkItem) {
                            view.nr.index = items.findIndex((item) => {
                                return this.keyField ? item[keyField] === view.item[keyField] : item === view.item;
                            });
                        }

                        // Check if index is still in visible range
                        if (view.nr.index === -1 || view.nr.index < this.firstAttachedItem || view.nr.index > this.lastAttachedItem) {
                            this.unuseView(view);
                        }
                    }
                });
            }

            // Use or create views
            const unusedIndex = continuous ? null : new Map();

            let item, type, unusedPool;
            let v;
            let view;

            for (let i = this.firstAttachedItem; i <= this.lastAttachedItem; i++) {
                item = items[i];
                const key = keyField ? item[keyField] : item;

                if (key == null) {
                    throw new Error(`Key is ${key} on item (keyField is '${keyField}')`);
                }

                view = views.get(key);

                // No view assigned to item
                if (!view) {
                    type = item[typeField] || 'untyped';
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
                            view = this.addView(pool, i, item, key, type);
                        }
                    } else {
                        // Use existing view
                        // We don't care if they are already used
                        // because we are not in continous scrolling
                        v = unusedIndex.get(type) || 0;
                        if (!unusedPool || v >= unusedPool.length) {
                            view = this.addView(pool, i, item, key, type);
                            this.unuseView(view, true);
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
            }

            await this.$nextTick();
            this.measureItems();
            this.totalHeight = this.calculateTotalHeight();
            this.fixScrollPosition();

            if (window && window.cancelAnimationFrame && window.requestAnimationFrame) {
                if (this.updatePositionsRAF) {
                    window.cancelAnimationFrame(this.updatePositionsRAF);
                }

                this.updatePositionsRAF = window.requestAnimationFrame(() => {
                    this.updateItemsPosition();
                });
            } else {
                this.updateItemsPosition();
            }

            if (rerender) {
                await this.$nextTick();
                await this.updateVisibleItems(checkItem);
            }
        },

        getScroll () {
            const { $el: el } = this;
            let scrollState;

            if (!this.scrollableParent) {
                const bounds = el.getBoundingClientRect();
                const boundsSize = bounds.height;
                let start = -bounds.top;
                let size = window.innerHeight;
                if (start < 0) {
                    size += start;
                    start = 0;
                }

                if (start + size > boundsSize) {
                    size = boundsSize - start;
                }

                scrollState = {
                    start,
                    end: start + size,
                };
            } else {
                scrollState = {
                    start: this.scrollableParent.scrollTop,
                    end: this.scrollableParent.scrollTop + this.scrollableParent.clientHeight,
                };
            }

            return scrollState;
        },

        calculateTotalHeight () {
            const keyField = this.keyField;

            if (this.itemSize) {
                return this.itemSize * this.items.length;
            }

            let height = 0;

            for (let i = 0; i < this.items.length; i++) {
                const key = keyField ? this.items[i][keyField] : this.items[i];
                height += this.sizeCache.get(key) || this.averageItemSize || 0;
            }

            return height;
        },

        unuseView (view, fake = false) {
            const unusedViews = this.unusedViews;
            const type = view.nr.type;
            let unusedPool = unusedViews.get(type);
            if (!unusedPool) {
                unusedPool = [];
                unusedViews.set(type, unusedPool);
            }
            unusedPool.push(view);
            if (!fake) {
                view.nr.used = false;
                view.position = -9999;
                this.views.delete(view.nr.key);
            }
        },

        addView (pool, index, item, key, type) {
            const view = {
                item,
                position: 0,
            };

            const nonReactive = {
                id: uid++,
                index,
                used: true,
                key,
                type,
            };

            Object.defineProperty(view, 'nr', {
                configurable: false,
                value: nonReactive,
            });

            pool.push(view);
            return view;
        },

        measureItems () {
            const poolDomElements = this.$refs.listviewItem;
            let hasUpdated = false;

            poolDomElements.forEach((poolDomElement, index) => {
                const view = this.pool[index];

                if (view.nr.used) {
                    const height = poolDomElement.offsetHeight;
                    const key = view.nr.key;
                    if (!this.sizeCache.has(key) || this.sizeCache.get(key) !== height) {
                        hasUpdated = true;
                        this.sizeCache.set(key, height);
                    }
                }
            });

            if (hasUpdated) {
                const sizesCount = this.sizeCache.size;
                let sizesSum = 0;

                this.sizeCache.forEach((size) => {
                    sizesSum += size;
                });

                const averageItemSize = sizesSum / sizesCount;

                this.averageItemSize = averageItemSize;
            }
        },

        fixScrollPosition () {
            let anchorScrollTop = 0;

            for (let i = 0; i < this.anchorItem.index; i++) {
                const keyField = this.keyField;
                const key = keyField ? this.items[i][keyField] : this.items[i];
                anchorScrollTop += this.sizeCache.get(key) || this.averageItemSize || 0;
            }

            anchorScrollTop += this.anchorItem.offset;
            this.anchorScrollTop = anchorScrollTop;
        },

        updateItemsPosition () {
            const keyField = this.keyField;

            // Position all nodes.
            let curPos = this.anchorScrollTop - this.anchorItem.offset;
            let i = this.anchorItem.index;
            while (i > this.firstAttachedItem) {
                const key = keyField ? this.items[i - 1][keyField] : this.items[i - 1];
                curPos -= this.sizeCache.get(key) || this.averageItemSize || 0;
                i--;
            }
            while (i < this.firstAttachedItem) {
                const key = keyField ? this.items[i][keyField] : this.items[i];
                curPos += this.sizeCache.get(key) || this.averageItemSize || 0;
                i++;
            }

            for (let i = this.firstAttachedItem; i <= this.lastAttachedItem; i++) {
                const key = keyField ? this.items[i][keyField] : this.items[i];
                const view = this.views.get(key);
                view.position = curPos;
                curPos += this.sizeCache.get(key) || this.averageItemSize || 0;
            }
        },
    },
};
</script>

<style lang="scss" scoped>
.listview {
    position: relative;
    overflow: hidden;

    &.ready &__item {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        will-change: transform;
    }
}
</style>
