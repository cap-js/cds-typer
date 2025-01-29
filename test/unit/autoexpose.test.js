'use strict'

const { describe, before, it } = require('node:test')
const assert = require('assert')
const { locations, prepareUnitTest } = require('../util')

describe('Autoexpose', () => {
    let ast

    before(async () => ast = (await prepareUnitTest('autoexpose/model.cds', locations.testOutput('autoexpose_test'))).astw.tree)

    it('should validate autoexposed composition target present in service', async () => {
        assert.ok(ast.find(n => n.name === 'Books'))
    })
})