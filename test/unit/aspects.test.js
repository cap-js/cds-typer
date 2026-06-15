'use strict'

const { before, describe, it } = require('node:test')
const assert = require('assert')
const { locations, prepareUnitTest } = require('../util')
const { checkInheritance } = require('../ast')

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

// https://github.com/cap-js/cds-typer/issues/615
describe('Aspect Naming Collision', () => {
    let astw

    before(async () => astw = (await prepareUnitTest('aspects-collision/model.cds', locations.testOutput('aspects_collision_test'), { typerOptions: { outputDTsFiles: false } })).astw)

    it('should use entityName (_BooksAspect) for aspect with collision, not singular (_BookAspect)', () => {
        assert.ok(astw.tree.find(n => n.name === '_BooksAspect'), 'aspect function should be named _BooksAspect')
        assert.ok(!astw.tree.find(n => n.name === '_BookAspect'), 'aspect function should not be named _BookAspect in root')
    })

    it('should reference _BooksAspect (not _BookAspect) when extending the colliding aspect', () => {
        const eAspectNode = astw.tree.find(n => n.name === '_EAspect')
        assert.ok(eAspectNode, '_EAspect function should exist in the AST')
        const [eAspect] = eAspectNode.body

        assert.ok(checkInheritance(eAspect, ['_BooksAspect']))
        assert.ok(!checkInheritance(eAspect, ['_BookAspect']), 'should not reference _BookAspect (premature inflection)')
    })
})