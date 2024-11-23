const { configuration } = require('../lib/config')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const typer = require('../lib/compile')
const acorn = require('acorn')
const { ASTWrapper } = require('./ast')
const { checkTranspilation } = require('./tscheck')
const { execSync } = require('child_process')

/**
 * Hackish. When having code as string, we can either:
 * (1) write to file and require() that file again (meh).
 * (2) eval() the code. When the code is a module (as is the case here)
 *     it will load all definitions into the exports variable, potentially
 *     shadowing any previous content over multiple runs. Instead, we define
 *     a local variable to which the results of eval() will be bound.
 * @param {any} code - JS code to evaluate
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

const cds2ts = async cdsFile => typer.compileFromFile(locations.unit.files(cdsFile))

const createProject = projDir => {
    fs.writeFileSync(path.join(projDir, 'package.json'), JSON.stringify({
        devDependencies: {
            '@sap/cds': 'file:' + require('@sap/cds').home,
            '@cap-js/cds-types': 'file:' + path.resolve(require.resolve('@cap-js/cds-types/package.json'), '..')
        }
    }, null, 2))
    // Avoid installing dependencies if they are already present. Speeds up tests quite a bit.
    if (!fs.existsSync(path.join(projDir, 'node_modules'))) {
        execSync('npm install', { cwd: projDir })
    }
}

/**
 * @typedef PrepareUnitTestParameters
 * @property {object} typerOptions - options to be passed to the typer
 * @property {(paths: string[]) => string} fileSelector - a function to select the file to be processed from the generated files
 * @property {boolean} transpilationCheck - whether to check the transpilation of the generated files
 * @property {boolean} javascriptCheck - whether to check the index.js files for consistency (being parsable by acorn)
 * @property {Parameters<import('acorn').parse>[1]} javascriptCheckParameters - parameters to pass to acorn.parse
 */

/**
 * @param {string} model - the path to the model file to be processed
 * @param {string} outputDirectory - the path to the output directory
 * @param {PrepareUnitTestParameters} parameters - additional parameters
 */
async function prepareUnitTest(model, outputDirectory, parameters = {}) {
    const configurationBefore = configuration.clone()
    const defaults = {
        typerOptions: {},
        fileSelector: paths => (paths ?? []).find(p => !p.endsWith('_')),
        transpilationCheck: false,
        javascriptCheck: false,
        javascriptCheckParameters: { ecmaVersion: 'latest' }
    }
    parameters = { ...defaults, ...parameters }

    configuration.setMany({...{ outputDirectory: outputDirectory, inlineDeclarations: 'structured' }, ...parameters.typerOptions})
    const paths = await cds2ts(model)

    if (parameters.transpilationCheck) {
        const tsFiles = paths.map(p => path.join(p, 'index.ts'))
        // create a package.json w/ common dependencies in a higher dir so that they can be reused by many tests
        createProject(path.resolve(outputDirectory, '../..'))
        await checkTranspilation(tsFiles)
    }

    if (parameters.javascriptCheck) {
        const jsErrors = (await Promise.all(paths
            .map(async p => {
                const fullPath = path.join(p, 'index.js')
                const code = await fs.promises.readFile(fullPath, 'utf-8')
                try {
                    acorn.parse(code, parameters.javascriptCheckParameters)
                    return undefined
                } catch (error) {
                    return `${fullPath}: ${error.message}`
                }
            })))
            .filter(error => error)

        if (jsErrors.length) {
            throw new Error(`Several errors found in the generated index.js files:\n${jsErrors.join('\n')}`)
        }
    }
    configuration.setFrom(configurationBefore)
    return { astw: new ASTWrapper(path.join(parameters.fileSelector(paths), 'index.ts')), paths }
}

module.exports = {
    loadModule,
    toHaveAll,
    toOnlyHave,
    toExactlyHave,
    resolveAliases,
    toHavePropertyOfType,
    locations,
    cds2ts,
    prepareUnitTest
}
