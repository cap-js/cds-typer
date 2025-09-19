'use strict'

const path = require('path')
const { before, describe, it } = require('node:test')
const assert = require('assert')
const { ASTWrapper } = require('../ast')
const { locations, prepareUnitTest } = require('../util')
const { perEachTestConfig } = require('../config')
const { configuration } = require('../../lib/config')

perEachTestConfig(({ outputDTsFiles, outputFile }) => {
    describe(`Excluding Clause Tests (using output **/*/${outputFile} files)`, () => {
        let paths

        before(async () => {
            configuration.outputDTsFiles = outputDTsFiles
            paths = (await prepareUnitTest('excluding/model.cds', locations.testOutput('excluding_test'))).paths
        })

        it('should have the element present in the original', async () => {
            assert.ok(new ASTWrapper(path.join(paths[1], outputFile)).exists('_TestObjectAspect', 'dependencies'))
        })

        it('should have the element gone in the projection', async () => {
            assert.strictEqual(new ASTWrapper(path.join(paths[2], outputFile))
                .getAspect('_SlimTestObjectAspect')
                .members
                .find(({name}) => name === 'dependencies'), undefined)
        })
    })
})