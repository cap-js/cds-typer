'use strict'

const path = require('path')
const cds = require('@sap/cds')
const { before, describe, it } = require('node:test')
const assert = require('assert')
const { locations, prepareUnitTest } = require('../util')
const { check, checkFunction } = require('../ast')

describe('Type Definitions Tests', () => {
    describe('Structured Output Tests', () => {
        let astw

        before(async () => astw = (await prepareUnitTest('type/model.cds', locations.testOutput('type_test'))).astw)

        it('should verify all definitions are present', () => {
            assert.ok(astw.tree.find(({name, nodeType}) => name === 'IntAlias' && nodeType === 'typeAliasDeclaration'))
            assert.ok(astw.tree.find(({name, nodeType}) => name === 'Points' && nodeType === 'classDeclaration'))
            assert.ok(astw.tree.find(({name, nodeType}) => name === 'Lines' && nodeType === 'typeAliasDeclaration'))
        })

        it('should verify types as properties', () => {
            const members = astw.tree.find(def => def.name === '_PersonAspect').body[0].members
            assert.ok(members.find(({name, type}) => name === 'id' && type?.subtypes[0].full === 'IntAlias'))
            assert.ok(members.find(({name, type}) => name === 'pos' && type?.subtypes[0].full === 'Points'))
            assert.ok(members.find(({name, type}) => name === 'history' && type.full === 'Array' && type.args[0].full === 'Points'))
            assert.ok(members.find(({name, type}) => name === 'line' && type.full === 'Array' && type.args[0].full === 'Points'))
        })

        it('should verify referring to nested types uses singular', async () => {
            checkFunction(astw.tree.find(node => node.name === 'fn'), {
                callCheck: ptype => check.isNullable(ptype.subtypes[0].args[0], [st => check.isTypeReference(st, 'OuterType')])
            })
        })

        it('should verify type reference to enums', async () => {
            // FIXME: check target of Ref (not yet retained from TS AST)
            assert.ok(astw.tree.find(def => def.name === 'Ref'))
            assert.ok(!astw.tree.find(def => def.name === 'Refs'))
            assert.ok(!astw.tree.find(def => def.name === 'Ref_'))
        })

        it('should verify type has static .kind = "type" property', async () => {
            const members = astw.tree.find(def => def.name === '_PointsAspect').body[0].members
            const kind = members.find(member => member.name === 'kind')
            assert.ok(kind)
            assert.ok(check.isStaticMember(kind))
            assert.ok(check.isReadonlyMember(kind))
            assert.strictEqual(kind.initializer, 'type')
        })

        it('should verify entity has static .kind = "entity" property', async () => {
            // FIXME: this test case might fit better elsewhere
            const members = astw.tree.find(def => def.name === '_PersonAspect').body[0].members
            const kind = members.find(member => member.name === 'kind')
            assert.ok(kind)
            assert.ok(check.isStaticMember(kind))
            assert.ok(check.isReadonlyMember(kind))
            assert.strictEqual(kind.initializer, 'entity')
        })
    })

    describe('Flat Output Tests', () => {
        let astw

        before(async () => astw = (await prepareUnitTest('type/model.cds', locations.testOutput('type_test'), { typerOptions: { inlineDeclarations: 'flat' } })).astw)

        it('should check elements of compiled model against generated type properties', async () => {
            const members = astw.tree.find(def => def.name === '_PersonAspect').body[0].members.map(m => m.name)
            const model = cds.linked(await cds.load(path.join(__dirname, 'files', 'type', 'model.cds')))

            // check odata model
            let srvModel = cds.linked(cds.compile(model).for.odata())
            let personsEntity = srvModel.definitions['type_test.Persons']

            for (const el of [...personsEntity.elements]) {
                assert.ok(members.includes(el.name))
            }

            // check sql model
            srvModel = cds.linked(cds.compile(model).for.sql())
            personsEntity = srvModel.definitions['type_test.Persons']

            for (const el of [...personsEntity.elements]) {
                assert.ok(members.includes(el.name))
            }
        })

        it('should check existence of flattened type elements', () => {
            const members = astw.tree.find(def => def.name === '_PersonAspect').body[0].members

            assert.ok(members.find(({name, type}) => name === 'pos_x' && type?.subtypes?.[0].keyword === 'number'))
            assert.ok(members.find(({name, type}) => name === 'pos_y' && type?.subtypes?.[0].keyword === 'number'))
            assert.ok(members.find(({name, type}) => name === 'pos_geoData_latitude' && type?.subtypes?.[0].keyword === 'number'))
            assert.ok(members.find(({name, type}) => name === 'pos_geoData_longitude' && type?.subtypes?.[0].keyword === 'number'))
        })
    })

    describe('Branded Primitives', () => {
        let astw

        before(async () => astw = (await prepareUnitTest('type/model.cds', locations.testOutput('type_test'), { typerOptions: { brandedPrimitiveTypes: true } })).astw)

        it('should generate primitive CDS types as branded TS types', async () => {
            const intType = astw.tree.find(def => def.name === 'IntAlias')
            assert.ok(check.isIntersectionType(intType.type, [check.isNumber]))
            // only primitives!
            const refType = astw.tree.find(def => def.name === 'Ref')
            assert.ok(!check.isIntersectionType(refType.type, [check.isNumber]))
        })
    })
})
