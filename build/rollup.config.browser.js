import { terser } from 'rollup-plugin-terser';
import base from './rollup.config.base';

const config = Object.assign({}, base, {
    output: {
        exports: 'named',
        name: 'VirtualList',
        file: 'dist/virtual-list.min.js',
        format: 'iife',
        sourcemap: true,
    },
});

config.plugins.push(terser({}));

export default config;
