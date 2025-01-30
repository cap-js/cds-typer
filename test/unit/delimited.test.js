'use strict'

const { describe, before, it } = require('node:test')
const assert = require('assert')
const { locations, prepareUnitTest } = require('../util')

describe('Delimited Identifiers', () => {
    let astw

    before(async () => astw = (await prepareUnitTest('delimident/model.cds', locations.testOutput('delimident_test'))).astw)

    it('should validate properties in aspect are present', () => {
        assert.ok(astw.getAspectProperty('_FooAspect', 'sap-icon://a'))
        const nested = astw.getAspectProperty('_FooAspect', 'sap-icon://b')
        assert.ok(nested)
        assert.strictEqual(nested.type.subtypes[0].members[0].name, 'sap-icon://c')
        const actions = astw.getAspectProperty('_FooAspect', 'actions')
        assert.ok(actions.type.members.find(fn => fn.name === 'sap-icon://f'))
    })
})
