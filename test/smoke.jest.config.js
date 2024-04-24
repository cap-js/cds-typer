module.exports = {
    displayName: 'smoke',
    rootDir: '..',
    testRegex: './smoke/.*.test.js',
    globalSetup: '<rootDir>/test/smoke/setup.js',
    testTimeout: 30000
}