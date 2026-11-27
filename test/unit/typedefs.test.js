const { it } = require('node:test')
const { join } = require('node:path')
const { checkTranspilation } = require('../tscheck')

it('reuses cds-types CSN definitions with centralized, typed adaptations', async () => {
    await checkTranspilation([join(__dirname, '../typings/csn.ts')], {
        allowJs: true,
        checkJs: false,
        skipLibCheck: false
    })
})
