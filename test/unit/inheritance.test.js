'use strict'

const { describe, it, before } = require('node:test')
const assert = require('assert')
const { locations, prepareUnitTest } = require('../util')
const { checkInheritance } = require('../ast')

describe('Inheritance', () => {
    let ast
    before(async () => {
        ast = (await prepareUnitTest('inheritance/model.cds', locations.testOutput('inheritance_test'))).astw.tree
    })

    it('should verify inheritance for Entity, Type <- Entity', async () => {
        const [leafAspect] = ast.find(n => n.name === '_LeafEntityAspect').body
        const leaf = ast.find(n => n.name === 'LeafEntity')
        // inherit from singular aspects
        assert.ok(checkInheritance(leafAspect, ['_AAspect', '_BAspect', '_TAspect', '_._ExtEAspect', '_._ExtTAspect']))
        // not from plural
        assert.ok(!checkInheritance(leafAspect, ['_AAspects']))
        // class only extends the aspect
        assert.ok(checkInheritance(leaf, ['_LeafEntityAspect']))
    })

    it('should verify inheritance for Entity, Type <- Type', async () => {
        const [leafAspect] = ast.find(n => n.name === '_LeafTypeAspect').body
        const leaf = ast.find(n => n.name === 'LeafType')
        // inherit from singular aspects
        assert.ok(checkInheritance(leafAspect, ['_AAspect', '_BAspect', '_TAspect', '_._ExtEAspect', '_._ExtTAspect']))
        // not from plural
        assert.ok(!checkInheritance(leafAspect, ['_AAspects']))
        // class only extends the aspect
        assert.ok(checkInheritance(leaf, ['_LeafTypeAspect']))
    })

    it('should verify inheritance for Extends Own Aspect (-s, Explicit Annotation)', async () => {
        assert.ok(checkInheritance(ast.find(n => n.name === 'Circus'), ['_CircusAspect']))
    })

    it('should verify inheritance for Extends Own Aspect (-s, No Annotation)', async () => {
        assert.ok(checkInheritance(ast.find(n => n.name === 'Abys'), ['_AbysAspect']))
    })

    it('should verify multilevel inheritance', async () => {
        const ast = (await prepareUnitTest('inheritance/multilevel.cds', locations.testOutput('inheritance_test'))).astw.tree
        // we can't really check the transitive inheritance relationship here, which would manifest in instances of E owning the properties from A1...
        assert.ok(checkInheritance(ast.find(n => n.name === '_EAspect').body[0], ['_A2Aspect']))
        assert.ok(checkInheritance(ast.find(n => n.name === '_A2Aspect').body[0], ['_A1Aspect']))
    })
})