'use strict'

const path = require('path')
const cds = require('@sap/cds')
const { beforeAll, describe, test, expect } = require('@jest/globals')
const { locations, prepareUnitTest } = require('../util')
const { check, checkFunction } = require('../ast')

describe('type Definitions', () => {
    describe('structured output', () => {
        let astw

        beforeAll(async () => astw = (await prepareUnitTest('type/model.cds', locations.testOutput('type_test'))).astw)

        test('All Definitions Present', () => {
            expect(astw.tree.find(({name, nodeType}) => name === 'IntAlias' && nodeType === 'typeAliasDeclaration')).toBeTruthy()
            expect(astw.tree.find(({name, nodeType}) => name === 'Points' && nodeType === 'classDeclaration')).toBeTruthy()
            expect(astw.tree.find(({name, nodeType}) => name === 'Lines' && nodeType === 'typeAliasDeclaration')).toBeTruthy()
        })

        test('Types as Properties', () => {
            const members = astw.tree.find(def => def.name === '_PersonAspect').body[0].members
            expect(members.find(({name, type}) => name === 'id' && type?.subtypes[0].full === 'IntAlias')).toBeTruthy()
            expect(members.find(({name, type}) => name === 'pos' && type?.subtypes[0].full === 'Points')).toBeTruthy()
            expect(members.find(({name, type}) => name === 'history' && type.full === 'Array' && type.args[0].full === 'Points')).toBeTruthy()
            expect(members.find(({name, type}) => name === 'line' && type.full === 'Array' && type.args[0].full === 'Points')).toBeTruthy()
        })

        test('Referring to Nested Types Uses Singular', async () => {
            checkFunction(astw.tree.find(node => node.name === 'fn'), {
                callCheck: ptype => check.isNullable(ptype.subtypes[0].args[0], [st => check.isTypeReference(st, 'OuterType')])
            })
        })

        test('Type Reference to Enums', async () => {
            // FIXME: check target of Ref (not yet retained from TS AST)
            expect(astw.tree.find(def => def.name === 'Ref')).toBeTruthy()
            expect(astw.tree.find(def => def.name === 'Refs')).toBeFalsy()
            expect(astw.tree.find(def => def.name === 'Ref_')).toBeFalsy()
        })

        test('Type Has static .kind = "type" Property', async () => {
            const members = astw.tree.find(def => def.name === '_PointsAspect').body[0].members
            const kind = members.find(member => member.name === 'kind')
            expect(kind).toBeTruthy()
            expect(check.isStaticMember(kind)).toBeTruthy()
            expect(check.isReadonlyMember(kind)).toBeTruthy()
            expect(kind.initializer).toBe('type')
        })

        test('Entity Has static .kind = "entity" Property', async () => {
            // FIXME: this test case might fit better elsewhere
            const members = astw.tree.find(def => def.name === '_PersonAspect').body[0].members
            const kind = members.find(member => member.name === 'kind')
            expect(kind).toBeTruthy()
            expect(check.isStaticMember(kind)).toBeTruthy()
            expect(check.isReadonlyMember(kind)).toBeTruthy()
            expect(kind.initializer).toBe('entity')
        })

    })

    describe('flat output', () => {
        let astw

        beforeAll(async () => astw = (await prepareUnitTest('type/model.cds', locations.testOutput('type_test'), { typerOptions: { inlineDeclarations: 'flat' } })).astw)

        test('check elements of compiled model against generated type properties', async () => {
            const members = astw.tree.find(def => def.name === '_PersonAspect').body[0].members.map(m => m.name)
            const model = cds.linked(await cds.load(path.join(__dirname, 'files', 'type', 'model.cds')))

            // check odata model
            let srvModel = cds.linked(cds.compile(model).for.odata())
            let personsEntity = srvModel.definitions['type_test.Persons']

            for (const el of [...personsEntity.elements]) {
                expect(members).toContain(el.name)
            }

            // check sql model
            srvModel = cds.linked(cds.compile(model).for.sql())
            personsEntity = srvModel.definitions['type_test.Persons']

            for (const el of [...personsEntity.elements]) {
                expect(members).toContain(el.name)
            }
        })

        test('check existence of flattened type elements', () => {
            const members = astw.tree.find(def => def.name === '_PersonAspect').body[0].members

            expect(members.find(({name, type}) => name === 'pos_x' && type?.subtypes?.[0].keyword === 'number')).toBeTruthy()
            expect(members.find(({name, type}) => name === 'pos_y' && type?.subtypes?.[0].keyword === 'number')).toBeTruthy()
            expect(members.find(({name, type}) => name === 'pos_geoData_latitude' && type?.subtypes?.[0].keyword === 'number')).toBeTruthy()
            expect(members.find(({name, type}) => name === 'pos_geoData_longitude' && type?.subtypes?.[0].keyword === 'number')).toBeTruthy()
        })

    })
})
