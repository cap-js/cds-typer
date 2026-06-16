'use strict'

const { describe, before, it } = require('node:test')
const assert = require('assert')
const { checkFunction, check } = require('../ast')
const { locations, prepareUnitTest } = require('../util')
const { perEachTestConfig } = require('../config')
const { configuration } = require('../../lib/config')

perEachTestConfig(({ outputDTsFiles, outputFile }) => {
    describe(`Array Of (using output **/*/${outputFile} files)`, () => {
        let astw

        before(async () => {
            configuration.outputDTsFiles = outputDTsFiles
            astw = (await prepareUnitTest('arrayof/model.cds', locations.testOutput('arrayof_test'))).astw
        })

        describe('Entity Properties', () => {
            let aspect
            before(async () => aspect = astw.getAspect('_EAspect'))

            it('should validate array of String', async () => {
                assert.ok(aspect.members.find(m => m.name === 'stringz'
                    && m.type.full === 'Array'
                    && check.isString(m.type.args[0])))
            })

            it('should validate many Integer', async () => {
                assert.ok(aspect.members.find(m => m.name === 'numberz'
                    && m.type.full === 'Array'
                    && check.isNumber(m.type.args[0])))
            })

            it('should validate array of locally defined type', async () => {
                assert.ok(aspect.members.find(m => m.name === 'tz'
                    && m.type.full === 'Array'
                    && m.type.args[0].full === 'T'))
            })

            it('should validate array of externally defined type', async () => {
                assert.ok(aspect.members.find(m => m.name === 'extz'
                    && m.type.full === 'Array'
                    && m.type.args[0].full === '_elsewhere.ExternalType'))
            })

            it('should validate array of inline type', async () => {
                assert.ok(aspect.members.find(m => m.name === 'inlinez'
                    && m.type.full === 'Array'
                    && m.type.args[0].keyword === 'typeliteral'
                    && m.type.args[0].members.length === 2))
            })
        })

        describe('Entity Properties (flat inline declarations)', () => {
            let aspectFlat
            before(async () => {
                configuration.outputDTsFiles = outputDTsFiles
                const result = await prepareUnitTest('arrayof/model.cds', locations.testOutput('arrayof_test_flat'), { typerOptions: { inlineDeclarations: 'flat' } })
                aspectFlat = result.astw.getAspect('_EAspect')
            })

            it('should validate array of String in flat mode', async () => {
                assert.ok(aspectFlat.members.find(m => m.name === 'stringz'
                    && m.type.full === 'Array'
                    && check.isString(m.type.args[0])))
            })

            it('should validate many Integer in flat mode', async () => {
                assert.ok(aspectFlat.members.find(m => m.name === 'numberz'
                    && m.type.full === 'Array'
                    && check.isNumber(m.type.args[0])))
            })

            it('should validate array of locally defined type in flat mode', async () => {
                assert.ok(aspectFlat.members.find(m => m.name === 'tz'
                    && m.type.full === 'Array'
                    && m.type.args[0].full === 'T'))
            })

            it('should validate array of externally defined type in flat mode', async () => {
                assert.ok(aspectFlat.members.find(m => m.name === 'extz'
                    && m.type.full === 'Array'
                    && m.type.args[0].full === '_elsewhere.ExternalType'))
            })

            it('should validate array of inline type in flat mode', async () => {
                assert.ok(aspectFlat.members.find(m => m.name === 'inlinez'
                    && m.type.full === 'Array'
                    && m.type.args[0].keyword === 'typeliteral'
                    && m.type.args[0].members.length === 2))
            })
        })

        describe('Function', () => {
            let func
            before(async () => func = astw.tree.find(n => n.name === 'fn'))

            it('should validate function returning array of String', async () => {
                assert.ok(checkFunction(func, {
                    callCheck: signature => check.isString(signature.subtypes[0].args[0].args[0]),
                    parameterCheck: params => params.members?.[0]?.name === 'xs',
                    returnTypeCheck: returns => check.isString(returns.subtypes[0].args[0].args[0])
                }))
            })
        })
    })
})
