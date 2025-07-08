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
            try {
                await prepareUnitTest(
                    rootFile,
                    locations.testOutput(name),
                    {
                        transpilationCheck: true,
                        tsCompilerOptions: {
                            skipLibCheck: true,
                        },
                        typerOptions: {
                            propertiesOptional: false
                        }
                    }
                )
            } catch (e) {
                // nodejs test runner just shows "x subtests failed" without any details
                // so we are artificially showing the error here for now
                // eslint-disable-next-line no-console
                console.error(e)
                throw e
            }
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
