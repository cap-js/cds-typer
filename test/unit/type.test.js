'use strict'

const { beforeAll, describe, test, expect } = require('@jest/globals')
const { locations, prepareUnitTest } = require('../util')
const { check, checkFunction } = require('../ast')

describe('type Definitions', () => {
    let astw

    beforeAll(async () => astw = (await prepareUnitTest('type/model.cds', locations.testOutput('type_test'))).astw)

    test('All Definitions Present', () => {
        expect(astw.tree.find(({name, nodeType}) => name === 'IntAlias' && nodeType === 'typeAliasDeclaration')).toBeTruthy()
        expect(astw.tree.find(({name, nodeType}) => name === 'Points' && nodeType === 'classDeclaration')).toBeTruthy()
        expect(astw.tree.find(({name, nodeType}) => name === 'Lines' && nodeType === 'typeAliasDeclaration')).toBeTruthy()
    })

    test('Types as Properties', () => {
        const members = astw.tree.find(def => def.name === '_PersonAspect').body[0].members
        expect(members.find(({name, type}) => name === 'id' && type.full === 'IntAlias'))
        expect(members.find(({name, type}) => name === 'pos' && type.full === 'Points'))
        expect(members.find(({name, type}) => name === 'history' && type.full === 'Array' && type.args[0].full === 'Points'))
        expect(members.find(({name, type}) => name === 'line' && type.full === 'Array' && type.args[0].full === 'Points'))
    })

    test('Referring to Nested Types Uses Singular', async () => {
        checkFunction(astw.tree.find(node => node.name === 'fn'), {
            callCheck: ptype => check.isNullable(ptype, [st => check.isTypeReference(st, 'OuterType')])
        })
    })

    test('Type Reference to Enums', async () => {
        // FIXME: check target of Ref (not yet retained from TS AST)
        expect(astw.tree.find(def => def.name === 'Ref')).toBeTruthy()
        expect(astw.tree.find(def => def.name === 'Refs')).toBeFalsy()
        expect(astw.tree.find(def => def.name === 'Ref_')).toBeFalsy()
    })
})