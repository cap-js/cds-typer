'use strict'

const path = require('path')
const { before, describe, it } = require('node:test')
const assert = require('assert')
const cds = require('@sap/cds')
const { ASTWrapper } = require('../ast')
const { locations, prepareUnitTest } = require('../util')
const { perEachTestConfig } = require('../config')

perEachTestConfig(({ output_file, output_d_ts_files }) => {
    describe(`Excluding Clause Tests (using output **/*/${output_file} files)`, () => {
        let paths

        before(async () => {
            cds.env.typer.output_d_ts_files = output_d_ts_files
            paths = (await prepareUnitTest('excluding/model.cds', locations.testOutput('excluding_test'))).paths
        })

        it('should have the element present in the original', async () => {
            assert.ok(new ASTWrapper(path.join(paths[1], output_file)).exists('_TestObjectAspect', 'dependencies'))
        })

        it('should have the element gone in the projection', async () => {
            assert.strictEqual(new ASTWrapper(path.join(paths[2], output_file))
                .getAspect('_SlimTestObjectAspect')
                .members
                .find(({name}) => name === 'dependencies'), undefined)
        })
    })
})