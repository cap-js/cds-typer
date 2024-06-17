'use strict'

const { describe, beforeAll, test, expect } = require('@jest/globals')
const { locations, prepareUnitTest } = require('../util')

describe('Delimited Identifiers', () => {
    let astw

    beforeAll(async () => astw = (await prepareUnitTest('delimident/model.cds', locations.testOutput('delimident_test'))).astw)
    
    test('Properties in Aspect Present', () => {
        expect(astw.getAspectProperty('_FooAspect', 'sap-icon://a')).toBeTruthy()
        const nested = astw.getAspectProperty('_FooAspect', 'sap-icon://b')
        expect(nested).toBeTruthy()
        expect(nested.type.subtypes[0].members[0].name).toBe('sap-icon://c')
        const actions = astw.getAspectProperty('_FooAspect', 'actions')
        expect(actions.type.members.find(fn => fn.name === 'sap-icon://f')).toBeTruthy()
    })
})
