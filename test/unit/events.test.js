'use strict'

const { beforeAll, describe, test, expect } = require('@jest/globals')
const { check } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('events', () => {
    let astw

    beforeAll(async () => astw = (await prepareUnitTest('events/model.cds', locations.testOutput('events_test'))).astw)

    describe('Generate Builtin imports', () => {
        test('generate _ module import for builtin types', () => {
            expect(astw.getImports()[0].module).toBe( './../_')
        })
    })

    describe('Event Type Present', () => {
        test('Top Level Event', async () => {
            expect(astw.tree.find(cls => cls.name === 'Bar'
                && cls.members.length === 3
                && cls.members[0].name === 'id' && check.isNullable(cls.members[0].type, [check.isNumber])
                && cls.members[1].name === 'name' && check.isNullable(cls.members[1].type, [check.isIndexedAccessType])
                && cls.members[2].name === 'createdOn' && check.isNullable(cls.members[2].type, [check.isTypeReference])
            )).toBeTruthy()
        })
    })
})
