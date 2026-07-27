'use strict'

const path = require('path')
const { before, describe, it } = require('node:test')
const assert = require('assert')
const { check, JSASTWrapper } = require('../ast')
const { locations, prepareUnitTest } = require('../util')
const { perEachTestConfig } = require('../config')
const { configuration } = require('../../lib/config')

perEachTestConfig(({ outputDTsFiles, outputFile }) => {
    describe(`Events Tests (using output **/*/${outputFile} files)`, () => {
        let astw
        let serviceAstw
        let serviceJsw
        let contextAstw
        let contextJsw

        before(async () => {
            configuration.outputDTsFiles = outputDTsFiles
            const result = await prepareUnitTest('events/model.cds', locations.testOutput('events_test'))
            astw = result.astw
            const servicePath = result.paths.find(p => p.endsWith(path.join('events', 'MyService')))
            assert.ok(servicePath, 'MyService namespace path should exist in output')
            const contextPath = result.paths.find(p => p.endsWith(path.join('events', 'ExplicitContext')))
            assert.ok(contextPath, 'ExplicitContext namespace path should exist in output')
            const { ASTWrapper } = require('../ast')
            serviceAstw = new ASTWrapper(path.join(servicePath, outputFile))
            serviceJsw = await JSASTWrapper.initialise(path.join(servicePath, 'index.js'))
            contextAstw = new ASTWrapper(path.join(contextPath, outputFile))
            contextJsw = await JSASTWrapper.initialise(path.join(contextPath, 'index.js'))
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
                    && cls.members[0].name === 'kind' && check.isReadonlyMember(cls.members[0]) && check.isStaticMember(cls.members[0])
                    && cls.members[1].name === 'id' && check.isNullable(cls.members[1].type, [check.isNumber])
                    && cls.members[2].name === 'name' && check.isNullable(cls.members[2].type, [check.isIndexedAccessType])
                    && cls.members[3].name === 'createdOn' && check.isNullable(cls.members[3].type, [check.isTypeReference])
                ))
            })

            it('should generate event defined inside a service in the service namespace file', async () => {
                assert.ok(serviceAstw, 'service namespace file should exist')
                assert.ok(serviceAstw.tree.find(cls => cls.name === 'OrderPlaced'
                    && cls.members.length === 2
                    && cls.members[0].name === 'kind' && check.isReadonlyMember(cls.members[0]) && check.isStaticMember(cls.members[0])
                    && cls.members[1].name === 'id' && check.isNullable(cls.members[1].type, [check.isNumber])
                ))
            })

            it('should use dot-separated prefix as namespace for dotted event names', async () => {
                assert.ok(serviceAstw, 'service namespace file should exist')
                const ns = serviceAstw.getModuleDeclaration('Scoped')
                assert.ok(ns, 'namespace Scoped should exist')
                assert.ok(ns.body.find(cls => cls.name === 'OrderPlaced'
                    && cls.members.length === 2
                    && cls.members[0].name === 'kind' && check.isReadonlyMember(cls.members[0]) && check.isStaticMember(cls.members[0])
                    && cls.members[1].name === 'id' && check.isNullable(cls.members[1].type, [check.isNumber])
                ))
            })

            it('should emit dotted event as object literal in JS when scope prefix has no matching entity', async () => {
                // `Scoped` is not an entity — emit `Scoped = {}` first, then `Scoped.OrderPlaced = '...'`.
                const initNode = serviceJsw.program.body.find(n =>
                    n.type === 'ExpressionStatement' &&
                    n.expression.left?.property?.name === 'Scoped' &&
                    n.expression.right?.type === 'ObjectExpression' &&
                    n.expression.right?.properties?.length === 0
                )
                assert.ok(initNode, 'module.exports.Scoped = {} initialiser should exist in index.js')
                const assignNode = serviceJsw.program.body.find(n =>
                    n.type === 'ExpressionStatement' &&
                    n.expression.left?.property?.name === 'OrderPlaced' &&
                    n.expression.left?.object?.property?.name === 'Scoped'
                )
                assert.ok(assignNode, 'module.exports.Scoped.OrderPlaced assignment should exist in index.js')
                assert.strictEqual(assignNode.expression.right?.value, 'Scoped.OrderPlaced')
            })

            it('should nest namespaces for events with more than one dot', async () => {
                const ns = serviceAstw.getModuleDeclaration('Deeply')
                assert.ok(ns, 'namespace Deeply should exist')
                const innerNs = ns.body.find(n => n.name === 'Scoped')
                assert.ok(innerNs, 'namespace Deeply.Scoped should exist')
                assert.ok(innerNs.body.find(cls => cls.name === 'OrderPlaced'
                    && cls.members.length === 2
                    && cls.members[0].name === 'kind' && check.isReadonlyMember(cls.members[0]) && check.isStaticMember(cls.members[0])
                    && cls.members[1].name === 'id' && check.isNullable(cls.members[1].type, [check.isNumber])
                ))
            })

            it('should emit deeply dotted event with lazy intermediate initialisation in JS', async () => {
                // `Deeply.Scoped.OrderPlaced`: emit `Deeply = {}`, `Deeply.Scoped ??= {}`, then the leaf.
                const initNode = serviceJsw.program.body.find(n =>
                    n.type === 'ExpressionStatement' &&
                    n.expression.left?.property?.name === 'Deeply' &&
                    n.expression.right?.type === 'ObjectExpression' &&
                    n.expression.right?.properties?.length === 0
                )
                assert.ok(initNode, 'module.exports.Deeply = {} initialiser should exist')
                const coalesceNode = serviceJsw.program.body.find(n =>
                    n.type === 'ExpressionStatement' &&
                    n.expression.operator === '??=' &&
                    n.expression.left?.property?.name === 'Scoped' &&
                    n.expression.left?.object?.property?.name === 'Deeply'
                )
                assert.ok(coalesceNode, 'module.exports.Deeply.Scoped ??= {} coalesce should exist')
                const assignNode = serviceJsw.program.body.find(n =>
                    n.type === 'ExpressionStatement' &&
                    n.expression.left?.property?.name === 'OrderPlaced' &&
                    n.expression.left?.object?.property?.name === 'Scoped' &&
                    n.expression.left?.object?.object?.property?.name === 'Deeply'
                )
                assert.ok(assignNode, 'module.exports.Deeply.Scoped.OrderPlaced assignment should exist')
                assert.strictEqual(assignNode.expression.right?.value, 'Deeply.Scoped.OrderPlaced')
            })
        })

        describe('Explicit Context Namespace', () => {
            it('should generate event defined inside a context in the context namespace file', async () => {
                assert.ok(contextAstw, 'context namespace file should exist')
                assert.ok(contextAstw.tree.find(cls => cls.name === 'ContextEvent'
                    && cls.members.length === 2
                    && cls.members[0].name === 'kind' && check.isReadonlyMember(cls.members[0]) && check.isStaticMember(cls.members[0])
                    && cls.members[1].name === 'id' && check.isNullable(cls.members[1].type, [check.isNumber])
                ))
            })

            it('should retain the context name in the JS string value', async () => {
                // The CDS runtime does NOT strip context names — only service names.
                // So `events.ExplicitContext.ContextEvent` must emit 'events.ExplicitContext.ContextEvent',
                // not just 'ContextEvent'.
                const assignNode = contextJsw.program.body.find(n =>
                    n.type === 'ExpressionStatement' &&
                    n.expression.left?.property?.name === 'ContextEvent'
                )
                assert.ok(assignNode, 'module.exports.ContextEvent assignment should exist in index.js')
                assert.strictEqual(assignNode.expression.right?.value, 'events.ExplicitContext.ContextEvent')
            })
        })
    })
})
