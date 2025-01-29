'use strict'

const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
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

describe('transpilation', () => {
    modelDirs.forEach(({ name, rootFile }) => {
        it(name, async () => {
            await prepareUnitTest(
                rootFile,
                locations.testOutput(name),
                { transpilationCheck: true }
            )
        })
    })
})

describe('index.js CommonJS', () => {
    modelDirs.forEach(({ name, rootFile }) => {
        it(name, async () => {
            await prepareUnitTest(
                rootFile,
                locations.testOutput(name),
                {
                    javascriptCheck: true,
                    javascriptCheckParameters: { ecmaVersion: 'latest'},
                    typerOptions: { targetModuleType: 'cjs' }
                }
            )
        })
    })
})

describe('index.js ESM', () => {
    modelDirs.forEach(({ name, rootFile }) => {
        it(name, async () => {
            await prepareUnitTest(
                rootFile,
                locations.testOutput(name),
                {
                    javascriptCheck: true,
                    javascriptCheckParameters: { ecmaVersion: 'latest', sourceType: 'module' },
                    typerOptions: { targetModuleType: 'esm' },
                }
            )
        })
    })
})
