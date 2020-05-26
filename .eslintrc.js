
module.exports = {
    root: true,
    parserOptions: {
        parser: 'babel-eslint',
        ecmaVersion: 2017,
        sourceType: 'module',
        allowImportExportEverywhere: true
    },
    extends: [
        'standard',
        'plugin:vue/vue3-recommended',
    ],
    plugins: [
        'vue',
    ],
    env: {
        browser: true,
    },
    // add your custom rules here
    'rules': {
        "vue/max-attributes-per-line": 0,
        "vue/html-indent": ["error", 4],
		"semi": [
			"error",
			"always"
		],
        "quote-props": "off",
		"space-before-function-paren": ["error", "always"],
        "indent": ["error", 4],
        "vue/attributes-order": 0,
        "no-alert": "error",
        "no-debugger": "error",
        "object-curly-spacing": ["error", "always"],
		"import/newline-after-import": ["error", { "count": 1 }],
		"import/imports-first": ["error", "absolute-first"],
		"comma-dangle": ["error", {
			"arrays": "always-multiline",
			"objects": "always-multiline",
			"imports": "always-multiline",
			"exports": "always-multiline",
			"functions": "ignore"
		}],
		"no-console": "error",
		"padding-line-between-statements": [
			"error",
			{ "blankLine": "never", "prev": "import", "next": "import" }
		],
		"no-unused-expressions": 0,
        // allow debugger during development
        "no-debugger": process.env.NODE_ENV === 'production' ? 2 : 0,
        "vue/component-tags-order": [
            "error", {
                "order": ["template", "script", "style"]
            }
        ]
    }
};