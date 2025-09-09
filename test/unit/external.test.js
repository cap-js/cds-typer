'use strict'

const path = require('path')
const { before, describe, it } = require('node:test')
const assert = require('assert')
const { ASTWrapper } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('EDMX Imports', () => {
    let paths

    before(async () => {
        paths = (await prepareUnitTest('external/model.cds', locations.testOutput('external_test'))).paths
    })

    it('should have the element present', async () => {
        assert.ok(new ASTWrapper(path.join(paths[1], 'index.ts')).exists('_TestObjectAspect', 'dependencies'))
    })
})