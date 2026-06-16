'use strict'

const { describe, it, before } = require('node:test')
const assert = require('assert')
const { check, checkFunction } = require('../ast')
const { locations, prepareUnitTest } = require('../util')
const { perEachTestConfig } = require('../config')
const { configuration } = require('../../lib/config')

perEachTestConfig(({ outputDTsFiles, outputFile }) => {
    const dir = locations.testOutput('not_null_test')

    describe(`Not Null (using output **/*/${outputFile} files)`, () => {
        let astw

        before(async () => {
            configuration.outputDTsFiles = outputDTsFiles
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
})
