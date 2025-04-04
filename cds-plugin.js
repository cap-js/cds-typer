const { readdir, stat } = require('node:fs/promises')
const { normalize } = require('node:path')
const cds = require('@sap/cds')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const typer = require('./lib/compile')
const { fs, path } = cds.utils
const { configuration } = require('./lib/config')

const DEBUG = cds.debug('cli|build')
const BUILD_CONFIG = 'tsconfig.cdsbuild.json'
const DEFAULT_MODEL_DIRECTORY_NAME = '@cds-models'


/**
 * Check if the project is a TypeScript project by looking for a dependency on TypeScript.
 * @returns {boolean}
 */
const isTypeScriptProject = () => {
    if (!fs.existsSync('package.json')) return false
    const pkg = require(path.resolve('package.json'))
    return Boolean(pkg.devDependencies?.typescript || pkg.dependencies?.typescript)
}

/**
 * Check if separate tsconfig file that is used for building the project.
 * @returns {boolean}
 */
const buildConfigExists = () => fs.existsSync(BUILD_CONFIG)

/**
 * @param {string} dir - The directory to remove.
 */
const rmDirIfExists = dir => {
    try { fs.rmSync(dir, { recursive: true }) } catch { /* ignore */ }
}

/**
 * Remove files with given extensions from a directory recursively.
 * @param {string} dir - The directory to start from.
 * @param {string[]} exts - The extensions to remove.
 * @returns {Promise<unknown>}
 */
const rmFiles = async (dir, exts) => fs.existsSync(dir)
    ? Promise.all(
        (await readdir(dir))
            .map(async file => {
                const filePath = path.join(dir, file)
                if ((await stat(filePath)).isDirectory()) {
                    return rmFiles(filePath, exts)
                } else if (exts.some(ext => file.endsWith(ext))) {
                    fs.unlinkSync(filePath)
                }
            })
    )
    : undefined

// IIFE to be able to return early
;(() => {
    if (cds.watched) {
        if (fs.existsSync(cds.env.typer.output_directory)) return
        DEBUG?.('>> start cds-typer before cds watch')
        module.exports = typer.compileFromFile('*')
            .then(() => DEBUG?.('<< end cds-typer before cds watch'))
            .catch(e => DEBUG?.(e))
        return
    }

    // FIXME: remove once cds7 has been phased out
    if (!cds?.version || cds.version < '8.0.0') {
        DEBUG?.('typescript build task requires @sap/cds-dk version >= 8.0.0, skipping registration')
        return
    }

    // by checking configuration instead of cds.env, we make sure the user can set
    // this configuration in both camelCase and snake_case.
    if (configuration.buildTask === false) {  // unset is considered true
        DEBUG?.('skipping typescript build task registration based on configuration option')
        return
    }

    // requires @sap/cds-dk version >= 7.5.0
    cds.build?.register?.('typescript', class extends cds.build.Plugin {
        static taskDefaults = { src: '.' }
        static hasTask() { return isTypeScriptProject() }

        // lower priority than the nodejs task
        get priority() { return -1 }

        get #appFolder () { return cds?.env?.folders?.app ?? 'app' }

        /**
         * cds.env > tsconfig.compilerOptions.paths > '@cds-models' (default)
         */
        get #modelDirectoryName () {
            const outputDirectory = cds.env.typer?.outputDirectory
            if (outputDirectory) return outputDirectory
            try {
                // expected format: { '#cds-models/*': [ './@cds-models/*' ] }
                //                                          ^^^^^^^^^^^
                //                             relevant part - may be changed by user
                const config = JSON.parse(fs.readFileSync ('tsconfig.json', 'utf8'))
                const alias = config.compilerOptions.paths['#cds-models/*'][0]
                const directory = alias.match(/(?:\.\/)?(.*)\/\*/)[1]
                return normalize(directory)  // could contain forward slashes in tsconfig.json
            } catch {
                DEBUG?.('tsconfig.json not found, not parsable, or inconclusive. Using default model directory name')
            }
            return DEFAULT_MODEL_DIRECTORY_NAME
        }

        init() {
            this.task.dest = path.join(cds.root, cds.env.build.target, cds.env.folders.srv)
        }

        async #runCdsTyper () {
            DEBUG?.('running cds-typer')
            cds.env.typer ??= {}
            cds.env.typer.outputDirectory ??= this.#modelDirectoryName
            await typer.compileFromFile('*')
        }

        async #buildWithConfig () {
        // possibly referencing their tsconfig.json via "extends", specifying the "compilerOptions.outDir" and
        // manually adding irrelevant folders (read: gen/ and app/) to the "exclude" array.
            DEBUG?.(`building with config ${BUILD_CONFIG}`)
            return exec(`npx tsc --project ${BUILD_CONFIG}`)
        }

        async #buildWithoutConfig () {
            DEBUG?.('building without config')
            // this will include gen/ that was created by the nodejs task
            // _within_ the project directory. So we need to remove it afterwards.
            await exec(`npx tsc --outDir "${this.task.dest.replace(/\\/g, '/')}"`) // see https://github.com/cap-js/cds-typer/issues/374
            rmDirIfExists(path.join(this.task.dest, cds.env.build.target))
            rmDirIfExists(path.join(this.task.dest, this.#appFolder))
        }

        async #copyCleanModel (buildDirCdsModels) {
        // copy models again, to revert transpilation thereof.
        // We only need the index.js files in un-transpiled form.
            await this.copy(this.#modelDirectoryName).to(buildDirCdsModels)
            await rmFiles(buildDirCdsModels, ['.ts'])
        }

        async build() {
            await this.#runCdsTyper()
            const buildDirCdsModels = path.join(this.task.dest, this.#modelDirectoryName)
            // remove the js files generated by the nodejs buildtask,
            // leaving only json, cds, and other static files
            await rmFiles(this.task.dest, ['.js', '.ts'])

            try {
                await (buildConfigExists()
                    ? this.#buildWithConfig()
                    : this.#buildWithoutConfig()
                )
            } catch (error) {
                throw error.stdout
                    ? new Error(error.stdout)
                    : error
            }
            this.#copyCleanModel(buildDirCdsModels)
        }
    })
})()
