'use strict'

const { describe, before, it } = require('node:test')
const assert = require('assert')
const { locations, prepareUnitTest } = require('../util')

describe('Count', () => {
    let ast

    before(async () => ast = (await prepareUnitTest('count/model.cds', locations.testOutput('count_test'))).astw.tree)

    it('should validate plural type has $count property', async () => {
        const singular = ast.find(n => n.name === 'Book')
        const plural = ast.find(n => n.name === 'Books')
        const countMember = plural.members.find(m => m.name === '$count')

        assert.ok(singular)
        assert.ok(!singular.members.find(m => m.name === '$count'))
        assert.ok(plural)
        assert.ok(countMember)
        assert.ok(countMember.optional)
        assert.strictEqual(countMember.type.keyword, 'number')
    })
})
