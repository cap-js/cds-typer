const {join} = require('path')
const { describe, test } = require('@jest/globals')
const { runTyperAndTranspile } = require('../util')

describe('Run and transpile', () => {

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
        const model = join(base, modelFile)
        const tsFile = join(base, testFile)
        const out = join(base, '_out')
        await runTyperAndTranspile(model, tsFile, out)
    })

})
