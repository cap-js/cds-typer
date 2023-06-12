'use strict'

const fs = require('fs')
const path = require('path')
const cds2ts = require('../../lib/compile')
const { resolveAliases, locations } = require('../util')
const execp = require('util').promisify(require('child_process').exec)
const { fail } = require('assert')
const { Levels } = require('../../lib/logging')

const ccs =  locations.integration.files('cloud-cap-samples')

const check = async (file, resolveAlias = false) => {
    if (resolveAlias) {
        resolveAliases(file, [[/@capire/g, './../..']])
    }
    const paths = await cds2ts
        .compileFromFile(path.normalize(file), { outputDirectory: locations.testOutput('ccs'), logLevel: Levels.NONE })
        // eslint-disable-next-line no-console
        .catch((err) => console.error('ERROR', err))

    const concatenated = paths.map((p) => path.join(p, 'index.ts')).join(' ')
    execp(`tsc --noemit ${concatenated}`).catch(e => fail(e.stdout))
}

// compilation produces sytactically valid TS script
describe('Compilation', () => {
    beforeEach(() => {
        try {
            fs.unlinkSync(dir)
        } catch (err) {
            //console.log('INFO', `Unable to unlink '${dir}' (${err}). This may not be an issue.`)
        }
    })
    // especially ts compilation can take a long time.
    // Based on previous experience, all tests run in around one minute at the time of writing.
    // So one minute _per_ test should (hopefully) suffice.
    jest.setTimeout(60000)
    test('Bookshoplet', async () => check(locations.unit.files('bookshoplet/model.cds')))
    test('Inflection', async () => check(locations.unit.files('inflection/model.cds')))
    test('Common', async () => check(`${ccs}/common/index.cds`))
    test('Bookshop', async () => check(`${ccs}/bookshop/index.cds`))
    test.skip('Bookstore', async () => check(`${ccs}/bookstore/index.cds`, true))
    test('Media', async () => check(`${ccs}/media/db/data-model.cds`))
    test('Hello', async () => check(`${ccs}/hello/srv/world.cds`))
    test.skip('Fiori', async () => check(`${ccs}/fiori/app/common.cds`, true))
})
