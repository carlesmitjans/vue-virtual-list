import base from './rollup.config.base';

const config = Object.assign({}, base, {
    output: {
        name: 'virtual-list',
        file: 'dist/virtual-list.esm.js',
        format: 'es',
        sourcemap: true,
    },
    external: [
        ...base.external,
    ],
});

export default config;
