'use strict'

const { before, describe, it } = require('node:test')
const assert = require('assert')
const { check } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('Events Tests', () => {
    let astw

    before(async () => {
        astw = (await prepareUnitTest('events/model.cds', locations.testOutput('events_test'))).astw
    })

    describe('Builtin Imports Generation', () => {
        it('should generate _ module import for builtin types', () => {
            assert.strictEqual(astw.getImports()[0].module, './../_')
        })
    })

    describe('Event Type Presence', () => {
        it('should have a top-level event with correct members', async () => {
            assert.ok(astw.tree.find(cls => cls.name === 'Bar'
                && cls.members.length === 4
                && cls.members[0].name === 'kind' && check.isStaticMember(cls.members[0])
                && cls.members[1].name === 'id' && check.isNullable(cls.members[1].type, [check.isNumber])
                && cls.members[2].name === 'name' && check.isNullable(cls.members[2].type, [check.isIndexedAccessType])
                && cls.members[3].name === 'createdOn' && check.isNullable(cls.members[3].type, [check.isTypeReference])
            ))
        })
    })
})
