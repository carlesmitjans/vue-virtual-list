import base from './rollup.config.base';

const config = Object.assign({}, base, {
    output: {
        exports: 'named',
        name: 'virtual-list',
        file: 'dist/virtual-list.umd.js',
        format: 'umd',
        sourcemap: true,
    },
});

export default config;
