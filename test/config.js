
/**
 * @description the options for CDS config, to be used in the tests
 * @typedef {object} CdsTestConfigOptions
 * @property {boolean} outputDTsFiles - whether to emit .d.ts files instead of .ts files
 * @property {string} outputFile - expected output file name (e.g., "index.ts" or "index.d.ts")
 */

/** @type {CdsTestConfigOptions[]} */
const CDS_TEST_CONFIG_OPTIONS = [
    { outputDTsFiles: false, outputFile: 'index.ts' },
    { outputDTsFiles: true, outputFile: 'index.d.ts' },
]

/**
 * @description
 *  It calls `callback` per each CDS test config
 * @param {(options: CdsTestConfigOptions) => void} callback - function to be called per each config
 *  (it must be `describe(...)` or `it(...)`)
 * @returns {void}
 */
function perEachTestConfig(callback) {
    for (const options of CDS_TEST_CONFIG_OPTIONS) {
        callback(options)
    }
}

module.exports = { CDS_TEST_CONFIG_OPTIONS, perEachTestConfig }