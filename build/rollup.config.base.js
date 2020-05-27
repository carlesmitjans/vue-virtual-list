import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import vue from 'rollup-plugin-vue';
import cjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import { eslint } from 'rollup-plugin-eslint';
import css from 'rollup-plugin-css-only';
import autoprefixer from 'autoprefixer';
import fs from 'fs';
import CleanCSS from 'clean-css';

const pckg = require('../package.json');

export default {
    input: 'src/wrapper.js',
    plugins: [
        resolve({
            mainFields: ['module', 'jsnext', 'main', 'browser'],
        }),
        eslint({
            include: ['src/**/*.{js,vue}'],
        }),
        vue({
            css: false,
            style: {
                postcssPlugins: [autoprefixer],
            },
        }),
        css({
            output: styles => {
                fs.writeFileSync('dist/vue-virtual-list.css', new CleanCSS().minify(styles).styles);
            },
        }),
        babel({
            exclude: 'node_modules/**',
            babelHelpers: 'runtime',
        }),
        cjs(),
        replace({
            VERSION: JSON.stringify(pckg.version),
        }),
    ],
    watch: {
        include: 'src/**',
    },
    external: [
        'vue',
    ],
};
