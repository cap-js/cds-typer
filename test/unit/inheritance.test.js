'use strict'

const { describe, test } = require('@jest/globals')
const { locations, prepareUnitTest } = require('../util')
const { checkInheritance } = require('../ast')

describe('Inheritance', () => {
    test('Entity <- Entity', async () => {
        const astw = (await prepareUnitTest('inheritance/model.cds', locations.testOutput('inheritance_test'))).astw
        const leaf = astw.tree.find(n => n.name === 'C')
        const x = checkInheritance(leaf, ['_AAspect', '_BAspect', '_TAspect', '_._ExtEAspect', '_._ExtTAspect', '_CAspect'],)
        console.log(astw)
    })
})