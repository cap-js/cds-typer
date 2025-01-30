'use strict'

const { describe, it, before } = require('node:test')
const assert = require('assert')
const { check, checkFunction } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

const dir = locations.testOutput('not_null_test')

describe('Not Null', () => {
    let astw

    before(async () => {
        astw = (await prepareUnitTest('notnull/model.cds', dir)).astw
    })

    describe('Properties', () => {
        it('should verify primitive property is not null', async () => {
            assert.ok(astw.getAspects().find(({name, members}) => name === '_EAspect'
            && members?.find(member => member.name === 'x' && !check.isNullable(member.type) && check.isNumber(member.type))))
        })

        it('should verify association to one is not null', async () => {
            assert.ok(astw.getAspects().find(({name, members}) => name === '_EAspect'
            && members?.find(member => member.name === 'foo_assoc' && !check.isNullable(member.type))))
        })

        it('should verify association to many is not null', async () => {
            assert.ok(astw.getAspects().find(({name, members}) => name === '_EAspect'
            && members?.find(member => member.name === 'foos_assoc' && !check.isNullable(member.type))))
        })

        it('should verify composition of one is not null', async () => {
            assert.ok(astw.getAspects().find(({name, members}) => name === '_EAspect'
            && members?.find(member => member.name === 'foo_comp' && !check.isNullable(member.type))))
        })

        it('should verify composition of many is not null', async () => {
            assert.ok(astw.getAspects().find(({name, members}) => name === '_EAspect'
            && members?.find(member => member.name === 'foos_comp' && !check.isNullable(member.type))))
        })

        it('should verify inline property is not null', async () => {
            assert.ok(astw.getAspects().find(({name, members}) => name === '_EAspect'
            && members?.find(member => member.name === 'inline'
                && !check.isNullable(member.type)
                && !check.isNullable(member.type.members[0]))))
        })
    })

    describe('Actions', () => {
        it('should verify bound action is not null', async () => {
            const actions = astw.getAspectProperty('_EAspect', 'actions')
            checkFunction(actions.type.members.find(fn => fn.name === 'f'), {
                parameterCheck: ({members: [fst]}) => fst.name === 'x' && !check.isNullable(fst.type)
            })
        })

        it('should verify unbound action is not null', async () => {
            checkFunction(astw.tree.find(node => node.name === 'free'), {
                callCheck: type => !check.isNullable(type),
                parameterCheck: ({members: [fst]}) => fst.name === 'param' && !check.isNullable(fst.type),
                returnTypeCheck: type => !check.isNullable(type)
            })
        })
    })

    describe('cuid', () => {
        it('should verify cuid is not null', async () => {
            // This checks the absence of a very specific bug (#219):
            // Having an association to an entity that extended cuid caused
            // the key to be nullable. It was not when it was not associated from anywhere.
            // The root cause for this was the order in which entities were visited.
            // Entities would sometimes modify the .isRefNotNull property of their referred
            // Entitiy before/ after the referred entity was visited, which would lead to variying types.
            // This cause mismatches in projections, where the key was correctly not nullable.
            // So we need to test with two separate models here:
            // A, where there is such an association, B, where there is none
            // To ensure they behave identically.
            const path = require('path')
            /**
             * @param {string} top - top level entity name
             */
            async function getTopLevelASTW (top) {
                const topLevel = path.join(dir, top)
                return (await prepareUnitTest(`notnull/nonnullablekeys/${top}.cds`, topLevel, {
                    fileSelector: paths => paths.find(p => p.endsWith(topLevel))
                })).astw
            }

            const astwA = await getTopLevelASTW('A')
            const astwB = await getTopLevelASTW('B')

            const cuidA = astwA.getAspectProperty('_cuidAspect', 'ID')
            const cuidB = astwB.getAspectProperty('_cuidAspect', 'ID')

            assert.strictEqual(check.isNullable(cuidA.type), check.isNullable(cuidB.type))
            assert.strictEqual(check.isString(cuidA.type), check.isString(cuidB.type))
        })
    })
})
