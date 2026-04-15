'use strict'

const { describe, it, before } = require('node:test')
const assert = require('assert')
const { check, checkFunction } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

const dir = locations.testOutput('utf8_test')

describe('UTF8', () => {
    let astw

    before(async () => {
        astw = (await prepareUnitTest('utf8/model.cds', dir)).astw
    })

    describe('Entities with Sanitized Names', () => {
        it('should have entity "C DÄ#" with sanitized name ___C_D__Aspect', async () => {
            const aspect = astw.getAspects().find(({name}) => name === '___C_D__Aspect')
            assert.ok(aspect, '___C_D__Aspect should exist')
        })

        it('should have entity "A" with sanitized name _AAspect', async () => {
            const aspect = astw.getAspects().find(({name}) => name === '_AAspect')
            assert.ok(aspect, '_AAspect should exist')
        })

        it('should have entity "本" with sanitized name __a4fb8425cd19033f465cd47d09504b62Aspect', async () => {
            const aspect = astw.getAspects().find(({name}) => name === '__a4fb8425cd19033f465cd47d09504b62Aspect')
            assert.ok(aspect, '__a4fb8425cd19033f465cd47d09504b62Aspect should exist')
        })

        it('should have entity "object" with sanitized name ___objectAspect', async () => {
            const aspect = astw.getAspects().find(({name}) => name === '___objectAspect')
            assert.ok(aspect, '___objectAspect should exist')
        })

        it('should have entity "A/B" with sanitized name ___A_BAspect', async () => {
            const aspect = astw.getAspects().find(({name}) => name === '___A_BAspect')
            assert.ok(aspect, '___A_BAspect should exist')
        })

        it('should have type "T Y P E" with sanitized name ___T_Y_P_EAspect', async () => {
            const aspect = astw.getAspects().find(({name}) => name === '___T_Y_P_EAspect')
            assert.ok(aspect, '___T_Y_P_EAspect should exist')
        })
    })

    describe('Entity Properties', () => {
        it('should verify "C DÄ#" has key property ID', async () => {
            const aspect = astw.getAspects().find(({name}) => name === '___C_D__Aspect')
            const id = aspect.members.find(member => member.name === 'ID')
            assert.ok(id, 'ID property should exist')
            assert.ok(!check.isNullable(id.type), 'ID should not be nullable')
        })

        it('should verify "C DÄ#" has property "välue"', async () => {
            const aspect = astw.getAspects().find(({name}) => name === '___C_D__Aspect')
            const value = aspect.members.find(member => member.name === 'välue')
            assert.ok(value, 'välue property should exist')
            assert.ok(check.isNullable(value.type, [check.isString]), 'välue should be nullable string')
        })

        it('should verify "C DÄ#" has association x to A/B', async () => {
            const aspect = astw.getAspects().find(({name}) => name === '___C_D__Aspect')
            const x = aspect.members.find(member => member.name === 'x')
            assert.ok(x, 'x property should exist')
            assert.ok(check.isNullable(x.type), 'x should be nullable')
        })

        it('should verify "C DÄ#" has property y of type "T Y P E"', async () => {
            const aspect = astw.getAspects().find(({name}) => name === '___C_D__Aspect')
            const y = aspect.members.find(member => member.name === 'y')
            assert.ok(y, 'y property should exist')
            assert.ok(check.isNullable(y.type), 'y should be nullable')
        })

        it('should verify "C DÄ#" has enum property z', async () => {
            const aspect = astw.getAspects().find(({name}) => name === '___C_D__Aspect')
            const z = aspect.members.find(member => member.name === 'z')
            assert.ok(z, 'z property should exist')
            assert.ok(check.isNullable(z.type), 'z should be nullable')
        })

        it('should verify "本" has property "作家"', async () => {
            const aspect = astw.getAspects().find(({name}) => name === '__a4fb8425cd19033f465cd47d09504b62Aspect')
            const author = aspect.members.find(member => member.name === '作家')
            assert.ok(author, '作家 property should exist')
            assert.ok(check.isNullable(author.type, [check.isString]), '作家 should be nullable string')
        })

        it('should verify "本" has property "タイトル"', async () => {
            const aspect = astw.getAspects().find(({name}) => name === '__a4fb8425cd19033f465cd47d09504b62Aspect')
            const title = aspect.members.find(member => member.name === 'タイトル')
            assert.ok(title, 'タイトル property should exist')
            assert.ok(check.isNullable(title.type), 'タイトル should be nullable')
        })

        it('should verify "object" has reserved word properties', async () => {
            const aspect = astw.getAspects().find(({name}) => name === '___objectAspect')
            const objProp = aspect.members.find(member => member.name === 'object')
            const forProp = aspect.members.find(member => member.name === 'for')
            const funcProp = aspect.members.find(member => member.name === 'function')
            
            assert.ok(objProp, 'object property should exist')
            assert.ok(forProp, 'for property should exist')
            assert.ok(funcProp, 'function property should exist')
        })

        it('should verify "A/B" has property "va lue" with space', async () => {
            const aspect = astw.getAspects().find(({name}) => name === '___A_BAspect')
            const value = aspect.members.find(member => member.name === 'va lue')
            assert.ok(value, 'va lue property should exist')
            assert.ok(check.isNullable(value.type, [check.isString]), 'va lue should be nullable string')
        })

        it('should verify "T Y P E" has property foo', async () => {
            const aspect = astw.getAspects().find(({name}) => name === '___T_Y_P_EAspect')
            const foo = aspect.members.find(member => member.name === 'foo')
            assert.ok(foo, 'foo property should exist')
            assert.ok(check.isNullable(foo.type, [check.isString]), 'foo should be nullable string')
        })
    })

    describe('Actions', () => {
        it('should verify bound action exists with sanitized name', async () => {
            const actions = astw.getAspectProperty('___C_D__Aspect', 'actions')
            assert.ok(actions, 'actions property should exist')
            assert.ok(actions.type, 'actions type should exist')
            assert.ok(actions.type.members, 'actions members should exist')
            // AST parser strips quotes from string literal property names
            const boundAction = actions.type.members.find(fn => fn.name === 'bound action')
            assert.ok(boundAction, 'bound action should exist in actions')
        })
    })
})