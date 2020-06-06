# vue-virtual-list

A simple virtual scroll vue component for performant rendering of very long lists. This component is largely based on [vue-virtual-scroller](https://github.com/Akryum/vue-virtual-scroller).

## Installation

```
 npm install --save github:alibaba-aero/vue-virtual-list
```

```javascript
import Vue from 'vue'
import ListView from 'vue-virtual-list'
import 'vue-virtual-list/dist/vue-virtual-list.css'

Vue.use(ListView)
```

## Usage

### Basic usage

Use the scoped slot to render each item in the list:

```html
<template>
    <div class="scroller">
        <list-view :items="list">
            <template v-slot="{ item, index }">
                <div class="user">{{ item.name }}</div>
            </template>
        </list-view>
    </div>
</template>

<script>
export default {
  props: {
    list: Array,
  },
}
</script>

<style scoped>
.scroller {
  height: 100%;
  overflow: auto;
}

.user {
  height: 32%;
  padding: 0 12px;
  display: flex;
  align-items: center;
}
</style>
```
## License

MIT
