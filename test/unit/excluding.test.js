'use strict'

const path = require('path')
const { before, describe, it } = require('node:test')
const assert = require('assert')
const { ASTWrapper } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('Excluding Clause Tests', () => {
    let paths

    before(async () => {
        paths = (await prepareUnitTest('excluding/model.cds', locations.testOutput('excluding_test'))).paths
    })

    it('should have the element present in the original', async () => {
        assert.ok(new ASTWrapper(path.join(paths[1], 'index.ts')).exists('_TestObjectAspect', 'dependencies'))
    })

    it('should have the element gone in the projection', async () => {
        assert.strictEqual(new ASTWrapper(path.join(paths[2], 'index.ts'))
            .getAspect('_SlimTestObjectAspect')
            .members
            .find(({name}) => name === 'dependencies'), undefined)
    })
})