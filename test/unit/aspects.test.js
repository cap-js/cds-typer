'use strict'

const { before, describe, it } = require('node:test')
const assert = require('assert')
const { locations, prepareUnitTest } = require('../util')

// FIXME: missing: inline enums (entity Foo { bar: String enum { ... }})
describe('CDS Aspects', () => {
    let astw

    before(async () => astw = (await prepareUnitTest('aspects/model.cds', locations.testOutput('aspect_test'))).astw)

    it('should validate aspect in singular form', () => {
        assert.ok(astw.tree.find(n => n.name === '_PersonAspect'))
    })

    it('should contain a composition to an aspect', () => {
        assert.ok(astw.exists('_CatalogAspect', 'persons'))
    })
})