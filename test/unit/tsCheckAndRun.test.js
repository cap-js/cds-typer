const {join} = require('path')
const { describe, test } = require('@jest/globals')
const { runTyperAndTsCheck } = require('../util')
const cds = require('@sap/cds')
const { fs } = cds.utils
const { locations } = require('../util')

describe('Generate, TS Check, Run ', () => {

    const tsDirs = fs.readdirSync(locations.unit.files(''))
        .map(dir => {
            const absolute = locations.unit.files(dir)
            const tsFiles = fs.readdirSync(absolute).some(f => f.endsWith('.ts') && !f.endsWith('d.ts'))
            return tsFiles ? dir : undefined
        })
        .filter(Boolean)

    test.each(tsDirs)('%s', async (dir, modelFile='model.cds', testFile='model.ts') => {
        const base = join(__dirname, 'files', dir, modelFile, '..')
        const modelPath = join(base, modelFile)
        const tsFile = join(base, testFile)
        const out = join(base, '_out')
        await runTyperAndTsCheck(modelPath, tsFile, out)

        // serve the services in a minimal way (no db, no express)
        cds.root = base
        cds.model = cds.linked(await cds.load(modelFile))
        await cds.serve('all')

    })

})
