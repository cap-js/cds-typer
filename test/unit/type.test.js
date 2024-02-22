'use strict'

const { locations, prepareUnitTest } = require('../util')

describe('type Definitions', () => {
    let astw

    beforeAll(async () => astw = (await prepareUnitTest('type/model.cds', locations.testOutput('type_test'))).astw)
    
    test('All Definitions Present', async () => {
        expect(astw.tree.find(({name, nodeType}) => name === 'IntAlias' && nodeType === 'typeAliasDeclaration')).toBeTruthy()
        expect(astw.tree.find(({name, nodeType}) => name === 'Points' && nodeType === 'classDeclaration')).toBeTruthy()
        expect(astw.tree.find(({name, nodeType}) => name === 'Lines' && nodeType === 'typeAliasDeclaration')).toBeTruthy()
    })

    test('Types as Properties', async () => {
        const members = astw.tree.find(def => def.name === '_PersonAspect').body[0].members
        expect(members.find(({name, type}) => name === 'id' && type.full === 'IntAlias'))
        expect(members.find(({name, type}) => name === 'pos' && type.full === 'Points'))
        expect(members.find(({name, type}) => name === 'history' && type.full === 'Array' && type.args[0].full === 'Points'))
        expect(members.find(({name, type}) => name === 'line' && type.full === 'Array' && type.args[0].full === 'Points'))
    })
})