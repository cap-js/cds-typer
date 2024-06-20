const fs = require('fs')
// const { unlink } = require('fs').promises
const path = require('path')
const { Logger } = require('../lib/logging')
const { fail } = require('assert')
const os = require('os')
const typer = require('../lib/compile')
const { ASTWrapper } = require('./ast')
const { checkTranspilation } = require('./tscheck')

/**
 * @typedef {{[key: string]: string[]}} ClassBody
 */

/**
 * @typedef {{
 *  imports: string;
 *   from: string;
 *   alias: string;
 * }} Import
 */

/**
 * @typedef {{
 *   classes: {[key: string]: ClassBody},
 *   declarations: {[key: string]: string},
 *   imports: Import[]
 * }} TSParseResult
 */


/**
 * Hackish. When having code as string, we can either:
 * (1) write to file and require() that file again (meh).
 * (2) eval() the code. When the code is a module (as is the case here)
 *     it will load all definitions into the exports variable, potentially
 *     shadowing any previous content over multiple runs. Instead, we define
 *     a local variable to which the results of eval() will be bound.
 * @param {any} code
 */
const loadModule = code => {
    const exports = {}
    eval(code)
    return exports
}

const toHaveAll = (module, props) => {
    const missing = props.filter(p => !(p in module))
    return missing.length === 0
        ? {
            message: () => '',
            pass: true,
        }
        : {
            message: () =>
                `missing properties ${JSON.stringify(missing)} in module with properties ${JSON.stringify(
                    Object.keys(module)
                )}.`,
            pass: false,
        }
}

const toOnlyHave = (module, props) => {
    const superfluous = Object.keys(module).filter(k => !props.includes(k))
    return superfluous.length === 0
        ? {
            message: () => '',
            pass: true,
        }
        : {
            message: () =>
                `extra properties ${JSON.stringify(superfluous)} in module with properties ${JSON.stringify(
                    Object.keys(module)
                )}.`,
            pass: false,
        }
}

const toExactlyHave = (module, props) => {
    const all = toHaveAll(module, props)
    const only = toOnlyHave(module, props)
    return {
        message: () => [all.message(), only.message()].join('\n'),
        pass: all.pass && only.pass,
    }
}

const toHavePropertyOfType = (clazz, property, types) => {
    const prop = clazz[property]
    
    if (!prop) {
        return {
            message: () => `no property '${property}' in class '${clazz}'`,
            pass: false
        }
    } 
    if (prop.length !== types.length || !types.every(t => prop.includes(t))) {
        return {
            message: () => `actual type of property ${property} '${prop}' does not match expected type '${types}'`,
            pass: false
        }
    }
    return { message: () => '', pass: true }
}

const getTSSignatures = code =>
    [...code.matchAll(/(\w+)\((.*)\)(?::\s?.*)?;/g)].map(f => ({
        name: f[1],
        args: f[2].split(',').filter(a => !!a) ?? [],
    }))

