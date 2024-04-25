'use strict'

const { beforeAll, describe, test, expect } = require('@jest/globals')
const { check, checkFunction } = require('../ast')
const { locations, prepareUnitTest } = require('../util')

const dir = locations.testOutput('not_null_test')

describe('Not Null', () => {
    let astw

    beforeAll(async () => astw = (await prepareUnitTest('notnull/model.cds', dir)).astw)

    describe('Properties', () => {
        test('Primitive', async () => 
            expect(astw.getAspects().find(({name, members}) => name === '_EAspect'
            && members?.find(member => member.name === 'x' && !check.isNullable(member.type) && check.isNumber(member.type))))
                .toBeTruthy())

        test('Association to One', async () => 
            expect(astw.getAspects().find(({name, members}) => name === '_EAspect'
            && members?.find(member => member.name === 'foo_assoc' && !check.isNullable(member.type))))
                .toBeTruthy())
        
        test('Association to Many', async () => 
            expect(astw.getAspects().find(({name, members}) => name === '_EAspect'
            && members?.find(member => member.name === 'foos_assoc' && !check.isNullable(member.type))))
                .toBeTruthy())

        test('Composition of One', async () => 
            expect(astw.getAspects().find(({name, members}) => name === '_EAspect'
            && members?.find(member => member.name === 'foo_comp' && !check.isNullable(member.type))))
                .toBeTruthy())
        
        test('Composition of Many', async () => 
            expect(astw.getAspects().find(({name, members}) => name === '_EAspect'
            && members?.find(member => member.name === 'foos_comp' && !check.isNullable(member.type))))
                .toBeTruthy())

        test('Inline', async () => 
            expect(astw.getAspects().find(({name, members}) => name === '_EAspect'
            && members?.find(member => member.name === 'inline' 
                && !check.isNullable(member.type)
                && !check.isNullable(member.type.members[0]))))
                .toBeTruthy())
    })


    describe('Actions', () => {
        test('Bound', async () => {
            const actions = astw.getAspectProperty('_EAspect', 'actions')
            checkFunction(actions.type.members.find(fn => fn.name === 'f'), {
                parameterCheck: ({members: [fst]}) => fst.name === 'x' && !check.isNullable(fst.type)
            })
        })
        
        test('Unbound', async () => {
            checkFunction(astw.tree.find(node => node.name === 'free'), {
                callCheck: type => !check.isNullable(type),
                parameterCheck: ({members: [fst]}) => fst.name === 'param' && !check.isNullable(fst.type),
                returnTypeCheck: type => !check.isNullable(type)
            })
        })
    })

    describe('cuid', () => {
        test('Not Null', async () => {
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

            expect(check.isNullable(cuidA.type)).toBe(check.isNullable(cuidB.type))
            expect(check.isString(cuidA.type)).toBe(check.isString(cuidB.type))
        })
    })

    
})
