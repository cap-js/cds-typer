'use strict'

const { describe, beforeAll, test, expect } = require('@jest/globals')
const { locations, prepareUnitTest } = require('../util')

describe('Count', () => {
    let ast

    beforeAll(
        async () => (ast = (await prepareUnitTest('count/model.cds', locations.testOutput('count_test'))).astw.tree)
    )

    test('Plural type has $count property', async () => {
        const node = ast.find(n => n.name === 'Books')
        const countMember = node.members.find(m => m.name === '$count')

        expect(node).toBeTruthy()
        expect(countMember).toBeTruthy()
        expect(countMember.optional).toBeTruthy()
        expect(countMember.type.keyword).toBe('number')
    })
})