const getJSFunctions = code =>
    [] // for better readbility after linting...
        .concat(
            [...code.matchAll(/^\s*(\w+)\((.*)\)\s?\{/gm)], // methods
            [...code.matchAll(/^\s*const (\w+)\s?=\s?(?:async )?\((.*)\)\s=>/gm)] // arrow functions
        )
        .map(f => ({
            name: f[1],
            args: f[2].split(',').filter(a => !!a) ?? [],
        }))

const validateDTSTypes = (base, ignores = {}) => {
    ignores = Object.assign({ js: [], ts: [] }, ignores)
    const jsPath = path.normalize(`${base}.js`)
    const dtsPath = path.normalize(`${base}.d.ts`)

    if (!fs.existsSync(jsPath)) {
        fail(`implementation file ${jsPath} missing.`)
    } else if (!fs.existsSync(dtsPath)) {
        fail(`declaration file ${dtsPath} missing.`)
    } else {
        const jsModule = fs.readFileSync(jsPath, { encoding: 'utf8', flag: 'r' })
        const dtsModule = fs.readFileSync(dtsPath, { encoding: 'utf8', flag: 'r' })
        const jsFunctions = getJSFunctions(jsModule)
        const tsSignatures = getTSSignatures(dtsModule)

        // look for functions that neither
        // (a) have a matching signature nor
        // (b) are ignored via the ignore list
        // (and vice versa for signatures)
        const missingSignatures = jsFunctions.filter(
            jsf =>
                !ignores.js.includes(jsf.name) &&
                !tsSignatures.find(tsf => tsf.name === jsf.name && tsf.args.length === jsf.args.length)
        )
        const missingImplementations = tsSignatures.filter(
            tsf =>
                !ignores.ts.includes(tsf.name) &&
                !jsFunctions.find(jsf => tsf.name === jsf.name && tsf.args.length === jsf.args.length)
        )

        const missing = []
        for (const ms of missingSignatures) {
            missing.push(
                `missing signature for function or method '${ms.name}' with ${ms.args.length} parameters in ${dtsPath}`
            )
        }

        for (const ms of missingImplementations) {
            missing.push(
                `missing implementation for function or method '${ms.name}' with ${ms.args.length} parameters in ${jsPath}`
            )
        }

        if (missing.length > 0) {
            // eslint-disable-next-line no-console
            console.log(jsPath, jsFunctions)
            // eslint-disable-next-line no-console
            console.log(dtsPath, tsSignatures)
            fail(missing.join('\n'))
        }
    }
}

/**
 * Really hacky way of consuming TS source code,
 * as using the native TS compiler turned out to
 * be a major pain. As we expect a very manageable
 * subset of TS, we can work with RegEx here.
 */
class TSParser {
    constructor(logger = null) {
        this.logger = logger ?? new Logger()
    }

    /**
     * @param {string} line
     */
    isComment(line) {
        const trimmed = line.trim()
        return trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('//')
    }

    /**
     * @param {string[]} lines
     * @returns {ClassBody}
     */
    #parseClassBody(lines) {
        const props = {}
        let line = lines.shift()
        while (line && !line.match(/}/)) {
            const [prop, type] = line.split(':').map(part => part.trim())
            if (type) {
                // type can be undefined, e.g. for "static readonly fq = 'foo';"
                props[prop.replace('?', '').trim()] = type  // remove optional annotation
                    .replace(';', '')
                    .split(/[&|]/)
                    .map(p => p.trim())
                    .filter(p => !!p)
            }
            line = lines.shift()
        }
        return props
    }

    /**
     * @param {string} file
     * @returns TSParseResult
     */
    parse(file) {
        const newNS = () => ({
            classes: {},
            declarations: {},
        })

        let openScopes = 0
        const imports = []
        const namespaces = { top: newNS() }
        let currentNamespace = namespaces.top

        const lines = fs
            .readFileSync(file, 'utf-8')
            .split('\n')
            .filter(l => !this.isComment(l))
            .filter(l => !!l.trim())

        let match
        while (lines.length > 0) {
            let line = lines.shift()

            // handle scopes
            openScopes += line.match(/\{/g)?.length ?? 0
            openScopes -= line.match(/\}/g)?.length ?? 0
            if (openScopes < 0) {
                this.logger.error('Detected dangling closing brace.')
            } else if (openScopes === 0) {
                currentNamespace = namespaces.top
            }

            // look at line
            if ((match = line.match(/(?:export )?class (\w+)( extends [.\w<>]+)?\s+\{/)) != null) {
                currentNamespace.classes[match[1]] = this.#parseClassBody(lines)
                // quirk: as parseClassBody will consume all lines up until and
                // including the next "}", we have to manually decrease the number
                // of open scopes here.
                openScopes--
            } else if ((match = line.match(/^\s*import (.*) as (.*) from (.*);/)) != null) {
                imports.push({
                    imports: match[1],
                    alias: match[2],
                    from: match[3].replace(/['"]+/g, ''),
                })
            } else if ((match = line.match(/^\s*declare const (.*): (.*);/)) != null) {
                currentNamespace.declarations[match[1]] = match[2]
            } else if ((match = line.match(/^\s*(?:export )?namespace (.*) \{/)) != null) {
                currentNamespace = newNS()
                namespaces[match[1]] = currentNamespace
            // eslint-disable-next-line no-useless-assignment
            } else if ((match = line.match(/^\}/)) != null) {
                // Just a closing brace that is already handled above.
                // Catch in own case anyway to avoid logging in else case.
            // eslint-disable-next-line no-useless-assignment
            } else if ((match = line.match(/^\s+/)) != null) {
                // Empty line.
                // Catch in own case anyway to avoid logging in else case.
            } else {
                this.logger.warning(`unexpected line: ${line}`)
            }
        }
        return { imports, namespaces }
    }
}

/**
 * A bit hacky way to replace references to aliases with absolute paths.
 * More specifically, the cloud cap sample projects specify aliases to each other
 * within their own package.json to resolve them conveniently.
 * These aliases don't exist within cds-typer's package.json and adding them
 * would clutter the namespace needlessly. So this method recursively walks
 * all imported files (starting from a specified base file), inspects all imports
 * and rewrites them if they contain a reference to an alias.
 * @param {string} file - the file to check. Should be a valid .cds file
 * @param {[string, string][]} resolves - and array of pairs:
 *  [0]: expression to look for within the "from" part of imports.
 *  [1]: the absolute path to the file to replace them with.
 */
const resolveAliases = (file, resolves) => {
    let content = fs.readFileSync(file, { encoding: 'utf8' })
    for (const [alias, resolved] of resolves) {
        content = content.replace(alias, resolved)
    }
    for (const match of content.matchAll(/using.* from '(.*)'/g)) {
        if (!match[1].startsWith('@')) {
            let imp = `${path.dirname(file)}/${match[1]}`
            if (fs.existsSync(imp) && fs.lstatSync(imp).isDirectory()) imp += '/index.cds'
            if (!imp.endsWith('.cds')) imp += '.cds'
            resolveAliases(imp, resolves)
        }
    }

    fs.writeFileSync(file, content, { encoding: 'utf-8' })
}

const locations = {
    testOutputBase: path.normalize(`${os.tmpdir}/type-gen/test/output/`),
    testOutput: suffix => {
        const dir = path.normalize(`${os.tmpdir}/type-gen/test/output/${suffix}`)
        // eslint-disable-next-line no-console
        console.log(`preparing test output directory: ${dir}`)
        return dir
    },
    unit: {
        base: path.normalize('./test/unit/'),
        files: suffix => path.normalize(`./test/unit/files/${suffix}`)
    },
    smoke: {
        base: path.normalize('./test/smoke/'),
        // models are the same as in unit tests
        files: suffix => path.normalize(`./test/unit/files/${suffix}`)
    },
    integration: {
        base: path.normalize('./test/integration/'),
        files: suffix => path.normalize(`./test/integration/files/${suffix}`),
        cloudCapSamples: suffix => path.normalize(`./test/integration/files/cloud-cap-samples/${suffix}`),
    }
}

const cds2ts = async (cdsFile, options = {}) => typer.compileFromFile(
    locations.unit.files(cdsFile), 
    options
)

/**
 * @typedef PrepareUnitTestParameters
 * @property {object} typerOptions options to be passed to the typer
 * @property {(paths: string[]) => string} fileSelector a function to select the file to be processed from the generated files
 * @property {boolean} transpilationCheck whether to check the transpilation of the generated files
 */

/**
 * @param {string} model - the path to the model file to be processed
 * @param {string} outputDirectory - the path to the output directory
 * @param {PrepareUnitTestParameters} parameters
 */
async function prepareUnitTest(model, outputDirectory, parameters = {}) {
    const defaults = {
        typerOptions: {},
        fileSelector: paths => (paths ?? []).find(p => !p.endsWith('_')),
        transpilationCheck: false
    }
    parameters = { ...defaults, ...parameters }

    const options = {...{ outputDirectory: outputDirectory, inlineDeclarations: 'structured' }, ...parameters.typerOptions}
    //await unlink(outputDirectory).catch(() => {})
    const paths = await cds2ts(model, options)
        // eslint-disable-next-line no-console
        .catch(err => console.error(err))
    
    if (parameters.transpilationCheck) {
        const tsFiles = paths.map(p => path.join(p, 'index.ts'))
        await checkTranspilation(tsFiles)
    }
    return { astw: new ASTWrapper(path.join(parameters.fileSelector(paths), 'index.ts')), paths }
}

module.exports = {
    loadModule,
    toHaveAll,
    toOnlyHave,
    toExactlyHave,
    TSParser,
    resolveAliases,
    validateDTSTypes,
    toHavePropertyOfType,
    locations,
    cds2ts,
    prepareUnitTest
}
