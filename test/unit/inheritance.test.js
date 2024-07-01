'use strict'

const { describe, test, beforeAll } = require('@jest/globals')
const { locations, prepareUnitTest } = require('../util')
const { checkInheritance } = require('../ast')
const { expect } = require('@jest/globals')

describe('Inheritance', () => {
    let ast
    beforeAll(async () => ast = (await prepareUnitTest('inheritance/model.cds', locations.testOutput('inheritance_test'))).astw.tree)

    test('Entity, Type <- Entity', async () => {
        const [leafAspect] = ast.find(n => n.name === '_LeafEntityAspect').body
        const leaf = ast.find(n => n.name === 'LeafEntity')//'LeafEntity')
        // inherit from singular aspects
        expect(checkInheritance(leafAspect, ['_AAspect', '_BAspect', '_TAspect', '_._ExtEAspect', '_._ExtTAspect'])).toBe(true)
        // not from plural
        expect(checkInheritance(leafAspect, ['_AAspects'])).toBe(false)
        // class only extends the aspect
        expect(checkInheritance(leaf, ['_LeafEntityAspect'])).toBe(true)
    })

    test('Entity, Type <- Type', async () => {
        const [leafAspect] = ast.find(n => n.name === '_LeafTypeAspect').body
        const leaf = ast.find(n => n.name === 'LeafType')
        // inherit from singular aspects
        expect(checkInheritance(leafAspect, ['_AAspect', '_BAspect', '_TAspect', '_._ExtEAspect', '_._ExtTAspect'])).toBe(true)
        // not from plural
        expect(checkInheritance(leafAspect, ['_AAspects'])).toBe(false)
        // class only extends the aspect
        expect(checkInheritance(leaf, ['_LeafTypeAspect'])).toBe(true)
    })


    test('Extends Own Aspect (-s, Explicit Annotation)', async () =>
        expect(checkInheritance(ast.find(n => n.name === 'Circus'), ['_CircusAspect'])).toBe(true)
    )

    test('Extends Own Aspect (-s, No Annotation)', async () =>
        expect(checkInheritance(ast.find(n => n.name === 'Abys'), ['_AbysAspect'])).toBe(true)
    )

    test('Multilevel Inheritance', async () => {
        const ast = (await prepareUnitTest('inheritance/multilevel.cds', locations.testOutput('inheritance_test'))).astw.tree
        // we can't really check the transitive inheritance relationship here, which would manifest in instances of E owning the properties from A1...
        expect(checkInheritance(ast.find(n => n.name === '_EAspect').body[0], ['_A2Aspect'])).toBe(true)
        expect(checkInheritance(ast.find(n => n.name === '_A2Aspect').body[0], ['_A1Aspect'])).toBe(true)
    })
})