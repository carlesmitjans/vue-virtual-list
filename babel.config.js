module.exports = {
    presets: [
        [
            '@babel/preset-env',
            { modules: false },
        ],
    ],
    plugins: ["transform-runtime"]
};
