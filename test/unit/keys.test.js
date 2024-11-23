'use strict'

const { check } = require('../ast')
const { beforeAll, describe, test } = require('@jest/globals')
const { locations, prepareUnitTest } = require('../util')
const { expect } = require('@jest/globals')

describe('KeyOf', () => {
    let astw

    beforeAll(async () => astw = (await prepareUnitTest('keys/model.cds', locations.testOutput('keys_test'))).astw)

    test('Type Correctly Wrapped For Key Property', () => {
        const c_ID = astw.getAspectProperty('_CAspect', 'c')
        expect(check.isKeyOf(c_ID.type, check.isString)).toBe(true)
    })

    test('Static Key Property Present', () => {
        const keys = astw.getAspectProperty('_CAspect', 'keys')
        expect(astw.getAspectProperty('_CAspect', 'keys')).toBeTruthy()
        expect(check.isStaticMember(keys)).toBeTruthy()
    })

    test('Key Type Inherited', () => {
        const keys = astw.getAspectProperty('_FooAspect', 'keys')
        expect(astw.getAspectProperty('_CAspect', 'keys')).toBeTruthy()
        expect(check.isStaticMember(keys)).toBeTruthy()
        expect(keys.type.subtypes.length === 2)  // just Foo and cuid, no type for SomethingWithoutKey -> 2
        expect(check.isIntersectionType(keys.type, [
            st => check.isTypeReference(st, '___.KeysOf'),
            st => check.isTypeQuery(st)
        ])).toBeTruthy()
    })
})