'use strict'

const fs = require('fs')
const path = require('path')
const { describe, test } = require('@jest/globals')
const { locations, prepareUnitTest } = require('../util')

const modelDirs = fs.readdirSync(locations.smoke.files(''))
    .map(dir => {
        const absolute = locations.unit.files(dir)
        const files = fs.readdirSync(absolute)
            .filter(f => f.endsWith('.cds'))
        
        return files.length === 0  // ts test only contains .ts files
            ? undefined
            : { 
                name: dir,
                rootFile: path.join(dir, files.find(f => f === 'model.cds') ?? files[0])
            }
    })
    .filter(Boolean)

describe('smoke', () => {
    describe('transpilation', () => {
        test.each(modelDirs)('$name', async ({ name, rootFile }) => {
            await prepareUnitTest(
                rootFile,
                locations.testOutput(name),
                { transpilationCheck: true }
            )
        })
    })
})
