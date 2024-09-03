/** @type {import('jest').Config} */
module.exports = {
    displayName: 'unit',
    rootDir: '..',
    testRegex: './unit/.*.test.js',
    globalSetup: '<rootDir>/test/unit/setup.js',
    testTimeout: 20_000,
}