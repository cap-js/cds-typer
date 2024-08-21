const {join} = require('path')
const { describe, test } = require('@jest/globals')
const { runTyperAndTsCheck } = require('../util')
const cds = require('@sap/cds')

describe('Generate, TS Check, Run ', () => {

    test.each([
        'actions',
        // 'arrayof',
        // 'aspects',
        // 'autoexpose',
        // 'bookshoplet',
        // 'builtins',
        // 'count',
        // 'delimident',
        // 'draft',
        // 'enums',
        // 'events',
        // 'excluding',
        // 'foreignkeys',
        // 'hana',
        // 'inflection',
        // 'inheritance',
        // 'inline',
        // 'notnull',
        // 'projection',
        // 'references',
        // 'scoped',
        // 'type',
        // 'typeof',
        // 'views',
    ])('%s', async (dir, modelFile='model.cds', testFile='model.ts') => {
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
