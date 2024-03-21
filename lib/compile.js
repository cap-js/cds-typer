'use strict'

const fs = require('fs')
const { normalize } = require('path')
const cds = require(require.resolve('@sap/cds', { paths: [process.cwd(), __dirname] }))
const util = require('./util')
const { writeout } = require('./file')
const { Logger } = require('./logging')
const { Visitor } = require('./visitor')

/**
 * @typedef {import('./visitor').CompileParameters} CompileParameters
 */

/**
 * Writes the accompanying jsconfig.json file to the specified paths.
 * Tries to merge nicely if an existing file is found.
 * @param path {string} filepath to jsconfig.json.
 * @param logger {import('./logging').Logger} logger
 * @private
 */
const writeJsConfig = (path, logger) => {
    let values = {
        compilerOptions: {
            checkJs: true,
        },
    }

    if (fs.existsSync(path)) {
        const currentContents = JSON.parse(fs.readFileSync(path))
        if (currentContents?.compilerOptions?.checkJs) {
            logger.warning(`jsconfig at location ${path} already exists. Attempting to merge.`)
        }
        util.deepMerge(currentContents, values)
        values = currentContents
    }

    fs.writeFileSync(path, JSON.stringify(values, null, 2))
}

/**
 * Compiles a .cds file to Typescript types.
 * @param inputFile {string} path to input .cds file
 * @param parameters {CompileParameters} path to root directory for all generated files, min log level, etc.
 */
const compileFromFile = async (inputFile, parameters) => {
    const paths = typeof inputFile === 'string' ? normalize(inputFile) : inputFile.map(f => normalize(f))
    const xtended = await cds.linked(await cds.load(paths, { docs: true, flavor: 'xtended' }))
    const inferred = await cds.linked(await cds.load(paths, { docs: true }))
    return compileFromCSN({xtended, inferred}, parameters)
}

/**
 * Compiles a CSN object to Typescript types.
 * @param {{xtended: CSN, inferred: CSN}} csn
 * @param parameters {CompileParameters} path to root directory for all generated files, min log level
 */
const compileFromCSN = async (csn, parameters) => {
    const envSettings = cds.env?.typer ?? {}
    parameters = { ...parameters, ...envSettings }
    const logger = new Logger()
    logger.addFrom(parameters.logLevel)
    if (parameters.jsConfigPath) {
        writeJsConfig(parameters.jsConfigPath, logger)
    }
    return writeout(
        parameters.outputDirectory,
        Object.values(new Visitor(csn, parameters, logger).getWriteoutFiles())
    )
}

module.exports = {
    compileFromFile
}
