'use strict'

const path = require('path')
const { before, describe, it } = require('node:test')
const assert = require('assert')
const { check } = require('../ast')
const { locations, prepareUnitTest } = require('../util')
const { perEachTestConfig } = require('../config')
const { configuration } = require('../../lib/config')

perEachTestConfig(({ outputDTsFiles, outputFile }) => {
    describe(`Events Tests (using output **/*/${outputFile} files)`, () => {
        let astw
        let serviceAstw

        before(async () => {
            configuration.outputDTsFiles = outputDTsFiles
            const result = await prepareUnitTest('events/model.cds', locations.testOutput('events_test'))
            astw = result.astw
            const servicePath = result.paths.find(p => p.endsWith(path.join('events', 'MyService')))
            if (servicePath) {
                const { ASTWrapper } = require('../ast')
                serviceAstw = new ASTWrapper(path.join(servicePath, outputFile))
            }
        })

        describe('Builtin Imports Generation', () => {
            it('should generate _ module import for builtin types', () => {
                assert.strictEqual(astw.getImports()[0].module, './../_')
            })
        })

        describe('Event Type Presence', () => {
            it('should have a top-level event with correct members', async () => {
                assert.ok(astw.tree.find(cls => cls.name === 'Bar'
                    && cls.members.length === 4
                    && cls.members[0].name === 'kind' && check.isReadonlyMember(cls.members[0])
                    && cls.members[1].name === 'id' && check.isNullable(cls.members[1].type, [check.isNumber])
                    && cls.members[2].name === 'name' && check.isNullable(cls.members[2].type, [check.isIndexedAccessType])
                    && cls.members[3].name === 'createdOn' && check.isNullable(cls.members[3].type, [check.isTypeReference])
                ))
            })

            it('should generate event defined inside a service in the service namespace file', async () => {
                assert.ok(serviceAstw, 'service namespace file should exist')
                assert.ok(serviceAstw.tree.find(cls => cls.name === 'OrderPlaced'
                    && cls.members.length === 2
                    && cls.members[0].name === 'kind' && check.isReadonlyMember(cls.members[0])
                    && cls.members[1].name === 'id' && check.isNullable(cls.members[1].type, [check.isNumber])
                ))
            })

            it('should use dot-separated prefix as namespace for dotted event names', async () => {
                assert.ok(serviceAstw, 'service namespace file should exist')
                const ns = serviceAstw.getModuleDeclaration('Scoped')
                assert.ok(ns, 'namespace Scoped should exist')
                assert.ok(ns.body.find(cls => cls.name === 'OrderPlaced'
                    && cls.members.length === 2
                    && cls.members[0].name === 'kind' && check.isReadonlyMember(cls.members[0])
                    && cls.members[1].name === 'id' && check.isNullable(cls.members[1].type, [check.isNumber])
                ))
            })
        })
    })
})
