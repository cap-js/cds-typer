module.exports = {
    displayName: 'smoke',
    rootDir: '..',
    testRegex: './smoke/.*.test.js',
    cache: false,
    globalSetup: '<rootDir>/test/smoke/setup.js',
    testTimeout: 30000
}