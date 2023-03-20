// as xmake does not allow requests towards external resources (github.com),
// we need to split tests referring to cap-cloud-samples into their own
// test suite.
module.exports = {
    displayName: "integration",
    rootDir: '..',
    testRegex: "./unit/.*.test.js",
    globalSetup: "<rootDir>/__tests__/integration/setup.js"
}