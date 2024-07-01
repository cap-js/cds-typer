'use strict'

const { describe, test, beforeAll } = require('@jest/globals')
const { locations, prepareUnitTest } = require('../util')
const { checkInheritance } = require('../ast')
const { expect } = require('@jest/globals')

describe('Inheritance', () => {
    let ast
    beforeAll(async () => ast = (await prepareUnitTest('inheritance/model.cds', locations.testOutput('inheritance_test'))).astw.tree)

    test('Entity, Type <- Entity', async () => {
        const leaf = ast.find(n => n.name === 'LeafEntity')
        // inherit from singular aspects
        expect(checkInheritance(leaf, ['_AAspect', '_BAspect', '_TAspect', '_._ExtEAspect', '_._ExtTAspect', '_LeafEntityAspect'])).toBe(true)
        // not from plural
        expect(checkInheritance(leaf, ['_AAspects'])).toBe(false)
    })

    test('Entity, Type <- Type', async () => {
        const leaf = ast.find(n => n.name === 'LeafType')
        // inherit from singular aspects
        expect(checkInheritance(leaf, ['_AAspect', '_BAspect', '_TAspect', '_._ExtEAspect', '_._ExtTAspect', '_LeafTypeAspect'])).toBe(true)
        // not from plural
        expect(checkInheritance(leaf, ['_AAspects'])).toBe(false)
    })


    test('Extends Own Aspect (-s, Explicit Annotation)', async () =>
        expect(checkInheritance(ast.find(n => n.name === 'Circus'), ['_CircusAspect'])).toBe(true)
    )

    test('Extends Own Aspect (-s, No Annotation)', async () =>
        expect(checkInheritance(ast.find(n => n.name === 'Abys'), ['_AbysAspect'])).toBe(true)
    )
})