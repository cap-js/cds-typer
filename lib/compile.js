'use strict'

const fs = require('fs')
const { normalize, join } = require('path')
const cds = require(require.resolve('@sap/cds', { paths: [process.cwd(), __dirname] }))
const util = require('./util')
const { writeout } = require('./file')
const { Visitor } = require('./visitor')
const { LOG, setLevel } = require('./logging')
const { configuration } = require('./config')

/**
 * @param {JSON} csn - the model
 * @param {string} hashFile - path to the hash file
 * @returns {[boolean, string]}
 */
const checkHash = (csn, hashFile) => {
    const crypto = require('crypto')
    const currentHash = crypto
        .createHash('blake2s256')
        .update(JSON.stringify(csn))
        .digest('hex')
    if (fs.existsSync(hashFile)) {
        const oldHash = fs.readFileSync(hashFile, 'utf8')
        if (oldHash === currentHash) {
            return [false, currentHash]
        }
    }
    return [true, currentHash]
}

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
 */
const compileFromCSN = async csn => {
    setLevel(configuration.logLevel)
    if (configuration.jsConfigPath) {
        writeJsConfig(configuration.jsConfigPath)
    }

    return writeout(
        configuration.outputDirectory,
        Object.values(new Visitor(csn).getWriteoutFiles())
    )
}

/**
 * Compiles a .cds file to Typescript types.
 * @param {string | string[]} inputFile - path to input .cds file
 */
const compileFromFile = async inputFile => {
    const hashFile = join(configuration.outputDirectory, '.hash')
    const paths = typeof inputFile === 'string' ? normalize(inputFile) : inputFile.map(f => normalize(f))
    const xtendedPlain = await cds.load(paths, { docs: true, flavor: 'xtended' })
    let modelHash

    if (configuration.cache === 'blake2s256') {
        const [shouldCompile, hash] = checkHash(xtendedPlain, hashFile)
        if (!shouldCompile) {
            LOG.info('Model has not changed. Skipping generation.')
            return
        }
        modelHash = hash
    }

    const xtended = await cds.linked(xtendedPlain)
    const inferred = await cds.linked(await cds.load(paths, { docs: true }))
    const result = await compileFromCSN({xtended, inferred})

    if (modelHash) {
        // write hash as last thing before returning,
        // so that we don't write it if an error occurs,
        // which would block the next run although the model has changed
        fs.writeFileSync(hashFile, modelHash)
    }
    return result
}

module.exports = {
    compileFromFile
}
