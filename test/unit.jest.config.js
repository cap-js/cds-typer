module.exports = {
    displayName: 'unit',
    rootDir: '..',
    testRegex: './unit/.*.test.js',
    globalSetup: '<rootDir>/test/unit/setup.js',
    moduleNameMapper: {
        '#cds-models/(.*)': './_out/$1/index.js',
    }

}