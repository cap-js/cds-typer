'use strict'

const fs = require('fs')
const { normalize } = require('path')
const cds = require(require.resolve('@sap/cds', { paths: [process.cwd(), __dirname] }))
const util = require('./util')
const { writeout } = require('./file')
const { Visitor } = require('./visitor')
const { LOG, setLevel } = require('./logging')

/**
 * @typedef {import('./typedefs').visitor.CompileParameters} CompileParameters
 */

/**
 * Writes the accompanying jsconfig.json file to the specified paths.
 * Tries to merge nicely if an existing file is found.
 * @param {string} path - filepath to jsconfig.json.
 * @private
 */
const writeJsConfig = path => {
    let values = {
        compilerOptions: {
            checkJs: true,
        },
    }

    if (fs.existsSync(path)) {
        const currentContents = JSON.parse(fs.readFileSync(path, 'utf8'))
        if (currentContents?.compilerOptions?.checkJs) {
            LOG.warn(`jsconfig at location ${path} already exists. Attempting to merge.`)
        }
        util.deepMerge(currentContents, values)
        values = currentContents
    }

    fs.writeFileSync(path, JSON.stringify(values, null, 2))
}

/**
 * Compiles a CSN object to Typescript types.
 * @param {{xtended: import('./typedefs').resolver.CSN, inferred: import('./typedefs').resolver.CSN}} csn - csn tuple
 * @param {CompileParameters} parameters - path to root directory for all generated files, min log level
 */
const compileFromCSN = async (csn, parameters) => {
    const envSettings = cds.env?.typer ?? {}
    parameters = { ...envSettings, ...parameters }
    setLevel(parameters.logLevel)
    if (parameters.jsConfigPath) {
        writeJsConfig(parameters.jsConfigPath)
    }
    return writeout(
        parameters.outputDirectory,
        Object.values(new Visitor(csn, parameters).getWriteoutFiles())
    )
}

/**
 * Compiles a .cds file to Typescript types.
 * @param {string | string[]} inputFile - path to input .cds file
 * @param {CompileParameters} parameters - path to root directory for all generated files, min log level, etc.
 */
const compileFromFile = async (inputFile, parameters) => {
    const paths = typeof inputFile === 'string' ? normalize(inputFile) : inputFile.map(f => normalize(f))
    const xtended = await cds.linked(await cds.load(paths, { docs: true, flavor: 'xtended' }))
    const inferred = await cds.linked(await cds.load(paths, { docs: true }))
    return compileFromCSN({xtended, inferred}, parameters)
}

module.exports = {
    compileFromFile
}
