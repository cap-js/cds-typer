module.exports = [
    //
    {
        ignores: ['**/test/integration/**'],
    },
    require('@eslint/js').configs.recommended,
    require('eslint-plugin-jsdoc').configs['flat/recommended-typescript-flavor-error'],
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'commonjs',
            globals: {
                ...require('globals').node
            }
        },
        files: ['**/*.js'],
        plugins: {
            '@stylistic/js': require('@stylistic/eslint-plugin-js')
        },
        rules: {
            'array-callback-return': [ 'error', { checkForEach: true } ],
            'constructor-super': 'error',
            'for-direction': 'error',
            'getter-return': 'error',
            'linebreak-style': [ 'error', 'unix' ],
            'no-async-promise-executor': 'error',
            'no-await-in-loop': 'error',
            'no-class-assign': 'error',
            'no-compare-neg-zero': 'error',
            'no-cond-assign': 'error',
            'no-const-assign': 'error',
            'no-constant-binary-expression': 'error',
            'no-constant-condition': 'error',
            'no-constructor-return': 'warn',
            'no-control-regex': 'warn',
            'no-debugger': 'error',
            'no-dupe-args': 'error',
            'no-dupe-class-members': 'error',
            'no-dupe-else-if': 'error',
            'no-dupe-keys': 'error',
            'no-duplicate-case': 'error',
            'no-duplicate-imports': 'error',
            'no-empty-character-class': 'error',
            'no-empty-pattern': 'error',
            'no-ex-assign': 'error',
            'no-fallthrough': [ 'error', { reportUnusedFallthroughComment: true }],
            'no-func-assign': 'error',
            'no-import-assign': 'error',
            'no-inner-declarations': 'error',
            'no-invalid-regexp': 'error',
            'no-irregular-whitespace': [ 'error', { skipStrings: false } ],
            'no-loss-of-precision': 'error',
            'no-misleading-character-class': 'error',
            'no-new-native-nonconstructor': 'error',
            'no-obj-calls': 'error',
            'no-promise-executor-return': 'error',
            'no-prototype-builtins': 'error',
            'no-self-assign': [ 'error', { props: false } ],
            'no-self-compare': 'error',
            'no-setter-return': 'error',
            'no-sparse-arrays': 'error',
            'no-template-curly-in-string': 'error',
            'no-this-before-super': 'error',
            'no-undef': 'error',
            'no-unexpected-multiline': 'error',
            'no-unmodified-loop-condition': 'error',
            'no-unreachable': 'warn',
            'no-unreachable-loop': 'error',
            'no-unsafe-finally': 'error',
            'no-unsafe-negation': [ 'error', { enforceForOrderingRelations: true } ],
            'no-unsafe-optional-chaining': [ 'error', { disallowArithmeticOperators: true } ],
            'no-unused-private-class-members': 'warn',
            'no-unused-vars': [ 'warn', { ignoreRestSiblings: true } ],
            'no-use-before-define': ['error', {classes: false, functions: false}],
            'no-useless-assignment': 'error',
            'no-useless-backreference': 'error',
            'require-atomic-updates': [ 'error', { allowProperties: true } ],
            'use-isnan': [ 'error', { enforceForIndexOf: true } ],
            'valid-typeof': [ 'error', { requireStringLiterals: true } ],
            'no-console': 'error',
            'arrow-parens': ['error', 'as-needed'],
            '@stylistic/js/nonblock-statement-body-position': ['error', 'beside'],
            '@stylistic/js/quotes': ['error', 'single'],
            '@stylistic/js/indent': ['error', 4],
            '@stylistic/js/semi': ['error', 'never', { 'beforeStatementContinuationChars': 'always'}],
        }
    }
]