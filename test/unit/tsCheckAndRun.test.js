const { configuration } = require('../../lib/config')
const { basename, join } = require('path')
const { describe, it, before } = require('node:test')
const cds = require('@sap/cds')
const { fs } = cds.utils
const { locations } = require('../util')
const { perEachTestConfig } = require('../config')

perEachTestConfig(({ output_file, output_d_ts_files }) => {
    describe(`Generate, TS Check, and Run Tests (using output **/*/${output_file} files)`, () => {
        before(() => {
            cds.env.typer.output_d_ts_files = output_d_ts_files
        })

        const tsDirs = fs.readdirSync(locations.unit.files(''))
            .map(dir => {
                const absolute = locations.unit.files(dir)
                const tsFiles = fs.readdirSync(absolute).some(f => f.endsWith('.ts') && !f.endsWith('d.ts'))
                return tsFiles ? dir : undefined
            })
            .filter(Boolean)

        tsDirs.forEach(dir => {
            it(`should process and run TypeScript files in ${dir}`, async () => {
                const modelFile = 'model.cds'
                const testFile = 'model.ts'
                const base = join(__dirname, 'files', dir, modelFile, '..')
                const modelPath = join(base, modelFile)
                const tsFile = join(base, testFile)
                const out = join(base, '_out')
                await runTyperAndTsCheck(modelPath, tsFile, out, output_file)

                // serve the services in a minimal way (no db, no express)
                cds.root = base
                cds.model = cds.linked(await cds.load(join(base, modelFile)))
                await cds.serve('all').with(join(out, 'model.js')) // as service impl. the tsc-emitted js file is used
            })
        })
    })
})

const typer = require('../../lib/compile')
const { checkTranspilation } = require('../tscheck')

/**
 * @param {string} model - the path to the model file to be processed
 * @param {string} testTsFile - the path to a custom test .ts file
 * @param {string} outputDirectory - the path to the output directory
 * @param {string} outputFile - the name of the output file (e.g. index.ts)
 * @param {PrepareUnitTestParameters} parameters - additional parameters
 */
async function runTyperAndTsCheck(model, testTsFile, outputDirectory, outputFile, parameters = {}) {
    await fs.promises.rm(outputDirectory, { force: true, recursive: true })

    const defaults = {
        typerOptions: {},
        fileSelector: paths => (paths ?? []).find(p => !p.endsWith('_')),
    }
    parameters = { ...defaults, ...parameters }

    configuration.setMany({...{ outputDirectory, inlineDeclarations: 'structured' }, ...parameters.typerOptions})
    const paths = await typer.compileFromFile(model)
    const tsFiles = paths.map(p => join(p, outputFile))
    const emitDir = join(outputDirectory, '__tsc-emit')
    await checkTranspilation([testTsFile, ...tsFiles], {
        noEmit: false, // need to have the model.js file so that we can run it later
        outDir: emitDir,
        skipLibCheck: true,
        paths: {
            '#cds-models/*': [ join(outputDirectory, `/*/${outputFile}`) ],
            '#cds-models': [ join(outputDirectory, `/${outputFile}`) ]
        }
    })

    // copy all the emited model.js file to the output directory
    const jsFile = basename(testTsFile).replace('.ts', '.js')
    await fs.promises.cp(join(emitDir, jsFile), join(outputDirectory, jsFile))
    // clean up the rest of the emitted stuff
    await fs.promises.rm(emitDir, { force: true, recursive: true })
    // add a package.json that can resolve the typer files
    await fs.promises.writeFile(join(outputDirectory, 'package.json'), JSON.stringify({
        imports: {
            '#cds-models/*': './*/index.js'
        }
    }, null, 2))
}

