'use strict'

const { describe, beforeAll, test, expect } = require('@jest/globals')
const { locations, prepareUnitTest } = require('../util')

describe('Count', () => {
    let ast

    beforeAll(
        async () => (ast = (await prepareUnitTest('count/model.cds', locations.testOutput('count_test'))).astw.tree)
    )

    test('Plural type has $count property', async () => {
        const singular = ast.find(n => n.name === 'Book')
        const plural = ast.find(n => n.name === 'Books')
        const countMember = plural.members.find(m => m.name === '$count')

        expect(singular).toBeTruthy()
        expect(singular.members.find(m => m.name === '$count')).toBeFalsy()
        expect(plural).toBeTruthy()
        expect(countMember).toBeTruthy()
        expect(countMember.optional).toBeTruthy()
        expect(countMember.type.keyword).toBe('number')
    })
})
