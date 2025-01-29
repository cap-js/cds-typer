'use strict'

const { describe, it, before } = require('node:test')
const assert = require('assert')
const { check } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

describe('KeyOf', () => {
    let astw

    before(async () => {
        astw = (await prepareUnitTest('keys/model.cds', locations.testOutput('keys_test'))).astw
    })

    it('should correctly wrap type for key property', () => {
        const c_ID = astw.getAspectProperty('_CAspect', 'c')
        assert.ok(check.isKeyOf(c_ID.type, check.isString))
    })

    it('should have static key property present', () => {
        const keys = astw.getAspectProperty('_CAspect', 'keys')
        assert.ok(keys)
        assert.ok(check.isStaticMember(keys))
    })

    it('should inherit key type', () => {
        const keys = astw.getAspectProperty('_FooAspect', 'keys')
        assert.ok(astw.getAspectProperty('_CAspect', 'keys'))
        assert.ok(check.isStaticMember(keys))
        assert.strictEqual(keys.type.subtypes.length, 2)  // just Foo and cuid, no type for SomethingWithoutKey -> 2
        assert.ok(check.isIntersectionType(keys.type, [
            st => check.isTypeReference(st, '___.KeysOf'),
            st => check.isTypeQuery(st)
        ]))
    })
})