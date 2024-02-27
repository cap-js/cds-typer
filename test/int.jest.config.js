// as xmake does not allow requests towards external resources (github.com),
// we need to split tests referring to cap-cloud-samples into their own
// test suite.
// FIXME: reneable integration tests or merge them with unit tests
/*
module.exports = {
    displayName: "integration",
    rootDir: '..',
    testRegex: "./integration/.*.test.js",
    globalSetup: "<rootDir>/test/integration/setup.js",
    cache: false
}
*/