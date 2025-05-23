const { SourceFile } = require('../file')
const fs = require('node:fs')
const path = require('node:path')

/** @type {string} */
let tsBoilerplate
/** @type {SourceFile} */
let baseDefinitions

/**
 * @returns {string}
 */
function getTsBoilerplate () {
    if (!tsBoilerplate) {
        tsBoilerplate = fs.readFileSync(path.join(__filename, '..', '..', 'boilerplate/tsBoilerplate.ts'), 'utf8')
    }
    return tsBoilerplate
}

/**
 * @returns {SourceFile}
 */
function getBaseDefinitions () {
    if (!baseDefinitions) {
        baseDefinitions = new SourceFile('_')
        baseDefinitions.addPreamble(getTsBoilerplate())
    }
    return baseDefinitions
}

module.exports = { getBaseDefinitions }
