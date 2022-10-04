'use strict'

const fs = require('fs')
const path = require('path')
const cds2ts = require('../lib/compile')
const testutil = require('./util')
const util = require('util')
const execp = util.promisify(require('child_process').exec)
const { fail } = require('assert')
const { Levels } = require('../lib/logging')


const dir = './__tests__/files'
const ccs = './' + path.join(dir, 'cloud-cap-samples')

const check = async (file, resolveAlias = false) => {
    if (resolveAlias) {
        testutil.resolveAliases(file, [[/@capire/g, './../..']])
    }
    const paths = await cds2ts
        .compileFromFile(file, { rootDirectory: `${dir}/output`, logLevel: Levels.NONE })
        .catch((err) => console.error('ERROR', err))

    const concatenated = paths.map((p) => path.join(p, 'index.ts')).join(' ')

    try {
        await execp(`tsc --noemit ${concatenated}`)
    } catch (e) {
        fail(
            '' + // just to appease the deprecation message of fail()...
                e.output
                    .filter((m) => m && m.toString())
                    .map((m) => m.toString())
                    .join('\n')
        )
    }
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
    test('bookshoplet', async () => check(`${dir}/bookshoplet/model.cds`))
    test('inflection', async () => check(`${dir}/inflection/model.cds`))
    test('common', async () => check(`${ccs}/common/index.cds`))
    test('bookshop', async () => check(`${ccs}/bookshop/index.cds`))
    test('bookstore', async () => check(`${ccs}/bookstore/index.cds`, true))
    test('media', async () => check(`${ccs}/media/db/data-model.cds`))
    test('hello', async () => check(`${ccs}/hello/srv/world.cds`))
    test('fiori', async () => check(`${ccs}/fiori/app/common.cds`, true))
})
