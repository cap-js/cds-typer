// TODO: this script wraps the `node --test` command until our lower bound for our test matrix is >=21 (30 Apr 2026).
// The native test runner with multiple suites requires using a glob pattern to specify the relevant test files.
// But glob is only available in Node 21 onwards. So to avoid errors where the runtime assumes it has to look for a file called "*.test.js",
// we wrap the call to node with an explicit glob expansion. Once Node22 is established as lower bound, we can have
//
// "test:unit": "node --import ./test/unit/setup.mjs --test './test/unit/*.test.js'",
// "test:integration": "node --import ./test/integration/setup.mjs --test './test/integration/*.test.js'",
// "test:smoke": "node --import ./test/smoke/setup.mjs --test './test/smoke/*.test.js'",
//
// again.
const { execSync, execFileSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const testDir = process.argv[2]
const setupFile = process.argv[3]

const testFiles = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.test.js'))
    .map(file => path.join(testDir, file))

if (testFiles.length === 0) {
    // eslint-disable-next-line no-console
    console.error(`No test files found in ${testDir}`)
    process.exit(1)
}

execFileSync('node', ['--import', setupFile, '--test', testFiles.join(' ')], { stdio: 'inherit' })
