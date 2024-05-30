const { readdir, stat } = require('node:fs/promises')
const { normalize } = require('node:path')
const cds = require('@sap/cds')
const util = require('util')
const exec = util.promisify(require('child_process').exec)

const { fs, path } = cds.utils
const DEBUG = cds.debug('cli|build')
const BUILD_CONFIG = 'tsconfig.cdsbuild.json'

/**
 * Check if a tsconfig file exists.
 */
const tsConfigExists = () => fs.existsSync('tsconfig.json')

/**
 * Check if separate tsconfig file that is used for building the project.
 * @returns {boolean}
 */
const buildConfigExists = () => fs.existsSync(BUILD_CONFIG)

/**
 * @param {string} dir The directory to remove.
 */
const rmDirIfExists = dir => {
    try { fs.rmSync(dir, { recursive: true }) } catch { /* ignore */ }
}

/**
 * Remove files with given extensions from a directory recursively.
 * @param {string} dir The directory to start from.
 * @param {string[]} exts The extensions to remove.
 * @returns {Promise<void>}
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

// requires @sap/cds-dk version >= 7.5.0
cds.build?.register?.('typescript', class extends cds.build.Plugin {
    static taskDefaults = { src: '.' }
    static hasTask() { return tsConfigExists() }

    // lower priority than the nodejs task
    get priority() { return -1 }

    get #appFolder () { return cds?.env?.folders?.app ?? 'app' }

    get #modelDirectoryName () {
        try {
            // expected format: { '#cds-models/*': [ './@cds-models/*/index.ts' ] }
            //                                       ^^^^^^^^^^^^^^^ 
            //                             relevant part - may be changed by user
            const config = JSON.parse(fs.readFileSync ('tsconfig.json', 'utf8'))
            const alias = config.compilerOptions.paths['#cds-models/*'][0]
            const directory = alias.match(/(?:\.\/)?(.*)\/\*\/index\.ts/)[1]
            return normalize(directory)  // could contain forward slashes in tsconfig.json
        } catch {
            DEBUG?.('tsconfig.json not found, not parsable, or unconclusive. Using default model directory name')
        }
        return '@cds-models'
    }

    init() {
        this.task.dest = path.join(cds.root, cds.env.build.target, cds.env.folders.srv)
    }

    async #runCdsTyper () {
        DEBUG?.('running cds-typer')
        await exec(`npx @cap-js/cds-typer "*" --outputDirectory ${this.#modelDirectoryName}`)
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
        await exec(`npx tsc --outDir ${this.task.dest}`)
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
